import axios from "axios";
import { ChatRequest } from "./types";
import { env } from "./env";

export async function handleChat(req, res) {
  try {
    const body = req.body as ChatRequest;

    // Combine historical messages with the latest user input
    const messages = [...body.messages, body.latestMessage];

    const openaiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
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
    console.error("CHAT ERROR", err.response?.data || err.message);
    res.status(500).json({ error: "Chat error" });
  }
}
