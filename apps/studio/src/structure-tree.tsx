import { useEffect, useRef, useState } from "react";
import { canContainStudioElement, getStudioCatalogRecipe, semanticParentRole } from "../../../modules/ads-core/src/index.ts";
import type { StudioCategory, StudioComponent, StudioComponentEdit, StudioPart } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Icon } from "./icons.tsx";
import { Button, IconButton, Select, copy } from "./ui.tsx";
import "./structure-tree.css";

const title = (part: StudioPart) => part.name !== part.role ? part.name : part.role === "panel" ? "Content" : part.role[0]!.toUpperCase() + part.role.slice(1);
export function StructureTree({ component, category, locale, selectedPart, disabled, onSelect, onEdit }: { component: StudioComponent; category: StudioCategory; locale: Locale; selectedPart: string | null; disabled: boolean; onSelect(partId: string): void; onEdit(edits: StudioComponentEdit[]): boolean }) {
  const tree = useRef<HTMLUListElement>(null), [closed, setClosed] = useState<string[]>([]);
  const t = (ko: string, en: string) => copy(locale, ko, en), design = category === "Web" ? component.web : component.mobile;
  const recipe = component.catalog && getStudioCatalogRecipe(component.catalog.catalogId);
  const selected = component.parts.find(part => part.id === selectedPart), root = component.parts.find(part => part.parent === null)!;
  const [insertion, setInsertion] = useState(root.id);
  const children = (id: string) => component.parts.filter(part => part.parent === id);
  const anchor = (part: StudioPart) => recipe?.parts.some(item => item.role === part.role) ?? true;
  const containers = component.parts.filter(part => canContainStudioElement(component, category, part.id));
  const isDescendant = (id: string, ancestor: string) => { let part = component.parts.find(item => item.id === id); const seen = new Set<string>(); while (part && !seen.has(part.id)) { if (part.id === ancestor) return true; seen.add(part.id); part = component.parts.find(item => item.id === part!.parent); } return false; };
  useEffect(() => {
    let part = component.parts.find(item => item.id === selectedPart) ?? root;
    const parents: string[] = [];
    while (part.parent) { parents.push(part.parent); part = component.parts.find(item => item.id === part.parent) ?? root; }
    setClosed(previous => previous.filter(id => !parents.includes(id)));
    part = component.parts.find(item => item.id === selectedPart) ?? root;
    while (!canContainStudioElement(component, category, part.id) && part.parent) part = component.parts.find(item => item.id === part.parent) ?? root;
    setInsertion(part.id);
  }, [selectedPart, category, component.id]);
  const siblings = selected?.parent ? children(selected.parent) : [], at = siblings.findIndex(part => part.id === selectedPart);
  const removable = Boolean(selected?.parent && !selected.required && !anchor(selected) && !children(selected.id).length && !component.catalog?.slots.some(slot => slot.ownerPartRef === selected.id) && !component.instances?.some(instance => instance.ownerPartRef === selected.id));
  const remove = () => { if (removable && selected && onEdit([{ kind: "part-delete", partId: selected.id }])) onSelect(selected.parent!); };
  const order = (direction: number) => { if (!selected?.parent || at + direction < 0 || at + direction >= siblings.length) return; const ids = siblings.map(part => part.id); [ids[at], ids[at + direction]] = [ids[at + direction]!, ids[at]!]; onEdit([{ kind: "part-order", parentId: selected.parent, childIds: ids }]); };
  const needsNormalization = recipe && ["accordion", "tabs", "choice-group", "menu", "navigation", "table"].includes(recipe.semantic.kind) && (recipe.semantic.kind === "accordion" && !component.parts.some(part => part.role === "item") || component.parts.some(part => anchor(part) && (component.parts.find(parent => parent.id === part.parent)?.role ?? null) !== semanticParentRole(recipe.semantic.kind, part.role, component.parts.map(item => item.role))));
  const render = (part: StudioPart, depth: number): React.ReactNode => {
    const descendants = children(part.id), collapsed = closed.includes(part.id);
    return <li role="none" key={part.id}><button type="button" role="treeitem" aria-level={depth + 1} aria-selected={part.id === selectedPart} aria-current={part.id === selectedPart ? "true" : undefined} aria-expanded={descendants.length ? !collapsed : undefined} tabIndex={part.id === (selectedPart ?? root.id) ? 0 : -1} data-testid={`part-${part.id}`} data-tree-part={part.id} className={`structure-node ${part.id === selectedPart ? "active" : ""}`} style={{ paddingInlineStart: 8 + Math.min(depth, 7) * 12 }} onClick={() => onSelect(part.id)} onKeyDown={event => {
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); event.stopPropagation(); if (!disabled) remove(); return; }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const visible = Array.from(tree.current!.querySelectorAll<HTMLButtonElement>('[role="treeitem"]')).filter(button => button.getClientRects().length), index = visible.indexOf(event.currentTarget);
      let target: HTMLButtonElement | undefined;
      if (event.key === "ArrowRight") { if (collapsed) setClosed(previous => previous.filter(id => id !== part.id)); else target = visible[index + 1]?.dataset.treePart === descendants[0]?.id ? visible[index + 1] : undefined; }
      else if (event.key === "ArrowLeft") { if (descendants.length && !collapsed) setClosed(previous => [...previous, part.id]); else target = visible.find(button => button.dataset.treePart === part.parent); }
      else target = visible[event.key === "Home" ? 0 : event.key === "End" ? visible.length - 1 : Math.max(0, Math.min(visible.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))];
      if (target) { target.focus(); onSelect(target.dataset.treePart!); }
    }}><i className={`structure-disclosure ${collapsed ? "" : "open"}`} onClick={event => { if (!descendants.length) return; event.stopPropagation(); setClosed(previous => collapsed ? previous.filter(id => id !== part.id) : [...previous, part.id]); }} aria-hidden="true">{descendants.length > 0 && <Icon name="chevron" size={10} />}</i><Icon name={part.elementKind === "text" ? "type" : part.elementKind === "frame" ? "frame" : part.elementKind === "box" ? "box" : "layers"} size={13} /><span>{title(part)}</span><code>{part.elementKind ? design.elements?.[part.id] : part.role === "trigger" || part.role === "close" ? "button" : part.role === "header" && recipe?.semantic.kind === "accordion" ? "h3" : anchor(part) ? t("구성", "part") : ""}</code></button>{descendants.length > 0 && <ul role="group" hidden={collapsed}>{descendants.map(child => render(child, depth + 1))}</ul>}</li>;
  };
  return <div className="structure-editor" data-testid="structure-editor"><ul ref={tree} className="element-tree" role="tree" aria-label={t("컴포넌트 구성요소", "Component structure")}>{render(root, 0)}</ul>
    {component.catalog?.semantic.host === "collection" && <p className="structure-caption">{t("반복되는 항목에 공통으로 적용되는 구조입니다.", "Shared structure for every collection item.")}</p>}
    {needsNormalization && <Button data-testid="structure-normalize" tone="subtle" disabled={disabled} onClick={() => onEdit([{ kind: "structure-normalize" }])}>{t("합성 구조로 정리", "Update compound structure")}</Button>}
    {component.catalog && <div className="structure-actions"><label className="structure-insert-target"><span>{t("삽입 위치", "Insert into")}</span><Select data-testid="element-insert-parent" aria-label={t("삽입 위치", "Insert into")} value={insertion} disabled={disabled || !containers.length} onChange={event => setInsertion(event.target.value)}>{containers.map(part => <option key={part.id} value={part.id}>{title(part)}</option>)}</Select></label><div className="structure-add-tools">{(["box", "frame", "text"] as const).map(kind => <Button key={kind} data-testid={`element-add-${kind}`} tone="subtle" icon={kind === "text" ? "type" : kind} disabled={disabled || !containers.some(part => part.id === insertion)} onClick={() => onEdit([{ kind: "element-add", parentId: insertion, element: kind }])}>{kind === "box" ? "Box" : kind === "frame" ? "Frame" : "Text"}</Button>)}</div>
      {selected?.parent && <div className="structure-manage"><IconButton icon="arrow" className="structure-move-up" label={t("앞으로", "Move earlier")} data-testid="part-move-up" disabled={disabled || at <= 0} onClick={() => order(-1)} /><IconButton icon="arrow" className="structure-move-down" label={t("뒤로", "Move later")} data-testid="part-move-down" disabled={disabled || at < 0 || at >= siblings.length - 1} onClick={() => order(1)} />{!anchor(selected) && <Select data-testid="part-parent" aria-label={t("상위 요소 변경", "Move to parent")} value={selected.parent} disabled={disabled} onChange={event => onEdit([{ kind: "part-parent", partId: selected.id, parentId: event.target.value }])}>{containers.filter(part => !isDescendant(part.id, selected.id)).map(part => <option key={part.id} value={part.id}>{title(part)}</option>)}</Select>}<IconButton icon="trash" label={t("요소 삭제", "Delete element")} data-testid="part-delete" disabled={disabled || !removable} onClick={remove} /></div>}
    </div>}
  </div>;
}
