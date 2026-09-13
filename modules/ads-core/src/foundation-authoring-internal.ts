import { canonicalJson } from "./canonical-json.ts";
import { isObject, isValidId } from "./documents.ts";
import { MAX_BATCH_BYTES } from "./constants.ts";
import type { JsonObject, JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { FoundationDocument } from "./foundation-contracts.ts";
import type { FoundationReference } from "./foundation-authoring-contracts.ts";

export const authoringList = (value: unknown): JsonObject[] => Array.isArray(value) ? value.filter(isObject) : [];
export const authoringPointer = (key: string): string => key.replaceAll("~", "~0").replaceAll("/", "~1");
export function put(object: object, key: string, value: unknown): void { Object.defineProperty(object, key, { value, enumerable: true, configurable: true, writable: true }); }
export function captureAuthoringProject(input: ProjectSnapshot): ProjectSnapshot {
  const project: unknown = JSON.parse(canonicalJson(input, MAX_BATCH_BYTES));
  if (!isObject(project) || !isValidId(project.id) || !isValidId(project.revision) || typeof project.name !== "string" || !project.name.trim() || !isObject(project.documents)) throw new Error("Invalid project header.");
  for (const [id, entry] of Object.entries(project.documents)) if (!isValidId(id) || !isObject(entry) || !isObject(entry.document) || entry.document.id !== id || typeof entry.originalText !== "string" || typeof entry.sourceUri !== "string") throw new Error("Invalid project document entry.");
  return project as unknown as ProjectSnapshot;
}
export function authoringFoundation(project: ProjectSnapshot): FoundationDocument {
  const documents = Object.values(project.documents).filter(entry => entry.document.kind === "foundation");
  if (documents.length !== 1) throw new Error("Exactly one Foundation is required for authoring.");
  return documents[0]!.document as FoundationDocument;
}

interface MutableReference { reference: FoundationReference; replace(id: string): void }
/** Enumerate executable reference locations only; opaque metadata is never scanned. */
export function foundationReferences(project: ProjectSnapshot, foundation: FoundationDocument): MutableReference[] {
  const found: MutableReference[] = [];
  const alias = (value: unknown, reference: Omit<FoundationReference, "tokenId">): void => {
    if (!isObject(value) || !isObject(value.ref) || value.ref.expectedKind !== "token" || typeof value.ref.id !== "string") return;
    const target = value.ref;
    found.push({ reference: { ...reference, tokenId: target.id as string }, replace: id => { target.id = id; } });
  };
  foundation.tokens.forEach((token, index) => alias(token.value, { kind: "alias", documentId: foundation.id, ownerTokenId: token.id, path: `/tokens/${index}/value/ref` }));
  foundation.themeAxes.forEach((axis, index) => {
    for (const [context, values] of Object.entries(axis.overrides ?? {})) for (const [id, value] of Object.entries(values)) {
      const path = `/themeAxes/${index}/overrides/${authoringPointer(context)}/${authoringPointer(id)}`;
      found.push({ reference: { tokenId: id, kind: "theme-override", documentId: foundation.id, ownerTokenId: id, axisId: axis.id, context, path }, replace: () => { throw new Error("An owned override must be removed with its token, not retargeted."); } });
      alias(value, { kind: "theme-alias", documentId: foundation.id, ownerTokenId: id, axisId: axis.id, context, path: `${path}/ref` });
    }
  });
  for (const { document } of Object.values(project.documents)) {
    if (document.kind === "component") {
      authoringList(document.motion).forEach((track, index) => {
        const collect = (value: JsonValue | undefined, path: string) => {
          if (!isObject(value) || typeof value.tokenRef !== "string") return;
          found.push({ reference: { tokenId: value.tokenRef, documentId: document.id, componentId: document.id, partId: String(track.targetPartRef), kind: "motion", path }, replace: id => { value.tokenRef = id; } });
        };
        collect(track.delay, `/motion/${index}/delay`);
        if (isObject(track.timing)) { collect(track.timing.duration, `/motion/${index}/timing/duration`); collect(track.timing.easing, `/motion/${index}/timing/easing`); }
      });
    }
    if (document.kind !== "design" || !isObject(document.foundationRef) || document.foundationRef.id !== foundation.id) continue;
    const componentId = isObject(document.componentRef) && typeof document.componentRef.id === "string" ? document.componentRef.id : undefined;
    const binding = (value: JsonValue | undefined, path: string, partId: JsonValue | undefined): void => {
      if (!isObject(value) || typeof value.tokenRef !== "string") return;
      found.push({ reference: { tokenId: value.tokenRef, documentId: document.id, kind: "design", path, ...(componentId ? { componentId } : {}), ...(typeof partId === "string" ? { partId } : {}) }, replace: id => { value.tokenRef = id; } });
    };
    authoringList(document.appearance).forEach((rule, index) => { if (isObject(rule.declarations)) for (const [key, value] of Object.entries(rule.declarations)) binding(value, `/appearance/${index}/declarations/${authoringPointer(key)}`, rule.targetPartRef); });
    authoringList(document.layout).forEach((rule, index) => { for (const key of ["gap", "padding", "minHeight"]) binding(rule[key], `/layout/${index}/${key}`, rule.targetPartRef); });
  }
  return found;
}
