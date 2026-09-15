import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, createStudioStarter, planStudioComponentCreate, planStudioComponentEdit, planStudioComponentDuplicate, inspectStudioProject, STUDIO_PROFILE } from "../src/index.ts";
import { createStudioBehaviorState, dispatchStudioBehavior, executeStudioBehavior, inspectStudioBehavior, readStudioBehavior, studioBehaviorRuntimeSource } from "../src/studio-behavior.ts";
import type { StudioBehaviorDefinition, StudioBehaviorRule } from "../src/studio-behavior.ts";
import type { AdsDocument, JsonObject, ProjectSnapshot } from "../src/contracts.ts";

const rows = (value: unknown) => value as JsonObject[];
function fixture() {
  let sequence = 0; const id = () => `behavior.fixture.${++sequence}`;
  const project: ProjectSnapshot = { id: "project.behavior", name: "Behavior", revision: "revision.behavior", documents: Object.fromEntries(createStudioStarter("project.behavior").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:behavior", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  const created = planStudioComponentCreate(project, { catalogId: "catalog.checkbox" }, id);
  assert.equal(created.valid, true, JSON.stringify(created.diagnostics));
  const component = created.changes.upserts.find(item => item.document.kind === "component")!.document;
  const added = planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "value-add", name: "active", type: { kind: "boolean" }, ownership: "local", value: false } }, id);
  assert.equal(added.valid, true, JSON.stringify(added.diagnostics));
  const source = added.project.documents[component.id]!.document, contract = source.publicContract as JsonObject;
  return { id, project: added.project, source, root: String(rows(source.parts)[0]!.id), local: String(rows(contract.values).find(value => value.name === "active")!.id), checked: String(rows(contract.values).find(value => value.name === "checked")!.id), event: String(rows(contract.events).find(event => event.name === "checkedChangeRequest")!.id) };
}
function behavior(rule: StudioBehaviorRule): StudioBehaviorDefinition { return { version: "1.0.0", rules: [rule] }; }
function rule(data: ReturnType<typeof fixture>): StudioBehaviorRule { return { id: "behavior.rule", name: "Toggle active", targetPartRef: data.root, trigger: "press", condition: null, actions: [{ kind: "toggle", valueRef: data.local }] }; }
function authored(data: ReturnType<typeof fixture>, definition = behavior(rule(data))): AdsDocument {
  const plan = planStudioComponentEdit(data.project, { componentId: data.source.id, edit: { kind: "behavior-set", behavior: definition } }, data.id);
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics));
  return plan.project.documents[data.source.id]!.document;
}

test("behavior is a source-preserving reviewed component edit and local state toggles only on its exact normalized input", () => {
  const data = fixture(), before = canonicalJson(data.project), source = authored(data), state = createStudioBehaviorState(source);
  assert.equal(canonicalJson(data.project), before);
  assert.deepEqual(source.behavior, data.source.behavior, "Catalog semantics stay intact");
  const focus = dispatchStudioBehavior(source, state, { targetPartRef: data.root, trigger: "focus" });
  assert.equal(focus.values[data.local], false); assert.deepEqual(focus.matchedRuleIds, []);
  const first = dispatchStudioBehavior(source, state, { targetPartRef: data.root, trigger: "press" });
  assert.equal(first.values[data.local], true); assert.equal(first.values[data.checked], false);
  const second = dispatchStudioBehavior(source, first.values, { targetPartRef: data.root, trigger: "press" });
  assert.equal(second.values[data.local], false); assert.equal(state[data.local], false);
  assert.equal(rows((source.publicContract as JsonObject).values).find(value => value.id === data.local)!.defaultValue, false);
});

test("guards use the pre-event snapshot, actions preserve source order and emitted requests do not adopt controlled values", () => {
  const data = fixture(), first = { ...rule(data), trigger: "focus" as const, condition: { valueRef: data.checked, operator: "equals" as const, value: false } };
  const source = authored(data, { version: "1.0.0", rules: [first, { ...rule(data), id: "behavior.request", trigger: "focus", condition: { valueRef: data.local, operator: "equals", value: false }, actions: [{ kind: "emit", eventRef: data.event, payload: { value: true } }, { kind: "set", valueRef: data.local, value: false }] }] });
  const state = createStudioBehaviorState(source), result = dispatchStudioBehavior(source, state, { targetPartRef: data.root, trigger: "focus" });
  assert.equal(result.values[data.local], false, "Second rule matches the original false value and overwrites in source order");
  assert.equal(result.values[data.checked], false, "Consumer never silently adopts an emitted request");
  assert.deepEqual(result.emissions, [{ eventRef: data.event, payload: { value: true }, ruleId: "behavior.request" }]);
  assert.deepEqual(result.matchedRuleIds, ["behavior.rule", "behavior.request"]);
  const external = { ...state, [data.checked]: true, [data.local]: true };
  assert.deepEqual(dispatchStudioBehavior(source, external, { targetPartRef: data.root, trigger: "focus" }).matchedRuleIds, []);
});

test("ownership, type, payload, identity and execution-budget violations reject the whole candidate", () => {
  const data = fixture(), base = rule(data), before = canonicalJson(data.project);
  const invalid: unknown[] = [
    { ...base, actions: [{ kind: "set", valueRef: data.checked, value: true }] },
    { ...base, actions: [{ kind: "set", valueRef: data.local, value: "true" }] },
    { ...base, actions: [{ kind: "emit", eventRef: data.event, payload: {} }] },
    { ...base, actions: [{ kind: "emit", eventRef: data.event, payload: { value: "true" } }] },
    { ...base, trigger: "change", actions: [{ kind: "emit", eventRef: data.event, payload: { value: true } }] },
    { ...base, actions: [{ kind: "eval", source: "fetch('/private')" }] },
    { ...base, actions: [{ kind: "toggle", valueRef: "missing.value" }] },
    { ...base, targetPartRef: "missing.part" }, { ...base, trigger: ["press"] },
    { ...base, condition: { valueRef: data.local, operator: "greater-than", value: true } },
    { ...base, condition: { valueRef: data.local, operator: "equals", value: true, code: "alert(1)" } },
    { ...base, actions: [] }, { ...base, actions: Array.from({ length: 9 }, () => base.actions[0]) },
  ];
  for (const entry of invalid) {
    const plan = planStudioComponentEdit(data.project, { componentId: data.source.id, edit: { kind: "behavior-set", behavior: { version: "1.0.0", rules: [entry] } as StudioBehaviorDefinition } }, data.id);
    assert.equal(plan.valid, false, JSON.stringify(entry)); assert.deepEqual(plan.changes, { upserts: [], deletes: [] }); assert.equal(canonicalJson(data.project), before);
  }
  for (const definition of [{ version: "2.0.0", rules: [base] }, { version: "1.0.0", rules: [base, base] }, { version: "1.0.0", rules: Array.from({ length: 33 }, (_item, index) => ({ ...base, id: `rule.${index}` })) }]) {
    const errors: string[] = []; inspectStudioBehavior({ ...data.source, studioBehavior: definition as unknown as JsonObject }, (_path, message) => errors.push(message)); assert.ok(errors.length);
  }
});

test("runtime errors cannot partially mutate state, emit external side effects or recover by type coercion", () => {
  const data = fixture(), source = authored(data), state = createStudioBehaviorState(source), before = canonicalJson(state);
  assert.throws(() => dispatchStudioBehavior(source, { ...state, [data.local]: "false" }, { targetPartRef: data.root, trigger: "press" }), /complete scalar contract/);
  assert.throws(() => dispatchStudioBehavior(source, state, { targetPartRef: "missing", trigger: "press" }), /existing element/);
  assert.throws(() => executeStudioBehavior(behavior({ ...rule(data), actions: [{ kind: "toggle", valueRef: data.local }, { kind: "set", valueRef: data.checked, value: true }] }), state, { targetPartRef: data.root, trigger: "press" }, [data.local]), /external/);
  assert.equal(canonicalJson(state), before);
});

test("source target runtime embeds the same pure interpreter and produces identical traces without authored executable code", () => {
  const data = fixture(), source = authored(data), definition = readStudioBehavior(source), state = createStudioBehaviorState(source), input = { targetPartRef: data.root, trigger: "press" as const };
  const generated = new Function(`return (${studioBehaviorRuntimeSource()})`)() as typeof executeStudioBehavior;
  assert.deepEqual(generated(definition, state, input, [data.local]), dispatchStudioBehavior(source, state, input));
  assert.equal(canonicalJson(state), canonicalJson(createStudioBehaviorState(source)));
});

test("deleting a referenced local value is rejected and duplicate behavior remaps owned identities", () => {
  const data = fixture(), source = authored(data), project = structuredClone(data.project);
  project.documents[source.id]!.document = source; project.documents[source.id]!.currentText = canonicalJson(source);
  const deleted = planStudioComponentEdit(project, { componentId: source.id, edit: { kind: "value-delete", valueId: data.local } }, data.id);
  assert.equal(deleted.valid, false); assert.deepEqual(deleted.changes, { upserts: [], deletes: [] });
  const duplicated = planStudioComponentDuplicate(project, { componentId: source.id }, data.id);
  assert.equal(duplicated.valid, true, JSON.stringify(duplicated.diagnostics));
  const copy = duplicated.changes.upserts.find(item => item.document.kind === "component")!.document, copied = readStudioBehavior(copy).rules[0]!;
  assert.notEqual(copied.id, "behavior.rule"); assert.notEqual(copied.targetPartRef, data.root);
  assert.notEqual((copied.actions[0] as { valueRef: string }).valueRef, data.local);
  assert.equal(inspectStudioProject(duplicated.project).valid, true);
  const copiedLocal = String(rows((copy.publicContract as JsonObject).values).find(value => value.name === "active")!.id);
  assert.equal(dispatchStudioBehavior(copy, createStudioBehaviorState(copy), { targetPartRef: copied.targetPartRef, trigger: copied.trigger }).values[copiedLocal], true);
});
