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
        trackbackId
    };
}
async function updateChatTranscript(clientId, payload) {
    const { client, authHeader } = getClientAuth(clientId);
    const formreactorId = resolveFormreactorId(clientId, client);
    const trackbackId = payload.trackbackId || (0, sessionStore_1.getTrackback)(payload.sessionId)?.trackbackId;
    if (!trackbackId) {
        throw new Error("Missing trackbackId for transcript update");
    }
    const url = `${CTM_API_BASE}/formreactor/${encodeURIComponent(formreactorId)}/${encodeURIComponent(trackbackId)}`;
    const response = await axios_1.default.post(url, { custom_chat_transcription: payload.transcript }, {
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json"
        }
    });
    (0, sessionStore_1.clearTrackback)(payload.sessionId);
    console.log("[TRANSCRIPT]", {
        clientId,
        sessionId: payload.sessionId,
        mode: "formreactor",
        status: response.status
    });
    return { ok: true };
}
