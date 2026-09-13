/** Versioned delivery policy; emitted packages carry these pins as data. */
export const TARGET_PACK_VERSION = "0.1.0" as const;
export const TARGET_MANIFEST_FILE = "axiom.delivery.json" as const;
export const TARGET_IDS = ["react", "react-native", "swiftui", "compose"] as const;
export const TARGET_LIMITS = { maxFiles: 128, maxFileBytes: 1024 * 1024, maxTotalBytes: 16 * 1024 * 1024 } as const;
export const TARGET_CODE = { INVALID: "TARGET_INVALID", UNSUPPORTED: "TARGET_UNSUPPORTED", LIMIT: "TARGET_LIMIT", CONFLICT: "TARGET_CONFLICT", STALE: "TARGET_STALE" } as const;
export const TARGET_DEPENDENCIES = {
  react: { react: "19.3.0", "react-dom": "19.3.0", "@types/react": "19.3.0", "@types/react-dom": "19.3.0", typescript: "5.9.3" },
  "react-native": { react: "19.2.3", "react-native": "0.86.3", expo: "57.0.17", "@types/react": "19.3.0", typescript: "5.9.3" },
  swiftui: { swift: "6.3.3", swiftTools: "6.0", iOS: "17.0" },
  compose: { agp: "9.0.1", gradle: "9.1.0", jdk: "17", kotlin: "2.2.10", composeBom: "2026.08.00", compileSdk: "36", buildTools: "36.0.0", minSdk: "26" },
} as const;
export const TARGET_FILE_PATTERN = /^(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
export const TARGET_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
export const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
