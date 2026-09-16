import type { CSSProperties } from "react";
import type { FoundationAuthoringProjection, FoundationTokenRow, FoundationTokenType } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { copy, IconButton } from "./ui.tsx";
import { specimenDimension, specimenSummary, TokenVisual } from "./token-visual.tsx";
import { activeTokenReferences } from "./token-relationships.tsx";

export interface TokenCreationContext { domain?: string; tier?: string; type?: FoundationTokenType; namePrefix?: string; role?: string }
interface Props {
  tokens: FoundationTokenRow[]; model: FoundationAuthoringProjection; locale: Locale; tokenId: string | null;
  selected: string[]; selectionMode: boolean; disabled: boolean;
  onSelect(id: string): void; onCheck(id: string, checked: boolean): void; onCreate(context: TokenCreationContext): void;
}
interface MaterialGroup { title: string; domain: string; purpose: string; tier: string; family: string; tokens: FoundationTokenRow[] }
const familyOf = (name: string) => name.split(".").slice(0, -1).join(".");
const sharedFamily = (tokens: FoundationTokenRow[]) => {
  const parts = familyOf(tokens[0]?.name ?? "").split(".");
  while (parts.length && !tokens.every(token => token.name.startsWith(`${parts.join(".")}.`))) parts.pop();
  return parts.join(".");
};

export function TokenAtlas({ tokens, model, locale, tokenId, selected, selectionMode, disabled, onSelect, onCheck, onCreate }: Props) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const groups = new Map<string, MaterialGroup>();
  for (const token of tokens) {
    const domain = model.domains.find(item => item.id === token.domain), tier = model.tiers.find(item => item.id === token.tier)?.name ?? t("미분류", "Unassigned");
    const purpose = domain?.bindingCategory && domain.bindingCategory !== "unrestricted" ? domain.bindingCategory : domain?.name.toLowerCase() ?? "";
    const family = ["spacing", "sizing"].includes(purpose) && token.typeRef.id === "dimension" ? "" : familyOf(token.name);
    const key = `${token.domain ?? ""}/${token.tier ?? ""}/${token.typeRef.id}/${family}`;
    const group = groups.get(key) ?? { title: family || domain?.name || token.typeRef.id, domain: domain?.name ?? "", purpose, tier, family, tokens: [] };
    group.tokens.push(token); groups.set(key, group);
  }
  const tiers = [...new Set([...groups.values()].map(group => group.tier))].sort((a, b) => Number(b.toLowerCase() === "primitive") - Number(a.toLowerCase() === "primitive"));
  const renderGroup = (group: MaterialGroup, key: string) => {
    const first = group.tokens[0]!, prefix = group.family || sharedFamily(group.tokens);
    const kind = group.purpose === "typography" || ["typography", "fontFamily", "fontWeight"].includes(first.typeRef.id) ? "typography" : first.typeRef.id === "dimension" ? group.purpose === "radius" ? "radius" : "ruler" : ["border", "strokeStyle"].includes(first.typeRef.id) ? "border" : first.typeRef.id;
    const linked = group.tokens.some(token => activeTokenReferences(model, token).length > 0);
    const range = Math.max(1, ...model.tokens.filter(token => token.domain === first.domain && token.typeRef.id === first.typeRef.id).map(token => Math.abs(specimenDimension(token.resolvedValue))));
    const renderToken = (token: FoundationTokenRow, inGraph = false) => {
      const localName = prefix && token.name.startsWith(`${prefix}.`) ? token.name.slice(prefix.length + 1) : token.name;
      const deprecated = token.deprecated !== undefined && token.deprecated !== false;
      const measured = specimenDimension(token.resolvedValue);
      return <article key={token.id} className={`material-token material-token-${token.typeRef.id} ${tokenId === token.id ? "selected" : ""} ${selectionMode ? "selection-mode" : ""} ${inGraph ? "dependency-token" : ""}`} data-testid={`foundation-row-${token.id}`}>
        <button type="button" className="material-select" aria-label={token.name} aria-pressed={tokenId === token.id} onClick={() => onSelect(token.id)}>
          {kind === "ruler" && !inGraph ? <span className="shared-measure-track"><i className={`shared-measure-bar ${measured < 0 ? "negative" : ""}`} style={{ width: `${Math.abs(measured) / range * 100}%` }} /><span className="measure-endpoint" style={{ left: `${Math.abs(measured) / range * 100}%` }} /></span> : <TokenVisual type={token.typeRef.id} value={token.resolvedValue} domain={group.purpose} locale={locale} name={token.name} presentation={!inGraph && kind === "typography" ? "editorial" : kind === "border" ? "line" : kind === "shadow" ? "bare" : "standard"} />}
          <span className="material-caption"><span className="material-name">{localName}</span><span className="material-value" title={specimenSummary(token.typeRef.id, token.resolvedValue, locale)}>{specimenSummary(token.typeRef.id, token.resolvedValue, locale)}</span></span><span className="sr-only">{token.name}</span>
        </button>
        {(selectionMode || deprecated) && <div className="material-meta">{selectionMode && <label title={t("일괄 편집 선택", "Select for bulk editing")}><input type="checkbox" aria-label={t(`${token.name} 선택`, `Select ${token.name}`)} checked={selected.includes(token.id)} onChange={event => onCheck(token.id, event.target.checked)} /></label>}{deprecated && <span className="deprecated-label">{t("중단 예정", "Deprecated")}</span>}</div>}
      </article>;
    };
    return <section className={`material-group atlas-${kind} ${linked ? "atlas-linked" : ""}`} key={key} data-token-tier={group.tier}>
      <header><div className="material-group-heading"><h3>{group.title}</h3><span>{group.tokens.length}</span></div><IconButton icon="plus" className="section-add-token" disabled={disabled} label={t(`${group.title}에 토큰 추가`, `Add token to ${group.title}`)} data-testid={`foundation-add-group-${first.id}`} onClick={() => onCreate({ ...(first.domain ? { domain: first.domain } : {}), ...(first.tier ? { tier: first.tier } : {}), type: first.typeRef.id, ...(first.role ? { role: first.role } : {}), ...(prefix ? { namePrefix: prefix } : {}) })} /></header>
      <>
        {kind === "ruler" && <div className="shared-ruler-heading"><span>{t("하나의 기준선", "Shared baseline")}</span><span>{t("상대 길이 · rem은 16px 기준", "Relative lengths · rem uses a 16px reference")}</span></div>}
        <div className={`material-grid material-${first.typeRef.id} atlas-${kind}-specimens`} style={{ "--specimen-count": Math.min(12, group.tokens.length) } as CSSProperties}>{group.tokens.map(token => renderToken(token))}</div>

      </>
    </section>;
  };
  return <div className="token-atlas blueprint-atlas" data-testid="token-atlas">{tiers.map(tier => <section className={`atlas-tier atlas-tier-${tier.toLowerCase() === "primitive" ? "primitive" : tier.toLowerCase() === "semantic" ? "semantic" : "custom"}`} key={tier}>{[...groups].filter(([, group]) => group.tier === tier).map(([key, group]) => renderGroup(group, key))}</section>)}</div>;
}
