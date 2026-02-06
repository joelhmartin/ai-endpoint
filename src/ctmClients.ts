/**
 * Dynamic CTM account registry.
 *
 * On startup, fetches every active sub-account from the CTM Agency API,
 * ensures each one has an "Ai Chat Lead" formreactor and a
 * "chat_transcription" custom field, then exposes a simple lookup map.
 *
 * All API calls use the single agency-level Basic auth header.
 */

import axios from "axios";
import { CTM_AUTH_HEADER } from "./env";

const CTM_API = "https://api.calltrackingmetrics.com/api/v1";

const authHeaders = {
  Authorization: CTM_AUTH_HEADER,
  "Content-Type": "application/json",
};

// ── Public interface ────────────────────────────────────────────────

export interface CTMClient {
  name: string;
  formreactorId: string;
}

const CLIENTS: Record<string, CTMClient> = {};

export function getClient(accountId: string): CTMClient | null {
  return CLIENTS[accountId] || null;
}

export function getAuthHeader(): string {
  return CTM_AUTH_HEADER;
}

export function getName(accountId: string): string {
  return CLIENTS[accountId]?.name || "";
}

export const CTMClients = { getClient, getAuthHeader, getName };

// ── Startup initialisation ──────────────────────────────────────────

interface CTMAccount {
  id: number;
  name: string;
  status: string;
}

async function fetchAllAccounts(): Promise<CTMAccount[]> {
  const accounts: CTMAccount[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const { data } = await axios.get(`${CTM_API}/accounts`, {
      headers: authHeaders,
      params: { page },
    });
    const items: CTMAccount[] = data.accounts ?? [];
    accounts.push(...items);
    totalPages = data.total_pages ?? 1;
    page++;
  }

  return accounts.filter((a) => a.status === "active");
}

async function ensureFormreactor(accountId: number): Promise<string> {
  // Check for existing "Ai Chat Lead" formreactor
  const { data: frData } = await axios.get(
    `${CTM_API}/accounts/${accountId}/form_reactors`,
    { headers: authHeaders }
  );
  const existing = (frData.form_reactors ?? []).find(
    (fr: { name: string }) => fr.name === "Ai Chat Lead"
  );
  if (existing) return existing.id as string;

  // Need to create — grab the first tracking number for this account
  const { data: numData } = await axios.get(
    `${CTM_API}/accounts/${accountId}/numbers.json`,
    { headers: authHeaders }
  );
  const numbers: { id: string }[] = numData.numbers ?? [];
  if (numbers.length === 0) {
    throw new Error(
      `Account ${accountId} has no tracking numbers — cannot create formreactor`
    );
  }

  const { data: created } = await axios.post(
    `${CTM_API}/accounts/${accountId}/form_reactors`,
    {
      name: "Ai Chat Lead",
      virtual_phone_number_id: numbers[0].id,
      log_form_entry_only: true,
      include_name: true,
      include_email: true,
    },
    { headers: authHeaders }
  );

  console.log(`[CTM] Created formreactor for account ${accountId}:`, created.id);
  return created.id as string;
}

async function ensureCustomField(accountId: number): Promise<void> {
  const { data: cfData } = await axios.get(
    `${CTM_API}/accounts/${accountId}/custom_fields`,
    { headers: authHeaders }
  );
  const existing = (cfData.custom_fields ?? []).find(
    (cf: { api_name: string }) => cf.api_name === "chat_transcription"
  );
  if (existing) return;

  await axios.post(
    `${CTM_API}/accounts/${accountId}/custom_fields`,
    {
      name: "Chat Transcription",
      api_name: "chat_transcription",
      field_type: "textarea",
      object_type: "Call",
    },
    { headers: authHeaders }
  );
  console.log(`[CTM] Created chat_transcription custom field for account ${accountId}`);
}

export async function initCTMClients(): Promise<void> {
  console.log("[CTM] Fetching accounts from agency API…");
  const accounts = await fetchAllAccounts();
  console.log(`[CTM] Found ${accounts.length} active accounts`);

  for (const acct of accounts) {
    const id = String(acct.id);
    try {
      const formreactorId = await ensureFormreactor(acct.id);
      await ensureCustomField(acct.id);
      CLIENTS[id] = { name: acct.name, formreactorId };
      console.log(`[CTM]  ✓ ${id} ${acct.name} → ${formreactorId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[CTM]  ✗ ${id} ${acct.name}: ${msg}`);
    }
  }

  console.log(`[CTM] Loaded ${Object.keys(CLIENTS).length} accounts`);
}
