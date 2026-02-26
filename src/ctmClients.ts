/**
 * Dynamic CTM account registry.
 *
 * On startup, fetches every active sub-account from the CTM Agency API
 * and loads any that already have an "Ai Chat Lead" FormReactor.
 * Accounts without a FormReactor are skipped — they will be lazily
 * initialised the first time a lead is submitted via ensureClient().
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

// ── Internal helpers ────────────────────────────────────────────────

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
  const existing = (frData.forms ?? frData.form_reactors ?? []).find(
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
      custom_fields: [
        {
          name: "chat_transcription",
          type: "textarea",
          required: false,
          log_visible: true,
        },
      ],
    },
    { headers: authHeaders }
  );

  const frId = created.form_reactor?.id ?? created.id;
  console.log(`[CTM] Created formreactor for account ${accountId}:`, frId);
  return frId as string;
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

// ── Read-only startup: load existing FormReactors ───────────────────

const BATCH_SIZE = 5;

async function loadAccount(acct: CTMAccount): Promise<void> {
  const id = String(acct.id);

  // Only READ — check if formreactor already exists
  const { data: frData } = await axios.get(
    `${CTM_API}/accounts/${acct.id}/form_reactors`,
    { headers: authHeaders }
  );
  const existing = (frData.forms ?? frData.form_reactors ?? []).find(
    (fr: { name: string }) => fr.name === "Ai Chat Lead"
  );

  if (!existing) return; // Skip — will be lazily created if needed

  CLIENTS[id] = { name: acct.name, formreactorId: existing.id as string };
  console.log(`[CTM]  ✓ ${id} ${acct.name} → ${existing.id}`);
}

export async function loadCTMClients(): Promise<void> {
  console.log("[CTM] Fetching accounts from agency API…");
  const accounts = await fetchAllAccounts();
  console.log(`[CTM] Found ${accounts.length} active accounts`);

  // Cache account names so ensureClient() can look them up later
  for (const acct of accounts) {
    accountNameCache[String(acct.id)] = acct.name;
  }

  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    const batch = accounts.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((acct) => loadAccount(acct))
    );
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "rejected") {
        const acct = batch[j];
        const reason = (results[j] as PromiseRejectedResult).reason;
        const msg = reason instanceof Error ? reason.message : String(reason);
        console.error(`[CTM]  ✗ ${acct.id} ${acct.name}: ${msg}`);
      }
    }
  }

  console.log(`[CTM] Loaded ${Object.keys(CLIENTS).length} accounts (read-only, no new FormReactors created)`);
}

// ── Lazy per-account initialisation with locking ────────────────────

const initLocks = new Map<string, Promise<void>>();

/** Cache of account names fetched during loadCTMClients */
let accountNameCache: Record<string, string> = {};

/**
 * Ensures the given account has a FormReactor + custom field ready.
 * Returns immediately if already loaded. Uses a per-account lock to
 * prevent concurrent creation (race condition on multi-instance deploy).
 */
export async function ensureClient(accountId: string): Promise<CTMClient> {
  if (CLIENTS[accountId]) return CLIENTS[accountId];

  if (!initLocks.has(accountId)) {
    initLocks.set(accountId, (async () => {
      try {
        const numId = Number(accountId);
        const [frId] = await Promise.all([
          ensureFormreactor(numId),
          ensureCustomField(numId),
        ]);

        // Use cached name if available, otherwise fetch from API
        let name = accountNameCache[accountId] || "";
        if (!name) {
          try {
            const { data } = await axios.get(
              `${CTM_API}/accounts/${numId}`,
              { headers: authHeaders }
            );
            name = data.name || "";
          } catch {
            name = `Account ${accountId}`;
          }
        }

        CLIENTS[accountId] = { name, formreactorId: frId };
        console.log(`[CTM] Lazy-initialised ${accountId} ${name} → ${frId}`);
      } finally {
        initLocks.delete(accountId);
      }
    })());
  }

  await initLocks.get(accountId);
  return CLIENTS[accountId];
}
