import type { STORE_ERROR } from "./constants.ts";

export type StoreErrorCode = (typeof STORE_ERROR)[keyof typeof STORE_ERROR];
export type FaultStage = "after-prepare" | "after-marker";
/** Fault hooks are test-only; after-marker failure means a committed result may be replayed. */
export interface FileStoreOptions { lockTimeoutMs?: number; fault?: (stage: FaultStage) => void | Promise<void> }
export interface StoreIdentity { storageFormatVersion: string; storeId: string }
export interface CommitMarker extends StoreIdentity { commitId: string; parentCommitId: string | null; payloadHash: string }
export interface LockRecord { hostname: string; pid: number; token: string; createdAt: string }
