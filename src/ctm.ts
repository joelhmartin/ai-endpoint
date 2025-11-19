import axios from "axios";

const CTM_BASE_URL = "https://api.calltrackingmetrics.com/api/v1/accounts";

export function buildCTMWebhook(accountId: string): string {
  return `${CTM_BASE_URL}/${accountId}/activities`;
}

export async function postTranscriptToCTM(url: string, authHeader: string, payload: unknown) {
  return axios.post(url, payload, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json"
    }
  });
}
