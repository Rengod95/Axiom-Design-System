/** Explicit authoring policy; preserving this pin does not certify a renderer. */
export const STUDIO_CATALOG_PROFILE = Object.freeze({ id: "axiom.catalog-authoring", version: "0.1.0" });
export const STUDIO_CATALOG_LIMITS = Object.freeze({ maxParts: 64, maxValues: 64, maxEvents: 64, maxSlots: 32, maxItems: 256, maxTextLength: 4096 });
export const STUDIO_CATALOG_CODE = Object.freeze({ invalid: "STUDIO_CATALOG_INVALID", unsupported: "STUDIO_CATALOG_UNIMPLEMENTED", limit: "STUDIO_CATALOG_LIMIT" });
export const STUDIO_CATALOG_EASINGS = ["linear", "ease", "ease-in", "ease-out", "ease-in-out"] as const;
export const STUDIO_CATALOG_ALIGNMENT = ["start", "center", "end", "stretch"] as const;
