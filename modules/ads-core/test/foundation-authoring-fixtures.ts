import { createStudioStarter, canonicalJson, STUDIO_PROFILE } from "../src/index.ts";
import type { AdsDocument, FoundationAuthoringEdit, FoundationDocument, FoundationEditPlan, FoundationSelection, ProjectSnapshot } from "../src/index.ts";
import { planFoundationEdit } from "../src/index.ts";

export function authoringFixture(allDocuments = false) {
  let sequence = 0;
  const createId = () => `authoring.generated.${++sequence}`;
  const starter = createStudioStarter("project.authoring");
  const project: ProjectSnapshot = { id: "project.authoring", name: "Authoring", revision: "project.r1", documents: {} };
  for (const document of allDocuments ? starter : starter.filter(item => item.kind === "foundation")) project.documents[document.id] = {
    document, originalText: `${JSON.stringify(document, null, 2)}\n`, sourceUri: `memory:original/${document.id}`, validation: "envelope-only", diagnostics: [], validationProfile: STUDIO_PROFILE,
  };
  const plan = (input: ProjectSnapshot, edit: FoundationAuthoringEdit | FoundationAuthoringEdit[], selection: FoundationSelection = {}): FoundationEditPlan => planFoundationEdit(input, edit, createId, selection);
  return { project, plan, createId };
}
export function source(project: ProjectSnapshot): FoundationDocument { return Object.values(project.documents).find(entry => entry.document.kind === "foundation")!.document as FoundationDocument; }
export function reviseFixture(project: ProjectSnapshot, document: AdsDocument): void {
  project.documents[document.id] = { ...project.documents[document.id]!, document, currentText: canonicalJson(document) };
}
export const brief = (plan: { diagnostics: unknown }): string => JSON.stringify(plan.diagnostics);
