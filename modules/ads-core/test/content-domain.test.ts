import { test } from "node:test";
import assert from "node:assert/strict";
import type { JsonObject, JsonValue } from "../src/contracts.ts";
import { inspectDocumentDomain, inspectRecordDomain } from "../src/domain-validation.ts";
import { inspectDocumentStructure, inspectRecordStructure } from "../src/structural-validation.ts";

const ref = { id: "foundation.main", expectedKind: "foundation" };
const run = (extra: JsonObject = {}): JsonObject => ({ id: "run.one", text: "안녕하세요\nAxiom", marks: [], ...extra });
const block = (extra: JsonObject = {}): JsonObject => ({ id: "block.one", kind: "paragraph", inlines: [run()], ...extra });
const text = (blocks: JsonValue[] = [block()]): JsonObject => ({ id: "text.one", kind: "text", schemaVersion: "future", revision: "r1", name: "Example", blocks, localeHints: {} });
const dimension = (value: number, unit = "px"): JsonObject => ({ value, unit });

test("domain text certifies known marks while preserving unknown source fields", () => {
  const input = text([block({ inlines: [run({ marks: ["strong", "emphasis", "underline", "strike", "code"], "vendor/~": { kind: "execute-nothing" } })] })]);
  input.extensions = { vendor: { href: "javascript:never()", kind: "future-type" } };
  const before = JSON.stringify(input);
  const result = inspectDocumentDomain(input, "memory:text");
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  assert.equal(result.profile, "foundation-domain");
  assert.ok(result.checkedRecords.includes("InlineRun"));
  assert.ok(!result.unverifiedTypes.includes("InlineMark"));
  assert.ok(result.unverifiedTypes.includes("AdditionalField"));
  assert.ok(result.unverifiedTypes.includes("OpaqueExtensionMap"));
  assert.ok(result.unverifiedTypes.includes("SchemaVersionSemantics"));
  assert.ok(result.diagnostics.some(d => d.path === "/blocks/0/inlines/0/vendor~1~0"));
  assert.ok(result.diagnostics.every(d => d.sourceRef === "memory:text" && d.phase === "document"));
  assert.equal(JSON.stringify(input), before);
  assert.ok(!inspectDocumentDomain(text()).unverifiedTypes.includes("InlineMark"), "An empty marks list has no unchecked members");
});

test("domain mark rules are opt-in and report the exact failing member", () => {
  for (const mark of ["bold", {}, null, 1]) {
    const input = text([block({ inlines: [run({ marks: ["strong", mark] })] })]);
    assert.equal(inspectDocumentStructure(input).valid, true);
    const result = inspectDocumentDomain(input);
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.some(d => d.code === "DOMAIN_INVALID" && d.path === "/blocks/0/inlines/0/marks/1"));
  }
});

test("list-item metadata is required and paragraphs cannot carry it", () => {
  const list = { id: "list.one", ordered: true, start: 1, level: 0 };
  assert.equal(inspectDocumentDomain(text([block({ kind: "list-item", list })])).valid, true);
  for (const input of [block({ kind: "list-item" }), block({ list })]) {
    const result = inspectDocumentDomain(text([input]));
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.some(d => d.path === "/blocks/0/list" && d.code === "DOMAIN_INVALID"));
  }
  for (const [key, value] of [["id", "bad id"], ["ordered", "yes"], ["start", 0], ["start", 1.5], ["level", -1], ["level", 0.5]] as const) {
    const result = inspectDocumentDomain(text([block({ kind: "list-item", list: { ...list, [key]: value } })]));
    assert.equal(result.valid, false, `${key}: ${value}`);
    assert.ok(result.diagnostics.some(d => d.path === `/blocks/0/list/${key}`));
  }
  const extended = inspectDocumentDomain(text([block({ kind: "list-item", list: { ...list, vendor: { start: -99 } } })]));
  assert.equal(extended.valid, true);
  assert.ok(extended.unverifiedTypes.includes("AdditionalField"));
  assert.ok(!extended.unverifiedTypes.includes("ListMetadata"));
});

test("SafeLink allows only declared inert URL forms and target names", () => {
  for (const href of ["https://example.test/a?x=1#part", "HTTP://example.test", "mailto:person@example.test?subject=Hello%20world", "mailto:", "mailto:?subject=Hello", "#section", "#한글", "https://example.test/space%20here"]) {
    const result = inspectRecordDomain("InlineRun", run({ link: { href, target: "_blank" } }));
    assert.equal(result.valid, true, `${href}: ${JSON.stringify(result.diagnostics)}`);
    assert.ok(!result.unverifiedTypes.includes("SafeLink"));
  }
  for (const href of ["javascript:alert(1)", "data:text/plain,hello", "file:///tmp/x", "/relative", "//example.test", "#", "", " https://example.test", "https://example.test/a\nb", "https://example.test/\u007f", "https://name:secret@example.test", "https://@example.test", "https:example.test", "mailto://example.test"]) {
    const input = run({ link: { href } });
    assert.equal(inspectRecordStructure("InlineRun", input).valid, true, href);
    const result = inspectRecordDomain("InlineRun", input);
    assert.equal(result.valid, false, href);
    assert.ok(result.diagnostics.some(d => d.path === "/link/href" && d.code === "DOMAIN_INVALID"), href);
  }
  assert.equal(inspectRecordDomain("InlineRun", run({ link: { href: "#ok", target: "popup" } })).valid, false);
  const extra = inspectRecordDomain("InlineRun", run({ link: { href: "#ok", target: "_self", vendor: { href: "javascript:opaque()" } } }));
  assert.equal(extra.valid, true);
  assert.ok(extra.diagnostics.some(d => d.path === "/link/vendor" && d.code === "DOMAIN_UNVERIFIED"));
});

test("SizePolicy applies mode requirements and inclusive same-unit bounds", () => {
  for (const value of [{ mode: "hug" }, { mode: "fill", min: dimension(0) }, { mode: "fixed", value: dimension(10), min: dimension(10), max: dimension(10) }, { mode: "fixed", value: dimension(1, "future-unit") }]) {
    const result = inspectRecordDomain("SizePolicy", value);
    assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
    if ("value" in value) assert.ok(result.unverifiedTypes.includes("DimensionUnitSupport"));
    assert.ok(!result.unverifiedTypes.includes("Dimension"));
  }
  for (const value of [{ mode: "fixed" }, { mode: "hug", value: dimension(1) }, { mode: "fill", value: dimension(1) }, { mode: "fixed", value: dimension(-1) }, { mode: "fixed", value: dimension(1, "") }, { mode: "fixed", value: { value: "1", unit: "px" } }, { mode: "hug", min: dimension(11), max: dimension(10) }, { mode: "fill", min: dimension(1), max: dimension(2, "em") }, { mode: "fixed", value: dimension(1), min: dimension(2) }, { mode: "fixed", value: dimension(3), max: dimension(2) }, { mode: "fixed", value: dimension(2, "em"), min: dimension(1) }]) {
    const result = inspectRecordDomain("SizePolicy", value);
    assert.equal(result.valid, false, JSON.stringify(value));
    assert.ok(result.diagnostics.some(d => d.code === "DOMAIN_INVALID"));
  }
  assert.equal(inspectRecordDomain("SizePolicy", { mode: "fixed", value: dimension(1, " ") }).valid, true, "Only nonempty unit identity is declared; target support remains unverified");
});

test("FreePosition signed coordinates remain opaque without claiming layout conformance", () => {
  const result = inspectRecordDomain("FreePosition", { relativeTo: "parent-content-box", x: dimension(-10), y: { future: true }, anchors: {} });
  assert.equal(result.valid, true);
  assert.ok(result.unverifiedTypes.includes("Dimension"));
});

test("Variant and optional Theme defaults must belong to their declared choices", () => {
  const variant = { id: "axis.size", name: "Size", options: ["small", "large"], default: "small" };
  assert.equal(inspectRecordDomain("VariantAxis", variant).valid, true);
  assert.equal(inspectRecordDomain("VariantAxis", { ...variant, default: "medium" }).valid, false);
  const theme = { id: "axis.theme", contexts: ["light", "dark"], scope: ref };
  assert.equal(inspectRecordDomain("ThemeAxis", theme).valid, true);
  assert.equal(inspectRecordDomain("ThemeAxis", { ...theme, default: "dark" }).valid, true);
  const invalid = inspectRecordDomain("ThemeAxis", { ...theme, default: "contrast" });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.diagnostics.some(d => d.path === "/default" && d.code === "DOMAIN_INVALID"));
});

test("Slot bounds permit instance-supplied required content without definition defaults", () => {
  const slot = { id: "slot.body", ownerPartRef: "part.root", contentKinds: ["component"], min: 1, max: 1, defaultContent: [], allowedContractRefs: [] };
  assert.equal(inspectRecordDomain("Slot", slot).valid, true);
  assert.equal(inspectRecordDomain("Slot", { ...slot, max: "unbounded" }).valid, true);
  const invalid = inspectRecordDomain("Slot", { ...slot, max: 0 });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.diagnostics.some(d => d.path === "/min" && d.code === "DOMAIN_INVALID"));
});
