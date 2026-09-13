import { useEffect, useId, useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "./icons.tsx";
import type { IconName } from "./icons.tsx";
import type { Locale } from "./locales.ts";

export const copy = (locale: Locale, ko: string, en: string): string => locale === "ko" ? ko : en;

/** Axiom UI controls share the same semantics in Foundation, canvas and inspector. */
export function Button({ tone = "secondary", size = "md", icon, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "subtle" | "danger"; size?: "sm" | "md" | "lg"; icon?: IconName }) {
  return <button type="button" {...props} data-size={size} className={`button ${tone} ${className}`}>{icon && <Icon name={icon} />}{children}</button>;
}
export function IconButton({ icon, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return <button type="button" {...props} className={`icon-button ${props.className ?? ""}`} aria-label={label} title={props.title ?? label}><Icon name={icon} /></button>;
}
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="field"><span className="field-label">{label}</span>{children}{hint && <small className="field-hint">{hint}</small>}</div>;
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
  return <div className="tabs" role="tablist" aria-label={label} onKeyDown={event => {
    const index = options.findIndex(item => item.value === value);
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : event.key === "ArrowRight" ? (index + 1) % options.length : event.key === "ArrowLeft" ? (index + options.length - 1) % options.length : null;
    if (next !== null) { event.preventDefault(); onChange(options[next]!.value); event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next]?.focus(); }
  }}>{options.map(item => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} className={value === item.value ? "active" : ""} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>;
}
