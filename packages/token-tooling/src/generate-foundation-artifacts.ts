import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveTokenContexts,
  serializeResolvedTokenManifest,
  type ResolverModifierRegistry,
  type TokenContextOverrideDocument,
  type TokenDomainDefinition,
  type TokenSourceDocument,
} from "@axiom/tokens";

import {
  TOKEN_DOMAIN_REGISTRY_PATH,
  TOKEN_FOUNDATION_POLICY_PATH,
  TOKEN_FOUNDATION_GENERATOR_VERSION,
  TOKEN_MODIFIER_REGISTRY_PATH,
  TOKEN_PATH_TYPES_PATH,
  TOKEN_RESOLVED_MANIFEST_PATH,
  TOKEN_SEMANTIC_VOCABULARY_PATH,
  TOKEN_SOURCE_FILES,
  TOKEN_SOURCE_PROFILE_PATH,
} from "./constants.js";
import {
  digestTokenSources,
  generateTokenPathTypes,
} from "./foundation-artifacts.js";
import {
  assertFoundationTokenPolicy,
  type FoundationTokenPolicy,
  type SemanticTokenVocabulary,
} from "./foundation-policy.js";
import { createTerrazzoTokenParser } from "./terrazzo-token-parser.js";

interface TokenSourceProfile {
  readonly profileVersion: string;
}

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const repositoryPath = (path: string): string => resolve(repositoryRoot, path);
const readJson = async <Value>(path: string): Promise<Value> =>
  JSON.parse(await readFile(repositoryPath(path), "utf8")) as Value;

const writeOrCheck = async (
  path: string,
  content: string,
  write: boolean,
): Promise<void> => {
  const absolutePath = repositoryPath(path);
  if (write) {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
    return;
  }
  let current: string;
  try {
    current = await readFile(absolutePath, "utf8");
  } catch {
    throw new Error(`${path} is missing; run pnpm tokens:generate.`);
  }
  if (current !== content) {
    throw new Error(`${path} has drifted; run pnpm tokens:generate.`);
  }
};

const [
  profile,
  foundationPolicyContent,
  semanticVocabularyContent,
  domainRegistry,
  modifierRegistry,
  sourceFiles,
] = await Promise.all([
  readJson<TokenSourceProfile>(TOKEN_SOURCE_PROFILE_PATH),
  readFile(repositoryPath(TOKEN_FOUNDATION_POLICY_PATH), "utf8"),
  readFile(repositoryPath(TOKEN_SEMANTIC_VOCABULARY_PATH), "utf8"),
  readJson<{ readonly domains: readonly TokenDomainDefinition[] }>(
    TOKEN_DOMAIN_REGISTRY_PATH,
  ),
  readJson<ResolverModifierRegistry>(TOKEN_MODIFIER_REGISTRY_PATH),
  Promise.all(
    TOKEN_SOURCE_FILES.map(async (source) => ({
      ...source,
      content: await readFile(repositoryPath(source.path), "utf8"),
    })),
  ),
]);
const foundationPolicy = JSON.parse(foundationPolicyContent) as FoundationTokenPolicy;
const semanticVocabulary = JSON.parse(
  semanticVocabularyContent,
) as SemanticTokenVocabulary;

const parser = createTerrazzoTokenParser({ domains: domainRegistry.domains });
const parseSource = async (
  source: (typeof sourceFiles)[number],
): Promise<Awaited<ReturnType<typeof parser.parse>>> => {
  const document: TokenSourceDocument = {
    filename: new URL(`file:///${source.path}`),
    content: source.content,
  };
  return parser.parse([document]);
};
const [base, light, dark] = await Promise.all(sourceFiles.map(parseSource));
if (base === undefined || light === undefined || dark === undefined) {
  throw new Error("The base, light, and dark Token sources are required.");
}

const sourceDigest = digestTokenSources(
  [
    ...sourceFiles.map(({ path, content }) => ({ filename: `file:///${path}`, content })),
    {
      filename: `file:///${TOKEN_FOUNDATION_POLICY_PATH}`,
      content: foundationPolicyContent,
    },
    {
      filename: `file:///${TOKEN_SEMANTIC_VOCABULARY_PATH}`,
      content: semanticVocabularyContent,
    },
  ],
);
const contexts: readonly TokenContextOverrideDocument[] = [
  { schemaVersion: light.schemaVersion, context: { theme: "light" }, tokens: light.tokens },
  { schemaVersion: dark.schemaVersion, context: { theme: "dark" }, tokens: dark.tokens },
];
const result = resolveTokenContexts(
  {
    profileVersion: profile.profileVersion,
    sourceDigest,
    base,
    contexts,
  },
  { domains: domainRegistry.domains, modifierRegistry },
);
assertFoundationTokenPolicy(
  base,
  result.manifest,
  foundationPolicy,
  semanticVocabulary,
  [light, dark],
);

const write = process.argv.includes("--write");
await Promise.all([
  writeOrCheck(
    TOKEN_RESOLVED_MANIFEST_PATH,
    serializeResolvedTokenManifest(result.manifest),
    write,
  ),
  writeOrCheck(TOKEN_PATH_TYPES_PATH, generateTokenPathTypes(base, sourceDigest), write),
]);
console.log(
  `Axiom Token Foundation artifacts are ${write ? "generated" : "current"}: ${base.tokens.length} Tokens, ${result.manifest.contexts.length} contexts, generator ${TOKEN_FOUNDATION_GENERATOR_VERSION}.`,
);
