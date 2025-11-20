export interface SessionTrackback {
  clientId: string;
  trackbackId: string;
  callId?: string;
  createdAt: string;
}

const trackbacks = new Map<string, SessionTrackback>();

export function saveTrackback(sessionId: string, data: SessionTrackback) {
  trackbacks.set(sessionId, data);
}

export function getTrackback(sessionId: string): SessionTrackback | null {
  return trackbacks.get(sessionId) || null;
}

export function clearTrackback(sessionId: string) {
  trackbacks.delete(sessionId);
}
