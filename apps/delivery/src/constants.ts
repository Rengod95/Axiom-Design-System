export const DELIVERY_FORMAT_VERSION = "0.1.0" as const;
export const DELIVERY_DIRECTORY = ".axiom-delivery" as const;
export const DELIVERY_FILES = { state: "connection.json", pending: "pending.json", lock: "writer.lock", receipts: "receipts" } as const;
export const DELIVERY_CODE = { INVALID: "DELIVERY_INVALID", AUTHORITY: "DELIVERY_AUTHORITY", EXISTS: "DELIVERY_EXISTS", PATH: "DELIVERY_PATH", STALE: "DELIVERY_STALE", CONFLICT: "DELIVERY_CONFLICT", LOCKED: "DELIVERY_LOCKED", INCOMPLETE: "DELIVERY_INCOMPLETE", CORRUPT: "DELIVERY_CORRUPT", IO: "DELIVERY_IO" } as const;
export const DELIVERY_SCOPES = { export: "delivery.write", plan: "connection.read", execute: "connection.execute", review: "review.apply" } as const;
export const MAX_DELIVERY_RECORD_BYTES = 64 * 1024 * 1024;
