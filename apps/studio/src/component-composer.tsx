import { useMemo, useState } from "react";
import { inspectStudioProject, planStudioComponentCreate } from "../../../modules/ads-core/src/index.ts";
import type { FoundationSelection, ProjectSnapshot } from "../../../modules/ads-core/src/index.ts";
import { colorHex } from "./ui-utils.ts";
import { CatalogPreview } from "./catalog-preview.tsx";
import { Button, Field, copy } from "./ui.tsx";
import type { Locale } from "./locales.ts";

const STARTS = [
  { id: "blank", catalogId: "catalog.box", ko: "빈 프레임", en: "Blank frame", detail: ["자유롭게 요소를 추가", "Build your own element tree"], structure: "blank" },
  { id: "stack", catalogId: "catalog.box", ko: "콘텐츠 스택", en: "Content stack", detail: ["제목 · 설명 · 콘텐츠 영역", "Heading, description and content area"], structure: "stack" },
  { id: "article", catalogId: "catalog.box", ko: "아티클", en: "Article", detail: ["의미 있는 문서 구조", "Semantic article structure"], structure: "article" },
  { id: "button", catalogId: "catalog.button", ko: "버튼", en: "Button", detail: ["활성화 · 비활성 상태", "Activation and disabled states"] },
  { id: "checkbox", catalogId: "catalog.checkbox", ko: "체크박스", en: "Checkbox", detail: ["선택 값 · 레이블 · 비활성 상태", "Checked value, label and disabled state"] },
  { id: "accordion", catalogId: "catalog.accordion", ko: "아코디언", en: "Accordion", detail: ["항목 · 트리거 · 펼침 영역", "Items, triggers and expandable content"] },
  { id: "input", catalogId: "catalog.textfield", ko: "입력 필드", en: "Text field", detail: ["레이블 · 입력 · 안내", "Label, input and supporting text"] },
  { id: "card", catalogId: "catalog.card", ko: "카드", en: "Card", detail: ["헤더 · 콘텐츠 · 액션 영역", "Header, content and actions"] },
] as const;

/** Preview is an in-memory plan. Only the final action enters the shared reviewed command path. */
export function ComponentComposer({ project, selection, locale, disabled, onCreate, onCancel }: { project: ProjectSnapshot; selection: FoundationSelection; locale: Locale; disabled: boolean; onCreate(catalogId: string, name: string, structure?: "blank" | "stack" | "article"): void; onCancel(): void }) {
  const [start, setStart] = useState("blank"), [name, setName] = useState("");
  const t = (ko: string, en: string) => copy(locale, ko, en), selected = STARTS.find(item => item.id === start)!;
  const structure = "structure" in selected ? selected.structure : undefined;
  const displayName = name.trim() || (locale === "ko" ? selected.ko : selected.en);
  const preview = useMemo(() => {
    let index = 0;
    const source = JSON.stringify(project);
    const id = () => { let next; do { next = `preview.composer.${++index}`; } while (source.includes(JSON.stringify(next))); return next; };
    const plan = planStudioComponentCreate(project, { catalogId: selected.catalogId, name: displayName, ...(structure ? { structure } : {}) }, id);
    const projection = plan.valid ? inspectStudioProject(plan.project, selection) : null;
    const component = projection?.components.find(item => !Object.hasOwn(project.documents, item.id));
    const root = component?.parts.find(item => item.parent === null), foreground = root ? component?.web.parts[root.id]?.base.color : undefined;
    const channels = foreground?.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    const lightInk = channels?.length === 3 && channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722 > 145;
    const surface = projection?.foundation.tokens.find(item => item.id === "token.surface");
    return { component, valid: plan.valid, background: colorHex(surface?.value) ?? (lightInk ? "#171717" : "#ffffff"), foreground: foreground ?? "#171717" };
  }, [project, selection, selected.catalogId, displayName, structure]);
  return <form className="component-composer" data-testid="component-composer" onSubmit={event => { event.preventDefault(); if (preview.valid && !disabled) onCreate(selected.catalogId, displayName, structure); }}>
    <div className="composer-setup"><Field label={t("컴포넌트 이름", "Component name")}><input autoFocus data-testid="composer-name" aria-label={t("컴포넌트 이름", "Component name")} value={name} maxLength={120} placeholder={displayName} onChange={event => setName(event.target.value)} /></Field>
      <fieldset className="composer-starts"><legend>{t("시작 구조", "Start with")}</legend>{STARTS.map(item => <label key={item.id} className="composer-choice"><input type="radio" name="component-start" value={item.id} checked={start === item.id} onChange={() => setStart(item.id)} data-testid={`composer-${item.id}`} /><span><strong>{locale === "ko" ? item.ko : item.en}</strong><small>{item.detail[locale === "ko" ? 0 : 1]}</small></span></label>)}</fieldset>
    </div><div className="composer-preview"><div className="composer-preview-label"><span>{t("실제 구조 미리보기", "Live structure preview")}</span><span className="badge">Web</span></div>{preview.component ? <div className="composer-preview-plane" style={{ background: preview.background, color: preview.foreground }}><CatalogPreview key={start} component={preview.component} category="Web" mode="edit" locale={locale} selectedPart={null} onSelect={() => {}} /></div> : <p role="alert">{t("프로젝트의 진단을 먼저 해결해야 컴포넌트를 만들 수 있습니다.", "Resolve the project diagnostics before creating a component.")}</p>}
      <dl className="composer-baseline"><div><dt>{t("디자인 기본값", "Design baseline")}</dt><dd>{t("호환되는 토큰 우선 연결 · 없는 값은 직접 지정", "Compatible tokens first; explicit values as fallback")}</dd></div><div><dt>{t("요소와 콘텐츠", "Elements & content")}</dt><dd>{t("요소는 구조를 만들고, 콘텐츠 영역은 사용할 때 받을 내용을 정의합니다.", "Elements form the structure. A content area declares what it accepts when used.")}</dd></div><div><dt>{t("추가한 뒤", "After creating")}</dt><dd>{t("요소 선택 → 레이아웃·스타일 편집 → 변경 검토", "Select elements → edit layout and style → review changes")}</dd></div></dl>
    </div><footer className="composer-actions"><Button onClick={onCancel}>{t("취소", "Cancel")}</Button><Button type="submit" tone="primary" icon="plus" data-testid="composer-create" disabled={disabled || !preview.valid}>{t("컴포넌트 만들기", "Create component")}</Button></footer>
  </form>;
}
