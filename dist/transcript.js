"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTranscript = handleTranscript;
const env_1 = require("./env");
const ctmClients_1 = require("./ctmClients");
const ctm_1 = require("./ctm");
function compileTranscript(history = [], latestMessage) {
    const entries = [...history];
    if (latestMessage) {
        entries.push({ role: "user", content: latestMessage });
    }
    return { transcript: entries };
}
async function handleTranscript(req, res) {
    try {
        const body = req.body;
        if (body.forwardToken !== env_1.env.FORWARD_TOKEN) {
            return res.status(401).json({ error: "invalid token" });
        }
        const client = ctmClients_1.CLIENTS[body.clientId];
        if (!client) {
            return res.status(404).json({ error: "unknown clientId" });
        }
        const ctmUrl = (0, ctm_1.buildCTMWebhook)(body.clientId);
        const transcriptPayload = compileTranscript(body.history || [], body.message);
        console.log("Received request for client", body.clientId);
        await (0, ctm_1.postTranscriptToCTM)(ctmUrl, client.auth, transcriptPayload);
        console.log("CTM POST success", body.clientId);
        res.json({ ok: true });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("TRANSCRIPT ERROR", message);
        res.status(500).json({ error: "Transcript error" });
    }
}
