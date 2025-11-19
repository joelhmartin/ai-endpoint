import { Request, Response } from "express";
import { TranscriptPayload } from "./types";
import { env } from "./env";
import { updateChatTranscript } from "./ctm";

type TranscriptRequestBody = TranscriptPayload;

export async function handleTranscript(
  req: Request<unknown, unknown, TranscriptRequestBody>,
  res: Response
) {
  const body = req.body as TranscriptPayload;

  if (!body || !body.clientId || !body.transcript) {
    return res.status(400).json({ error: "Missing clientId or transcript" });
  }

  if (body.token !== env.FORWARD_TOKEN) {
    return res.status(403).json({ error: "Invalid token" });
  }

  const transcript = body.transcript;
  if (!transcript.sessionId || !Array.isArray(transcript.messages) || transcript.messages.length === 0) {
    return res.status(400).json({ error: "Empty transcript" });
  }

  try {
    await updateChatTranscript(body.clientId, transcript);
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[transcript] error", {
      clientId: body.clientId,
      sessionId: transcript.sessionId,
      error: message
    });
    return res.status(500).json({ error: "Transcript update failed" });
  }
}
