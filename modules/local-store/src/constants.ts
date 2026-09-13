/** Storage protocol and bounded lock coordination for the Node adapter. */
export const STORAGE_FORMAT_VERSION = "0.1.0";
export const STORE_FILES = Object.freeze({ identity: "store.json", head: "HEAD.json", writer: ".writer.lock", recovery: ".recovery.lock", objects: "objects", commits: "commits", pending: "pending" });
export const LOCK_TIMEOUT_MS = 2_000;
export const LOCK_POLL_MS = 20;
export const MAX_LOCK_TIMEOUT_MS = 30_000;
export const MAX_STATE_BYTES = 64 * 1024 * 1024;
export const MAX_JSON_DEPTH = 256;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
export const STORE_ERROR = Object.freeze({ locked: "STORE_LOCKED", corrupt: "STORE_CORRUPT", path: "STORE_PATH", state: "STORE_STATE", io: "STORE_IO" });
