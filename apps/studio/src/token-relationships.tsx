import { foundationValueReferences } from "../../../modules/ads-core/src/index.ts";
import type { ReactNode } from "react";
import type { FoundationAuthoringProjection, FoundationTokenRow, ProjectSnapshot, StudioCategory, StudioComponent, StudioUsage } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Button, copy } from "./ui.tsx";
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

/** Context belongs to the selected token, rather than a second Foundation workspace. */
export function TokenUsage({ model, token, components, project, locale, onSelect, onSelectComponent }: { model: FoundationAuthoringProjection; token: FoundationTokenRow; components: StudioComponent[]; project: ProjectSnapshot; locale: Locale; onSelect(id: string): void; onSelectComponent(id: string, partId: string, category?: StudioCategory): void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const sources = activeTokenReferences(model, token);
  const dependents = model.tokens.filter(item => activeTokenReferences(model, item).some(ref => ref.ref.id === token.id));
  return <div className="token-context" data-testid="token-context">
    {sources.length > 0 && <div><h3>{t("값을 가져오는 토큰", "Value comes from")}</h3>{sources.map((source, index) => <Button key={index} tone="subtle" onClick={() => onSelect(source.ref.id)}>{model.tokens.find(item => item.id === source.ref.id)?.name ?? source.ref.id}{source.ref.path ?? ""}</Button>)}</div>}
    {dependents.length > 0 && <div><h3>{t("이 값을 사용하는 토큰", "Tokens using this value")}</h3>{dependents.map(item => <Button key={item.id} tone="subtle" onClick={() => onSelect(item.id)}>{item.name}</Button>)}</div>}
    <div><h3>{t("컴포넌트에서 사용", "Used in components")} <span className="badge">{token.usages.length}</span></h3>
    {token.usages.length ? <ul className="relationship-usages">{token.usages.map(use => <UsageLink key={use.documentId+use.path} use={use} components={components} project={project} locale={locale} onSelect={onSelectComponent} />)}</ul> : <p className="field-hint">{t("아직 연결된 컴포넌트가 없습니다.", "No component bindings yet.")}</p>}</div>
  </div>;
}
