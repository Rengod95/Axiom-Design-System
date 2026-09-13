import type { Diagnostic } from "../../../modules/ads-core/src/index.ts";
import { DELIVERY_CODE } from "./constants.ts";

/** Typed local delivery failures retain authority, conflict and I/O distinctions. */
export class DeliveryError extends Error {
  readonly code: typeof DELIVERY_CODE[keyof typeof DELIVERY_CODE];
  /** Preserve the original host error without exposing it in a generated package. */
  constructor(code: DeliveryError["code"], message: string, options?: ErrorOptions) { super(message,options); this.name="DeliveryError"; this.code=code; }
  /** Reuse the public diagnostic envelope for host-facing adapters. */
  toDiagnostic(): Diagnostic { return { code:this.code, phase:this.code === DELIVERY_CODE.AUTHORITY ? "authorization" : "state",severity:"error",message:this.message }; }
}
