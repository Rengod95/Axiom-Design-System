import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import {
  CANONICAL_DIGEST_ALGORITHM,
  CANONICAL_DIGEST_PREFIX,
  PROPERTY_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
  WEBREF_INPUT_PATH,
  WEBREF_PACKAGE_NAME,
  WEBREF_PACKAGE_VERSION,
} from "../constants.js";
import type { UpstreamCSSProperty } from "../contracts.js";

export interface PinnedWebrefInput {
  readonly packageVersion: string;
  readonly inputPath: string;
  readonly inputDigest: string;
  readonly properties: readonly UpstreamCSSProperty[];
}

interface WebrefDocument {
  readonly properties?: unknown;
}

const require = createRequire(import.meta.url);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const normalizeProperty = (value: unknown, index: number): UpstreamCSSProperty => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(
      `${PROPERTY_DIAGNOSTIC_CODE.UPSTREAM_SHAPE_INVALID}: Webref property ${index} must be an object.`,
    );
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (typeof record["name"] !== "string" || typeof record["href"] !== "string") {
    throw new TypeError(
      `${PROPERTY_DIAGNOSTIC_CODE.UPSTREAM_SHAPE_INVALID}: Webref property ${index} requires name and href.`,
    );
  }
  for (const field of ["longhands", "resetLonghands"] as const) {
    const candidate = record[field];
    if (candidate !== undefined && !isStringArray(candidate)) {
      throw new TypeError(
        `${PROPERTY_DIAGNOSTIC_CODE.UPSTREAM_SHAPE_INVALID}: ${record["name"]}.${field} must be a string array.`,
      );
    }
  }
  return {
    name: record["name"],
    href: record["href"],
    ...(typeof record["syntax"] === "string" ? { syntax: record["syntax"] } : {}),
    ...(typeof record["inherited"] === "boolean" || typeof record["inherited"] === "string"
      ? { inherited: record["inherited"] }
      : {}),
    ...(typeof record["initial"] === "string" ? { initial: record["initial"] } : {}),
    ...(isStringArray(record["longhands"]) ? { longhands: record["longhands"] } : {}),
    ...(isStringArray(record["resetLonghands"])
      ? { resetLonghands: record["resetLonghands"] }
      : {}),
    ...(typeof record["legacyAliasOf"] === "string"
      ? { legacyAliasOf: record["legacyAliasOf"] }
      : {}),
  };
};

export const loadPinnedWebref = async (): Promise<PinnedWebrefInput> => {
  const packagePath = require.resolve(`${WEBREF_PACKAGE_NAME}/package.json`);
  const inputPath = require.resolve(`${WEBREF_PACKAGE_NAME}/${WEBREF_INPUT_PATH}`);
  const [packageSource, inputSource] = await Promise.all([
    readFile(packagePath, "utf8"),
    readFile(inputPath, "utf8"),
  ]);
  const packageManifest = JSON.parse(packageSource) as { readonly version?: unknown };
  if (packageManifest.version !== WEBREF_PACKAGE_VERSION) {
    throw new Error(
      `${PROPERTY_DIAGNOSTIC_CODE.PROFILE_INPUT_MISMATCH}: expected ${WEBREF_PACKAGE_NAME} ${WEBREF_PACKAGE_VERSION}.`,
    );
  }
  const document = JSON.parse(inputSource) as WebrefDocument;
  if (!Array.isArray(document.properties)) {
    throw new TypeError(
      `${PROPERTY_DIAGNOSTIC_CODE.UPSTREAM_SHAPE_INVALID}: Webref css.json requires a properties array.`,
    );
  }
  const properties = document.properties
    .map(normalizeProperty)
    .sort((left, right) => left.name.localeCompare(right.name, STABLE_SORT_LOCALE));
  const names = new Set<string>();
  for (const property of properties) {
    if (names.has(property.name)) {
      throw new Error(
        `${PROPERTY_DIAGNOSTIC_CODE.UPSTREAM_SHAPE_INVALID}: duplicate Webref property '${property.name}'.`,
      );
    }
    names.add(property.name);
  }
  return {
    packageVersion: WEBREF_PACKAGE_VERSION,
    inputPath: WEBREF_INPUT_PATH,
    inputDigest: `${CANONICAL_DIGEST_PREFIX}${createHash(CANONICAL_DIGEST_ALGORITHM)
      .update(inputSource)
      .digest("hex")}`,
    properties,
  };
};
