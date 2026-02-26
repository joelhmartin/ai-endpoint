import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth({
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

let cachedClient: Awaited<ReturnType<GoogleAuth["getClient"]>> | null = null;

async function getClient() {
  if (!cachedClient) {
    cachedClient = await auth.getClient();
  }
  return cachedClient;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const client = await getClient();
  const token = await client.getAccessToken();
  return {
    Authorization: `Bearer ${token.token}`,
    "Content-Type": "application/json",
  };
}
