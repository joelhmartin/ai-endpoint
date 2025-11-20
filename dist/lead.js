"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLead = handleLead;
const env_1 = require("./env");
const ctm_1 = require("./ctm");
const sessionStore_1 = require("./sessionStore");
async function handleLead(req, res) {
    const body = req.body;
    if (!body || !body.clientId || !body.sessionId) {
        return res.status(400).json({ error: "Missing clientId or sessionId" });
    }
    if (body.token !== env_1.env.FORWARD_TOKEN) {
        return res.status(403).json({ error: "Invalid token" });
    }
    const isLeadPayload = Boolean(body.name && body.email && body.phone);
    const isTranscriptUpdate = Boolean(body.transcript && !isLeadPayload);
    try {
        if (isLeadPayload) {
            const result = await (0, ctm_1.createChatLead)(body.clientId, {
                sessionId: body.sessionId,
                name: body.name,
                email: body.email,
                phone: body.phone,
                transcript: body.transcript || "",
                meta: body.meta || {}
            });
            return res.json({ status: "created", trackbackId: result.trackbackId || null });
        }
        if (isTranscriptUpdate) {
            const trackbackId = body.trackbackId || (0, sessionStore_1.getTrackback)(body.sessionId)?.trackbackId;
            if (!trackbackId) {
                return res.status(400).json({ error: "Missing trackbackId" });
            }
            console.log("[lead] update", {
                clientId: body.clientId,
                sessionId: body.sessionId,
                trackbackId,
                transcriptLength: body.transcript?.length || 0
            });
            await (0, ctm_1.updateChatTranscript)(body.clientId, {
                sessionId: body.sessionId,
                transcript: body.transcript,
                trackbackId
            });
            return res.json({ status: "updated" });
        }
        return res.status(400).json({ error: "Invalid lead payload" });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error("[lead] error", {
            clientId: body.clientId,
            sessionId: body.sessionId,
            error: message
        });
        return res.status(500).json({ error: "Lead handling failed" });
    }
}
