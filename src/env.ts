export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  FORWARD_TOKEN: process.env.FORWARD_TOKEN || "",
  MODEL_NAME: process.env.MODEL_NAME || "gpt-4o-mini",
  LOG_LEVEL: process.env.LOG_LEVEL || "info"
};

if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
if (!env.FORWARD_TOKEN) throw new Error("FORWARD_TOKEN missing");
