import axios from "axios";
import { env } from "./env";
import { CTMClients } from "./ctmClients";

export async function sendTranscriptToCTM(clientId: string, transcript: any) {
  const clientAuth = process.env[`CTM_AUTH_${clientId}`] || CTMClients.getAuthHeader(clientId);

  if (!clientAuth) {
    throw new Error("Missing CTM credentials for client " + clientId);
  }

  return axios.post(
    `${env.CTM_BASE_URL}/${clientId}/transcripts`,
    { transcript },
    {
      headers: {
        Authorization: clientAuth,
        "Content-Type": "application/json"
      }
    }
  );
}
