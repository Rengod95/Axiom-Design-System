import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, CommandService, IMPORT_LIMITS, MemoryStore, PROTOCOL_VERSION } from "../src/index.ts";
import type { CommandEnvelope, CommandResult, JsonObject, KernelState, Principal } from "../src/index.ts";

const OWNER: Principal = { id: "author", scopes: ["project.read", "project.write", "review.apply"] };
const OTHER: Principal = { id: "other", scopes: OWNER.scopes };
const digest = (text: string): string => createHash("sha256").update(text).digest("hex");
const document = (id = "card", fields: JsonObject = {}): string => JSON.stringify({ id, kind: "component", schemaVersion: "1.0.0", revision: "source-r1", name: "Card", ...fields });

async function setup() {
  let identities = 0;
  let commands = 0;
  const store = new MemoryStore();
  const services = { createId: () => `generated-${++identities}`, digest };
  const service = new CommandService(store, services);
  const envelope = (operation: string, payload: JsonObject, revision: string | null, principal = OWNER): CommandEnvelope => {
    const id = `command-${++commands}`;
    return { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: principal.id, projectId: "project", baseRevision: revision, operation, payload, idempotencyKey: id, origin: "GUI", transactionId: id, requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
  };
  await service.execute(envelope("project.create", { name: "Source review" }, null), OWNER);
  const current = async (): Promise<string> => (await service.getProject(OWNER))!.revision;
  const importSources = async (mode: string, sources: JsonObject[], principal = OWNER): Promise<CommandResult> => service.execute(envelope("document.import", { sourceRefs: sources, formatProfile: "ads-envelope", importMode: mode }, await current(), principal), principal);
  const adopt = async (candidate: CommandResult): Promise<CommandResult> => {
    assert.equal(candidate.status, "reviewRequired");
    const revision = await current();
    const reviewed = await service.execute(envelope("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" }, revision), OWNER);
    assert.equal(reviewed.status, "accepted");
    const applied = await service.execute(envelope("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: reviewed.reviewToken!, expectedRevision: revision }, revision), OWNER);
    assert.equal(applied.status, "accepted");
    return applied;
  };
  return { store, services, service, envelope, current, importSources, adopt };
}

test("draft capture preserves malformed, empty, unknown-kind and valid sources atomically and privately", async () => {
  const h = await setup();
  const revision = await h.current();
  const sources = ["", '{"id":', document("future", { kind: "future-kind" }), document("valid")].map((content, index) => ({ uri: `memory:source-${index}`, content }));
  const command = h.envelope("document.import", { sourceRefs: sources, formatProfile: "ads-envelope", importMode: "draft" }, revision);
  const captured = await h.service.execute(command, OWNER);
  assert.equal(captured.status, "accepted");
  assert.equal(captured.revision, revision);
  assert.equal(captured.undoHandle, undefined);
  assert.deepEqual(captured.originalHashes, sources.map((source) => digest(source.content)));
  assert.equal((await h.service.getHistory(OWNER)).length, 1);
  assert.deepEqual(Object.keys((await h.service.getProject(OWNER))!.documents), []);
  const drafts = await h.service.listDrafts(OWNER);
  assert.deepEqual(drafts.map((draft) => draft.validation), ["invalid", "invalid", "invalid", "envelope-only"]);
  assert.deepEqual(drafts.map((draft) => draft.originalText), sources.map((source) => source.content));
  assert.deepEqual(await h.service.listDrafts(OTHER), []);
  assert.equal(await h.service.getDraft(drafts[0]!.id, OTHER), null);
  drafts[0]!.originalText = "caller mutation";
  assert.equal((await h.service.getDraft(drafts[0]!.id, OWNER))!.originalText, "");
  assert.equal((await h.service.getDiagnostics(OTHER)).diagnostics.length, 0);
  assert.ok((await h.service.getDiagnostics(OWNER)).diagnostics.some((entry) => entry.severity === "error"));
  await h.adopt(await h.importSources("review", [{ uri: "memory:adopted", content: document() }]));
  const beforeReplay = await h.store.read();
  assert.deepEqual(await h.service.execute(command, OWNER), captured);
  assert.deepEqual(await h.store.read(), beforeReplay);
  const restarted = new CommandService(new MemoryStore(beforeReplay), h.services);
  assert.deepEqual(await restarted.listDrafts(OWNER), await h.service.listDrafts(OWNER));
});

test("draft byte, count and transport failures leave no capture, candidate or receipt", async () => {
  const h = await setup();
  const before = await h.store.read();
  const invalidBatches: JsonObject[][] = [
    [], [{ uri: "memory:bad", content: 1 }], [{ uri: "", content: "" }],
    [{ uri: "memory:bad", content: "", draftId: "other" }],
    [{ uri: "memory:bad", content: "x".repeat(IMPORT_LIMITS.maxDocumentBytes + 1) }],
    Array.from({ length: IMPORT_LIMITS.maxDocuments + 1 }, () => ({ uri: "memory:empty", content: "" })),
    Array.from({ length: 9 }, () => ({ uri: "memory:large", content: "x".repeat(950_000) })),
  ];
  for (const sources of invalidBatches) {
    assert.equal((await h.importSources("draft", sources)).status, "rejected");
    assert.deepEqual(await h.store.read(), before);
  }
});

test("a reviewed repair exports the immutable invalid original beside current normalized JSON", async () => {
  const h = await setup();
  const original = '{\r\n  "name": "잘못된 원본",\r\n';
  const captured = await h.importSources("draft", [{ uri: "file:original.json", content: original }]);
  const draftId = captured.draftRefs![0]!;
  const repaired = document("card", { extensions: { vendor: { opaque: "kept" } } });
  const proposed = await h.importSources("review", [{ uri: "file:repair.json", content: repaired, draftId }]);
  assert.equal(await h.service.exportDocument("card", OWNER), null);
  await h.adopt(proposed);
  const entry = (await h.service.getDocument("card", OWNER))!;
  assert.equal(entry.originalText, original);
  assert.equal(entry.sourceUri, "file:original.json");
  assert.equal(entry.currentText, repaired);
  assert.equal(entry.currentSourceUri, "file:repair.json");
  const exported = (await h.service.exportDocument("card", OWNER))!;
  assert.deepEqual(exported.original, { uri: "file:original.json", text: original, digest: digest(original) });
  assert.equal(exported.normalized.text, canonicalJson(JSON.parse(repaired)));
  assert.equal(exported.normalized.digest, digest(exported.normalized.text));
  assert.equal(exported.canonicalProfile, "1.0.0");
  assert.equal(exported.hashAlgorithm, "sha256");
  assert.equal(exported.semantics, "unverified");
  assert.equal((await h.service.getDraft(draftId, OWNER))!.originalText, original);
  await assert.rejects(h.service.exportDocument("card", { id: OWNER.id, scopes: [] }), { code: "SCOPE_REQUIRED" });
});

test("reviewed updates show escaped field paths and preserve first original through restart and undo/redo", async () => {
  const h = await setup();
  const original = document("card", { extensions: { "vendor/key": { "~value": 1, removed: true } } });
  await h.adopt(await h.importSources("review", [{ uri: "file:first.json", content: original }]));
  const edited = document("card", { revision: "source-r2", name: "Changed", extensions: { "vendor/key": { "~value": 2, added: null } } });
  const source = { uri: "file:second.json", content: edited, expectedRevision: "source-r1" };
  const command = h.envelope("document.import", { sourceRefs: [source], formatProfile: "ads-envelope", importMode: "update" }, await h.current());
  const candidate = await h.service.execute(command, OWNER);
  assert.deepEqual(candidate.diff[0]?.fields, [
    { path: "/extensions/vendor~1key/added", after: null },
    { path: "/extensions/vendor~1key/removed", before: true },
    { path: "/extensions/vendor~1key/~0value", before: 1, after: 2 },
    { path: "/name", before: "Card", after: "Changed" },
    { path: "/revision", before: "source-r1", after: "source-r2" },
  ]);
  assert.equal((await h.service.getDocument("card", OWNER))!.currentText, undefined);
  const applied = await h.adopt(candidate);
  assert.deepEqual(await h.service.execute(command, OWNER), candidate);
  const second = document("card", { revision: "source-r3", name: "Third" });
  await h.adopt(await h.importSources("update", [{ uri: "file:third.json", content: second, expectedRevision: "source-r2" }]));
  const entry = (await h.service.getDocument("card", OWNER))!;
  assert.equal(entry.originalText, original);
  assert.equal(entry.sourceUri, "file:first.json");
  assert.equal(entry.currentText, second);
  const restartedStore = new MemoryStore(await h.store.read());
  const restarted = new CommandService(restartedStore, h.services);
  assert.equal((await restarted.exportDocument("card", OWNER))!.original.digest, digest(original));
  const lastUndo = (await restartedStore.read())!.undo.at(-1)!;
  const undo = await restarted.execute(h.envelope("transaction.undo", { undoHandle: lastUndo.handle, expectedRevision: lastUndo.applicableRevision }, lastUndo.applicableRevision), OWNER);
  assert.equal((await restarted.getDocument("card", OWNER))!.currentText, edited);
  assert.equal((await restarted.exportDocument("card", OWNER))!.original.text, original);
  const redo = await restarted.execute(h.envelope("transaction.redo", { redoHandle: undo.redoHandle!, expectedRevision: undo.revision! }, undo.revision!), OWNER);
  assert.equal(redo.status, "accepted");
  assert.equal((await restarted.getDocument("card", OWNER))!.currentText, second);
  assert.notEqual(applied.revision, redo.revision);
});

test("update refuses missing identity, stale or reused source revision, kind changes and unregistered migration atomically", async () => {
  const h = await setup();
  const original = document();
  await h.adopt(await h.importSources("review", [{ uri: "memory:card", content: original }]));
  const before = await h.store.read();
  const cases = [
    { source: { uri: "memory:x", content: document("missing"), expectedRevision: "source-r1" }, code: "DOCUMENT_MISSING" },
    { source: { uri: "memory:x", content: document("card", { revision: "source-r2" }), expectedRevision: "old" }, code: "REVISION_CONFLICT" },
    { source: { uri: "memory:x", content: document("card", { name: "Changed" }), expectedRevision: "source-r1" }, code: "REVISION_CONFLICT" },
    { source: { uri: "memory:x", content: document("card", { revision: "source-r2", kind: "design" }), expectedRevision: "source-r1" }, code: "REFERENCE_KIND" },
    { source: { uri: "memory:x", content: document("card", { revision: "source-r2", schemaVersion: "2.0.0" }), expectedRevision: "source-r1" }, code: "MIGRATION_UNSUPPORTED" },
  ];
  for (const entry of cases) {
    assert.equal((await h.importSources("update", [entry.source])).diagnostics[0]?.code, entry.code);
    assert.deepEqual(await h.store.read(), before);
  }
  const valid = { uri: "memory:valid", content: document("card", { revision: "source-r2" }), expectedRevision: "source-r1" };
  assert.equal((await h.importSources("update", [valid, { uri: "memory:bad", content: "{", expectedRevision: "source-r1" }])).status, "rejected");
  assert.deepEqual(await h.store.read(), before);
  assert.equal((await h.importSources("update", [valid, valid])).diagnostics[0]?.code, "DOCUMENT_EXISTS");
  assert.deepEqual(await h.store.read(), before);
});

test("pinned local references require an atomic matching update of the whole affected source batch", async () => {
  const h = await setup();
  await h.adopt(await h.importSources("review", [
    { uri: "memory:target", content: document("target") },
    { uri: "memory:consumer", content: document("consumer", { ref: { id: "target", expectedKind: "component", revision: "source-r1" } }) },
  ]));
  const target = { uri: "memory:target", content: document("target", { revision: "source-r2" }), expectedRevision: "source-r1" };
  const before = await h.store.read();
  assert.equal((await h.importSources("update", [target])).diagnostics[0]?.code, "REFERENCE_REVISION");
  assert.deepEqual(await h.store.read(), before);
  const consumer = { uri: "memory:consumer", content: document("consumer", { revision: "source-r2", ref: { id: "target", expectedKind: "component", revision: "source-r2" } }), expectedRevision: "source-r1" };
  await h.adopt(await h.importSources("update", [target, consumer]));
  assert.equal((await h.service.getDocument("target", OWNER))!.document.revision, "source-r2");
});

test("draft binding is principal-bound and rejection retains inspection locations", async () => {
  const h = await setup();
  const captured = await h.importSources("draft", [{ uri: "memory:bad", content: "{}" }]);
  const before = await h.store.read();
  const source = { uri: "memory:repair", content: document(), draftId: captured.draftRefs![0]! };
  assert.equal((await h.importSources("review", [source], OTHER)).diagnostics[0]?.code, "DRAFT_MISSING");
  assert.deepEqual(await h.store.read(), before);
  const invalid = await h.importSources("review", [{ uri: "memory:invalid", content: document("card", { metadata: [] }) }]);
  assert.ok(invalid.diagnostics.some((diagnostic) => diagnostic.path === "/metadata"));
  assert.deepEqual(await h.store.read(), before);
});

test("legacy records remain readable while malformed optional source fields are rejected", async () => {
  const h = await setup();
  const legacy = (await h.store.read())!;
  assert.equal(legacy.drafts, undefined);
  assert.deepEqual(await new CommandService(new MemoryStore(legacy), h.services).listDrafts(OWNER), []);
  const invalid = { ...legacy, drafts: [{ id: "draft" }] } as unknown as KernelState;
  await assert.rejects(new CommandService(new MemoryStore(invalid), h.services).listDrafts(OWNER), { code: "STATE_INVALID" });
});

test("formatting, object order and source path changes are reviewed provenance edits without false semantic diffs", async () => {
  const h = await setup();
  const original = document();
  await h.adopt(await h.importSources("review", [{ uri: "memory:first", content: original }]));
  const reordered = JSON.stringify({ name: "Card", revision: "source-r1", schemaVersion: "1.0.0", kind: "component", id: "card" }, null, 2) + "\n";
  const candidate = await h.importSources("update", [{ uri: "memory:moved", content: reordered, expectedRevision: "source-r1" }]);
  assert.deepEqual(candidate.diff, [{ id: "card", change: "updated", fields: [] }]);
  await h.adopt(candidate);
  const entry = (await h.service.getDocument("card", OWNER))!;
  assert.equal(entry.document.revision, "source-r1");
  assert.equal(entry.originalText, original);
  assert.equal(entry.currentSourceUri, "memory:moved");
  assert.equal(entry.currentText, reordered);
});

test("private queries snapshot authenticated identity before awaiting storage", async () => {
  const h = await setup();
  await h.importSources("draft", [{ uri: "memory:other-secret", content: "{private" }], OTHER);
  const mutable = { id: OWNER.id, scopes: [...OWNER.scopes] };
  const drafts = h.service.listDrafts(mutable);
  const diagnostics = h.service.getDiagnostics(mutable);
  mutable.id = OTHER.id;
  assert.deepEqual(await drafts, []);
  assert.deepEqual((await diagnostics).diagnostics, []);
});

test("unrepresentable raw UTF-16 rejects capture while lossy numeric literals remain recoverable drafts", async () => {
  const h = await setup();
  const before = await h.store.read();
  for (const content of ["\ud800", "\udc00", '"raw \ud800"']) {
    assert.equal((await h.importSources("draft", [{ uri: "memory:raw", content }])).diagnostics[0]?.code, "JSON_INVALID");
    assert.deepEqual(await h.store.read(), before);
  }
  const original = '{"id":"card","kind":"component","revision":"source-r1","schemaVersion":"1.0.0","name":"Card","value":9007199254740993}';
  const captured = await h.importSources("draft", [{ uri: "memory:precise", content: original }]);
  assert.equal(captured.status, "accepted");
  assert.equal(captured.diagnostics[0]?.code, "JSON_NUMBER");
  assert.equal((await h.service.getDraft(captured.draftRefs![0]!, OWNER))!.originalText, original);
  assert.equal((await h.importSources("review", [{ uri: "memory:precise", content: original }])).diagnostics[0]?.code, "JSON_NUMBER");
});

test("legacy sources are re-inspected for queries without rewriting adopted data or receipts", async () => {
  const h = await setup();
  const legacy = (await h.store.read())!;
  const originalText = '{"id":"legacy","kind":"component","revision":"source-r1","schemaVersion":"1.0.0","name":"Legacy","value":1e-400}';
  legacy.project!.documents.legacy = { document: JSON.parse(originalText), sourceUri: "memory:legacy", originalText, validation: "envelope-only", diagnostics: [] };
  const store = new MemoryStore(legacy);
  const service = new CommandService(store, h.services);
  assert.equal((await service.getDiagnostics(OWNER)).diagnostics[0]?.code, "JSON_NUMBER");
  const exported = (await service.exportDocument("legacy", OWNER))!;
  assert.equal(exported.diagnostics[0]?.code, "JSON_NUMBER");
  assert.equal(exported.original.text, originalText);
  assert.equal(exported.semantics, "unverified");
  assert.deepEqual(await store.read(), legacy);
});
