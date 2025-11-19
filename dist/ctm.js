"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatLead = createChatLead;
exports.updateChatTranscript = updateChatTranscript;
const axios_1 = __importDefault(require("axios"));
const ctmClients_1 = require("./ctmClients");
const CTM_BASE_URL = "https://api.calltrackingmetrics.com/api/v1/accounts";
function buildActivitiesUrl(accountId) {
    return `${CTM_BASE_URL}/${accountId}/activities`;
}
function getClientAuth(clientId) {
    const client = ctmClients_1.CLIENTS[clientId];
    if (!client || !client.auth) {
        throw new Error("No CTM client configured for " + clientId);
    }
    return { client, authHeader: client.auth };
}
async function createChatLead(clientId, args) {
    const { client, authHeader } = getClientAuth(clientId);
    const url = buildActivitiesUrl(clientId);
    const payload = {
        type: "chat_lead",
        subject: `Chat lead for ${client.name}`,
        note: args.transcript,
        metadata: {
            sessionId: args.sessionId,
            name: args.name,
            email: args.email,
            phone: args.phone,
            meta: args.meta || {}
        }
    };
    const response = await axios_1.default.post(url, payload, {
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json"
        }
    });
    return {
        ok: true,
        callIdToken: response.data?.id || null
    };
}
async function updateChatTranscript(clientId, transcript) {
    const { client, authHeader } = getClientAuth(clientId);
    const url = buildActivitiesUrl(clientId);
    const note = transcript.messages
        .map(message => {
        const speaker = message.role === "assistant" ? `${client.name} Assistant` : "User";
        return `${message.at} - ${speaker}: ${message.text}`;
    })
        .join("\n");
    const payload = {
        type: "chat_transcript",
        subject: `Chat transcript ${transcript.sessionId}`,
        note,
        metadata: {
            sessionId: transcript.sessionId,
            startedAt: transcript.startedAt,
            endedAt: transcript.endedAt,
            meta: transcript.meta || {}
        }
    };
    await axios_1.default.post(url, payload, {
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json"
        }
    });
    return { ok: true };
}
