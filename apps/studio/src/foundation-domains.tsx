import type { FoundationAuthoringProjection } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { DOMAIN_LABELS } from "./foundation-starter-panel.tsx";
import { Button, copy } from "./ui.tsx";
import { TokenVisual } from "./token-visual.tsx";
import { Icon } from "./icons.tsx";

export function FoundationDomains({ model, locale, onDomain, onTemplate, onManage }: { model: FoundationAuthoringProjection; locale: Locale; onDomain(id: string): void; onTemplate(): void; onManage(): void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const unassigned = model.tokens.filter(token => !token.domain);
  return <section className="domain-workspace"><header className="domain-workspace-heading"><div className="section-heading"><h2>{t("도메인", "Domains")}</h2><p>{t("스케일과 의미 토큰을 종류별로 정리합니다.", "Scales and semantic tokens, organized by purpose.")}</p></div><div className="domain-workspace-actions"><Button size="sm" tone="subtle" onClick={onTemplate}>{t("템플릿", "Templates")}</Button><Button size="sm" tone="subtle" icon="settings" onClick={onManage}>{t("관리", "Manage")}</Button></div></header>
    {!model.domains.length && <div className="template-invitation"><h3>{t("기본 토큰 세트를 준비하세요", "Prepare your foundation")}</h3><p>{t("색상부터 타이포그래피와 모션까지, 11개 도메인의 추천 세트로 시작할 수 있습니다.", "Start with suggested sets across 11 domains, from color to typography and motion.")}</p><Button tone="primary" onClick={onTemplate}>{t("기본 템플릿 선택", "Choose a starter template")}</Button></div>}
    <div className="domain-directory">{model.domains.map(domain => {
      const tokens = model.tokens.filter(token => token.domain === domain.id), aliases = tokens.filter(token => token.aliasTarget), label = DOMAIN_LABELS[domain.name.toLowerCase()];
      return <button type="button" key={domain.id} className="domain-directory-row" data-testid={`domain-page-${domain.id}`} onClick={() => onDomain(`id:${domain.id}`)}><span className={`domain-material domain-material-${tokens[0]?.typeRef.id ?? "empty"}`}>{tokens.slice(0, 4).map(token => <TokenVisual key={token.id} type={token.typeRef.id} value={token.resolvedValue} domain={domain.name} locale={locale} />)}</span><span className="domain-directory-label"><strong>{label ? t(...label) : domain.name}</strong><small>{domain.description || domain.allowedTypes?.join(" · ") || t("모든 유형", "All types")}</small></span><span className="domain-totals"><strong>{tokens.length} {t("토큰", "tokens")}</strong><small>{aliases.length} {t("참조", "aliases")}</small></span><span className="domain-directory-arrow" aria-hidden="true"><Icon name="arrow" size={14} /></span></button>;
    })}</div>
    {unassigned.length > 0 && <div className="unassigned-row"><div><strong>{t("분류되지 않은 토큰", "Unassigned tokens")}</strong><p>{t(`${unassigned.length}개 토큰에 도메인을 지정하면 여기에 함께 정리됩니다.`, `Assign a domain to ${unassigned.length} tokens to organize them here.`)}</p></div><Button onClick={() => onDomain("none")}>{t("분류하기", "Classify tokens")}</Button></div>}
  </section>;
}
