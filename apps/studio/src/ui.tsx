import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ButtonHTMLAttributes, InputHTMLAttributes, KeyboardEvent, ReactNode, SelectHTMLAttributes } from "react";
import { Icon } from "./icons.tsx";
import type { IconName } from "./icons.tsx";
import type { Locale } from "./locales.ts";

export const copy = (locale: Locale, ko: string, en: string): string => locale === "ko" ? ko : en;

type SelectOption = { value: string; label: string; disabled: boolean; hidden: boolean; group: number };
type SelectGroup = { label?: string; options: number[] };
type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size"> & { triggerIcon?: IconName; iconOnly?: boolean };

function selectText(node: ReactNode): string {
  return Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : isValidElement<{ children?: ReactNode }>(child) ? selectText(child.props.children) : "").join("");
}

/** The native element remains the form owner; the authored popup never opens a browser menu. */
export function Select({ children, value, defaultValue, className = "", style, disabled, id: suppliedId, tabIndex, autoFocus, onChange, onInvalid, triggerIcon, iconOnly = false, ...props }: SelectProps) {
  const generatedId = useId(), id = suppliedId ?? `select-${generatedId}`, listId = `${id}-listbox`;
  const native = useRef<HTMLSelectElement>(null), trigger = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1), [nativeValue, setNativeValue] = useState(String(value ?? defaultValue ?? ""));
  const [inferredLabel, setInferredLabel] = useState(""), [invalid, setInvalid] = useState(false), [inheritedDisabled, setInheritedDisabled] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 180, maxHeight: 280, side: "bottom" });
  const typeahead = useRef({ text: "", at: 0 });
  const { options, groups } = useMemo(() => {
    const options: SelectOption[] = [], groups: SelectGroup[] = [{ options: [] }];
    const visit = (nodes: ReactNode, group: number, groupDisabled = false) => Children.forEach(nodes, child => {
      if (!isValidElement<{ children?: ReactNode; value?: string | number; label?: string; disabled?: boolean; hidden?: boolean }>(child)) return;
      if (child.type === "optgroup") {
        const nextGroup = groups.length;
        groups.push({ label: child.props.label ?? "", options: [] });
        visit(child.props.children, nextGroup, groupDisabled || child.props.disabled === true);
      } else if (child.type === "option") {
        const text = selectText(child.props.children), index = options.length;
        options.push({ value: String(child.props.value ?? text), label: child.props.label ?? text, disabled: groupDisabled || child.props.disabled === true, hidden: child.props.hidden === true, group });
        groups[group]!.options.push(index);
      } else if (child.type === Fragment) visit(child.props.children, group, groupDisabled);
    });
    visit(children, 0);
    // Preserve native order when ordinary options occur after an optgroup.
    const orderedGroups: (SelectGroup & { source: number })[] = [];
    options.forEach((option, index) => {
      if (orderedGroups.at(-1)?.source !== option.group) orderedGroups.push({ ...groups[option.group]!, options: [], source: option.group });
      orderedGroups.at(-1)!.options.push(index);
    });
    return { options, groups: orderedGroups };
  }, [children]);
  const selected = options.findIndex(option => option.value === String(value ?? nativeValue));
  const enabled = options.flatMap((option, index) => !option.disabled && !option.hidden ? [index] : []);
  const unavailable = disabled || inheritedDisabled;
  const label = props["aria-label"] ?? (props["aria-labelledby"] ? undefined : inferredLabel || undefined);
  const testId = (props as Record<string, unknown>)["data-testid"] as string | undefined;

  // Form reset, dynamically replaced options and disabled fieldsets also own select state.
  useLayoutEffect(() => {
    const element = native.current;
    if (!element) return;
    setNativeValue(element.value);
    setInheritedDisabled(element.matches(":disabled"));
    setInferredLabel([...element.labels ?? []].map(label => label.textContent?.trim()).filter(Boolean).join(" ") || element.closest(".field")?.querySelector(".field-label")?.textContent?.trim() || "");
  });
  useEffect(() => {
    const element = native.current, form = element?.form;
    if (!element || !form) return;
    let frame = 0;
    const reset = () => { setOpen(false); frame = requestAnimationFrame(() => { setNativeValue(element.value); setInvalid(false); }); };
    form.addEventListener("reset", reset);
    return () => { cancelAnimationFrame(frame); form.removeEventListener("reset", reset); };
  }, [props.form]);
  useEffect(() => { if (unavailable) setOpen(false); }, [unavailable]);
  useEffect(() => { if (autoFocus && !unavailable) trigger.current?.focus(); }, [autoFocus, unavailable]);

  useLayoutEffect(() => {
    if (!open) return;
    const button = trigger.current;
    if (!button) return;
    const place = () => {
      const rect = button.getBoundingClientRect(), viewport = window.visualViewport;
      const leftEdge = viewport?.offsetLeft ?? 0, topEdge = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth, viewportHeight = viewport?.height ?? window.innerHeight;
      if (rect.bottom <= topEdge || rect.top >= topEdge + viewportHeight || rect.right <= leftEdge || rect.left >= leftEdge + viewportWidth) { setOpen(false); return; }
      const below = topEdge + viewportHeight - rect.bottom - 12, above = rect.top - topEdge - 12;
      const side = below < 180 && above > below ? "top" : "bottom", maxHeight = Math.max(48, Math.min(280, side === "top" ? above : below));
      const width = Math.min(Math.max(rect.width, 180), viewportWidth - 16);
      setPosition({ left: Math.min(Math.max(leftEdge + 8, rect.left), leftEdge + viewportWidth - width - 8), top: side === "top" ? rect.top - 4 : rect.bottom + 4, width, maxHeight, side });
    };
    const dismiss = (event: Event) => { if (event.target instanceof Node && !button.parentElement?.contains(event.target) && !popup.current?.contains(event.target)) setOpen(false); };
    const blur = () => setOpen(false);
    place();
    const observer = new ResizeObserver(place); observer.observe(button);
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true); window.addEventListener("blur", blur);
    window.visualViewport?.addEventListener("resize", place); window.visualViewport?.addEventListener("scroll", place);
    document.addEventListener("pointerdown", dismiss, true); document.addEventListener("focusin", dismiss);
    return () => {
      observer.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); window.removeEventListener("blur", blur);
      window.visualViewport?.removeEventListener("resize", place); window.visualViewport?.removeEventListener("scroll", place);
      document.removeEventListener("pointerdown", dismiss, true); document.removeEventListener("focusin", dismiss);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (!open || active < 0) return;
    const menu = popup.current, option = document.getElementById(`${listId}-${active}`);
    if (!menu || !option) return;
    const top = option.offsetTop, bottom = top + option.offsetHeight;
    if (top < menu.scrollTop + 4) menu.scrollTop = top - 4;
    else if (bottom > menu.scrollTop + menu.clientHeight - 4) menu.scrollTop = bottom - menu.clientHeight + 4;
  }, [active, open, listId, position.maxHeight]);
  useEffect(() => { if (open && !enabled.includes(active)) setActive(enabled.includes(selected) ? selected : enabled[0] ?? -1); }, [open, active, selected, options]);

  const show = (index = enabled.includes(selected) ? selected : enabled[0] ?? -1) => {
    if (unavailable || !enabled.length) return;
    typeahead.current = { text: "", at: 0 }; setActive(index); setOpen(true);
  };
  const choose = (index: number, restoreFocus = true) => {
    const option = options[index], element = native.current;
    if (!option || option.disabled || option.hidden || unavailable || !element) return;
    if (element.value !== option.value) {
      element.value = option.value;
      // A real change event retains currentTarget, form ownership and React's controlled value restoration.
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setOpen(false); typeahead.current = { text: "", at: 0 };
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.isDefaultPrevented() || unavailable || event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
    if (event.key === "Tab") { if (open) choose(active, false); return; }
    if (event.altKey && event.key === "ArrowUp") { event.preventDefault(); setOpen(false); return; }
    if (event.ctrlKey || event.metaKey || event.altKey && event.key !== "ArrowDown") return;
    if (["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(event.key)) {
      event.preventDefault();
      if (!open) { show(event.key === "Home" ? enabled[0] : event.key === "End" ? enabled.at(-1) : undefined); return; }
      const current = Math.max(0, enabled.indexOf(active));
      const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : current + (event.key === "ArrowUp" ? -1 : event.key === "PageUp" ? -10 : event.key === "PageDown" ? 10 : 1);
      setActive(enabled[Math.max(0, Math.min(enabled.length - 1, next))] ?? -1); return;
    }
    if (event.key === "Enter" || event.key === " " && (!typeahead.current.text || performance.now() - typeahead.current.at >= 700)) { event.preventDefault(); if (open) choose(active); else show(); return; }
    if (event.key.length !== 1 || !enabled.length) return;
    event.preventDefault();
    const now = performance.now(), previous = now - typeahead.current.at < 700 ? typeahead.current.text : "";
    const text = `${previous}${event.key}`.toLocaleLowerCase(), repeated = [...text].every(letter => letter === text[0]);
    const query = repeated ? text[0]! : text, start = previous && !repeated ? Math.max(0, enabled.indexOf(active)) : (Math.max(-1, enabled.indexOf(open ? active : selected)) + 1) % enabled.length;
    const match = [...enabled.slice(start), ...enabled.slice(0, start)].find(index => options[index]!.label.trim().toLocaleLowerCase().startsWith(query));
    typeahead.current = { text, at: now };
    if (match !== undefined) { setActive(match); setOpen(true); }
  };

  return <span className={`select-control ${iconOnly ? "select-icon-only" : ""} ${className}`} style={style} data-open={open || undefined}>
    <select {...props} id={id} ref={native} className="select-native" value={value} defaultValue={defaultValue} disabled={disabled} tabIndex={-1} aria-hidden="true" onFocus={event => { props.onFocus?.(event); trigger.current?.focus({ preventScroll: true }); }} onChange={event => { setNativeValue(event.currentTarget.value); setInvalid(!event.currentTarget.validity.valid); onChange?.(event); }} onInvalid={event => { event.preventDefault(); setInvalid(true); onInvalid?.(event); trigger.current?.focus({ preventScroll: true }); }}>{children}</select>
    <button ref={trigger} id={`${id}-trigger`} type="button" role="combobox" className="select-trigger" data-select-trigger="" data-select-for={testId} disabled={unavailable} tabIndex={tabIndex} title={props.title ?? options[selected]?.label} aria-label={label} aria-labelledby={props["aria-labelledby"]} aria-describedby={props["aria-describedby"]} aria-required={props.required || undefined} aria-invalid={props["aria-invalid"] ?? (invalid || undefined)} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined} onClick={() => { if (open) setOpen(false); else show(); }} onKeyDown={keyboard}>{triggerIcon && <span className="select-leading-icon"><Icon name={triggerIcon} size={16} /></span>}<span className={`select-value ${iconOnly ? "sr-only" : ""}`}>{options[selected]?.label ?? ""}</span><Icon name="chevron" size={12} /></button>
    {open && createPortal(<div ref={popup} id={listId} role="listbox" className="select-popup" aria-label={label} aria-labelledby={props["aria-labelledby"]} data-side={position.side} style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }} onMouseDown={event => event.preventDefault()}>{groups.map((group, groupIndex) => <div key={groupIndex} role={group.label === undefined ? "presentation" : "group"} aria-label={group.label}>{group.label !== undefined && <div className="select-group-label" aria-hidden="true">{group.label}</div>}{group.options.filter(index => !options[index]!.hidden).map(index => { const option = options[index]!; return <div key={index} id={`${listId}-${index}`} role="option" aria-selected={selected === index} aria-disabled={option.disabled || undefined} className="select-option" data-active={active === index || undefined} onPointerMove={event => { if (event.pointerType === "mouse" && !option.disabled) setActive(index); }} onClick={() => choose(index)}><span>{option.label}</span>{selected === index && <Icon name="check" size={14} />}</div>; })}</div>)}</div>, trigger.current?.closest("dialog") ?? document.body)}
  </span>;
}

/** A single moving surface connects workspace selections without moving their labels. */
export function SelectionPill({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const marker = ref.current, nav = marker?.parentElement;
    if (!marker || !nav) return;
    const update = () => { const active = nav.querySelector<HTMLElement>('button[aria-pressed="true"]'); marker.style.opacity = active ? "1" : "0"; if (active) { marker.style.transform = `translateY(${active.offsetTop}px)`; marker.style.height = `${active.offsetHeight}px`; } };
    update(); const observer = new ResizeObserver(update); observer.observe(nav); return () => observer.disconnect();
  }, [value]);
  return <span ref={ref} className="nav-marker" aria-hidden="true" />;
}

export function ChoiceControl({ label, value, choices, onChange, testId }: { label: string; value: string; choices: { value: string; label: string; icon?: IconName }[]; onChange(value: string): void; testId?: string }) {
  return <div className="choice-control" role="group" aria-label={label} data-testid={testId}>{choices.map(choice => <button key={choice.value} type="button" aria-pressed={choice.value === value} onClick={() => onChange(choice.value)}>{choice.icon && <Icon name={choice.icon} />}{choice.label}</button>)}</div>;
}

/** Axiom UI controls share the same semantics in Foundation, canvas and inspector. */
export function Button({ tone = "secondary", size = "md", icon, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "subtle" | "danger"; size?: "sm" | "md" | "lg"; icon?: IconName }) {
  return <button type="button" {...props} data-size={size} className={`button ${tone} ${className}`}>{icon && <Icon name={icon} />}{children}</button>;
}
export function IconButton({ icon, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return <button type="button" {...props} className={`icon-button ${props.className ?? ""}`} aria-label={label} title={props.title ?? label}><Icon name={icon} /></button>;
}
export function Field({ label, hint, children, layout = "stack" }: { label: string; hint?: string; children: ReactNode; layout?: "stack" | "row" }) {
  return <div className={`field field-${layout}`}><span className="field-label">{label}</span>{children}{hint && <small className="field-hint">{hint}</small>}</div>;
}
export function Section({ title, children, action, defaultOpen = true }: { title: string; children: ReactNode; action?: ReactNode; defaultOpen?: boolean }) {
  return <details className="inspector-section" open={defaultOpen}><summary className="section-title"><span>{title}</span><Icon name="chevron" size={12} /></summary>{action && <div className="section-action">{action}</div>}<div className="section-content">{children}</div></details>;
}
export function TextInput({ value, onCommit, label, multiline = false, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: string; onCommit(value: string): void; label: string; multiline?: boolean }) {
  const [draft, setDraft] = useState(value), composing = useRef(false), id = useId();
  useEffect(() => { if (!composing.current) setDraft(value); }, [value]);
  const common = { id: props.id ?? id, "aria-label": label, "data-testid": (props as Record<string, unknown>)["data-testid"] as string | undefined, value: draft, disabled: props.disabled, placeholder: props.placeholder, maxLength: props.maxLength ?? 4096, onChange: (event: { currentTarget: { value: string } }) => { setDraft(event.currentTarget.value); if (!composing.current) onCommit(event.currentTarget.value); }, onCompositionStart: () => { composing.current = true; }, onCompositionEnd: (event: { currentTarget: { value: string } }) => { composing.current = false; onCommit(event.currentTarget.value); } };
  return multiline ? <textarea {...common} rows={3} /> : <input {...props} {...common} />;
}
export function NumberInput({ value, onCommit, label, unit, min, max, step = 1, testId }: { value: number; onCommit(value: number): void; label: string; unit?: string; min?: number; max?: number; step?: number; testId?: string }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const valid = draft.trim() !== "" && Number.isFinite(Number(draft)) && (min === undefined || Number(draft) >= min) && (max === undefined || Number(draft) <= max);
  return <div className="number-input"><input type="number" aria-label={label} data-testid={testId} aria-invalid={!valid} min={min} max={max} step={step} value={draft} onChange={event => { setDraft(event.target.value); const number = event.target.valueAsNumber; if (Number.isFinite(number) && (min === undefined || number >= min) && (max === undefined || number <= max)) onCommit(number); }} onBlur={() => { if (!valid) setDraft(String(value)); }} />{unit && <span aria-hidden="true">{unit}</span>}</div>;
}
export function EmptyState({ icon = "search", title, description, children }: { icon?: IconName; title: string; description: string; children?: ReactNode }) {
  return <div className="empty-state"><Icon name={icon} size={28} /><h2>{title}</h2><p>{description}</p>{children}</div>;
}
export function TabBar<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange(value: T): void }) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const reveal = () => {
      const selected = element.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      if (!selected || !element.clientWidth) return;
      const viewport = element.getBoundingClientRect(), tab = selected.getBoundingClientRect();
      // Scroll only this horizontal strip; never move independent editor panels.
      if (tab.left < viewport.left + 4) element.scrollLeft += tab.left - viewport.left - 4;
      else if (tab.right > viewport.right - 4) element.scrollLeft += tab.right - viewport.right + 4;
    };
    reveal(); const observer = new ResizeObserver(reveal); observer.observe(element);
    const selected = element.querySelector('[aria-selected="true"]'); if (selected) observer.observe(selected);
    return () => observer.disconnect();
  }, [value, label]);
  return <div ref={strip} className="tabs" role="tablist" aria-label={label} onKeyDown={event => {
    const index = options.findIndex(item => item.value === value);
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : event.key === "ArrowRight" ? (index + 1) % options.length : event.key === "ArrowLeft" ? (index + options.length - 1) % options.length : null;
    if (next !== null) { event.preventDefault(); onChange(options[next]!.value); event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next]?.focus({ preventScroll: true }); }
  }}>{options.map(item => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} className={value === item.value ? "active" : ""} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>;
}
