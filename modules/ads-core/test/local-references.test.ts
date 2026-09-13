import { test } from "node:test";
import assert from "node:assert/strict";
import type { DocumentEntry, JsonObject } from "../src/contracts.ts";
import { MAX_STRUCTURE_DIAGNOSTICS, STRUCTURAL_PROFILE } from "../src/constants.ts";
import { parseDocument } from "../src/documents.ts";
import { inspectLocalReferences } from "../src/local-references.ts";

const PROJECT = "workspace";
function entry(kind: string, id: string, body: JsonObject, profiled = true, revision = "source-r1"): DocumentEntry {
  const result = parseDocument(JSON.stringify({ id, kind, schemaVersion: "1.0.0", revision, name: id, ...body }));
  if (profiled) result.validationProfile = STRUCTURAL_PROFILE;
  return result;
}
function component(id: string, body: JsonObject = {}, profiled = true): DocumentEntry {
  return entry("component", id, {
    purpose: "Graph fixture", archetypeRef: { id: "external.archetype", expectedKind: "archetype", version: "1.0.0" }, traitBindings: [],
    publicContract: { values: [], events: [], exposedSlots: [], replaceableParts: [], allowedOverrides: [], variants: [] },
    parts: [], slots: [], behavior: { states: [], transitions: [], hostBindings: [] },
    accessibility: { purpose: "Fixture", nameSources: [], descriptionSources: [], stateExposure: [], readingOrder: [], focus: {}, announcements: [], requirements: [] },
    motion: [], requirements: [], ...body,
  }, profiled);
}
function part(id: string, parent: string | null = null): JsonObject {
  return { id, parent, roleRefs: [], required: false, cardinality: {}, relationships: [] };
}
function foundation(body: JsonObject = {}, profiled = true): DocumentEntry {
  return entry("foundation", "foundation", { tokens: [{ id: "token.type", name: "Type", typeRef: {}, value: {} }], domains: [], tiers: [], themeAxes: [], themeSets: [], policies: [], originalSources: [], ...body }, profiled);
}
function text(ref: JsonObject, id = "text", profiled = true): DocumentEntry {
  return entry("text", id, { blocks: [{ id: `${id}.block`, kind: "paragraph", typographyRef: ref, inlines: [{ id: `${id}.run`, text: "Text", marks: [] }] }], localeHints: {} }, profiled);
}

test("indexes only agreed nested paths and resolves typed targets to their owning source revision", () => {
  const definitions = foundation({ themeAxes: [{ id: "axis.mode", contexts: ["light"], scope: { id: "foundation", expectedKind: "foundation", revision: "source-r1" } }], themeSets: [{ id: "theme.light", contexts: { "axis.mode": "light" }, resolutionProfile: { id: "external.resolver", expectedKind: "resolutionProfile", version: "1.0.0" } }] });
  const body = component("component", {
    parts: [part("part.root"), part("part.child", "part.root")],
    slots: [{ id: "slot.body", ownerPartRef: "part.child", contentKinds: ["text"], min: 0, max: 1, defaultContent: [], allowedContractRefs: [] }],
    publicContract: {
      values: [{ id: "value.open", name: "open", type: {}, ownership: "consumer", requestEventRef: "event.change", visibility: "public" }],
      events: [{ id: "event.change", name: "change", payloadType: {}, phase: "intent", cancellable: false, visibility: "public" }],
      exposedSlots: ["slot.body"], replaceableParts: ["part.child"], allowedOverrides: [], variants: [{ id: "variant.size", name: "size", options: ["small"], default: "small" }],
    },
  });
  const report = inspectLocalReferences({ foundation: definitions, component: body, text: text({ id: "token.type", expectedKind: "token", revision: "source-r1" }) }, PROJECT);
  assert.equal(report.valid, true);
  for (const kind of ["part", "slot", "value", "event", "variant", "token", "themeAxis", "themeSet", "textBlock", "inlineRun"]) assert.ok(report.entities.some((entity) => entity.kind === kind), kind);
  const tokenRef = report.references.find((ref) => ref.id === "token.type")!;
  assert.equal(tokenRef.status, "resolved");
  assert.equal(tokenRef.resolvedTarget?.ownerDocumentId, "foundation");
  assert.equal(tokenRef.resolvedTarget?.ownerRevision, "source-r1");
  assert.equal(tokenRef.resolvedTarget?.path, "/tokens/0");
  assert.equal(tokenRef.resolvedTarget?.validation, "structural");
  assert.ok(report.references.some((ref) => ref.path === "/publicContract/values/0/requestEventRef" && ref.status === "resolved"));
});

test("unknown fields, metadata, extensions and opaque named/union payloads do not create entities or references", () => {
  const hidden = { id: "hidden", expectedKind: "component", payload: { id: "nested-hidden" } };
  const document = foundation({
    metadata: hidden, extensions: { vendor: hidden }, future: hidden,
    tokens: [{ id: "token.type", name: "Type", typeRef: hidden, value: hidden, metadata: hidden, extensions: hidden }],
    domains: [hidden], originalSources: [hidden],
  });
  const source = entry("text", "text", { blocks: [{ id: "block", kind: "paragraph", inlines: [{ id: "run", text: "text", marks: [hidden], link: hidden }] }], localeHints: { locale: hidden } });
  const report = inspectLocalReferences({ foundation: document, text: source }, PROJECT);
  assert.equal(report.references.length, 0);
  assert.equal(report.entities.some((entity) => entity.id === "hidden" || entity.id === "nested-hidden"), false);
});

test("reports missing, mismatched-kind and pinned owner-revision failures at the actual Ref path", () => {
  for (const [ref, code, status] of [
    [{ id: "absent", expectedKind: "token" }, "REFERENCE_MISSING", "missing"],
    [{ id: "token.type", expectedKind: "part" }, "REFERENCE_KIND", "kind-mismatch"],
    [{ id: "token.type", expectedKind: "token", revision: "wrong" }, "REFERENCE_REVISION", "revision-mismatch"],
  ] as const) {
    const report = inspectLocalReferences({ foundation: foundation(), text: text(ref) }, PROJECT);
    assert.equal(report.valid, false);
    assert.equal(report.references.find((reference) => reference.ownerDocumentId === "text")?.status, status);
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.code === code && diagnostic.sourceRef === "text" && diagnostic.path === "/blocks/0/typographyRef"));
  }
});

test("public version pins cannot waive local existence or pinned revision checks", () => {
  const document = text({ id: "token.type", expectedKind: "token", version: "1.0.0", revision: "source-r1" });
  const beforeDeletion = inspectLocalReferences({ foundation: foundation(), text: document }, PROJECT);
  assert.equal(beforeDeletion.valid, true);
  assert.equal(beforeDeletion.references[0]?.status, "unverified");
  assert.ok(beforeDeletion.diagnostics.some((diagnostic) => diagnostic.code === "STRUCTURE_UNVERIFIED"));
  const afterDeletion = inspectLocalReferences({ text: document }, PROJECT, ["text"]);
  assert.equal(afterDeletion.valid, false);
  assert.equal(afterDeletion.references[0]?.status, "missing");
  const stale = inspectLocalReferences({ foundation: foundation(), text: text({ id: "token.type", expectedKind: "token", version: "1.0.0", revision: "wrong" }) }, PROJECT);
  assert.equal(stale.references[0]?.status, "revision-mismatch");
  const external = inspectLocalReferences({ text: text({ id: "external.trait", expectedKind: "trait", version: "future" }) }, PROJECT);
  assert.equal(external.valid, true);
  assert.equal(external.references[0]?.status, "unverified");
});

test("duplicate identities are global and never resolved by first occurrence or owner filtering", () => {
  const first = component("first", { parts: [part("duplicate")] }, false);
  const second = component("second", { parts: [part("duplicate")] }, false);
  const unrelated = component("selected");
  assert.equal(inspectLocalReferences({ first, second, selected: unrelated }, PROJECT, ["selected"]).valid, true);
  const colliding = component("selected", { parts: [part("duplicate")] });
  const report = inspectLocalReferences({ first, second, selected: colliding }, PROJECT, ["selected"]);
  assert.equal(report.valid, false);
  assert.ok(report.diagnostics.some((diagnostic) => diagnostic.code === "ENTITY_DUPLICATE" && diagnostic.sourceRef === "selected" && diagnostic.path === "/parts/0/id"));
  assert.equal(report.diagnostics.some((diagnostic) => diagnostic.sourceRef === "first" || diagnostic.sourceRef === "second"), false);
  const reserved = inspectLocalReferences({ selected: component("selected", { parts: [part(PROJECT)] }) }, PROJECT);
  assert.equal(reserved.valid, false);
  const sameDocument = component("selected", { parts: [part("duplicate"), part("duplicate")], publicContract: { values: [], events: [], variants: [], exposedSlots: [], replaceableParts: ["duplicate"], allowedOverrides: [] } });
  const ambiguous = inspectLocalReferences({ selected: sameDocument }, PROJECT);
  assert.equal(ambiguous.references.find((ref) => ref.id === "duplicate")?.status, "ambiguous");
});

test("local Part/slot/value relationships cannot attach to another document's entities", () => {
  const report = inspectLocalReferences({ first: component("first", { parts: [part("first.part", "second.part")] }), second: component("second", { parts: [part("second.part")] }) }, PROJECT);
  assert.equal(report.valid, false);
  assert.equal(report.references.find((ref) => ref.id === "second.part")?.status, "owner-mismatch");
});

test("Part parent permits a forest but rejects self/multiple-node cycles without recursion", () => {
  const forest = inspectLocalReferences({ component: component("component", { parts: [part("root.one"), part("root.two"), part("child", "root.one")] }) }, PROJECT);
  assert.equal(forest.valid, true);
  for (const parts of [[part("self", "self")], [part("one", "two"), part("two", "one")]]) {
    const report = inspectLocalReferences({ component: component("component", { parts }) }, PROJECT);
    assert.equal(report.valid, false);
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.code === "STRUCTURE_CYCLE" && diagnostic.path?.endsWith("/parent")));
  }
  const length = 6_000;
  const parts = Array.from({ length }, (_, index) => part(`part.${index}`, index ? `part.${index - 1}` : `part.${length - 1}`)).reverse();
  const report = inspectLocalReferences({ component: component("component", { parts }) }, PROJECT);
  assert.ok(report.diagnostics.some((diagnostic) => diagnostic.code === "STRUCTURE_CYCLE" && diagnostic.message.includes("6000 identities")));
});

test("generic document and prototype navigation cycles are not mistaken for Part cycles", () => {
  const project = (id: string, target: string): DocumentEntry => entry("project", id, { documents: [{ id: target, expectedKind: "project", revision: "source-r1" }], libraries: [], targetProfiles: [], brandLibraries: [], connections: [] });
  const first = project("first", "second");
  const second = project("second", "first");
  assert.equal(inspectLocalReferences({ first, second }, PROJECT).valid, true);
  const screen = (id: string): DocumentEntry => entry("screen", id, { instances: [], themeSetRef: { id: "theme", expectedKind: "themeSet" }, brandAssetRefs: [], layout: [] });
  const definitions = foundation({ themeSets: [{ id: "theme", contexts: {}, resolutionProfile: { id: "external.resolver", expectedKind: "resolutionProfile" } }] });
  const componentDocument = component("component", { publicContract: { values: [], events: [{ id: "event.navigate", name: "navigate", payloadType: {}, phase: "intent", cancellable: false, visibility: "public" }], variants: [], exposedSlots: [], replaceableParts: [], allowedOverrides: [] } });
  const scenario = entry("scenario", "scenario", {
    screenRef: { id: "screen.one", expectedKind: "screen" }, initialMockValues: {}, initialMockStates: {}, eventBindings: [], inputTrace: {}, expectations: [], stepBudget: 5, clock: {},
    prototypeLinks: [
      { id: "link.one", fromScreenRef: { id: "screen.one", expectedKind: "screen" }, toScreenRef: { id: "screen.two", expectedKind: "screen" }, eventRef: { id: "event.navigate", expectedKind: "event", revision: "source-r1" } },
      { id: "link.two", fromScreenRef: { id: "screen.two", expectedKind: "screen" }, toScreenRef: { id: "screen.one", expectedKind: "screen" }, eventRef: { id: "event.navigate", expectedKind: "event", revision: "source-r1" } },
    ],
  });
  const report = inspectLocalReferences({ foundation: definitions, component: componentDocument, one: screen("screen.one"), two: screen("screen.two"), scenario }, PROJECT);
  assert.equal(report.valid, true);
  assert.equal(report.diagnostics.some((diagnostic) => diagnostic.code === "STRUCTURE_CYCLE"), false);
});

test("unprofiled, structurally invalid and source-mismatched nested targets stay explicitly unverified", () => {
  const reference = text({ id: "token.type", expectedKind: "token", revision: "source-r1" });
  const legacy = foundation({}, false);
  const report = inspectLocalReferences({ foundation: legacy, text: reference }, PROJECT, ["text"]);
  assert.equal(report.valid, true);
  assert.equal(report.entities.some((entity) => entity.id === "token.type"), false);
  assert.equal(report.references[0]?.status, "unverified");
  assert.equal(report.references[0]?.resolvedTarget?.validation, "unverified");
  const query = inspectLocalReferences({ foundation: legacy, text: reference }, PROJECT);
  assert.equal(query.entities.find((entity) => entity.id === "token.type")?.validation, "unverified");
  const invalidBody = foundation({ domains: "wrong" });
  assert.equal(inspectLocalReferences({ foundation: invalidBody, text: reference }, PROJECT).references[0]?.status, "unverified");
  const mismatched = foundation();
  mismatched.document.name = "Changed without updating source";
  assert.equal(inspectLocalReferences({ foundation: mismatched, text: reference }, PROJECT).references[0]?.status, "unverified");
  assert.doesNotThrow(() => inspectLocalReferences({ component: component("component", { parts: [null, 1, "part"], publicContract: null }) }, PROJECT));
});

test("live kernel project scope resolves bare identity but has no source revision or library version", () => {
  const bare = inspectLocalReferences({ text: text({ id: PROJECT, expectedKind: "project" }) }, PROJECT);
  assert.equal(bare.references[0]?.status, "resolved");
  assert.equal(bare.references[0]?.resolvedTarget?.ownerRevision, null);
  for (const ref of [{ id: PROJECT, expectedKind: "project", revision: "source-r1" }, { id: PROJECT, expectedKind: "project", version: "1.0.0" }]) {
    const pinned = inspectLocalReferences({ text: text(ref) }, PROJECT);
    assert.equal(pinned.valid, false);
    assert.equal(pinned.references[0]?.status, "revision-mismatch");
  }
});

test("diagnostic truncation remains explicit and cannot hide a later enforced error", () => {
  const blocks = Array.from({ length: MAX_STRUCTURE_DIAGNOSTICS + 2 }, (_, index) => ({ id: `block.${index}`, kind: "paragraph", inlines: [], typographyRef: { id: index === MAX_STRUCTURE_DIAGNOSTICS + 1 ? "missing-token" : `external.${index}`, expectedKind: index === MAX_STRUCTURE_DIAGNOSTICS + 1 ? "token" : "trait" } }));
  const report = inspectLocalReferences({ text: entry("text", "text", { blocks, localeHints: {} }) }, PROJECT);
  assert.equal(report.valid, false);
  assert.equal(report.diagnostics.length, MAX_STRUCTURE_DIAGNOSTICS);
  assert.equal(report.diagnostics.at(-1)?.code, "STRUCTURE_LIMIT");
  assert.equal(report.diagnostics.at(-1)?.severity, "error");
  assert.equal(report.references.at(-1)?.status, "missing");
});
