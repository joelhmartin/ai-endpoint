export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  FORWARD_TOKEN: process.env.FORWARD_TOKEN || "",
  CTM_BASE_URL:
    process.env.CTM_BASE_URL || "https://api.calltrackingmetrics.com/api/v1/accounts"
};

if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
if (!env.FORWARD_TOKEN) throw new Error("FORWARD_TOKEN missing");
