export const env = {
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || "anchor-hub-480305",
  GCP_REGION: process.env.GCP_REGION || "europe-west1",
  FORWARD_TOKEN: process.env.FORWARD_TOKEN || "",
  MODEL_NAME: process.env.MODEL_NAME || "google/gemini-2.0-flash-001",
  LOG_LEVEL: process.env.LOG_LEVEL || "info"
};

if (!env.FORWARD_TOKEN) throw new Error("FORWARD_TOKEN missing");
