import type { FoundationAuthoringProjection, FoundationTokenRow, FoundationTokenType } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { copy, IconButton } from "./ui.tsx";
import { specimenSummary, TokenVisual } from "./token-visual.tsx";
import { Icon } from "./icons.tsx";

export interface TokenCreationContext { domain?: string; tier?: string; type?: FoundationTokenType; namePrefix?: string }
interface Props {
  tokens: FoundationTokenRow[]; model: FoundationAuthoringProjection; locale: Locale; tokenId: string | null;
  selected: string[]; selectionMode: boolean; disabled: boolean;
  onSelect(id: string): void; onCheck(id: string, checked: boolean): void; onCreate(context: TokenCreationContext): void;
}

export function TokenAtlas({ tokens, model, locale, tokenId, selected, selectionMode, disabled, onSelect, onCheck, onCreate }: Props) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const groups = new Map<string, { title: string; domain: string; tier: string; family: string; tokens: FoundationTokenRow[] }>();
  const familyOf = (name: string) => name.split(".").slice(0, -1).join(".");
  for (const token of tokens) {
    const domain = model.domains.find(item => item.id === token.domain)?.name ?? "", tier = model.tiers.find(item => item.id === token.tier)?.name ?? t("미분류", "Unassigned");
    const family = familyOf(token.name);
    const key = `${token.domain ?? ""}/${token.tier ?? ""}/${token.typeRef.id}/${family}`;
    const group = groups.get(key) ?? { title: family || domain || token.typeRef.id, domain, tier, family, tokens: [] };
    group.tokens.push(token); groups.set(key, group);
  }
  return <div className="token-atlas" data-testid="token-atlas">{[...groups].sort((a, b) => Number(b[1].tier.toLowerCase() === "primitive") - Number(a[1].tier.toLowerCase() === "primitive")).map(([key, group]) => {
    const first = group.tokens[0]!;
    return <section className="material-group" key={key}>
      <header><div className="material-group-heading"><h3>{group.title}</h3><span>{group.tier} <span aria-hidden="true">·</span> {group.tokens.length}</span></div><IconButton icon="plus" className="section-add-token" disabled={disabled} label={t(`${group.title}에 토큰 추가`, `Add token to ${group.title}`)} data-testid={`foundation-add-group-${first.id}`} onClick={() => onCreate({ ...(first.domain ? { domain: first.domain } : {}), ...(first.tier ? { tier: first.tier } : {}), type: first.typeRef.id, ...(group.family ? { namePrefix: group.family } : {}) })} /></header>
      <div className={`material-grid material-${first.typeRef.id}`}>{group.tokens.map(token => {
        const aliasName = model.tokens.find(item => item.id === token.aliasTarget)?.name;
        const aliasLabel = aliasName && group.family && familyOf(aliasName) === group.family ? aliasName.slice(group.family.length + 1) : aliasName;
        const deprecated = token.deprecated !== undefined && token.deprecated !== false;
        return <article key={token.id} className={`material-token material-token-${token.typeRef.id} ${tokenId === token.id ? "selected" : ""} ${selectionMode ? "selection-mode" : ""}`} data-testid={`foundation-row-${token.id}`}>
          <button type="button" className="material-select" aria-label={token.name} aria-pressed={tokenId === token.id} onClick={() => onSelect(token.id)}><TokenVisual type={token.typeRef.id} value={token.resolvedValue} domain={group.domain} locale={locale} name={token.name} /><span className="material-name">{group.family ? token.name.slice(group.family.length + 1) : token.name}</span><span className="material-value" title={specimenSummary(token.typeRef.id, token.resolvedValue, locale)}>{specimenSummary(token.typeRef.id, token.resolvedValue, locale)}</span><span className="sr-only">{token.name}</span></button>
          {(selectionMode || token.aliasTarget || deprecated) && <div className="material-meta">{selectionMode && <label title={t("일괄 편집 선택", "Select for bulk editing")}><input type="checkbox" aria-label={t(`${token.name} 선택`, `Select ${token.name}`)} checked={selected.includes(token.id)} onChange={event => onCheck(token.id, event.target.checked)} /></label>}{token.aliasTarget && <span className="material-alias" title={aliasName ?? token.aliasTarget}><Icon name="link" size={12} />{aliasLabel ?? t("참조", "Alias")}</span>}{deprecated && <span className="deprecated-label">{t("중단 예정", "Deprecated")}</span>}</div>}
        </article>;
      })}</div>
    </section>;
  })}</div>;
}
