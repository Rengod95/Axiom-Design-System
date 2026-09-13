/** ADR-0014 pins execution independently from arbitrary ADS schema versions. */
export const STUDIO_SOURCE_PROFILE = Object.freeze({ id: "axiom.studio", version: "0.1.0" });
export const STUDIO_SCHEMA_VERSION = "1.0.0";
export const STUDIO_ARCHETYPE_VERSION = "1.0.0";
export const STUDIO_ARCHETYPES = Object.freeze({ button: "axiom.archetype.command", card: "axiom.archetype.content", toast: "axiom.archetype.notification" });
export const STUDIO_RESOLVER = Object.freeze({ id: "axiom.resolver.explicit-order", expectedKind: "resolutionProfile", version: "1.0.0" });
export const STUDIO_CATEGORIES = Object.freeze(["Web", "Mobile"] as const);
export const STUDIO_VISUAL_PROPERTIES = Object.freeze(["background", "color", "borderColor", "borderWidth", "borderRadius", "fontSize", "opacity"] as const);
export const STUDIO_COLOR_PROPERTIES = new Set<string>(["background", "color", "borderColor"]);
export const STUDIO_PART_ROLES = Object.freeze({ button: ["root", "label"], card: ["root", "header", "body", "actions"], toast: ["root", "body", "close"] } as const);
export const STUDIO_MAX_DIMENSION = 4096;
export const STUDIO_MAX_COMPONENTS = 64;
export const STUDIO_MAX_RULES = 128;
export const STUDIO_MAX_THEME_SETS = 32;
export const STUDIO_MOTION = Object.freeze({ durationMs: 160, reducedDurationMs: 0, cleanupMs: 500 });
export const STUDIO_ERROR = Object.freeze({ invalid: "STUDIO_INVALID", unsupported: "STUDIO_UNSUPPORTED", conflict: "STUDIO_RULE_CONFLICT" });
