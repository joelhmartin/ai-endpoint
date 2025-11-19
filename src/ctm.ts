import axios from "axios";
import { CLIENTS } from "./ctmClients";
import { Transcript, LeadPayloadMeta } from "./types";

const CTM_BASE_URL = "https://api.calltrackingmetrics.com/api/v1/accounts";

interface CreateLeadArgs {
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  transcript: string;
  meta?: LeadPayloadMeta;
}

function buildActivitiesUrl(accountId: string): string {
  return `${CTM_BASE_URL}/${accountId}/activities`;
}

function getClientAuth(clientId: string) {
  const client = CLIENTS[clientId];
  if (!client || !client.auth) {
    throw new Error("No CTM client configured for " + clientId);
  }

  return { client, authHeader: client.auth };
}

export async function createChatLead(clientId: string, args: CreateLeadArgs) {
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

  const response = await axios.post(url, payload, {
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

export async function updateChatTranscript(clientId: string, transcript: Transcript) {
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

  await axios.post(url, payload, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json"
    }
  });

  return { ok: true };
}
