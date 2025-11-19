"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTranscript = handleTranscript;
const env_1 = require("./env");
const ctm_1 = require("./ctm");
async function handleTranscript(req, res) {
    const body = req.body;
    if (!body || !body.clientId || !body.transcript) {
        return res.status(400).json({ error: "Missing clientId or transcript" });
    }
    if (body.token !== env_1.env.FORWARD_TOKEN) {
        return res.status(403).json({ error: "Invalid token" });
    }
    const transcript = body.transcript;
    if (!transcript.sessionId || !Array.isArray(transcript.messages) || transcript.messages.length === 0) {
        return res.status(400).json({ error: "Empty transcript" });
    }
    try {
        await (0, ctm_1.updateChatTranscript)(body.clientId, transcript);
        return res.json({ ok: true });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error("[transcript] error", {
            clientId: body.clientId,
            sessionId: transcript.sessionId,
            error: message
        });
        return res.status(500).json({ error: "Transcript update failed" });
    }
}
