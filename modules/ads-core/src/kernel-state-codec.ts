import type { KernelState } from "./contracts.ts";
import { CODE, MAX_CANONICAL_BYTES } from "./constants.ts";
import { canonicalJson, utf8SourceBytes } from "./canonical-json.ts";
import { KernelError } from "./kernel-error.ts";
import { assertKernelStateShape } from "./kernel-state-shape.ts";

function invalid(cause: unknown): never {
  if (cause instanceof KernelError) throw cause;
  throw new KernelError(CODE.STATE_INVALID, "The supplied kernel state is not valid canonical JSON data.");
}

/** Canonicalize descriptor data, then inspect only its detached JSON snapshot. */
export function encodeKernelState(value: unknown): string {
  try {
    const text = canonicalJson(value, MAX_CANONICAL_BYTES);
    const snapshot: unknown = JSON.parse(text);
    assertKernelStateShape(snapshot);
    return text;
  } catch (cause) { return invalid(cause); }
}

/** Decode this codec's exact representation; do not normalize damaged stored bytes. */
export function decodeKernelState(text: string): KernelState {
  try {
    if (typeof text !== "string") throw new KernelError(CODE.STATE_INVALID, "Canonical kernel state text must be a string.");
    utf8SourceBytes(text, MAX_CANONICAL_BYTES);
    const snapshot: unknown = JSON.parse(text);
    // Native parsing permits the internal wrapper depth. Exact comparison catches
    // duplicate keys and number conversion loss as well as alternate spellings.
    if (canonicalJson(snapshot, MAX_CANONICAL_BYTES) !== text) throw new KernelError(CODE.STATE_INVALID, "Stored kernel state is not its exact canonical representation.");
    assertKernelStateShape(snapshot);
    return snapshot;
  } catch (cause) { return invalid(cause); }
}
