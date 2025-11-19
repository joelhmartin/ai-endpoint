export interface ChatRequest {
  sessionId: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  latestMessage: { role: "user"; content: string };
  clientId: string;
}

export interface TranscriptPayload {
  transcript: any;
  clientId: string;
  token: string;
}
