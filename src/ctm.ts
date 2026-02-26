import axios from "axios";
import { getClient, getAuthHeader } from "./ctmClients";
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

async function lookupCallId(
  clientId: string,
  trackbackId: string,
  authHeader: string
): Promise<string | undefined> {
  const url = `${CTM_API_BASE}/accounts/${clientId}/calls?form.trackback_id=${encodeURIComponent(
    trackbackId
  )}`;
  const response = await axios.get(url, {
    headers: { Authorization: authHeader }
  });
  return response.data?.calls?.[0]?.id || undefined;
}

async function updateCallCustomTranscript(
  clientId: string,
  callId: string,
  transcript: string,
  authHeader: string
) {
  const url = `${CTM_API_BASE}/accounts/${clientId}/calls/${encodeURIComponent(callId)}/modify`;
  return axios.post(
    url,
    {
      custom_fields: {
        chat_transcription: transcript
      }
    },
    {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      }
    }
  );
}

function getClientAuth(clientId: string) {
  const client = getClient(clientId);
  if (!client) {
    throw new Error("No CTM client configured for " + clientId);
  }
  return { client, authHeader: getAuthHeader() };
}

function formatPhoneNumber(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

export async function createChatLead(clientId: string, args: CreateLeadArgs) {
  const { client, authHeader } = getClientAuth(clientId);
  const url = buildFormreactorUrl(client.formreactorId);

  // Send all fields — including transcript — in a single formreactor submission.
  // Custom fields use the `custom_` prefix at the top level (per CTM FormReactor API).
  const body: Record<string, string> = {
    phone_number: formatPhoneNumber(args.phone),
    country_code: "1",
    caller_name: args.name,
    email: args.email,
  };
  if (args.transcript) {
    body.custom_chat_transcription = args.transcript;
  }

  const response = await axios.post(url, JSON.stringify(body), {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  const trackbackId = response.data?.trackback_id || response.data?.id || null;
  if (trackbackId) {
    saveTrackback(args.sessionId, {
      clientId,
      trackbackId,
      callId: undefined,
      createdAt: new Date().toISOString(),
    });
  }

  console.log("[LEAD]", {
    clientId,
    sessionId: args.sessionId,
    status: response.status,
    trackbackId: trackbackId || null,
  });

  return {
    ok: true,
    trackbackId,
  };
}

export async function updateChatTranscript(clientId: string, payload: TranscriptUpdateArgs) {
  const { authHeader } = getClientAuth(clientId);
  const trackInfo = getTrackback(payload.sessionId);
  const trackbackId = payload.trackbackId || trackInfo?.trackbackId;

  if (!trackbackId) {
    throw new Error("Missing trackbackId for transcript update");
  }

  let callId = trackInfo?.callId;
  if (!callId) {
    callId = await lookupCallId(clientId, trackbackId, authHeader);
  }

  if (!callId) {
    throw new Error("Could not find call for trackbackId " + trackbackId);
  }

  await updateCallCustomTranscript(clientId, callId, payload.transcript, authHeader);

  clearTrackback(payload.sessionId);

  console.log("[TRANSCRIPT UPDATED]", {
    clientId,
    sessionId: payload.sessionId,
    callId,
  });

  return { ok: true };
}
