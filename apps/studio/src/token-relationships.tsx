import { foundationValueReferences } from "../../../modules/ads-core/src/index.ts";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { FoundationAuthoringProjection, FoundationTokenRow, ProjectSnapshot, StudioCategory, StudioComponent, StudioUsage } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Button, Field, copy } from "./ui.tsx";
import { tokenValueSummary, tokenSwatch } from "./token-value-editor.tsx";
import { Icon } from "./icons.tsx";
import { object } from "./ui-utils.ts";
import { specimenColor, specimenSummary } from "./token-visual.tsx";

/** The graph follows the selected theme's value expression, including property/composite references. */
export function activeTokenReferences(model: FoundationAuthoringProjection, token: FoundationTokenRow) {
  let value = token.value;
  for (const axisId of model.resolutionOrder) {
    const axis = model.axes.find(item => item.id === axisId), context = model.contexts[axisId];
    const overrides = context === undefined ? undefined : axis?.overrides?.[context];
    if (overrides && Object.hasOwn(overrides, token.id)) value = overrides[token.id]!;
  }
  return foundationValueReferences(value);
}

export function TokenDependencyMap({ tokens, model, locale, onSelect, renderToken }: { tokens: FoundationTokenRow[]; model: FoundationAuthoringProjection; locale: Locale; onSelect(id: string): void; renderToken(token: FoundationTokenRow): ReactNode }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const edges = tokens.flatMap(token => activeTokenReferences(model, token).map(reference => ({ source: reference.ref.id, target: token.id, path: reference.ref.path })));
  const sourceIds = [...new Set(edges.map(edge => edge.source))];
  const height = Math.max(sourceIds.length, tokens.length) * 64;
  return <div className="token-dependency-map" data-testid="token-dependency-map"><div className="dependency-column-labels"><span>{t("참조하는 값", "Referenced values")}</span><span>{t("이 값으로 만드는 역할", "Roles built from these values")}</span></div><div className="dependency-map-stage" style={{ height }}>
    <svg className="dependency-map-edges" viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden="true">{edges.map((edge, index) => {
      const y1 = sourceIds.indexOf(edge.source) * 64 + 28, y2 = tokens.findIndex(token => token.id === edge.target) * 64 + 28;
      const d = `M 420 ${y1} C 488 ${y1} 512 ${y2} 580 ${y2}`;
      return <g key={`${edge.source}/${edge.target}/${index}`} data-source-token={edge.source} data-target-token={edge.target}><title>{`${model.tokens.find(token => token.id === edge.source)?.name ?? edge.source}${edge.path ?? ""} → ${model.tokens.find(token => token.id === edge.target)?.name ?? edge.target}`}</title><path className="dependency-edge" d={d} vectorEffect="non-scaling-stroke" /><path className="dependency-edge-flow" d={d} pathLength="100" vectorEffect="non-scaling-stroke" style={{ animationDelay: `${index % 7 * -.37}s` }} /><circle cx="420" cy={y1} r="2" /><circle cx="580" cy={y2} r="2" /></g>;
    })}</svg>
    {sourceIds.map((id, index) => { const token = model.tokens.find(item => item.id === id); return <button type="button" className="dependency-source" style={{ top: index * 64 }} key={id} disabled={!token} onClick={() => onSelect(id)} aria-label={token?.name ?? id} title={token?.name ?? id}>{token?.typeRef.id === "color" ? <i style={{ background: specimenColor(token.resolvedValue) }} /> : <Icon name="token" size={15} />}<span><strong>{token?.name ?? id}</strong><small>{token ? specimenSummary(token.typeRef.id, token.resolvedValue, locale) : t("참조 대상 없음", "Missing reference")}</small></span><span className="dependency-source-tier">{model.tiers.find(tier => tier.id === token?.tier)?.name}</span></button>; })}
    {tokens.map((token, index) => <div className="dependency-target" style={{ top: index * 64 }} key={token.id}>{renderToken(token)}</div>)}
  </div><ul className="sr-only">{edges.map((edge, index) => <li key={index}>{model.tokens.find(token => token.id === edge.target)?.name ?? edge.target}: {t("참조", "references")} {model.tokens.find(token => token.id === edge.source)?.name ?? edge.source}{edge.path ?? ""}</li>)}</ul></div>;
}

function UsageLink({ use, components, project, locale, onSelect }: { use: StudioUsage; components: StudioComponent[]; project: ProjectSnapshot; locale: Locale; onSelect(id: string, partId: string, category?: StudioCategory): void }) {
  const component = components.find(item => item.id === use.componentId), part = component?.parts.find(item => item.id === use.partId);
  const source = project.documents[use.documentId]?.document;
  const category = source?.category === "Web" || source?.category === "Mobile" ? source.category : undefined;
  const [kind, index, ...fields] = use.path.split("/").slice(1);
  const rows = source?.[kind ?? ""], row = Array.isArray(rows) ? rows[Number(index)] : undefined;
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const readable = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, letter => letter.toUpperCase());
  const property = fields.filter(field => field !== "declarations").map(readable).join(" / ");
  const conditions = object(row) ? [row.variants, row.states].filter(object).flatMap(values => Object.entries(values).map(([key, value]) => `${readable(key)}: ${String(value)}`)) : [];
  const context = kind === "appearance" ? [t("규칙", "Rule") + ` ${Number(index) + 1}`, ...conditions.length ? conditions : [t("기본", "Base")]].join(" · ") : kind === "layout" ? t("레이아웃", "Layout") : kind === "motion" ? `${t("모션", "Motion")} ${Number(index) + 1}` : readable(kind ?? "");
  return <li><button type="button" className="relationship-usage-link" data-usage-category={category} data-usage-component={use.componentId} data-usage-part={use.partId} title={`${use.documentId}${use.path}`} disabled={!component || !part} onClick={() => onSelect(use.componentId, use.partId, category)}><Icon name="component" size={14} /><span><strong>{component?.name ?? use.componentId} / {part?.name ?? use.partId}</strong><small>{source?.name ?? use.documentId} · {property} · {context}</small></span><Icon name="arrow" size={14} /></button></li>;
}

export function TokenRelationships({ model, components, project, locale, tokenId, onSelect, onSelectComponent }: { model: FoundationAuthoringProjection; components: StudioComponent[]; project: ProjectSnapshot; locale: Locale; tokenId: string | null; onSelect(id: string): void; onSelectComponent(id: string, partId: string, category?: StudioCategory): void }) {
  const [query, setQuery] = useState("");
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const roots = useMemo(() => model.tokens.filter(token => !activeTokenReferences(model, token).length && (!query || [token, ...model.tokens.filter(item => item.aliasChain.includes(token.id))].some(item => item.name.toLowerCase().includes(query.toLowerCase())))), [model, query]);
  let renderedNodes = 0; const expanded = new Set<string>();
  const node = (token: FoundationTokenRow, ancestry: Set<string>, depth: number) => {
    if (++renderedNodes > 512) return null;
    if (ancestry.has(token.id) || depth > 32) return <li key={token.id}>{t("순환 또는 깊이 제한", "Cycle or depth limit")}</li>;
    const next = new Set([...ancestry, token.id]), children = expanded.has(token.id) ? [] : model.tokens.filter(item => activeTokenReferences(model, item).some(edge => edge.ref.id === token.id));
    expanded.add(token.id);
    return <li key={token.id}><div className={`relationship-node ${tokenId === token.id ? "selected" : ""}`}><button type="button" onClick={() => onSelect(token.id)} aria-pressed={tokenId === token.id}>{tokenSwatch(token.resolvedValue) ? <i className="swatch" style={{ background: tokenSwatch(token.resolvedValue) }} /> : <Icon name="token" size={14} />}<span><strong>{token.name}</strong><small>{model.tiers.find(tier => tier.id === token.tier)?.name ?? (activeTokenReferences(model, token).length ? t("연결", "Binding") : t("직접 값", "Literal"))} · {tokenValueSummary(token.resolvedValue)}</small></span></button><span className="badge">{token.usages.length} {t("사용처", "uses")}</span></div>{token.overrideTrace.length > 0 && <p className="relationship-origin">{token.overrideTrace.map(trace => `${model.axes.find(axis => axis.id === trace.axisId)?.name ?? trace.axisId} / ${trace.context}`).join(" · ")}</p>}{children.length > 0 && <ul>{children.map(child => node(child, next, depth + 1))}</ul>}{token.usages.length > 0 && <ul className="relationship-usages">{token.usages.map(use => <UsageLink key={`${use.documentId}${use.path}`} use={use} components={components} project={project} locale={locale} onSelect={onSelectComponent} />)}</ul>}</li>;
  };
  return <section className="relationship-panel"><div className="section-heading"><h2>{t("값이 연결되는 방식", "How values connect")}</h2><p>{t("기본값 → 의미 토큰 → 컴포넌트 사용처. 토큰을 선택하면 연결과 테마 재정의를 편집합니다.", "Primitive → semantic → component usage. Select a token to edit its references and theme overrides.")}</p></div><Field label={t("연결 검색", "Search connections")}><input aria-label={t("연결 검색", "Search connections")} value={query} onChange={event => setQuery(event.target.value)} placeholder="action, surface, spacing…" /></Field><ul className="relationship-tree" data-testid="token-relationship-tree">{roots.map(token => node(token, new Set(), 0))}</ul>{renderedNodes > 512 && <p className="field-hint">{t("연결이 많아 일부만 표시합니다. 검색으로 범위를 좁히세요.", "Showing a bounded set of connections. Search to narrow the graph.")}</p>}{!roots.length && <p className="field-hint">{t("표시할 연결이 없습니다.", "No connections match.")}</p>}<Button tone="subtle" onClick={() => setQuery("")}>{t("전체 연결 보기", "Show all connections")}</Button></section>;
}
