import type { FoundationAuthoringProjection, FoundationTokenRow } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { copy } from "./ui.tsx";
import { specimenSummary, TokenVisual } from "./token-visual.tsx";
import { Icon } from "./icons.tsx";

export function TokenAtlas({ tokens, model, locale, tokenId, selected, onSelect, onCheck }: { tokens: FoundationTokenRow[]; model: FoundationAuthoringProjection; locale: Locale; tokenId: string | null; selected: string[]; onSelect(id: string): void; onCheck(id: string, checked: boolean): void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const groups = new Map<string, { title: string; domain: string; tier: string; tokens: FoundationTokenRow[] }>();
  const familyOf = (token: FoundationTokenRow) => token.name.split(".").slice(0, -1).join(".");
  const familyCounts = new Map<string, number>();
  for (const token of tokens) { const key = `${token.domain}/${token.tier}/${token.typeRef.id}/${familyOf(token)}`; familyCounts.set(key, (familyCounts.get(key) ?? 0) + 1); }
  for (const token of tokens) {
    const domain = model.domains.find(item => item.id === token.domain)?.name ?? "", tier = model.tiers.find(item => item.id === token.tier)?.name ?? t("미분류", "Unassigned");
    const family = (familyCounts.get(`${token.domain}/${token.tier}/${token.typeRef.id}/${familyOf(token)}`) ?? 0) >= 3 ? familyOf(token) : "";
    const key = `${token.domain ?? ""}/${token.tier ?? ""}/${token.typeRef.id}/${family}`;
    const group = groups.get(key) ?? { title: family || domain || token.typeRef.id, domain, tier, tokens: [] }; group.tokens.push(token); groups.set(key, group);
  }
  return <div className="token-atlas" data-testid="token-atlas">{[...groups].sort((a, b) => Number(b[1].tier.toLowerCase() === "primitive") - Number(a[1].tier.toLowerCase() === "primitive")).map(([key, group]) => <section className="material-group" key={key}><header><h3>{group.title}</h3><span>{group.tier} <span aria-hidden="true">·</span> {group.tokens.length}</span></header><div className={`material-grid material-${group.tokens[0]!.typeRef.id}`}>{group.tokens.map(token => <article key={token.id} className={`material-token ${tokenId === token.id ? "selected" : ""}`} data-testid={`foundation-row-${token.id}`}><button type="button" className="material-select" aria-pressed={tokenId === token.id} onClick={() => onSelect(token.id)}><TokenVisual type={token.typeRef.id} value={token.resolvedValue} domain={group.domain} locale={locale} name={token.name} /><span className="material-name">{group.title === familyOf(token) ? token.name.split(".").at(-1) : token.name}</span><span className="material-value" title={specimenSummary(token.typeRef.id, token.resolvedValue, locale)}>{specimenSummary(token.typeRef.id, token.resolvedValue, locale)}</span><span className="sr-only">{token.name}</span></button><div className="material-meta"><label title={t("일괄 편집 선택", "Select for bulk editing")}><input type="checkbox" aria-label={t(`${token.name} 선택`, `Select ${token.name}`)} checked={selected.includes(token.id)} onChange={event => onCheck(token.id, event.target.checked)} /></label>{token.aliasTarget ? <span className="material-alias" title={model.tokens.find(item => item.id === token.aliasTarget)?.name ?? token.aliasTarget}><Icon name="link" size={12} />{model.tokens.find(item => item.id === token.aliasTarget)?.name ?? t("참조", "Alias")}</span> : <span>{token.references.length} {t("참조", "uses")}</span>}{token.deprecated !== undefined && token.deprecated !== false && <span className="deprecated-label">{t("중단 예정", "Deprecated")}</span>}</div></article>)}</div></section>)}</div>;
}
