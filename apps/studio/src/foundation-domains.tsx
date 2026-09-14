import type { FoundationAuthoringProjection } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { DOMAIN_LABELS } from "./foundation-starter-panel.tsx";
import { Button, copy } from "./ui.tsx";
import { TokenVisual } from "./token-visual.tsx";

export function FoundationDomains({ model, locale, onDomain, onTemplate }: { model: FoundationAuthoringProjection; locale: Locale; onDomain(id: string): void; onTemplate(): void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const unassigned = model.tokens.filter(token => !token.domain);
  return <section className="domain-workspace"><div className="section-heading"><h2>{t("도메인별로 설계하기", "Design by domain")}</h2><p>{t("각 도메인의 기본 스케일, 의미 토큰과 테마 값을 한곳에서 관리하세요.", "Manage each domain’s primitive scales, semantic aliases and themed values together.")}</p></div>
    {!model.domains.length && <div className="template-invitation"><h3>{t("기본 토큰 세트를 준비하세요", "Prepare your foundation")}</h3><p>{t("색상부터 타이포그래피와 모션까지, 11개 도메인의 추천 세트로 시작할 수 있습니다.", "Start with suggested sets across 11 domains, from color to typography and motion.")}</p><Button tone="primary" onClick={onTemplate}>{t("기본 템플릿 선택", "Choose a starter template")}</Button></div>}
    <div className="domain-directory">{model.domains.map(domain => {
      const tokens = model.tokens.filter(token => token.domain === domain.id), aliases = tokens.filter(token => token.aliasTarget), label = DOMAIN_LABELS[domain.name.toLowerCase()];
      return <button type="button" key={domain.id} className="domain-directory-row" data-testid={`domain-page-${domain.id}`} onClick={() => onDomain(`id:${domain.id}`)}><span className={`domain-material domain-material-${tokens[0]?.typeRef.id ?? "empty"}`}>{tokens.slice(0, 4).map(token => <TokenVisual key={token.id} type={token.typeRef.id} value={token.resolvedValue} domain={domain.name} locale={locale} />)}</span><span><strong>{label ? t(...label) : domain.name}</strong><small>{domain.description || domain.allowedTypes?.join(" · ") || t("모든 유형", "All types")}</small></span><span className="domain-totals"><strong>{tokens.length} {t("토큰", "tokens")}</strong><small>{aliases.length} semantic / alias</small></span><span aria-hidden="true">→</span></button>;
    })}</div>
    {unassigned.length > 0 && <div className="unassigned-row"><div><strong>{t("분류되지 않은 토큰", "Unassigned tokens")}</strong><p>{t(`${unassigned.length}개 토큰에 도메인을 지정하면 여기에 함께 정리됩니다.`, `Assign a domain to ${unassigned.length} tokens to organize them here.`)}</p></div><Button onClick={() => onDomain("none")}>{t("분류하기", "Classify tokens")}</Button></div>}
  </section>;
}
