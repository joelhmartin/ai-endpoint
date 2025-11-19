import axios from "axios";
import { Request, Response } from "express";
import { ChatRequest } from "./types";
import { env } from "./env";

type ChatRequestBody = ChatRequest;

export async function handleChat(
  req: Request<unknown, unknown, ChatRequestBody>,
  res: Response
) {
  try {
    const body = req.body as ChatRequest;

    // Combine historical messages with the latest user input.
    const messages = [...body.messages, body.latestMessage];

    const openaiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: env.MODEL_NAME,
        messages: messages
      },
      {
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = openaiRes.data.choices?.[0]?.message?.content || "";

    res.json({ reply });
  } catch (err: any) {
    const status = err.response?.status;
    console.error("CHAT ERROR", status || err.message);
    res.status(500).json({ error: "Chat error" });
  }
}
