export interface ChatRequest {
  sessionId: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  latestMessage: { role: "user"; content: string };
  clientId: string;
}

export interface TranscriptTurn {
  role: string;
  content: string;
  timestamp?: string;
}

export interface TranscriptPayload {
  forwardToken: string;
  clientId: string;
  message: string;
  history?: TranscriptTurn[];
}
