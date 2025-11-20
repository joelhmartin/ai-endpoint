import axios from "axios";
import { CLIENTS, CTMClient } from "./ctmClients";
import { LeadPayloadMeta } from "./types";
import { getTrackback, saveTrackback, clearTrackback } from "./sessionStore";

const CTM_API_BASE = "https://api.calltrackingmetrics.com/api/v1";

interface CreateLeadArgs {
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  transcript: string;
  meta?: LeadPayloadMeta;
}

interface TranscriptUpdateArgs {
  sessionId: string;
  transcript: string;
  trackbackId?: string;
}

function buildFormreactorUrl(formreactorId: string): string {
  return `${CTM_API_BASE}/formreactor/${encodeURIComponent(formreactorId)}`;
}

function getClientAuth(clientId: string) {
  const client = CLIENTS[clientId];
  if (!client || !client.auth) {
    throw new Error("No CTM client configured for " + clientId);
  }

  return { client, authHeader: client.auth };
}

function resolveFormreactorId(clientId: string, client: CTMClient): string {
  const fromClient = client.formreactorId;
  const fromEnv = process.env[`CTM_FORMREACTOR_${clientId}`];
  const defaultEnv = process.env.CTM_FORMREACTOR_ID;
  const id = fromClient || fromEnv || defaultEnv;
  if (!id) {
    throw new Error("Missing CTM formreactor ID for client " + clientId);
  }
  return id;
}

function formatPhoneNumber(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

export async function createChatLead(clientId: string, args: CreateLeadArgs) {
  const { client, authHeader } = getClientAuth(clientId);
  const formreactorId = resolveFormreactorId(clientId, client);
  const url = buildFormreactorUrl(formreactorId);

  const payload = new URLSearchParams();
  payload.set("phone_number", formatPhoneNumber(args.phone));
  payload.set("country_code", "1");
  payload.set("caller_name", args.name);
  payload.set("email", args.email);
  payload.set("custom_chat_transcription", args.transcript);

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  const trackbackId = response.data?.trackback_id || response.data?.id || null;
  if (trackbackId) {
    saveTrackback(args.sessionId, {
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

export async function updateChatTranscript(clientId: string, payload: TranscriptUpdateArgs) {
  const { client, authHeader } = getClientAuth(clientId);
  const formreactorId = resolveFormreactorId(clientId, client);
  const trackbackId = payload.trackbackId || getTrackback(payload.sessionId)?.trackbackId;

  if (!trackbackId) {
    throw new Error("Missing trackbackId for transcript update");
  }

  const url = `${CTM_API_BASE}/formreactor/${encodeURIComponent(formreactorId)}/${encodeURIComponent(trackbackId)}`;
  const response = await axios.post(
    url,
    { custom_chat_transcription: payload.transcript },
    {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      }
    }
  );
  clearTrackback(payload.sessionId);
  console.log("[TRANSCRIPT]", {
    clientId,
    sessionId: payload.sessionId,
    mode: "formreactor",
    status: response.status
  });
  return { ok: true };
}
