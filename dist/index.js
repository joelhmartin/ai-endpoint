"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const chat_1 = require("./chat");
const transcript_1 = require("./transcript");
const lead_1 = require("./lead");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "2mb" }));
app.post("/chat", chat_1.handleChat);
app.post("/lead", lead_1.handleLead);
app.post("/transcript", transcript_1.handleTranscript);
app.get("/healthz", (req, res) => res.json({ ok: true }));
app.use((req, res) => {
    console.log("[CHAT API] Unknown route", req.method, req.path);
    res.status(404).json({ error: "Not found" });
});
const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Cloud Run backend running on port", port));
