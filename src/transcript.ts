import { Request, Response } from "express";
import { TranscriptPayload, TranscriptTurn } from "./types";
import { env } from "./env";
import { CLIENTS } from "./ctmClients";
import { buildCTMWebhook, postTranscriptToCTM } from "./ctm";

type TranscriptRequestBody = TranscriptPayload;

function compileTranscript(history: TranscriptTurn[] = [], latestMessage: string) {
  const entries = [...history];
  if (latestMessage) {
    entries.push({ role: "user", content: latestMessage });
  }

  return { transcript: entries };
}

export async function handleTranscript(
  req: Request<unknown, unknown, TranscriptRequestBody>,
  res: Response
) {
  try {
    const body = req.body as TranscriptPayload;

    if (body.forwardToken !== env.FORWARD_TOKEN) {
      return res.status(401).json({ error: "invalid token" });
    }

    const client = CLIENTS[body.clientId];
    if (!client) {
      return res.status(404).json({ error: "unknown clientId" });
    }

    const ctmUrl = buildCTMWebhook(body.clientId);
    const transcriptPayload = compileTranscript(body.history || [], body.message);

    console.log("Received request for client", body.clientId);
    await postTranscriptToCTM(ctmUrl, client.auth, transcriptPayload);
    console.log("CTM POST success", body.clientId);

    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("TRANSCRIPT ERROR", message);
    res.status(500).json({ error: "Transcript error" });
  }
}
