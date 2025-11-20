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

export interface LeadPayloadMeta {
  page?: string;
  title?: string;
}

export interface LeadPayload {
  clientId: string;
  token: string;
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  transcript?: string;
  trackbackId?: string;
  meta?: LeadPayloadMeta;
}
