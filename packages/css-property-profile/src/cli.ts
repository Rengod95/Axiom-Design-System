import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CSS_PROFILE_GENERATOR_VERSION,
  CSS_PROPERTY_TYPES_PATH,
  PROPERTY_DIAGNOSTIC_CODE,
  WEBREF_INPUT_PATH,
  WEBREF_PACKAGE_VERSION,
} from "./constants.js";
import type {
  CSSAppearanceProfileInputManifest,
  SparsePropertyPolicySource,
  TokenBindingCatalog,
} from "./contracts.js";
import {
  digestCanonicalJson,
  serializeCanonicalJson,
} from "./generation/canonical-json.js";
import { generatePropertyProfile } from "./generation/profile-generator.js";
import { generateCSSPropertyTypes } from "./generation/property-types.js";
import { loadPinnedWebref } from "./webref/webref-importer.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const paths = {
  bindings: new URL("../../../spec/css/token-binding-catalog.json", import.meta.url),
  coverage: new URL("../../../spec/css/token-binding-coverage.json", import.meta.url),
  domains: new URL("../../../spec/token/token-domain-registry.json", import.meta.url),
  policy: new URL("../../../spec/css/sparse-property-policy.json", import.meta.url),
  profile: new URL("../../../spec/css/profile-input-manifest.json", import.meta.url),
  projectors: new URL(
    "../../../spec/token/composite-token-projector-registry.json",
    import.meta.url,
  ),
  registry: new URL("../../../spec/css/effective-property-registry.json", import.meta.url),
  types: new URL(`../../../${CSS_PROPERTY_TYPES_PATH}`, import.meta.url),
} as const;

const readJson = async <T>(url: URL): Promise<T> =>
  JSON.parse(await readFile(url, "utf8")) as T;

const assertEqual = (actual: string, expected: string, subject: string): void => {
  if (actual !== expected) {
    throw new Error(
      `${PROPERTY_DIAGNOSTIC_CODE.PROFILE_INPUT_MISMATCH}: ${subject} expected '${expected}', received '${actual}'.`,
    );
  }
};

const writeOrCheck = async (url: URL, content: string, write: boolean): Promise<void> => {
  if (write) {
    await mkdir(dirname(fileURLToPath(url)), { recursive: true });
    await writeFile(url, content, "utf8");
    return;
  }
  let current: string;
  try {
    current = await readFile(url, "utf8");
  } catch {
    throw new Error(`${fileURLToPath(url)} is missing; run pnpm profile:generate.`);
  }
  if (current !== content) {
    throw new Error(`${fileURLToPath(url)} has drifted; run pnpm profile:generate.`);
  }
};

const [profile, policy, bindings, domainRegistry, projectorRegistry] = await Promise.all([
  readJson<CSSAppearanceProfileInputManifest>(paths.profile),
  readJson<SparsePropertyPolicySource>(paths.policy),
  readJson<TokenBindingCatalog>(paths.bindings),
  readJson<{ readonly domains: readonly { readonly id: string }[] }>(paths.domains),
  readJson<{ readonly projectors: readonly { readonly id: string }[] }>(paths.projectors),
]);
const webref = await loadPinnedWebref();
assertEqual(profile.webrefPackageVersion, WEBREF_PACKAGE_VERSION, "Webref package version");
assertEqual(profile.webrefInputPath, WEBREF_INPUT_PATH, "Webref input path");
assertEqual(profile.webrefInputDigest, webref.inputDigest, "Webref input digest");
assertEqual(profile.generatorVersion, CSS_PROFILE_GENERATOR_VERSION, "generator version");
assertEqual(
  profile.policySourceDigest,
  digestCanonicalJson({ policy, bindings }),
  "policy source digest",
);

const result = generatePropertyProfile({
  upstreamProperties: webref.properties,
  profile,
  policy,
  bindings,
  tokenDomains: domainRegistry.domains.map((entry) => entry.id),
  projectors: projectorRegistry.projectors.map((entry) => entry.id),
});
const write = process.argv.includes("--write");
await Promise.all([
  writeOrCheck(paths.registry, serializeCanonicalJson(result.registry), write),
  writeOrCheck(paths.coverage, serializeCanonicalJson(result.coverage), write),
  writeOrCheck(paths.types, generateCSSPropertyTypes(result.registry), write),
]);
console.log(
  `Axiom CSS profile is ${write ? "generated" : "current"}: ${result.registry.properties.length} properties from ${repositoryRoot}.`,
);
