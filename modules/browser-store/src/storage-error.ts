import { BROWSER_STORE_ERROR } from "./constants.ts";
import type { BrowserStoreErrorCode } from "./contracts.ts";

/** Browser failures never silently fall back to an empty or memory-only store. */
export class BrowserStoreError extends Error {
  readonly code: BrowserStoreErrorCode;
  constructor(code: BrowserStoreErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BrowserStoreError";
    this.code = code;
  }
}

export function browserStorageError(cause: unknown): BrowserStoreError {
  if (cause instanceof BrowserStoreError) return cause;
  const name = cause instanceof Error || typeof cause === "object" && cause !== null && "name" in cause ? String(cause.name) : "";
  const code = name === "QuotaExceededError" ? BROWSER_STORE_ERROR.quota
    : name === "VersionError" ? BROWSER_STORE_ERROR.version
    : name === "SecurityError" || name === "NotSupportedError" ? BROWSER_STORE_ERROR.unavailable
    : name === "AbortError" ? BROWSER_STORE_ERROR.aborted
    : name === "InvalidStateError" ? BROWSER_STORE_ERROR.closed
    : name === "DataCloneError" || name === "TransactionInactiveError" ? BROWSER_STORE_ERROR.state : BROWSER_STORE_ERROR.io;
  return new BrowserStoreError(code, "Browser storage operation failed.", { cause });
}
