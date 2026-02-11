#!/usr/bin/env npx ts-node
/**
 * Cleanup duplicate "Ai Chat Lead" FormReactors across all CTM sub-accounts.
 *
 * Usage:
 *   npx ts-node scripts/cleanup-formreactors.ts          # dry run (default)
 *   npx ts-node scripts/cleanup-formreactors.ts --execute # actually delete duplicates
 *
 * Requires CTM_ACCESS_KEY + CTM_SECRET_KEY env vars (or .env file).
 */

import axios from "axios";

const CTM_API = "https://api.calltrackingmetrics.com/api/v1";

const ACCESS_KEY = process.env.CTM_ACCESS_KEY || "d4141f35cc0f2da64301d81c6763730e";
const SECRET_KEY = process.env.CTM_SECRET_KEY || "f98e1f6eb956edae55561fe964581c78a277";

const AUTH_HEADER =
  "Basic " + Buffer.from(`${ACCESS_KEY}:${SECRET_KEY}`).toString("base64");

const headers = {
  Authorization: AUTH_HEADER,
  "Content-Type": "application/json",
};

const DRY_RUN = !process.argv.includes("--execute");

interface CTMAccount {
  id: number;
  name: string;
  status: string;
}

interface FormReactor {
  id: number;
  name: string;
}

async function fetchAllAccounts(): Promise<CTMAccount[]> {
  const accounts: CTMAccount[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const { data } = await axios.get(`${CTM_API}/accounts`, {
      headers,
      params: { page },
    });
    accounts.push(...(data.accounts ?? []));
    totalPages = data.total_pages ?? 1;
    page++;
  }

  return accounts.filter((a) => a.status === "active");
}

async function getFormReactors(accountId: number): Promise<FormReactor[]> {
  const { data } = await axios.get(
    `${CTM_API}/accounts/${accountId}/form_reactors`,
    { headers }
  );
  return (data.form_reactors ?? []) as FormReactor[];
}

async function deleteFormReactor(accountId: number, frId: number): Promise<void> {
  await axios.delete(
    `${CTM_API}/accounts/${accountId}/form_reactors/${frId}`,
    { headers }
  );
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN (pass --execute to delete) ===" : "=== EXECUTING DELETES ===");
  console.log();

  const accounts = await fetchAllAccounts();
  console.log(`Found ${accounts.length} active accounts\n`);

  let totalScanned = 0;
  let accountsWithDuplicates = 0;
  let totalDuplicates = 0;
  let totalDeleted = 0;

  for (const acct of accounts) {
    totalScanned++;
    const allFRs = await getFormReactors(acct.id);
    const chatFRs = allFRs.filter((fr) => fr.name === "Ai Chat Lead");

    if (chatFRs.length <= 1) continue;

    accountsWithDuplicates++;
    // Sort by ID ascending — keep the oldest (lowest ID)
    chatFRs.sort((a, b) => a.id - b.id);
    const keep = chatFRs[0];
    const duplicates = chatFRs.slice(1);
    totalDuplicates += duplicates.length;

    console.log(`Account ${acct.id} (${acct.name}): ${chatFRs.length} "Ai Chat Lead" FormReactors`);
    console.log(`  Keeping:   #${keep.id}`);

    for (const dup of duplicates) {
      if (DRY_RUN) {
        console.log(`  Would delete: #${dup.id}`);
      } else {
        try {
          await deleteFormReactor(acct.id, dup.id);
          console.log(`  Deleted: #${dup.id}`);
          totalDeleted++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  Failed to delete #${dup.id}: ${msg}`);
        }
      }
    }
    console.log();
  }

  console.log("=== Summary ===");
  console.log(`Accounts scanned:    ${totalScanned}`);
  console.log(`Accounts with dupes: ${accountsWithDuplicates}`);
  console.log(`Duplicate FRs found: ${totalDuplicates}`);
  if (DRY_RUN) {
    console.log(`Would delete:        ${totalDuplicates}`);
    console.log("\nRe-run with --execute to actually delete duplicates.");
  } else {
    console.log(`Deleted:             ${totalDeleted}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
