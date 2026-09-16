/** ADR-0013's physical browser journal, separate from ADS project revisions. */
export const BROWSER_STORAGE_VERSION = "0.1.0";
export const BROWSER_DATABASE_VERSION = 1;
export const BROWSER_STORES = Object.freeze({ commits: "commits", meta: "meta", head: "head" });
export const BROWSER_MAX_COMMITS = 10_000;
/** Optimization only: at most 64 MiB of UTF-16 text plus bounded proof references per connection. */
export const BROWSER_PROOF_MAX_CHARACTERS = 32 * 1024 * 1024;
export const BROWSER_PROOF_MAX_REFERENCES = 262_144;
export const BROWSER_OPEN_TIMEOUT_MS = 5_000;
export const BROWSER_MAX_OPEN_TIMEOUT_MS = 30_000;
export const BROWSER_MAX_DATABASE_NAME_LENGTH = 256;
export const BROWSER_ID_PREFIX = "browser";
export const BROWSER_DIGEST_PATTERN = /^[a-f0-9]{64}$/;
export const BROWSER_STORE_ERROR = Object.freeze({
  unavailable: "BROWSER_STORE_UNAVAILABLE", blocked: "BROWSER_STORE_BLOCKED", closed: "BROWSER_STORE_CLOSED",
  version: "BROWSER_STORE_VERSION", corrupt: "BROWSER_STORE_CORRUPT", state: "BROWSER_STORE_STATE",
  quota: "BROWSER_STORE_QUOTA", aborted: "BROWSER_STORE_ABORTED", capacity: "BROWSER_STORE_CAPACITY", io: "BROWSER_STORE_IO",
});
