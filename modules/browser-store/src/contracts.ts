import type { KernelState } from "../../ads-core/src/index.ts";
import type { BROWSER_STORE_ERROR } from "./constants.ts";

export type BrowserStoreErrorCode = (typeof BROWSER_STORE_ERROR)[keyof typeof BROWSER_STORE_ERROR];
export type BrowserFaultPhase = "before-write" | "after-write" | "after-complete";
export interface IndexedDbStoreOptions { indexedDB?: IDBFactory; openTimeoutMs?: number; fault?: (phase: BrowserFaultPhase) => void }
export interface BrowserCommit {
  storageFormatVersion: string; sequence: number; parentDigest: string | null;
  projectId: string | null; revision: string | null; stateText: string; stateDigest: string; commitDigest: string;
}
export interface BrowserHead { storageFormatVersion: string; sequence: number; commitDigest: string }
export interface RecoveredBrowserState { state: KernelState | null; head: BrowserHead | null }
