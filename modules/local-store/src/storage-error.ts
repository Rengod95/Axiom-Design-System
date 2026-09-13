import type { StoreErrorCode } from "./contracts.ts";
import { STORE_ERROR } from "./constants.ts";

/** A machine-readable failure which never implies that an uncertain commit was rolled back. */
export class FileStoreError extends Error {
  readonly code: StoreErrorCode;
  constructor(code: StoreErrorCode, message: string, options?: ErrorOptions) {
    super(message, options); this.name = "FileStoreError"; this.code = code;
  }
}

/** Preserve typed failures and retain the original I/O failure as its cause. */
export function storageError(error: unknown): FileStoreError {
  return error instanceof FileStoreError ? error : new FileStoreError(STORE_ERROR.io, "The storage operation did not finish; inspect the durable state before retrying.", { cause: error });
}

/** Node error codes are inspected only after narrowing the unknown boundary. */
export function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
