"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTMClients = void 0;
exports.getClient = getClient;
exports.getAuthHeader = getAuthHeader;
exports.getName = getName;
exports.loadCTMClients = loadCTMClients;
exports.ensureClient = ensureClient;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("./env");
const CTM_API = "https://api.calltrackingmetrics.com/api/v1";
const authHeaders = {
    Authorization: env_1.CTM_AUTH_HEADER,
    "Content-Type": "application/json",
};
const CLIENTS = {};
function getClient(accountId) {
    return CLIENTS[accountId] || null;
}
function getAuthHeader() {
    return env_1.CTM_AUTH_HEADER;
}
function getName(accountId) {
    return CLIENTS[accountId]?.name || "";
}
exports.CTMClients = { getClient, getAuthHeader, getName };
async function fetchAllAccounts() {
    const accounts = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
        const { data } = await axios_1.default.get(`${CTM_API}/accounts`, {
            headers: authHeaders,
            params: { page },
        });
        const items = data.accounts ?? [];
        accounts.push(...items);
        totalPages = data.total_pages ?? 1;
        page++;
    }
    return accounts.filter((a) => a.status === "active");
}
async function ensureFormreactor(accountId) {
    // Check for existing "Ai Chat Lead" formreactor
    const { data: frData } = await axios_1.default.get(`${CTM_API}/accounts/${accountId}/form_reactors`, { headers: authHeaders });
    const existing = (frData.form_reactors ?? []).find((fr) => fr.name === "Ai Chat Lead");
    if (existing)
        return existing.id;
    // Need to create — grab the first tracking number for this account
    const { data: numData } = await axios_1.default.get(`${CTM_API}/accounts/${accountId}/numbers.json`, { headers: authHeaders });
    const numbers = numData.numbers ?? [];
    if (numbers.length === 0) {
        throw new Error(`Account ${accountId} has no tracking numbers — cannot create formreactor`);
    }
    const { data: created } = await axios_1.default.post(`${CTM_API}/accounts/${accountId}/form_reactors`, {
        name: "Ai Chat Lead",
        virtual_phone_number_id: numbers[0].id,
        log_form_entry_only: true,
        include_name: true,
        include_email: true,
    }, { headers: authHeaders });
    console.log(`[CTM] Created formreactor for account ${accountId}:`, created.id);
    return created.id;
}
async function ensureCustomField(accountId) {
    const { data: cfData } = await axios_1.default.get(`${CTM_API}/accounts/${accountId}/custom_fields`, { headers: authHeaders });
    const existing = (cfData.custom_fields ?? []).find((cf) => cf.api_name === "chat_transcription");
    if (existing)
        return;
    await axios_1.default.post(`${CTM_API}/accounts/${accountId}/custom_fields`, {
        name: "Chat Transcription",
        api_name: "chat_transcription",
        field_type: "textarea",
        object_type: "Call",
    }, { headers: authHeaders });
    console.log(`[CTM] Created chat_transcription custom field for account ${accountId}`);
}
// ── Read-only startup: load existing FormReactors ───────────────────
const BATCH_SIZE = 5;
async function loadAccount(acct) {
    const id = String(acct.id);
    // Only READ — check if formreactor already exists
    const { data: frData } = await axios_1.default.get(`${CTM_API}/accounts/${acct.id}/form_reactors`, { headers: authHeaders });
    const existing = (frData.form_reactors ?? []).find((fr) => fr.name === "Ai Chat Lead");
    if (!existing)
        return; // Skip — will be lazily created if needed
    CLIENTS[id] = { name: acct.name, formreactorId: existing.id };
    console.log(`[CTM]  ✓ ${id} ${acct.name} → ${existing.id}`);
}
async function loadCTMClients() {
    console.log("[CTM] Fetching accounts from agency API…");
    const accounts = await fetchAllAccounts();
    console.log(`[CTM] Found ${accounts.length} active accounts`);
    // Cache account names so ensureClient() can look them up later
    for (const acct of accounts) {
        accountNameCache[String(acct.id)] = acct.name;
    }
    for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
        const batch = accounts.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map((acct) => loadAccount(acct)));
        for (let j = 0; j < results.length; j++) {
            if (results[j].status === "rejected") {
                const acct = batch[j];
                const reason = results[j].reason;
                const msg = reason instanceof Error ? reason.message : String(reason);
                console.error(`[CTM]  ✗ ${acct.id} ${acct.name}: ${msg}`);
            }
        }
    }
    console.log(`[CTM] Loaded ${Object.keys(CLIENTS).length} accounts (read-only, no new FormReactors created)`);
}
// ── Lazy per-account initialisation with locking ────────────────────
const initLocks = new Map();
/** Cache of account names fetched during loadCTMClients */
let accountNameCache = {};
/**
 * Ensures the given account has a FormReactor + custom field ready.
 * Returns immediately if already loaded. Uses a per-account lock to
 * prevent concurrent creation (race condition on multi-instance deploy).
 */
async function ensureClient(accountId) {
    if (CLIENTS[accountId])
        return CLIENTS[accountId];
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
                        const { data } = await axios_1.default.get(`${CTM_API}/accounts/${numId}`, { headers: authHeaders });
                        name = data.name || "";
                    }
                    catch {
                        name = `Account ${accountId}`;
                    }
                }
                CLIENTS[accountId] = { name, formreactorId: frId };
                console.log(`[CTM] Lazy-initialised ${accountId} ${name} → ${frId}`);
            }
            finally {
                initLocks.delete(accountId);
            }
        })());
    }
    await initLocks.get(accountId);
    return CLIENTS[accountId];
}
