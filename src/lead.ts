import { Request, Response } from "express";
import { LeadPayload } from "./types";
import { env } from "./env";
import { createChatLead } from "./ctm";

type LeadRequestBody = LeadPayload;

export async function handleLead(
  req: Request<unknown, unknown, LeadRequestBody>,
  res: Response
) {
  const body = req.body as LeadPayload;

  if (!body || !body.clientId || !body.sessionId) {
    return res.status(400).json({ error: "Missing clientId or sessionId" });
  }

  if (!body.name || !body.email || !body.phone) {
    return res.status(400).json({ error: "Missing name, email, or phone" });
  }

  if (body.token !== env.FORWARD_TOKEN) {
    return res.status(403).json({ error: "Invalid token" });
  }

  try {
    const result = await createChatLead(body.clientId, {
      sessionId: body.sessionId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      transcript: body.transcript,
      meta: body.meta || {}
    });

    return res.json({ ok: true, callIdToken: result.callIdToken || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[lead] error", {
      clientId: body.clientId,
      sessionId: body.sessionId,
      error: message
    });
    return res.status(500).json({ error: "Lead creation failed" });
  }
}
