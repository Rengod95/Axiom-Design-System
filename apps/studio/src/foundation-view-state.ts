export interface FoundationViewState {
  tab: "domains" | "tokens" | "themes";
  tier: string;
  domain: string;
  view: "visual" | "list" | "graph";
  tokenId: string | null;
  scroll: Record<string, number>;
}

/** Workspace preferences never become token meaning or project source. */
export function readFoundationView(projectId: string | undefined): Partial<FoundationViewState> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`axiom.foundation.view.${projectId}`) ?? "null");
    if (!value || typeof value !== "object") return {};
    const input = value as Record<string, unknown>;
    return {
      ...(["domains", "tokens", "themes"].includes(String(input.tab)) ? { tab: input.tab as FoundationViewState["tab"] } : {}),
      ...(typeof input.tier === "string" ? { tier: input.tier } : {}),
      ...(typeof input.domain === "string" ? { domain: input.domain } : {}),
      ...(["visual", "list", "graph"].includes(String(input.view)) ? { view: input.view as FoundationViewState["view"] } : {}),
      ...(typeof input.tokenId === "string" ? { tokenId: input.tokenId } : {}),
      scroll: input.scroll && typeof input.scroll === "object" ? Object.fromEntries(Object.entries(input.scroll).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0)) : {},
    };
  } catch { return {}; }
}

export function writeFoundationView(projectId: string, value: FoundationViewState): void {
  try { localStorage.setItem(`axiom.foundation.view.${projectId}`, JSON.stringify(value)); } catch { /* Source editing works without preference storage. */ }
}
