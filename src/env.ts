export const env = {
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || "anchor-hub-480305",
  GCP_REGION: process.env.GCP_REGION || "europe-west1",
  FORWARD_TOKEN: process.env.FORWARD_TOKEN || "",
  MODEL_NAME: process.env.MODEL_NAME || "google/gemini-2.0-flash-001",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  CTM_ACCESS_KEY: process.env.CTM_ACCESS_KEY || "d4141f35cc0f2da64301d81c6763730e",
  CTM_SECRET_KEY: process.env.CTM_SECRET_KEY || "f98e1f6eb956edae55561fe964581c78a277",
  RAG_LOCATION: process.env.RAG_LOCATION || "europe-west1",
  RAG_GCS_BUCKET: process.env.RAG_GCS_BUCKET || "anchor-hub-480305-rag-uploads",
};

if (!env.FORWARD_TOKEN) throw new Error("FORWARD_TOKEN missing");

export const CTM_AUTH_HEADER =
  "Basic " + Buffer.from(`${env.CTM_ACCESS_KEY}:${env.CTM_SECRET_KEY}`).toString("base64");
