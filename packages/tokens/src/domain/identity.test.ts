import { describe, expect, it } from "vitest";

import type { TokenDomainDefinition } from "../contracts.js";
import {
  parseTokenIdentity,
  validateTokenDomainConstraints,
  validateTokenDomainType,
} from "./identity.js";

const domains: readonly TokenDomainDefinition[] = [
  {
    id: "color",
    root: "color",
    allowedDTCGTypes: ["color"],
  },
];

describe("Token identity", () => {
  it("parses explicit domain and tier segments", () => {
    expect(parseTokenIdentity("color.semantic.fill.brand", domains)).toEqual({
      ok: true,
      identity: {
        id: "color.semantic.fill.brand",
        domain: "color",
        tier: "semantic",
      },
      diagnostics: [],
    });
  });

  it.each([
    ["color.action.primary", "AXT1104"],
    ["paint.semantic.action.primary", "AXT1103"],
    ["color.semantic", "AXT1100"],
    ["color.semantic.Bad-segment", "AXT1105"],
  ])("rejects invalid identity %s", (id, code) => {
    const result = parseTokenIdentity(id, domains);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === code)).toBe(true);
  });

  it("validates Domain to DTCG type compatibility", () => {
    const result = parseTokenIdentity("color.primitive.brand", domains);
    if (!result.ok) throw new Error("fixture identity should be valid");

    expect(validateTokenDomainType(result.identity, "dimension", domains)).toMatchObject([
      { code: "AXT1201" },
    ]);
  });

  it("validates registry-owned numeric constraints and defers aliases", () => {
    const constrainedDomains: readonly TokenDomainDefinition[] = [
      {
        id: "opacity",
        root: "opacity",
        allowedDTCGTypes: ["number"],
        constraints: [{ kind: "numberRange", minimum: 0, maximum: 1 }],
      },
    ];
    const result = parseTokenIdentity("opacity.primitive.overlay", constrainedDomains);
    if (!result.ok) throw new Error("fixture identity should be valid");

    expect(
      validateTokenDomainConstraints(
        result.identity,
        "number",
        1.1,
        constrainedDomains,
      ),
    ).toMatchObject([{ code: "AXT1202" }]);
    expect(
      validateTokenDomainConstraints(
        result.identity,
        "number",
        "{opacity.primitive.opaque}",
        constrainedDomains,
        "opacity.primitive.opaque",
      ),
    ).toEqual([]);
  });
});
