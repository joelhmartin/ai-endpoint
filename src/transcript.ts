import { TranscriptPayload } from "./types";
import { env } from "./env";
import { sendTranscriptToCTM } from "./ctm";

export async function handleTranscript(req, res) {
  try {
    const body = req.body as TranscriptPayload;

    if (body.token !== env.FORWARD_TOKEN) {
      return res.status(403).json({ error: "Invalid token" });
    }

    await sendTranscriptToCTM(body.clientId, body.transcript);

    res.json({ ok: true });
  } catch (err: any) {
    console.error("TRANSCRIPT ERROR", err.response?.data || err.message);
    res.status(500).json({ error: "Transcript error" });
  }
}
