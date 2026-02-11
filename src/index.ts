import express from "express";
import cors from "cors";

import { handleChat } from "./chat";
import { handleLead } from "./lead";
import { loadCTMClients } from "./ctmClients";
import { initRagCorpora } from "./ragCorpusStore";
import {
  handleCreateCorpus,
  handleDeleteCorpus,
  handleUploadFile,
  handleListFiles,
  handleDeleteFile,
  handleRagStatus,
  upload,
} from "./rag";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.post("/chat", handleChat);
app.post("/lead", handleLead);

// RAG endpoints
app.post("/rag/corpus", handleCreateCorpus);
app.delete("/rag/corpus", handleDeleteCorpus);
app.post("/rag/files", upload.single("file"), handleUploadFile);
app.get("/rag/files", handleListFiles);
app.delete("/rag/files", handleDeleteFile);
app.get("/rag/status", handleRagStatus);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use((req, res) => {
  console.log("[CHAT API] Unknown route", req.method, req.path);
  res.status(404).json({ error: "Not found" });
});

const port = process.env.PORT || 8080;

(async () => {
  const [ctmResult, ragResult] = await Promise.allSettled([
    loadCTMClients(),
    initRagCorpora(),
  ]);

  if (ctmResult.status === "rejected") {
    console.error("[CTM] Failed to initialise CTM clients:", ctmResult.reason);
    process.exit(1);
  }

  if (ragResult.status === "rejected") {
    console.error("[RAG] init failed (non-fatal):", ragResult.reason);
  }

  app.listen(port, () => console.log("Cloud Run backend running on port", port));
})();
