import {
  CSS_GENERATED_FILE_HEADER,
  CSS_GENERATED_FILE_INDENT,
  CSS_PROFILE_GENERATOR_VERSION,
  EFFECTIVE_PROPERTY_REGISTRY_SCHEMA_VERSION,
} from "../constants.js";
import type { EffectiveCSSPropertyRegistry } from "../contracts.js";
import { uniqueSortedStrings } from "./stable-string-order.js";

const quotedUnion = (values: readonly string[]): string =>
  uniqueSortedStrings(values)
    .map((value) => `${CSS_GENERATED_FILE_INDENT}| ${JSON.stringify(value)}`)
    .join("\n");

export const generateCSSPropertyTypes = (
  registry: EffectiveCSSPropertyRegistry,
): string => `${CSS_GENERATED_FILE_HEADER.join("\n")}
// Webref input digest: ${registry.profile.webrefInputDigest}
// Policy source digest: ${registry.profile.policySourceDigest}
// Generator version: ${CSS_PROFILE_GENERATOR_VERSION}
// Schema version: ${EFFECTIVE_PROPERTY_REGISTRY_SCHEMA_VERSION}

import type { Properties as CSSProperties } from "csstype";

export type CSSCanonicalProperty =
${quotedUnion(Object.values(registry.authoringNames))};

export type CSSAuthoringProperty =
${quotedUnion(Object.keys(registry.authoringNames))};

export type CsstypeBackedAuthoringProperty = Extract<
  CSSAuthoringProperty,
  keyof CSSProperties<string | number>
>;
`;
