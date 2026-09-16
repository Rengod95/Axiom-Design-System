import { resolveFoundationTokens } from "../../../modules/ads-core/src/index.ts";
import type { AdsDocument, FoundationAuthoringProjection, FoundationDocument, ResolvedFoundationToken, FoundationThemeSet, FoundationValueSet } from "../../../modules/ads-core/src/index.ts";

/** Resolve the edited theme in a detached preview; global editor selection is not an input. */
export function resolveThemeDraft(document: AdsDocument | undefined, theme: FoundationThemeSet) {
  if (!document || !Array.isArray(document.themeSets)) return resolveFoundationTokens(document, { themeSetId: theme.id });
  const source = document as FoundationDocument;
  return resolveFoundationTokens({ ...source, themeSets: [...source.themeSets.filter(item => item.id !== theme.id), theme] }, { themeSetId: theme.id });
}

export function themeOverrideOrigin(trace: ResolvedFoundationToken["overrideTrace"][number], source: Pick<FoundationAuthoringProjection, "valueSets" | "axes">, locale: "ko" | "en"): string {
  if (trace.valueSetId) return `${source.valueSets.find(group => group.id === trace.valueSetId)?.name ?? trace.valueSetId} · ${locale === "ko" ? "값 그룹" : "Value group"}`;
  return `${source.axes.find(axis => axis.id === trace.axisId)?.name ?? trace.axisId} / ${trace.context}`;
}

export interface ValueGroupDraft { name: string; domain: string; copyFrom: string }
/** Compare against the form's editing baseline, not a newly undone or externally changed source. */
export function valueGroupDraftState(draft: ValueGroupDraft, group: Pick<FoundationValueSet, "id" | "name"> | undefined, defaultDomain: string, domainIds: readonly string[]) {
  return {
    dirty: group ? draft.name !== group.name : draft.name !== "" || draft.domain !== defaultDomain || draft.copyFrom !== "",
    valid: Boolean(draft.name.trim()) && (Boolean(group) || domainIds.includes(draft.domain)),
  };
}
