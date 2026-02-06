// ── Vertex AI RAG Engine resource shapes ────────────────────────────

export interface RagCorpusResource {
  name: string; // e.g. projects/123/locations/us-central1/ragCorpora/456
  displayName: string;
  description?: string;
  createTime?: string;
  updateTime?: string;
}

export interface RagFileResource {
  name: string; // e.g. …/ragCorpora/456/ragFiles/789
  displayName: string;
  sizeBytes?: string;
  createTime?: string;
  updateTime?: string;
}

export interface RetrievedContext {
  text: string;
  score: number;
  sourceDisplayName: string;
}

export interface RetrieveContextsResponse {
  contexts?: {
    contexts?: Array<{
      sourceUri?: string;
      sourceDisplayName?: string;
      text?: string;
      score?: number;
    }>;
  };
}

export interface LongRunningOperation {
  name: string;
  done?: boolean;
  error?: { code: number; message: string };
  response?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ── WordPress request bodies ────────────────────────────────────────

export interface CreateCorpusRequest {
  token: string;
  clientId: string;
  name: string;
}

export interface DeleteCorpusRequest {
  token: string;
  clientId: string;
}

export interface DeleteFileRequest {
  token: string;
  clientId: string;
  ragFileName: string;
}
