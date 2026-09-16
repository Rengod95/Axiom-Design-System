import { useId } from "react";
import type { FoundationAuthoringProjection, FoundationTokenRow } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { DOMAIN_LABELS } from "./foundation-starter-panel.tsx";
import { Button, copy } from "./ui.tsx";
import { specimenColor, specimenDimension, specimenTiming } from "./token-visual.tsx";
import { Icon } from "./icons.tsx";

function DomainBlueprint({ purpose, tokens }: { purpose: string; tokens: FoundationTokenRow[] }) {
  const grid = useId(), measurements = tokens.filter(token => token.typeRef.id === "dimension").map(token => specimenDimension(token.resolvedValue));
  const maximum = Math.max(1, ...measurements), first = tokens[0];
  const plane = (x: number, y: number) => `M ${x} ${y} l 70 -30 54 30 -70 30 Z`;
  const dimension = purpose === "spacing" || purpose === "sizing";
  return <svg className={`domain-blueprint blueprint-${purpose}`} viewBox="0 0 280 154" aria-hidden="true"><defs><pattern id={grid} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 H 0 V 20" fill="none" stroke="currentColor" strokeWidth=".35" /></pattern></defs><rect className="blueprint-grid" x="10" y="10" width="260" height="134" fill={`url(#${grid})`} /><g className="blueprint-guides" fill="none"><path d="M 30 77 H 250 M 140 14 V 140" strokeDasharray="2 4" /><path d="M 24 22 h 8 M 28 18 v 8 M 248 132 h 8 M 252 128 v 8" /></g><g className="blueprint-object" fill="none">
    {purpose === "color" || purpose === "gradient" ? <>{[2, 1, 0].map((layer, index) => <g key={layer} transform={`translate(${layer * 18} ${layer * -12})`}><path d={plane(56, 94)} fill={specimenColor(tokens[index]?.resolvedValue)} fillOpacity=".12" /><path d="M 56 94 v 7 l 54 30 70 -30 v -7" /></g>)}<path className="blueprint-projection" d="M 56 94 V 120 M 180 94 V 120 M 92 70 V 40" strokeDasharray="2 4" /></>
      : dimension ? <>{purpose === "spacing" ? <>{[0, 1, 2, 3].map(index => { const width = 24 + (measurements[index] ?? maximum * (index + 1) / 4) / maximum * 116; return <g key={index}><path d={`M 64 ${36 + index * 25} H ${64 + width}`} /><path d={`M 64 ${32 + index * 25} v 8 M ${64 + width} ${32 + index * 25} v 8`} /><circle cx={64 + width} cy={36 + index * 25} r="2" /></g>; })}<path d="M 64 24 V 126" /></> : <><rect x="60" y="30" width="156" height="96" rx="8" /><rect x="84" y="48" width="108" height="60" rx="4" /><rect x="108" y="64" width="60" height="28" rx="2" /><path d="M 60 138 H 216 M 60 134 v 8 M 216 134 v 8 M 228 30 V 126 M 224 30 h 8 M 224 126 h 8" /><circle cx="60" cy="138" r="2" /><circle cx="216" cy="138" r="2" /></>}</>
      : purpose === "radius" ? <><path d="M 64 128 V 82 Q 64 28 118 28 H 218" strokeWidth="1.5" /><path d="M 64 82 H 118 V 28 M 118 82 L 80 44" strokeDasharray="3 4" /><circle cx="118" cy="82" r="54" className="blueprint-construction" /><circle cx="118" cy="82" r="3" /><path d="M 58 82 h 12 M 118 22 v 12" /></>
      : purpose === "typography" ? <><path d="M 42 36 H 238 M 42 110 H 238 M 42 126 H 238 M 78 22 V 136 M 196 22 V 136" className="blueprint-construction" /><text className="blueprint-type" x="79" y="110">Ag</text><path d="M 58 36 V 110 M 54 36 h 8 M 54 110 h 8" /><circle cx="78" cy="110" r="2" /><circle cx="196" cy="110" r="2" /></>
      : purpose === "motion" ? (() => { const [x1, y1, x2, y2] = specimenTiming(first?.typeRef.id ?? "cubicBezier", first?.resolvedValue).points; return <><path d="M 60 122 V 26 M 60 122 H 222" /><path d={`M 60 122 C ${60 + x1! * 152} ${122 - y1! * 94} ${60 + x2! * 152} ${122 - y2! * 94} 212 28`} strokeWidth="1.5" /><path d={`M 60 122 L ${60 + x1! * 152} ${122 - y1! * 94} M 212 28 L ${60 + x2! * 152} ${122 - y2! * 94}`} className="blueprint-construction" /><circle cx={60 + x1! * 152} cy={122 - y1! * 94} r="3" /><circle cx={60 + x2! * 152} cy={122 - y2! * 94} r="3" /></>; })()
      : purpose === "border" ? <><path d="M 50 42 H 230" /><path d="M 50 76 H 230" strokeDasharray="8 5" /><path d="M 50 110 H 230" strokeDasharray="1 6" strokeLinecap="round" /><path d="M 42 26 V 126 M 238 26 V 126" className="blueprint-construction" /><circle cx="50" cy="42" r="2" /><circle cx="230" cy="110" r="2" /></>
      : <>{[2, 1, 0].map(layer => <path key={layer} d={plane(68, 102 - layer * 25)} opacity={purpose === "opacity" ? .35 + layer * .3 : 1} />)}<path className="blueprint-construction" d="M 68 52 V 118 M 138 22 V 106 M 192 52 V 118" strokeDasharray="2 4" />{purpose === "shadow" && <ellipse cx="130" cy="128" rx="65" ry="10" strokeDasharray="2 3" />}</>}
  </g></svg>;
}

export function FoundationDomains({ model, locale, onDomain, onTemplate, onManage }: { model: FoundationAuthoringProjection; locale: Locale; onDomain(id: string): void; onTemplate(): void; onManage(): void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const unassigned = model.tokens.filter(token => !token.domain);
  return <section className="domain-workspace"><header className="domain-workspace-heading"><div className="section-heading"><h2>{t("도메인", "Domains")}</h2><p>{t("시스템을 이루는 11가지 재료. 역할과 기본 스케일을 함께 살펴보세요.", "The materials of your system. Explore meaningful roles and their base scales.")}</p></div><div className="domain-workspace-actions"><Button size="sm" tone="subtle" onClick={onTemplate}>{t("템플릿 적용", "Apply a template")}</Button><Button size="sm" tone="subtle" icon="settings" onClick={onManage}>{t("관리", "Manage")}</Button></div></header>
    {!model.domains.length && <div className="template-invitation"><h3>{t("기본 토큰 세트를 준비하세요", "Prepare your foundation")}</h3><p>{t("색상부터 타이포그래피와 모션까지, 11개 도메인의 추천 세트로 시작할 수 있습니다.", "Start with suggested sets across 11 domains, from color to typography and motion.")}</p><Button tone="primary" onClick={onTemplate}>{t("기본 템플릿 선택", "Choose a starter template")}</Button></div>}
    <div className="domain-directory">{model.domains.map(domain => {
      const tokens = model.tokens.filter(token => token.domain === domain.id), aliases = tokens.filter(token => token.aliasTarget), label = DOMAIN_LABELS[domain.name.toLowerCase()];
      const purpose = domain.bindingCategory && domain.bindingCategory !== "unrestricted" ? domain.bindingCategory : domain.name.toLowerCase();
      return <button type="button" key={domain.id} className="domain-directory-row blueprint-domain-card" data-testid={`domain-page-${domain.id}`} onClick={() => onDomain(`id:${domain.id}`)}><DomainBlueprint purpose={purpose} tokens={tokens} /><span className="domain-directory-label"><strong>{label ? t(...label) : domain.name}</strong><small>{domain.description || t(`${aliases.length}개의 역할 연결 · 기본 스케일`, `${aliases.length} role connections · base scales`)}</small></span><span className="domain-totals"><strong>{tokens.length} {t("토큰", "tokens")}</strong><small>{aliases.length} {t("참조", "aliases")}</small></span><span className="domain-directory-arrow" aria-hidden="true"><Icon name="arrow" size={14} /></span></button>;
    })}</div>
    {unassigned.length > 0 && <div className="unassigned-row"><div><strong>{t("분류되지 않은 토큰", "Unassigned tokens")}</strong><p>{t(`${unassigned.length}개 토큰에 도메인을 지정하면 여기에 함께 정리됩니다.`, `Assign a domain to ${unassigned.length} tokens to organize them here.`)}</p></div><Button onClick={() => onDomain("none")}>{t("분류하기", "Classify tokens")}</Button></div>}
  </section>;
}
