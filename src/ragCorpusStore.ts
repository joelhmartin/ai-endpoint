import { listRagCorpora } from "./ragApi";

export interface CorpusInfo {
  corpusName: string; // full resource name
  displayName: string;
}

const CORPORA: Record<string, CorpusInfo> = {};

// Display name convention: client_{clientId}_{humanName}
function parseClientId(displayName: string): string | null {
  const match = displayName.match(/^client_(\w+)_/);
  return match ? match[1] : null;
}

export function getCorpus(clientId: string): CorpusInfo | null {
  return CORPORA[clientId] || null;
}

export function hasCorpus(clientId: string): boolean {
  return clientId in CORPORA;
}

export function setCorpus(clientId: string, info: CorpusInfo): void {
  CORPORA[clientId] = info;
}

export function removeCorpus(clientId: string): void {
  delete CORPORA[clientId];
}

export async function initRagCorpora(): Promise<void> {
  console.log("[RAG] Fetching existing corpora…");
  const corpora = await listRagCorpora();

  for (const c of corpora) {
    const clientId = parseClientId(c.displayName);
    if (clientId) {
      CORPORA[clientId] = {
        corpusName: c.name,
        displayName: c.displayName,
      };
    }
  }

  console.log(`[RAG] Loaded ${Object.keys(CORPORA).length} corpora`);
}
