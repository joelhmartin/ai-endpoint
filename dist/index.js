"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const chat_1 = require("./chat");
const lead_1 = require("./lead");
const ctmClients_1 = require("./ctmClients");
const ragCorpusStore_1 = require("./ragCorpusStore");
const rag_1 = require("./rag");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "2mb" }));
app.post("/chat", chat_1.handleChat);
app.post("/lead", lead_1.handleLead);
// RAG endpoints
app.post("/rag/corpus", rag_1.handleCreateCorpus);
app.delete("/rag/corpus", rag_1.handleDeleteCorpus);
app.post("/rag/files", rag_1.upload.single("file"), rag_1.handleUploadFile);
app.get("/rag/files", rag_1.handleListFiles);
app.delete("/rag/files", rag_1.handleDeleteFile);
app.get("/rag/status", rag_1.handleRagStatus);
app.get("/health", (req, res) => res.json({ ok: true }));
app.use((req, res) => {
    console.log("[CHAT API] Unknown route", req.method, req.path);
    res.status(404).json({ error: "Not found" });
});
const port = process.env.PORT || 8080;
(async () => {
    const [ctmResult, ragResult] = await Promise.allSettled([
        (0, ctmClients_1.loadCTMClients)(),
        (0, ragCorpusStore_1.initRagCorpora)(),
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
