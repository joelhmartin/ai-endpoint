"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatLead = createChatLead;
exports.updateChatTranscript = updateChatTranscript;
const axios_1 = __importDefault(require("axios"));
const ctmClients_1 = require("./ctmClients");
const sessionStore_1 = require("./sessionStore");
const CTM_API_BASE = "https://api.calltrackingmetrics.com/api/v1";
const CTM_ACCOUNTS_BASE = `${CTM_API_BASE}/accounts`;
function buildActivitiesUrl(accountId) {
    return `${CTM_ACCOUNTS_BASE}/${accountId}/activities`;
}
function buildFormreactorUrl(formreactorId) {
    return `${CTM_API_BASE}/formreactor/${encodeURIComponent(formreactorId)}`;
}
function getClientAuth(clientId) {
    const client = ctmClients_1.CLIENTS[clientId];
    if (!client || !client.auth) {
        throw new Error("No CTM client configured for " + clientId);
    }
    return { client, authHeader: client.auth };
}
function resolveFormreactorId(clientId, client) {
    const fromClient = client.formreactorId;
    const fromEnv = process.env[`CTM_FORMREACTOR_${clientId}`];
    const defaultEnv = process.env.CTM_FORMREACTOR_ID;
    const id = fromClient || fromEnv || defaultEnv;
    if (!id) {
        throw new Error("Missing CTM formreactor ID for client " + clientId);
    }
    return id;
}
function formatPhoneNumber(phone) {
    return (phone || "").replace(/\D/g, "");
}
function buildTranscriptString(transcript, practiceName) {
    return transcript.messages
        .map(message => {
        const speaker = message.role === "assistant" ? `${practiceName} Assistant` : "User";
        return `${message.at} - ${speaker}: ${message.text}`;
    })
        .join("\n");
}
async function createChatLead(clientId, args) {
    const { client, authHeader } = getClientAuth(clientId);
    const formreactorId = resolveFormreactorId(clientId, client);
    const url = buildFormreactorUrl(formreactorId);
    const payload = new URLSearchParams();
    payload.set("phone_number", formatPhoneNumber(args.phone));
    payload.set("country_code", "1");
    payload.set("caller_name", args.name);
    payload.set("email", args.email);
    payload.set("custom_chat_transcription", args.transcript);
    const response = await axios_1.default.post(url, payload, {
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });
    const trackbackId = response.data?.trackback_id || response.data?.id || null;
    if (trackbackId) {
        (0, sessionStore_1.saveTrackback)(args.sessionId, {
            clientId,
            trackbackId,
            createdAt: new Date().toISOString()
        });
    }
    console.log("[LEAD]", {
        clientId,
        sessionId: args.sessionId,
        status: response.status,
        trackbackId: trackbackId || null
    });
    return {
        ok: true,
        callIdToken: trackbackId
    };
}
async function updateChatTranscript(clientId, transcript) {
    const { client, authHeader } = getClientAuth(clientId);
    const transcriptText = buildTranscriptString(transcript, client.name);
    const trackback = (0, sessionStore_1.getTrackback)(transcript.sessionId);
    if (trackback && trackback.trackbackId) {
        const modifyUrl = `${CTM_API_BASE}/calls/${encodeURIComponent(trackback.trackbackId)}/modify`;
        const response = await axios_1.default.post(modifyUrl, { custom_chat_transcription: transcriptText }, {
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json"
            }
        });
        (0, sessionStore_1.clearTrackback)(transcript.sessionId);
        console.log("[TRANSCRIPT]", {
            clientId,
            sessionId: transcript.sessionId,
            mode: "modify",
            status: response.status
        });
        return { ok: true };
    }
    console.warn("[TRANSCRIPT] missing trackback", {
        clientId,
        sessionId: transcript.sessionId
    });
    const fallbackUrl = buildActivitiesUrl(clientId);
    const response = await axios_1.default.post(fallbackUrl, {
        type: "chat_transcript",
        subject: `Chat transcript ${transcript.sessionId}`,
        note: transcriptText,
        metadata: {
            sessionId: transcript.sessionId,
            startedAt: transcript.startedAt,
            endedAt: transcript.endedAt,
            meta: transcript.meta || {}
        }
    }, {
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json"
        }
    });
    console.log("[TRANSCRIPT]", {
        clientId,
        sessionId: transcript.sessionId,
        mode: "activity",
        status: response.status
    });
    return { ok: true };
}
