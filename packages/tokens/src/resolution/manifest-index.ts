import type {
  CanonicalDigestPort,
  ResolvedTokenManifest,
  ResolvedTokenManifestIndex,
  TokenDiagnostic,
} from "../contracts.js";
import { DEFAULT_DIAGNOSTIC_SEVERITY, TOKEN_DIAGNOSTIC_CODE, TOKEN_DIAGNOSTIC_PHASE } from "../constants.js";
import { serializeResolvedTokenManifest } from "./manifest-serializer.js";

/** Creates a deterministic Token-ID index while preserving every supplied context entry. */
export const createResolvedTokenManifestIndex = (
  manifest: ResolvedTokenManifest,
): ResolvedTokenManifestIndex => {
  const grouped = new Map<string, {
    readonly entries: Array<ResolvedTokenManifest["contexts"][number]["tokens"][number]>;
    readonly contexts: Array<ResolvedTokenManifest["contexts"][number]["context"]>;
  }>();
  const diagnostics: TokenDiagnostic[] = [];
  const contextKeys = new Set<string>();
  for (const resolvedContext of manifest.contexts) {
    const contextKey = Object.entries(resolvedContext.context).sort(([left], [right]) => left.localeCompare(right, "en")).map(([key, value]) => `${key}=${value}`).join("&");
    if (contextKeys.has(contextKey)) diagnostics.push({ code: TOKEN_DIAGNOSTIC_CODE.INVALID_CONTEXT, severity: DEFAULT_DIAGNOSTIC_SEVERITY, phase: TOKEN_DIAGNOSTIC_PHASE, message: "Resolved Token Manifest contains duplicate context identities." });
    contextKeys.add(contextKey);
    const tokenIds = new Set<string>();
    for (const entry of resolvedContext.tokens) {
      if (tokenIds.has(entry.id)) diagnostics.push({ code: TOKEN_DIAGNOSTIC_CODE.DUPLICATE_TOKEN, severity: DEFAULT_DIAGNOSTIC_SEVERITY, phase: TOKEN_DIAGNOSTIC_PHASE, message: `Resolved context contains duplicate Token '${entry.id}'.`, tokenId: entry.id });
      tokenIds.add(entry.id);
    const existing = grouped.get(entry.id) ?? { entries: [], contexts: [] };
    existing.entries.push(entry);
    existing.contexts.push(resolvedContext.context);
    grouped.set(entry.id, existing);
  }
  }
  const tokens = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([id, entries]) => Object.freeze({
      id,
      entries: Object.freeze([...entries.entries]),
      contexts: Object.freeze([...entries.contexts]),
    }));
  const byId = new Map(tokens.map((entry) => [entry.id, entry]));
  for (const token of tokens) {
    const first = token.entries[0];
    if (token.entries.length !== manifest.contexts.length) diagnostics.push({ code: TOKEN_DIAGNOSTIC_CODE.CONTEXT_SET_MISMATCH, severity: DEFAULT_DIAGNOSTIC_SEVERITY, phase: TOKEN_DIAGNOSTIC_PHASE, message: `Token '${token.id}' is missing from one or more resolved contexts.`, tokenId: token.id });
    if (first !== undefined && token.entries.some((entry) => entry.domain !== first.domain || entry.tier !== first.tier || entry.dtcgType !== first.dtcgType)) diagnostics.push({ code: TOKEN_DIAGNOSTIC_CODE.CONTEXT_IDENTITY_MISMATCH, severity: DEFAULT_DIAGNOSTIC_SEVERITY, phase: TOKEN_DIAGNOSTIC_PHASE, message: `Token '${token.id}' changes immutable identity across contexts.`, tokenId: token.id });
  }
  return Object.freeze({
    tokens: Object.freeze(tokens),
    diagnostics: Object.freeze(diagnostics),
    find: (id: string) => byId.get(id),
  });
};

/** Hashes the package's canonical resolved-manifest serialization through an explicit trusted port. */
export const digestResolvedTokenManifest = (
  manifest: ResolvedTokenManifest,
  digestPort: CanonicalDigestPort,
): string => digestPort.digestCanonicalJson(JSON.parse(serializeResolvedTokenManifest(manifest)));
