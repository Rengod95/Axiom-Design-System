import { sha256 } from "@noble/hashes/sha2.js";
import type { KernelServices } from "../../ads-core/src/index.ts";
import { BROWSER_ID_PREFIX, BROWSER_STORE_ERROR } from "./constants.ts";
import { BrowserStoreError } from "./storage-error.ts";

const ENCODER = new TextEncoder();
const HEX_RADIX = 16;
const HEX_BYTE_LENGTH = 2;

/** Synchronous UTF-8 SHA-256 keeps the core reducer inside an active IndexedDB transaction. */
export function browserDigest(text: string): string {
  if (typeof text !== "string") throw new BrowserStoreError(BROWSER_STORE_ERROR.state, "Digest input must be text.");
  return Array.from(sha256(ENCODER.encode(text)), (byte) => byte.toString(HEX_RADIX).padStart(HEX_BYTE_LENGTH, "0")).join("");
}

/** Bind secure-context identity generation; crypto capability failure is never a weak-random fallback. */
export function createBrowserServices(cryptoProvider: Pick<Crypto, "randomUUID"> = globalThis.crypto): KernelServices {
  const randomUUID = cryptoProvider?.randomUUID;
  if (typeof randomUUID !== "function") throw new BrowserStoreError(BROWSER_STORE_ERROR.unavailable, "A secure-context crypto.randomUUID capability is required.");
  return { createId: () => `${BROWSER_ID_PREFIX}-${randomUUID.call(cryptoProvider)}`, digest: browserDigest };
}
