import express from "express";
import cors from "cors";

import { handleChat } from "./chat";
import { handleTranscript } from "./transcript";
import { handleLead } from "./lead";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.post("/chat", handleChat);
app.post("/lead", handleLead);
app.post("/transcript", handleTranscript);

app.get("/healthz", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Cloud Run backend running on port", port));
