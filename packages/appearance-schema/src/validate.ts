import { resolvedTokens } from "@axiom/tokens";
import { isTokenReference } from "./contracts.js";
import type { AppearanceStyle } from "./contracts.js";
import {
  appearancePropertyRegistry,
  type AppearancePropertyName,
} from "./registry.js";

export interface AppearanceValidationIssue {
  readonly path: string;
  readonly message: string;
}

export const validateAppearanceStyle = (
  value: unknown,
  path = "appearance",
): readonly AppearanceValidationIssue[] => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [{ path, message: "Appearance style must be a plain object" }];
  }

  const issues: AppearanceValidationIssue[] = [];
  for (const [property, propertyValue] of Object.entries(value)) {
    if (!(property in appearancePropertyRegistry)) {
      issues.push({ path: `${path}.${property}`, message: "Unknown appearance property" });
      continue;
    }

    const definition =
      appearancePropertyRegistry[property as AppearancePropertyName];
    if (isTokenReference(propertyValue)) {
      const token = resolvedTokens[propertyValue.path];
      if (!token) {
        issues.push({ path: `${path}.${property}`, message: "Unknown token path" });
      } else if (!definition.tokenTypes.includes(token.type as never)) {
        issues.push({
          path: `${path}.${property}`,
          message: `Token type ${token.type} is not accepted`,
        });
      }
      continue;
    }

    if (!(definition.literals as readonly unknown[]).includes(propertyValue)) {
      issues.push({
        path: `${path}.${property}`,
        message: "Value is outside the registered literal domain",
      });
    }
  }

  return issues;
};

export const assertAppearanceStyle = (
  value: unknown,
  path?: string,
): asserts value is AppearanceStyle => {
  const issues = validateAppearanceStyle(value, path);
  if (issues.length > 0) {
    throw new TypeError(
      issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"),
    );
  }
};
