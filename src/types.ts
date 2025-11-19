export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatMeta {
  page?: string;
  title?: string;
  businessName?: string;
  businessLocation?: string;
  businessPhone?: string;
  businessEmail?: string;
  context?: string;
}

export interface ChatRequest {
  sessionId: string;
  clientId: string;
  messages: ChatMessage[];
  latestMessage: ChatMessage;
  meta?: ChatMeta;
}

export interface TranscriptMessage {
  role: ChatRole;
  text: string;
  at: string;
}

export interface TranscriptMeta {
  page?: string;
  title?: string;
  businessName?: string;
  businessLocation?: string;
  businessPhone?: string;
  businessEmail?: string;
}

export interface Transcript {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  meta?: TranscriptMeta;
  messages: TranscriptMessage[];
}

export interface TranscriptPayload {
  clientId: string;
  token: string;
  transcript: Transcript;
}

export interface LeadPayloadMeta {
  page?: string;
  title?: string;
}

export interface LeadPayload {
  clientId: string;
  token: string;
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  transcript: string;
  meta?: LeadPayloadMeta;
}
