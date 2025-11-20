import { Request, Response } from "express";
import { LeadPayload } from "./types";
import { env } from "./env";
import { createChatLead, updateChatTranscript } from "./ctm";
import { getTrackback } from "./sessionStore";

type LeadRequestBody = LeadPayload;

export async function handleLead(
  req: Request<unknown, unknown, LeadRequestBody>,
  res: Response
) {
  const body = req.body as LeadPayload;

  if (!body || !body.clientId || !body.sessionId) {
    return res.status(400).json({ error: "Missing clientId or sessionId" });
  }

  if (body.token !== env.FORWARD_TOKEN) {
    return res.status(403).json({ error: "Invalid token" });
  }

  const isLeadPayload = Boolean(body.name && body.email && body.phone);
  const isTranscriptUpdate = Boolean(body.transcript && !isLeadPayload);

  try {
    if (isLeadPayload) {
      const result = await createChatLead(body.clientId, {
        sessionId: body.sessionId,
        name: body.name!,
        email: body.email!,
        phone: body.phone!,
        transcript: body.transcript || "",
        meta: body.meta || {}
      });

      return res.json({ status: "created", trackbackId: result.trackbackId || null });
    }

    if (isTranscriptUpdate) {
      const trackbackId = body.trackbackId || getTrackback(body.sessionId)?.trackbackId;
      if (!trackbackId) {
        return res.status(400).json({ error: "Missing trackbackId" });
      }

      await updateChatTranscript(body.clientId, {
        sessionId: body.sessionId,
        transcript: body.transcript!,
        trackbackId
      });
      return res.json({ status: "updated" });
    }

    return res.status(400).json({ error: "Invalid lead payload" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[lead] error", {
      clientId: body.clientId,
      sessionId: body.sessionId,
      error: message
    });
    return res.status(500).json({ error: "Lead handling failed" });
  }
}
