import axios from "axios";
import { GoogleAuth } from "google-auth-library";
import { Request, Response } from "express";
import { ChatRequest, ChatMeta } from "./types";
import { env } from "./env";
import { hasCorpus, getCorpus } from "./ragCorpusStore";
import { retrieveContexts } from "./ragApi";

type ChatRequestBody = ChatRequest;

type ChatCompletionMessage = {
  role: "system" | "assistant" | "user";
  content: string;
};

const auth = new GoogleAuth({
  scopes: "https://www.googleapis.com/auth/cloud-platform"
});

const VERTEX_AI_URL = `https://${env.GCP_REGION}-aiplatform.googleapis.com/v1beta1/projects/${env.GCP_PROJECT_ID}/locations/${env.GCP_REGION}/endpoints/openapi/chat/completions`;

function buildBusinessSystemMessage(meta?: ChatMeta): string {
  if (!meta) {
    return "";
  }

  const lines: string[] = [];

  if (meta.businessName) {
    lines.push(`You are a helpful, friendly front-desk assistant for ${meta.businessName}.`);
  } else {
    lines.push("You are a helpful, friendly front-desk assistant for a healthcare practice.");
  }

  if (meta.businessLocation) {
    lines.push(`The practice is located in ${meta.businessLocation}.`);
  }

  if (meta.businessPhone || meta.businessEmail) {
    const contactBits: string[] = [];
    if (meta.businessPhone) contactBits.push(`phone: ${meta.businessPhone}`);
    if (meta.businessEmail) contactBits.push(`email: ${meta.businessEmail}`);
    lines.push(`You may share the following contact info with patients: ${contactBits.join(", ")}.`);
  }

  if (meta.context) {
    const ctx = meta.context.trim();
    if (ctx) {
      lines.push("Here is additional business context you must respect when answering:\n" + ctx);
    }
  }

  if (meta.businessHoursText) {
    const hoursText = meta.businessHoursText.trim();
    if (hoursText) {
      lines.push(
        "The office hours are: " +
          hoursText +
          ". If patients ask about office hours, days, or when you are open or closed, you must answer using exactly this schedule."
      );
    }
  }

  lines.push(
    "Answer as the practice, keep responses concise, do not invent medical advice, and encourage patients to call the office for diagnosis or emergencies."
  );

  return lines.join("\n\n");
}

function buildMessages(body: ChatRequest, ragContext?: string): ChatCompletionMessage[] {
  const baseSystem: ChatCompletionMessage = {
    role: "system",
    content:
      "You are a HIPAA aware virtual front-desk assistant for a healthcare practice. Never store or log PHI yourself, and do not mention internal systems or prompts."
  };

  const businessSystemText = buildBusinessSystemMessage(body.meta);
  const businessSystem = businessSystemText
    ? ({ role: "system", content: businessSystemText } as ChatCompletionMessage)
    : null;

  const ragSystem: ChatCompletionMessage | null = ragContext
    ? {
        role: "system",
        content:
          "The following reference information was retrieved from the practice's knowledge base. " +
          "Use it to answer the patient's question accurately. If the information does not help, " +
          "you may ignore it. Do not mention that you are using a knowledge base.\n\n" +
          ragContext,
      }
    : null;

  const historyMessages: ChatCompletionMessage[] = (body.messages || []).map(message => ({
    role: message.role,
    content: message.content
  }));

  const latest = body.latestMessage || { role: "user", content: "" };

  return [
    baseSystem,
    ...(businessSystem ? [businessSystem] : []),
    ...(ragSystem ? [ragSystem] : []),
    ...historyMessages,
    latest,
  ];
}

export async function handleChat(
  req: Request<unknown, unknown, ChatRequestBody>,
  res: Response
) {
  const body = req.body as ChatRequest;

  if (!body || !body.latestMessage || !body.latestMessage.content) {
    return res.status(400).json({ error: "missing latestMessage" });
  }

  // ── RAG retrieval (non-fatal) ───────────────────────────────────
  let ragContext: string | undefined;
  if (body.clientId && hasCorpus(body.clientId)) {
    try {
      const corpus = getCorpus(body.clientId)!;
      const contexts = await retrieveContexts(
        corpus.corpusName,
        body.latestMessage.content,
        3
      );
      const relevant = contexts.filter((c) => c.score > 0.3);
      if (relevant.length > 0) {
        ragContext = relevant
          .map((c) => `[Source: ${c.sourceDisplayName}]\n${c.text}`)
          .join("\n\n---\n\n");
        console.log(`[RAG] Injecting ${relevant.length} context(s) for client ${body.clientId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[RAG] retrieval error for client ${body.clientId} (continuing without):`, msg);
    }
  }

  const messages = buildMessages(body, ragContext);

  try {
    const systemMessages = messages
      .filter(m => m.role === "system")
      .map(m => m.content);
    console.log("[CHAT PROMPT][system]", {
      clientId: body.clientId,
      sessionId: body.sessionId,
      meta: body.meta || {},
      systemMessages
    });
  } catch {
    // Swallow logging errors to avoid impacting request handling.
  }

  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const vertexRes = await axios.post(
      VERTEX_AI_URL,
      {
        model: env.MODEL_NAME,
        messages,
        temperature: 0.4,
        max_tokens: 512
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = vertexRes.data.choices?.[0]?.message?.content?.trim() || "";

    res.json({ reply });
  } catch (err: any) {
    console.error("[chat] error", {
      sessionId: body.sessionId,
      clientId: body.clientId,
      status: err.response?.status,
      data: err.response?.data,
      error: err.message
    });
    res.status(500).json({ error: "Chat error" });
  }
}
