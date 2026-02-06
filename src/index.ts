import express from "express";
import cors from "cors";

import { handleChat } from "./chat";
import { handleLead } from "./lead";
import { initCTMClients } from "./ctmClients";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.post("/chat", handleChat);
app.post("/lead", handleLead);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use((req, res) => {
  console.log("[CHAT API] Unknown route", req.method, req.path);
  res.status(404).json({ error: "Not found" });
});

const port = process.env.PORT || 8080;

(async () => {
  try {
    await initCTMClients();
  } catch (err) {
    console.error("[CTM] Failed to initialise CTM clients:", err);
    process.exit(1);
  }
  app.listen(port, () => console.log("Cloud Run backend running on port", port));
})();
