import assert from "node:assert/strict";
import test from "node:test";
import { inspectStudioProject, planStudioComponentCreate } from "../../ads-core/src/index.ts";
import { generateTargetPack } from "../src/index.ts";
import { projectFixture, DIGEST } from "./target-fixture.ts";

const IDS = ["button", "chip", "input", "textarea", "numberfield", "select", "checkbox", "radio", "switch", "tabs", "card"];
function fixture(catalogId: string) {
  let sequence = 0;
  const plan = planStudioComponentCreate(projectFixture(), { catalogId: `catalog.${catalogId}` }, () => `design.baseline.${++sequence}`);
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics));
  const component = inspectStudioProject(plan.project).components.find(component => component.catalog)!;
  return { plan, component };
}

test("key Library baselines are valid authored designs and export complete React controls", () => {
  for (const name of IDS) {
    const { plan, component } = fixture(name);
    const generation = generateTargetPack(plan.project, { target: "react" }, DIGEST);
    assert.equal(generation.valid, true, `${name}: ${JSON.stringify(generation.diagnostics)}`);
    const css = generation.pack!.files.find(file => file.path === "src/styles.css")!.text;
    assert(css.includes("outline-offset:3px") && css.includes("cursor:not-allowed"), name);
    assert(!css.includes("--catalog-border") && !css.includes("var(--surface)"), "Consumer styles cannot depend on Studio tokens");
    const root = component.parts.find(part => part.role === "root")!;
    if (["button", "chip", "card"].includes(name)) {
      const states = component.web.parts[root.id]!.combinations;
      assert.equal(states.filled.borderWidth, 0);
      assert.equal(states.outlined.borderWidth, 1);
      assert.notEqual(states.filled.background, states.outlined.background);
    }
  }
});

test("field baselines persist token linkage, independent label scale and usable control geometry", () => {
  for (const name of ["input", "textarea", "select"]) {
    const { plan, component } = fixture(name);
    const control = component.parts.find(part => part.role === (name === "select" ? "trigger" : "input"))!;
    const label = component.parts.find(part => part.role === "label")!;
    assert.equal(component.web.layout[control.id]!.minHeight, name === "textarea" ? 96 : 40);
    assert.equal(component.web.layout[control.id]!.padding, 10);
    assert.deepEqual(component.web.layout[control.id]!.width, { mode: "fill" });
    assert.equal(component.web.parts[label.id]!.base.fontSize, 12);
    const source = Object.values(plan.project.documents).find(item => item.document.id === component.web.id)!.document;
    const rules = source.appearance as { targetPartRef: string; declarations: Record<string, unknown> }[];
    const paint = rules.find(rule => rule.targetPartRef === control.id)!.declarations;
    assert.deepEqual(paint.background, { tokenRef: "token.surface" });
    assert.deepEqual(paint.borderColor, { tokenRef: "token.border" });
  }
});

test("Web baseline improvements preserve native root-only paint obligations", () => {
  for (const name of ["button", "input", "switch", "card"]) {
    const { plan, component } = fixture(name);
    for (const part of component.parts.filter(part => part.role !== "root")) {
      assert.deepEqual(component.mobile.parts[part.id]!.base, {});
      assert.equal(component.mobile.layout[part.id]!.padding, 0);
    }
    for (const target of ["swiftui", "compose", "react-native"] as const) {
      const generation = generateTargetPack(plan.project, { target }, DIGEST);
      assert.equal(generation.valid, true, `${name} ${target}: ${JSON.stringify(generation.diagnostics)}`);
    }
  }
});
