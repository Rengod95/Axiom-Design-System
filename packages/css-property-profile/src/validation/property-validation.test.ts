import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";

import type { EffectiveCSSPropertyRegistry } from "../contracts.js";
import { CSSGrammarValidator } from "./css-grammar-validator.js";
import { validateTokenBinding } from "./token-binding-validator.js";

let registry: EffectiveCSSPropertyRegistry;

beforeAll(async () => {
  registry = JSON.parse(
    await readFile(
      new URL("../../../../spec/css/effective-property-registry.json", import.meta.url),
      "utf8",
    ),
  ) as EffectiveCSSPropertyRegistry;
});

const diagnosticCode = (result: ReturnType<CSSGrammarValidator["validate"]>): string | undefined =>
  result.valid ? undefined : result.diagnostics[0]?.code;

describe("CSS grammar and authoring policy validation", () => {
  it("accepts standard raw CSS and rejects grammar mismatches", () => {
    const validator = new CSSGrammarValidator(registry);
    expect(validator.validate("grid-template-columns", "repeat(3, minmax(0, 1fr))"))
      .toEqual({ valid: true });
    expect(diagnosticCode(validator.validate("grid-template-columns", "not-a-track(")))
      .toBe("AXP1201");
    expect(validator.validate("width", "inherit")).toEqual({ valid: true });
    expect(diagnosticCode(validator.validate("width", "revert-layer"))).toBe("AXP1101");
  });

  it("allows a custom-property placeholder only when an explicit caller boundary permits it", () => {
    const validator = new CSSGrammarValidator(registry);
    expect(diagnosticCode(validator.validate("transition-duration", "var(--axiom-motion-token)")))
      .toBe("AXP1201");
    expect(new CSSGrammarValidator(registry, {
      allowCustomPropertyReferences: true,
    }).validate("transition-duration", "var(--axiom-motion-token)"))
      .toEqual({ valid: true });
  });

  it("enforces governed, blocked, and opt-in property authoring", () => {
    const validator = new CSSGrammarValidator(registry);
    expect(diagnosticCode(validator.validate("background-color", "red"))).toBe("AXP1101");
    expect(diagnosticCode(validator.validate("all", "initial"))).toBe("AXP1101");
    expect(diagnosticCode(validator.validate("view-transition-name", "card"))).toBe("AXP1002");
    expect(
      new CSSGrammarValidator(registry, {
        enabledExperimentalProperties: ["view-transition-name"],
      }).validate("view-transition-name", "card"),
    ).toEqual({ valid: true });
    expect(diagnosticCode(validator.validate("-webkit-transform", "scale(1)"))).toBe("AXP1003");
    expect(diagnosticCode(validator.validate("axiom-unknown", "1"))).toBe("AXP1001");
  });

  it("enforces declaration syntax and declared custom-property boundaries", () => {
    const validator = new CSSGrammarValidator(registry);
    expect(diagnosticCode(validator.validate("width", "10px !important"))).toBe("AXP1202");
    expect(diagnosticCode(validator.validate("width", "10px; color: red"))).toBe("AXP1204");
    expect(validator.validate("--axiom-project-example", "calc(1px + 2px)"))
      .toEqual({ valid: true });
    expect(diagnosticCode(validator.validate("--unknown-project-value", "1"))).toBe("AXP1001");
  });
});

describe("Token binding policy validation", () => {
  it("distinguishes direct, template, and projector bindings", () => {
    expect(validateTokenBinding(registry, {
      property: "background-color",
      mode: "direct",
      domain: "color",
    })).toEqual([]);
    expect(validateTokenBinding(registry, {
      property: "background-color",
      mode: "direct",
      domain: "space",
    })[0]?.code).toBe("AXP1103");
    expect(validateTokenBinding(registry, {
      property: "grid-template-columns",
      mode: "template",
      domain: "size",
    })).toEqual([]);
    expect(validateTokenBinding(registry, {
      property: "grid-template-columns",
      mode: "direct",
      domain: "size",
    })[0]?.code).toBe("AXP1102");
    expect(validateTokenBinding(registry, {
      property: "box-shadow",
      mode: "projector",
      projector: "css.shadow.v1",
    })).toEqual([]);
  });

  it("applies governed negation and rejects unconfigured properties", () => {
    expect(validateTokenBinding(registry, {
      property: "margin-inline-start",
      mode: "direct",
      domain: "space",
      negated: true,
    })).toEqual([]);
    expect(validateTokenBinding(registry, {
      property: "padding-inline",
      mode: "direct",
      domain: "space",
      negated: true,
    })[0]?.code).toBe("AXP1102");
    expect(validateTokenBinding(registry, {
      property: "inset-inline-start",
      mode: "direct",
      domain: "space",
      negated: true,
    })).toEqual([]);
    expect(validateTokenBinding(registry, {
      property: "gap",
      mode: "direct",
      domain: "space",
      negated: true,
    })[0]?.code).toBe("AXP1102");
    expect(validateTokenBinding(registry, {
      property: "scroll-snap-type",
      mode: "direct",
      domain: "space",
    })[0]?.code).toBe("AXP1102");
    expect(validateTokenBinding(registry, {
      property: "-webkit-transform",
      mode: "template",
      domain: "size",
    })[0]?.code).toBe("AXP1003");
  });
});
