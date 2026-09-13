import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { encodeKernelState, decodeKernelState } from "../src/kernel-state-codec.ts";
import { canonicalJson } from "../src/canonical-json.ts";
import { KernelError } from "../src/kernel-error.ts";
import { CommandService } from "../src/command-service.ts";
import { MemoryStore } from "../src/memory-store.ts";
import { DOMAIN_PROFILE, KERNEL_FORMAT_VERSION, MAX_CANONICAL_DEPTH, PROTOCOL_VERSION, STRUCTURAL_PROFILE } from "../src/constants.ts";
import type { CommandEnvelope, CommandResult, JsonObject, KernelState } from "../src/contracts.ts";

const digest = (text: string): string => createHash("sha256").update(text).digest("hex");
const HASH = "a".repeat(64);
const OWNER = { id: "owner", scopes: ["project.read", "project.write", "review.apply"] };
const empty = (): KernelState => ({ formatVersion: KERNEL_FORMAT_VERSION, project: null, candidates: [], receipts: [], undo: [], redo: [], history: [] });
function fixture(): KernelState {
  const document = { id: "text.one", kind: "text", schemaVersion: "future-unverified", revision: "source-r1", name: "Text", blocks: "legacy body remains opaque", metadata: { vendor: [1, null, "😀"] } };
  const entry = { document, originalText: "{malformed original\r\n", sourceUri: "memory:original", currentText: JSON.stringify(document), currentSourceUri: "memory:repair", validation: "envelope-only" as const, diagnostics: [], validationProfile: DOMAIN_PROFILE };
  const documents = { "text.one": entry };
  const result: CommandResult = { status: "reviewRequired", revision: "r1", diagnostics: [], affectedRefs: ["text.one"], diff: [{ id: "text.one", change: "updated", fields: [{ path: "/blocks", before: null, after: [] }] }], candidateId: "candidate.one", patchDigest: HASH, draftRefs: ["draft.one"], originalHashes: [HASH] };
  return {
    formatVersion: KERNEL_FORMAT_VERSION, project: { id: "project", name: "Project", revision: "r1", documents },
    candidates: [{ id: "candidate.one", projectId: "project", baseRevision: "r1", digest: HASH, actorId: "owner", documents, diff: result.diff, diagnostics: [], status: "approved", approval: { principalId: "owner", token: "approval.one", digest: HASH, baseRevision: "r1" } }],
    receipts: [{ projectId: "project", principalId: "owner", key: "receipt.one", requestDigest: HASH, result }],
    undo: [{ handle: "undo.one", actorId: "owner", applicableRevision: "r1", before: {}, after: documents }],
    redo: [{ handle: "redo.one", actorId: "owner", applicableRevision: "r1", before: documents, after: {} }],
    history: [{ revision: "r1", parentRevision: null, actorId: "owner", operation: "document.import", transactionId: "tx.one", affectedRefs: ["text.one"] }],
    drafts: [{ id: "draft.one", projectId: "project", actorId: "owner", sourceUri: "memory:empty", originalText: "", sourceDigest: HASH, diagnostics: [{ code: "JSON_INVALID", phase: "parse", severity: "error", message: "Incomplete source", path: "" }], validation: "invalid", validationProfile: STRUCTURAL_PROFILE }],
  };
}
const typedError = (code: string, path?: string) => (error: unknown): boolean => error instanceof KernelError && error.code === code && (path === undefined || error.location.path === path);

test("canonical state preserves all kernel records, raw originals and both policies without certifying body semantics", () => {
  const state = fixture();
  const encoded = encodeKernelState(state);
  assert.equal(encoded, canonicalJson(state));
  const decoded = decodeKernelState(encoded);
  assert.deepEqual(decoded, state);
  assert.equal(decoded.project!.documents["text.one"]!.document.blocks, "legacy body remains opaque");
  assert.equal(decoded.project!.documents["text.one"]!.originalText, "{malformed original\r\n");
  assert.equal(decoded.project!.documents["text.one"]!.validationProfile, DOMAIN_PROFILE);
  assert.equal(decoded.drafts![0]!.validationProfile, STRUCTURAL_PROFILE);
  decoded.receipts[0]!.result.affectedRefs.push("changed");
  assert.deepEqual(decodeKernelState(encoded).receipts[0]!.result.affectedRefs, ["text.one"]);
  const legacy = fixture();
  delete legacy.drafts;
  delete legacy.project!.documents["text.one"]!.validationProfile;
  assert.deepEqual(decodeKernelState(encodeKernelState(legacy)), legacy);
  assert.deepEqual(decodeKernelState(encodeKernelState(empty())), empty());
});

test("each known record family rejects malformed fields with a precise state path", () => {
  const cases: [string[], unknown][] = [
    [["formatVersion"], "future"], [["project"], {}], [["project", "documents"], []],
    [["project", "documents", "text.one", "document", "id"], "wrong-map-key"],
    [["project", "documents", "text.one", "document", "revision"], 1],
    [["project", "documents", "text.one", "originalText"], null],
    [["project", "documents", "text.one", "currentText"], 42],
    [["project", "documents", "text.one", "validationProfile"], "future-profile"],
    [["candidates"], {}], [["candidates", "0", "documents"], []], [["candidates", "0", "digest"], "bad"],
    [["candidates", "0", "approval", "token"], false], [["candidates", "0", "status"], "queued"],
    [["receipts", "0", "result"], {}], [["receipts", "0", "result", "affectedRefs"], [1]],
    [["receipts", "0", "result", "diff", "0", "change"], "moved"], [["receipts", "0", "result", "diff", "0", "fields", "0", "path"], null],
    [["receipts", "0", "result", "originalHashes"], ["bad"]], [["receipts", "0", "requestDigest"], "sha256:bad"],
    [["undo", "0", "before"], []], [["redo", "0", "applicableRevision"], null],
    [["history", "0", "parentRevision"], 4], [["history", "0", "affectedRefs"], {}],
    [["drafts", "0", "sourceDigest"], "A".repeat(64)], [["drafts", "0", "validationProfile"], "future"],
    [["drafts", "0", "diagnostics", "0", "phase"], "random"], [["drafts", "0", "validation"], "valid"],
  ];
  for (const [keys, value] of cases) {
    const state = structuredClone(fixture()) as unknown as Record<string, unknown>;
    let parent = state;
    for (const key of keys.slice(0, -1)) parent = parent[key] as Record<string, unknown>;
    parent[keys.at(-1)!] = value;
    assert.throws(() => encodeKernelState(state), typedError("STATE_INVALID"), keys.join("/"));
    assert.throws(() => decodeKernelState(canonicalJson(state)), typedError("STATE_INVALID"), keys.join("/"));
  }
  assert.throws(() => encodeKernelState({ ...empty(), formatVersion: "future" }), typedError("STATE_INVALID", "/formatVersion"));
  for (const key of ["project", "candidates", "receipts", "undo", "redo", "history"]) {
    const state = { ...empty() } as Record<string, unknown>; delete state[key];
    assert.throws(() => encodeKernelState(state), typedError("STATE_INVALID"), key);
  }
});

test("decode rejects duplicate, noncanonical, lossy numeric and malformed committed text", () => {
  const encoded = encodeKernelState(empty());
  const extended = canonicalJson({ ...empty(), futureData: { value: 1 } });
  const invalid = [
    " " + encoded, encoded + "\n", JSON.stringify(empty()), "{", "null", "[]",
    encoded.replace('"project":null', '"project":null,"project":null'),
    extended.replace('"value":1', '"value":1.0'), extended.replace('"value":1', '"value":1e0'),
    extended.replace('"value":1', '"value":9007199254740993'), extended.replace('"value":1', '"value":-0'),
    encoded.replace('"formatVersion"', '"\\u0066ormatVersion"'),
  ];
  for (const text of invalid) assert.throws(() => decodeKernelState(text), typedError("STATE_INVALID"), text.slice(0, 80));
  assert.throws(() => decodeKernelState(extended.replace('"value":1', '"value":1e999')), typedError("JSON_NUMBER"));
  assert.throws(() => decodeKernelState(42 as unknown as string), typedError("STATE_INVALID"));
});

test("optional policies are checked independently in candidate and Undo snapshots", () => {
  for (const keys of [
    ["candidates", "0", "documents", "text.one"], ["undo", "0", "after", "text.one"], ["redo", "0", "before", "text.one"],
  ]) {
    // Parse splits shared fixture references so each location is independently tested.
    const state = JSON.parse(canonicalJson(fixture())) as Record<string, unknown>;
    let entry = state;
    for (const key of keys) entry = entry[key] as Record<string, unknown>;
    entry.validationProfile = "unknown-policy";
    const path = "/" + keys.join("/") + "/validationProfile";
    assert.throws(() => encodeKernelState(state), typedError("STATE_INVALID", path));
    assert.throws(() => decodeKernelState(canonicalJson(state)), typedError("STATE_INVALID", path));
  }
  const state = fixture();
  let nested: unknown = null;
  // Seven wrappers lead from state through candidate/document/extensions to data.
  for (let index = 0; index < MAX_CANONICAL_DEPTH - 7; index++) nested = { child: nested };
  state.candidates[0]!.documents["text.one"]!.document.extensions = { data: nested } as JsonObject;
  assert.deepEqual(decodeKernelState(encodeKernelState(state)), state);
  state.candidates[0]!.documents["text.one"]!.document.extensions = { data: { child: nested } } as JsonObject;
  assert.throws(() => encodeKernelState(state), typedError("JSON_LIMIT"));
});

test("only descriptor snapshots are inspected and own prototype-like keys remain data", () => {
  let executed = 0;
  const state = fixture();
  const proxy = new Proxy(state, { get() { executed++; throw new Error("Untrusted get"); } });
  assert.equal(encodeKernelState(proxy), canonicalJson(state));
  assert.equal(executed, 0);
  const accessor = Object.defineProperty({ ...empty() }, "project", { enumerable: true, get() { executed++; return null; } });
  assert.throws(() => encodeKernelState(accessor), typedError("JSON_INVALID"));
  const custom = Object.create({ toJSON() { executed++; return empty(); } });
  assert.throws(() => encodeKernelState(custom), typedError("JSON_INVALID"));
  class CustomArray extends Array { toJSON() { executed++; return []; } }
  assert.throws(() => encodeKernelState({ ...empty(), history: new CustomArray() }), typedError("JSON_INVALID"));
  assert.equal(executed, 0);
  const data = JSON.parse('{"__proto__":{"polluted":true},"constructor":"data","prototype":false}') as object;
  const preserved = { ...empty(), extra: data };
  assert.deepEqual(decodeKernelState(encodeKernelState(preserved)), preserved);
  assert.equal(Object.hasOwn({}, "polluted"), false);
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  for (const value of [cyclic, { bad: undefined }, { bad: 1n }, { bad: Symbol("data") }, { bad: () => 1 }, [1, , 3]]) {
    assert.throws(() => encodeKernelState({ ...empty(), extra: value }), typedError("JSON_INVALID"));
  }
});

test("internal wrapper depth is allowed and exponential shared data fails before expansion", () => {
  let nested: unknown = null;
  for (let index = 0; index < MAX_CANONICAL_DEPTH - 1; index++) nested = { child: nested };
  const boundary = { ...empty(), extra: nested };
  assert.equal(encodeKernelState(boundary), canonicalJson(boundary));
  assert.deepEqual(decodeKernelState(encodeKernelState(boundary)), boundary);
  const tooDeep = { ...empty(), extra: { child: nested } };
  assert.throws(() => encodeKernelState(tooDeep), typedError("JSON_LIMIT"));
  assert.throws(() => decodeKernelState(JSON.stringify(tooDeep)), typedError("JSON_LIMIT"));
  const child = spawnSync(process.execPath, ["--max-old-space-size=48", "--input-type=module", "-e", `
    import { encodeKernelState } from ${JSON.stringify(new URL("../src/kernel-state-codec.ts", import.meta.url).href)};
    let extra={}; for(let index=0;index<32;index++) extra={a:extra,b:extra};
    try { encodeKernelState({formatVersion:'0.1.0',project:null,candidates:[],receipts:[],undo:[],redo:[],history:[],extra}); process.exit(2); }
    catch(error) { if(error.code!=='JSON_LIMIT') throw error; }
  `], { encoding: "utf8", timeout: 10_000 });
  assert.equal(child.status, 0, child.stderr);
});

test("actual command candidates, receipt replay, domain sources and Undo/redo survive codec persistence", async () => {
  let nextId = 0;
  const services = { createId: () => `id-${++nextId}`, digest };
  const memory = new MemoryStore();
  const store = {
    read: async () => { const state = await memory.read(); return state === null ? null : decodeKernelState(encodeKernelState(state)); },
    transact: async <T>(update: (state: KernelState | null) => { state: KernelState; value: T; changed: boolean }): Promise<T> => memory.transact(state => {
      const result = update(state === null ? null : decodeKernelState(encodeKernelState(state)));
      return { ...result, state: decodeKernelState(encodeKernelState(result.state)) };
    }),
  };
  const service = new CommandService(store, services);
  const current = async () => (await service.getProject(OWNER))?.revision ?? null;
  const command = async (operation: string, payload: JsonObject): Promise<CommandEnvelope> => {
    const id = `request-${++nextId}`;
    return { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: OWNER.id, projectId: "project", baseRevision: await current(), operation, payload, idempotencyKey: id, origin: "GUI", transactionId: id, requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
  };
  const execute = async (operation: string, payload: JsonObject) => service.execute(await command(operation, payload), OWNER);
  assert.equal((await execute("project.create", { name: "Codec workflow" })).status, "accepted");
  const captured = await execute("document.import", { sourceRefs: [{ uri: "memory:broken", content: "{broken" }], formatProfile: "ads-domain", importMode: "draft" });
  const document = { id: "text.one", kind: "text", schemaVersion: "future", revision: "source-r1", name: "Text", blocks: [], localeHints: {} };
  const candidate = await execute("document.import", { sourceRefs: [{ uri: "memory:repaired", content: JSON.stringify(document), draftId: captured.draftRefs![0]! }], formatProfile: "ads-envelope", importMode: "review" });
  assert.equal(candidate.status, "reviewRequired");
  const approved = await execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
  const apply = await command("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: (await current())! });
  const applied = await service.execute(apply, OWNER);
  assert.equal(applied.status, "accepted");
  const reopened = new CommandService(store, services);
  assert.deepEqual(await reopened.execute(apply, OWNER), applied);
  const saved = (await reopened.getDocument("text.one", OWNER))!;
  assert.equal(saved.originalText, "{broken");
  assert.equal(saved.validationProfile, DOMAIN_PROFILE);
  const undone = await execute("transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: (await current())! });
  assert.equal(undone.status, "accepted");
  assert.equal(await service.getDocument("text.one", OWNER), null);
  const redone = await execute("transaction.redo", { redoHandle: undone.redoHandle!, expectedRevision: (await current())! });
  assert.equal(redone.status, "accepted");
  assert.deepEqual(await service.getDocument("text.one", OWNER), saved);
  assert.deepEqual(await new CommandService(store, services).execute(apply, OWNER), applied);
});
