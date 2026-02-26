import axios from "axios";
import { env } from "./env";
import { getAuthHeaders } from "./auth";
import {
  RagCorpusResource,
  RagFileResource,
  RetrievedContext,
  RetrieveContextsResponse,
  LongRunningOperation,
} from "./ragTypes";

/** Build the Vertex AI base URL for a given location. */
function baseUrl(location: string): string {
  return `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${env.GCP_PROJECT_ID}/locations/${location}`;
}

/** Extract the location from a full Vertex AI resource name (e.g. projects/.../locations/europe-west1/...). */
function locationOf(resourceName: string): string {
  const m = resourceName.match(/locations\/([^/]+)/);
  return m ? m[1] : env.RAG_LOCATION;
}

// ── LRO polling ─────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 60_000;

export async function pollOperation(
  operationName: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<LongRunningOperation> {
  const deadline = Date.now() + timeoutMs;
  const loc = locationOf(operationName);
  const url = `https://${loc}-aiplatform.googleapis.com/v1beta1/${operationName}`;

  while (Date.now() < deadline) {
    const headers = await getAuthHeaders();
    const { data } = await axios.get<LongRunningOperation>(url, { headers });
    if (data.done) {
      if (data.error) {
        throw new Error(`LRO failed: ${data.error.message} (code ${data.error.code})`);
      }
      return data;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`LRO ${operationName} timed out after ${timeoutMs}ms`);
}

// ── Corpus CRUD ─────────────────────────────────────────────────────

export async function createRagCorpus(
  displayName: string,
  description?: string
): Promise<string> {
  const headers = await getAuthHeaders();
  const { data } = await axios.post<LongRunningOperation>(
    `${baseUrl(env.RAG_LOCATION)}/ragCorpora`,
    {
      display_name: displayName,
      ...(description ? { description } : {}),
    },
    { headers }
  );

  const op = await pollOperation(data.name, 120_000);
  const corpusName = (op.response as Record<string, unknown>)?.name as string;
  if (!corpusName) throw new Error("createRagCorpus: no corpus name in LRO response");
  return corpusName;
}

export async function deleteRagCorpus(corpusName: string): Promise<void> {
  const headers = await getAuthHeaders();
  const loc = locationOf(corpusName);
  await axios.delete(
    `https://${loc}-aiplatform.googleapis.com/v1beta1/${corpusName}?force=true`,
    { headers }
  );
}

/**
 * List all RAG corpora. Scans both the configured RAG_LOCATION and any
 * legacy locations so that corpora created in a previous region are found.
 */
const RAG_SCAN_LOCATIONS = Array.from(
  new Set([env.RAG_LOCATION, "europe-west1"])
);

export async function listRagCorpora(): Promise<RagCorpusResource[]> {
  const all: RagCorpusResource[] = [];

  for (const loc of RAG_SCAN_LOCATIONS) {
    const headers = await getAuthHeaders();
    let pageToken: string | undefined;
    do {
      const params: Record<string, string> = { page_size: "100" };
      if (pageToken) params.page_token = pageToken;

      const { data } = await axios.get(`${baseUrl(loc)}/ragCorpora`, {
        headers,
        params,
      });
      const items: RagCorpusResource[] = (data.ragCorpora ?? []).map(
        (c: Record<string, unknown>) => ({
          name: c.name as string,
          displayName: (c.display_name ?? c.displayName ?? "") as string,
          description: (c.description ?? "") as string,
        })
      );
      all.push(...items);
      pageToken = data.nextPageToken as string | undefined;
    } while (pageToken);
  }

  return all;
}

// ── File operations ─────────────────────────────────────────────────

export async function importRagFile(
  corpusName: string,
  gcsUri: string,
  chunkSize = 512,
  chunkOverlap = 100
): Promise<RagFileResource> {
  const headers = await getAuthHeaders();
  const loc = locationOf(corpusName);
  const corpusId = corpusName.split("/").pop();
  const { data } = await axios.post<LongRunningOperation>(
    `${baseUrl(loc)}/ragCorpora/${corpusId}/ragFiles:import`,
    {
      import_rag_files_config: {
        gcs_source: { uris: [gcsUri] },
        rag_file_chunking_config: {
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
        },
      },
    },
    { headers }
  );

  const op = await pollOperation(data.name, 120_000);
  // The import response doesn't directly return the file resource,
  // but we can list files to find the newly imported one
  const files = await listRagFiles(corpusName);
  const latest = files[files.length - 1];
  if (!latest) throw new Error("importRagFile: no file found after import");
  return latest;
}

export async function listRagFiles(corpusName: string): Promise<RagFileResource[]> {
  const headers = await getAuthHeaders();
  const loc = locationOf(corpusName);
  const corpusId = corpusName.split("/").pop();
  const all: RagFileResource[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = { page_size: "100" };
    if (pageToken) params.page_token = pageToken;

    const { data } = await axios.get(
      `${baseUrl(loc)}/ragCorpora/${corpusId}/ragFiles`,
      { headers, params }
    );
    const items: RagFileResource[] = (data.ragFiles ?? []).map(
      (f: Record<string, unknown>) => ({
        name: f.name as string,
        displayName: (f.display_name ?? f.displayName ?? "") as string,
        sizeBytes: (f.size_bytes ?? f.sizeBytes ?? "") as string,
        createTime: (f.create_time ?? f.createTime ?? "") as string,
      })
    );
    all.push(...items);
    pageToken = data.nextPageToken as string | undefined;
  } while (pageToken);

  return all;
}

export async function deleteRagFile(ragFileName: string): Promise<void> {
  const headers = await getAuthHeaders();
  const loc = locationOf(ragFileName);
  await axios.delete(
    `https://${loc}-aiplatform.googleapis.com/v1beta1/${ragFileName}`,
    { headers }
  );
}

// ── Retrieval ───────────────────────────────────────────────────────

export async function retrieveContexts(
  corpusName: string,
  queryText: string,
  topK = 3
): Promise<RetrievedContext[]> {
  const headers = await getAuthHeaders();
  const loc = locationOf(corpusName);
  const { data } = await axios.post<RetrieveContextsResponse>(
    `${baseUrl(loc)}:retrieveContexts`,
    {
      vertex_rag_store: {
        rag_resources: [{ rag_corpus: corpusName }],
      },
      query: {
        text: queryText,
        similarity_top_k: topK,
      },
    },
    { headers }
  );

  return (data.contexts?.contexts ?? []).map((c) => ({
    text: c.text ?? "",
    score: c.score ?? 0,
    sourceDisplayName: c.sourceDisplayName ?? "",
  }));
}
