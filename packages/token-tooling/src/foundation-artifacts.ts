import { createHash } from "node:crypto";

import type { ParsedDtcgDocument, ResolvedTokenManifest } from "@axiom/tokens";

import {
  TOKEN_FOUNDATION_GENERATOR_VERSION,
  TOKEN_GENERATED_FILE_HEADER,
  TOKEN_GENERATED_FILE_INDENT,
  TOKEN_GENERATED_SCHEMA_VERSION,
  TOKEN_SOURCE_DIGEST_ALGORITHM,
  TOKEN_SOURCE_DIGEST_PREFIX,
  TOKEN_STABLE_SORT_LOCALE,
} from "./constants.js";

export interface TokenSourceDigestInput {
  readonly filename: string;
  readonly content: string;
}

const compare = (left: string, right: string): number =>
  left.localeCompare(right, TOKEN_STABLE_SORT_LOCALE);

export const digestTokenSources = (
  sources: readonly TokenSourceDigestInput[],
): string => {
  const canonicalInput = JSON.stringify(
    [...sources]
      .sort((left, right) => compare(left.filename, right.filename))
      .map(({ filename, content }) => ({ filename, content })),
  );
  return `${TOKEN_SOURCE_DIGEST_PREFIX}${createHash(TOKEN_SOURCE_DIGEST_ALGORITHM)
    .update(canonicalInput)
    .digest("hex")}`;
};

const quotedUnion = (values: readonly string[], indentation: string): string =>
  [...new Set(values)]
    .sort(compare)
    .map((value) => `${indentation}| ${JSON.stringify(value)}`)
    .join("\n");

export const generateTokenPathTypes = (
  document: ParsedDtcgDocument,
  sourceDigest: string,
): string => {
  const tokensByDomain = new Map<string, string[]>();
  const tiers: string[] = [];
  for (const token of document.tokens) {
    const paths = tokensByDomain.get(token.domain) ?? [];
    paths.push(token.id);
    tokensByDomain.set(token.domain, paths);
    tiers.push(token.tier);
  }
  const domains = [...tokensByDomain.keys()].sort(compare);
  const interfaceMembers = domains
    .map((domain) => {
      const paths = quotedUnion(
        tokensByDomain.get(domain) ?? [],
        TOKEN_GENERATED_FILE_INDENT.repeat(2),
      );
      return `${TOKEN_GENERATED_FILE_INDENT}readonly ${domain}:\n${paths};`;
    })
    .join("\n");

  return `${TOKEN_GENERATED_FILE_HEADER.join("\n")}
// Source digest: ${sourceDigest}
// Generator version: ${TOKEN_FOUNDATION_GENERATOR_VERSION}
// Schema version: ${TOKEN_GENERATED_SCHEMA_VERSION}

export type TokenDomain =
${quotedUnion(domains, TOKEN_GENERATED_FILE_INDENT)};

export type TokenTier =
${quotedUnion(tiers, TOKEN_GENERATED_FILE_INDENT)};

export interface TokenPathByDomain {
${interfaceMembers}
}

export type TokenPath<Domain extends TokenDomain = TokenDomain> =
  TokenPathByDomain[Domain];
`;
};

export const tokenPathsFromManifest = (
  manifest: ResolvedTokenManifest,
): readonly string[] =>
  [...new Set(manifest.contexts.flatMap((context) => context.tokens.map((token) => token.id)))].sort(
    compare,
  );
