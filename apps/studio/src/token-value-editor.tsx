import { useCallback, useEffect, useRef, useState } from "react";
import { inspectFoundationDocument, STUDIO_ROOT_FONT_SIZE } from "../../../modules/ads-core/src/index.ts";
import type { FoundationTokenType, JsonObject, JsonValue } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Select, Button, Field, TextInput, copy } from "./ui.tsx";
import { StudioSlider } from "./studio-slider.tsx";
import type { StudioSliderProps } from "./studio-slider.tsx";

export const TOKEN_TYPES: readonly FoundationTokenType[] = ["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"];
export const COLOR_SPACES = ["srgb", "srgb-linear", "hsl", "hwb", "lab", "lch", "oklab", "oklch", "display-p3", "a98-rgb", "prophoto-rgb", "rec2020", "xyz-d65", "xyz-d50"] as const;
const WEIGHTS = ["thin", "hairline", "extra-light", "ultra-light", "light", "normal", "regular", "book", "medium", "semi-bold", "demi-bold", "bold", "extra-bold", "ultra-bold", "black", "heavy", "extra-black", "ultra-black"];
const STROKES = ["solid", "dashed", "dotted", "double", "groove", "ridge", "outset", "inset"];
const obj = (value: JsonValue): JsonObject => value !== null && !Array.isArray(value) && typeof value === "object" ? value : {};
const array = (value: JsonValue): JsonValue[] => Array.isArray(value) ? value : [];

/** Unit switching converts the quantity at an explicit basis; it never reinterprets the same numeral. */
export function convertTokenMeasurement(measured: JsonObject, nextUnit: string, rootFontSize = STUDIO_ROOT_FONT_SIZE): JsonObject {
  const scales: Record<string, number> = { px: 1, rem: rootFontSize, ms: 1, s: 1000 };
  const oldUnit = String(measured.unit);
  if (!Number.isFinite(rootFontSize) || rootFontSize <= 0 || !Object.hasOwn(scales, oldUnit) || !Object.hasOwn(scales, nextUnit)
    || ["px", "rem"].includes(oldUnit) !== ["px", "rem"].includes(nextUnit) || typeof measured.value !== "number" || !Number.isFinite(measured.value)) throw new Error("A conversion needs compatible units, a finite value and an explicit positive root size.");
  const value = measured.value * scales[oldUnit]! / scales[nextUnit]!;
  if (!Number.isFinite(value)) throw new Error("Converted measurement exceeds the finite numeric range.");
  return { ...measured, value, unit: nextUnit };
}

/** Defaults initialize a newly chosen type; editing existing values never normalizes them. */
export function defaultTokenValue(type: FoundationTokenType): JsonValue {
  const dimension = (value: number): JsonObject => ({ value, unit: "px" });
  const color = (): JsonObject => ({ colorSpace: "srgb", components: [0.2, 0.3, 0.8], alpha: 1 });
  switch (type) {
    case "color": return color();
    case "dimension": return dimension(8);
    case "duration": return { value: 160, unit: "ms" };
    case "fontFamily": return ["system-ui", "sans-serif"];
    case "fontWeight": return 400;
    case "cubicBezier": return [0.2, 0, 0, 1];
    case "number": return 1;
    case "strokeStyle": return "solid";
    case "border": return { color: color(), width: dimension(1), style: "solid" };
    case "transition": return { duration: { value: 160, unit: "ms" }, delay: { value: 0, unit: "ms" }, timingFunction: [0.2, 0, 0, 1] };
    case "shadow": return { color: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.15 }, offsetX: dimension(0), offsetY: dimension(2), blur: dimension(8), spread: dimension(0) };
    case "gradient": return [{ color: color(), position: 0 }, { color: { colorSpace: "srgb", components: [1, 1, 1] }, position: 1 }];
    case "typography": return { fontFamily: ["system-ui", "sans-serif"], fontSize: dimension(16), fontWeight: 400, letterSpacing: dimension(0), lineHeight: 1.5 };
  }
}

/** Reuses the public, pinned Foundation validator; this says nothing about target mapping. */
export function validateTokenEditorValue(type: FoundationTokenType, value: JsonValue) {
  return inspectFoundationDocument({ id: "foundation.editor", kind: "foundation", name: "Token value", schemaVersion: "1.0.0", revision: "editor.draft", studioProfile: { id: "axiom.studio", version: "0.1.0" },
    tokens: [{ id: "token.editor", name: "Value", typeRef: { id: type }, value: { literal: value } }], domains: [], tiers: [], themeAxes: [], themeSets: [], policies: [], originalSources: [], resolutionOrder: [] });
}

export function tokenValueSummary(value: JsonValue | undefined): string {
  if (value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value === null) return "null";
  const record = obj(value);
  if (typeof record.value === "number" && typeof record.unit === "string") return `${record.value} ${record.unit}`;
  if (typeof record.colorSpace === "string" && Array.isArray(record.components)) return `${record.colorSpace} (${record.components.join(", ")})${record.alpha === undefined ? "" : ` / ${record.alpha}`}`;
  if (Array.isArray(value) && value.every(item => typeof item === "string")) return value.join(", ");
  const text = JSON.stringify(value); return text.length > 110 ? `${text.slice(0, 107)}…` : text;
}
export function tokenSwatch(value: JsonValue | undefined): string | undefined {
  if (value === undefined) return;
  const color = obj(value);
  if (color.colorSpace !== "srgb" || !Array.isArray(color.components) || color.components.length !== 3 || !color.components.every(item => typeof item === "number" && item >= 0 && item <= 1)) return;
  const alpha = color.alpha ?? 1;
  if (typeof alpha !== "number" || alpha < 0 || alpha > 1) return;
  return `rgb(${color.components.map(n => Math.round((n as number) * 255)).join(" ")} / ${alpha})`;
}

interface Shared { locale: Locale; disabled?: boolean | undefined; path: string; onValidity(path: string, valid: boolean): void }
type SliderOptions = Pick<StudioSliderProps, "min" | "max" | "step" | "variant" | "gradient" | "unit">;
interface ValueProps extends Shared { type: FoundationTokenType; value: JsonValue; onChange(value: JsonValue): void; numericRange?: SliderOptions | undefined }
function Numeric({ value, onChange, label, allowNone = false, slider, ...shared }: Shared & { value: JsonValue; onChange(value: JsonValue): void; label: string; allowNone?: boolean; slider?: SliderOptions | undefined }) {
  const [draft, setDraft] = useState(String(value));
  const valid = allowNone && draft === "none" || draft.trim() !== "" && Number.isFinite(Number(draft));
  useEffect(() => { setDraft(String(value)); }, [value]);
  useEffect(() => { shared.onValidity(shared.path, valid); }, [valid, shared.path, shared.onValidity]);
  useEffect(() => () => shared.onValidity(shared.path, true), [shared.path, shared.onValidity]);
  const change = (text: string) => { setDraft(text); if (allowNone && text === "none") onChange("none"); else if (text.trim() !== "" && Number.isFinite(Number(text))) onChange(Number(text)); };
  return <Field label={label}>{slider ? <StudioSlider {...slider} label={label} locale={shared.locale} value={draft} invalid={!valid} disabled={shared.disabled} onChange={change} /> : <TextInput label={label} inputMode="decimal" value={draft} aria-invalid={!valid} disabled={shared.disabled} onCommit={change} />}{!valid && <small className="field-error">{copy(shared.locale, allowNone ? "유한한 숫자 또는 none을 입력하세요." : "유한한 숫자를 입력하세요.", allowNone ? "Enter a finite number or none." : "Enter a finite number.")}</small>}</Field>;
}

function HexColor({ value, onChange, locale, disabled, path, onValidity }: ValueProps) {
  const record = obj(value), components = array(record.components ?? []);
  const source = components.length === 3 && components.every(item => typeof item === "number" && item >= 0 && item <= 1)
    ? `#${components.map(item => Math.round((item as number) * 255).toString(16).padStart(2, "0")).join("")}` : "";
  const [draft, setDraft] = useState(source), [edited, setEdited] = useState(false);
  const valid = !edited || /^#[0-9a-f]{6}$/i.test(draft), validityPath = `${path}/hex-input`;
  useEffect(() => { setDraft(source); setEdited(false); }, [source]);
  useEffect(() => { onValidity(validityPath, valid); }, [onValidity, validityPath, valid]);
  useEffect(() => () => onValidity(validityPath, true), [onValidity, validityPath]);
  return <Field label="Hex"><TextInput label="Hex sRGB" data-testid={path === "value" ? "token-value-input" : undefined} value={draft} placeholder="#RRGGBB" aria-invalid={!valid} disabled={disabled} onCommit={text => {
    setDraft(text); setEdited(true);
    if (/^#[0-9a-f]{6}$/i.test(text)) { const { hex: _hex, ...rest } = record; onChange({ ...rest, components: [1, 3, 5].map(index => parseInt(text.slice(index, index + 2), 16) / 255) }); }
  }} />{!valid && <small className="field-error">{copy(locale, "# 뒤에 6자리 16진수 색상을 입력하세요.", "Enter # followed by six hexadecimal digits.")}</small>}</Field>;
}

function ValueFields(props: ValueProps) {
  const { type, value, onChange, locale, path, disabled, onValidity, numericRange } = props;
  const t = (ko: string, en: string) => copy(locale, ko, en), record = obj(value);
  const measurement = (label: string, measured: JsonObject, measuredType: "dimension" | "duration", measuredPath: string, change: (next: JsonValue) => void) => <div className="dimension-property measurement-property"><Numeric {...props} path={`${measuredPath}/value`} label={label} value={measured.value ?? 0} slider={measuredPath === "value" && numericRange ? numericRange : measuredType === "duration" ? { min: measuredPath.endsWith("/delay") ? measured.unit === "s" ? -2 : -2000 : 0, max: measured.unit === "s" ? 2 : 2000, step: measured.unit === "s" ? .01 : 10, variant: "ruler" } : { min: measured.unit === "rem" ? -4 : -64, max: measured.unit === "rem" ? 16 : 256, step: measured.unit === "rem" ? .05 : 1 }} onChange={next => change({ ...measured, value: next })} /><Select aria-label={label === t("값", "Value") ? t("단위", "Unit") : `${label} ${t("단위", "unit")}`} title={measuredType === "dimension" ? t("크기를 유지해 단위 변환 · 1rem = 16px 기준", "Convert quantity · 1rem = 16px reference") : t("시간을 유지해 단위 변환", "Convert duration")} disabled={disabled} value={String(measured.unit ?? "")} onChange={event => change(convertTokenMeasurement(measured, event.target.value))}>{(measuredType === "dimension" ? ["px", "rem"] : ["ms", "s"]).map(unit => <option key={unit}>{unit}</option>)}</Select><small className="field-hint" style={{ gridColumn: "1 / -1" }}>{measuredType === "dimension" ? t("단위 전환은 1rem = 16px 기준으로 값을 변환합니다.", "Switching units converts the value at 1rem = 16px.") : t("단위 전환은 같은 시간을 유지합니다.", "Switching units preserves the duration.")}</small></div>;
  const child = (key: string, expected: FoundationTokenType, label: string) => {
    const childValue = record[key] ?? defaultTokenValue(expected), change = (next: JsonValue) => onChange({ ...record, [key]: next });
    if (expected === "dimension" || expected === "duration") return <div className="composite-measurement" key={key}>{measurement(label, obj(childValue), expected, `${path}/${key}`, change)}</div>;
    if (expected === "number") return <Numeric {...props} key={key} path={`${path}/${key}`} label={label} value={childValue} onChange={change} />;
    return <fieldset className="value-group" key={key}><legend>{label}</legend><ValueFields {...props} path={`${path}/${key}`} type={expected} value={childValue} onChange={change} /></fieldset>;
  };
  const select = (label: string, selected: string, values: readonly string[], change: (v: string) => void) => <Field label={label}><Select aria-label={label} disabled={disabled} value={selected} onChange={event => change(event.target.value)}>{values.map(item => <option key={item} value={item}>{item}</option>)}</Select></Field>;
  if (type === "number") return <Numeric {...props} label={t("값", "Value")} slider={numericRange} />;
  if (type === "dimension" || type === "duration") return measurement(t("값", "Value"), record, type, path, onChange);
  if (type === "cubicBezier") return <div className="value-grid">{["x₁", "y₁", "x₂", "y₂"].map((label, i) => <Numeric {...props} path={`${path}/${i}`} key={i} label={label} slider={i % 2 === 0 ? { min: 0, max: 1, step: .01 } : undefined} value={array(value)[i] ?? 0} onChange={next => { const values = [...array(value)]; values[i] = next; onChange(values); }} />)}</div>;
  if (type === "color") {
    const space = String(record.colorSpace ?? "srgb"), channels = space === "hsl" ? ["H", "S", "L"] : space === "hwb" ? ["H", "W", "B"] : space.includes("lch") ? ["L", "C", "H"] : space.includes("lab") ? ["L", "a", "b"] : space.startsWith("xyz") ? ["X", "Y", "Z"] : ["R", "G", "B"];
    const swatch = tokenSwatch(value);
    return <><div className="color-primary">
      {swatch && <Field label={t("색", "Color")}><input type="color" aria-label={t("sRGB 색 선택", "Choose sRGB color")} disabled={disabled} value={`#${array(record.components!).map(n => Math.round((n as number) * 255).toString(16).padStart(2, "0")).join("")}`} onChange={event => { const components = [1, 3, 5].map(i => parseInt(event.target.value.slice(i, i + 2), 16) / 255); const { hex: _hex, ...rest } = record; onChange({ ...rest, components }); }} /></Field>}
      {space === "srgb" ? <HexColor {...props} /> : <span className="badge">{space}</span>}
    </div><Numeric {...props} path={`${path}/alpha`} label={t("알파", "Alpha")} value={record.alpha ?? 1} slider={{ min: 0, max: 1, step: .01, variant: "gradient", gradient: `linear-gradient(90deg,transparent,${tokenSwatch({ ...record, alpha: 1 }) ?? "var(--ink)"})` }} onChange={alpha => onChange({ ...record, alpha })} /><details className="color-advanced" open={space !== "srgb"}><summary>{t("색 공간과 채널", "Color space and channels")}</summary>
      {select(t("색 공간", "Color space"), space, COLOR_SPACES, colorSpace => onChange({ ...record, colorSpace }))}<p className="field-hint">{t("색 공간 변경은 채널 수치를 유지합니다. 색상 변환이 아닙니다.", "Changing the space keeps the channel numbers. It does not convert the color.")}</p>
      <div className={space === "srgb" ? "color-channel-sliders" : "value-grid three"}>{channels.map((label, i) => <Numeric {...props} path={`${path}/components/${i}`} key={i} label={label} allowNone slider={space === "srgb" ? { min: 0, max: 1, step: .01, variant: "gradient", gradient: `linear-gradient(90deg,${tokenSwatch({ ...record, alpha: 1, components: array(record.components ?? [0, 0, 0]).map((channel, index) => index === i ? 0 : channel) }) ?? "#000"},${tokenSwatch({ ...record, alpha: 1, components: array(record.components ?? [0, 0, 0]).map((channel, index) => index === i ? 1 : channel) }) ?? "#fff"})` } : undefined} value={array(record.components ?? [0, 0, 0])[i] ?? 0} onChange={next => { const components = [...array(record.components ?? [0, 0, 0])]; components[i] = next; const { hex: _hex, ...rest } = record; onChange({ ...rest, components }); }} />)}</div>
      {Object.hasOwn(record, "hex") && <Field label={t("원본 hex 보조값", "Original hex fallback")}><TextInput label="Hex fallback" value={String(record.hex)} disabled={disabled} onCommit={hex => onChange({ ...record, hex })} /><Button tone="subtle" disabled={disabled} onClick={() => { const { hex: _hex, ...rest } = record; onChange(rest); }}>{t("보조값 제거", "Remove fallback")}</Button></Field>}</details></>;

  }
  if (type === "fontFamily") {
    const names = typeof value === "string" ? [value] : array(value);
    return <>{select(t("형식", "Form"), typeof value === "string" ? "single" : "fallback-list", ["single", "fallback-list"], form => onChange(form === "single" ? String(names[0] ?? "") : names))}{names.map((name, index) => <div className="list-editor-row" key={index}><TextInput label={t(`글꼴 ${index + 1}`, `Font ${index + 1}`)} value={String(name)} disabled={disabled} onCommit={text => { if (typeof value === "string") onChange(text); else onChange(names.map((entry, i) => i === index ? text : entry)); }} />{typeof value !== "string" && <Button icon="trash" disabled={disabled} aria-label={t(`글꼴 ${index + 1} 제거`, `Remove font ${index + 1}`)} onClick={() => onChange(names.filter((_, i) => i !== index))} />}</div>)}{typeof value !== "string" && <Button tone="subtle" icon="plus" disabled={disabled} onClick={() => onChange([...names, "sans-serif"])}>{t("대체 글꼴 추가", "Add fallback font")}</Button>}</>;
  }
  if (type === "fontWeight") return <>{select(t("굵기 형식", "Weight form"), typeof value === "number" ? "number" : "named", ["number", "named"], mode => onChange(mode === "number" ? 400 : "normal"))}{typeof value === "number" ? <Numeric {...props} label={t("굵기 (1–1000)", "Weight (1–1000)")} slider={{ min: 1, max: 1000, step: 1, variant: "ruler" }} /> : select(t("굵기 이름", "Named weight"), String(value), WEIGHTS, onChange)}</>;
  if (type === "strokeStyle") return <>{select(t("선 유형", "Stroke style"), typeof value === "string" ? value : "custom", [...STROKES, "custom"], style => onChange(style === "custom" ? { dashArray: [{ value: 4, unit: "px" }, { value: 2, unit: "px" }], lineCap: "butt" } : style))}{typeof value !== "string" && <>{select(t("끝 모양", "Line cap"), String(record.lineCap), ["round", "butt", "square"], lineCap => onChange({ ...record, lineCap }))}{array(record.dashArray ?? []).map((item, i, items) => <div className="list-editor-row" key={i}><ValueFields {...props} type="dimension" path={`${path}/dashArray/${i}`} value={item} onChange={next => onChange({ ...record, dashArray: items.map((part, j) => j === i ? next : part) })} /><Button icon="trash" aria-label={t(`대시 ${i + 1} 제거`, `Remove dash ${i + 1}`)} disabled={disabled} onClick={() => onChange({ ...record, dashArray: items.filter((_, j) => j !== i) })} /></div>)}<Button tone="subtle" icon="plus" disabled={disabled} onClick={() => onChange({ ...record, dashArray: [...array(record.dashArray ?? []), { value: 2, unit: "px" }] })}>{t("대시 추가", "Add dash")}</Button></>}</>;
  if (type === "border") return <>{child("color", "color", t("색", "Color"))}{child("width", "dimension", t("두께", "Width"))}{child("style", "strokeStyle", t("선", "Stroke"))}</>;
  if (type === "transition") return <><div className="token-measurement-grid">{child("duration", "duration", t("지속 시간", "Duration"))}{child("delay", "duration", t("지연", "Delay"))}</div>{child("timingFunction", "cubicBezier", t("이징", "Easing"))}</>;
  if (type === "typography") return <>{child("fontFamily", "fontFamily", t("글꼴", "Font family"))}{child("fontWeight", "fontWeight", t("굵기", "Weight"))}<div className="token-measurement-grid">{child("fontSize", "dimension", t("크기", "Font size"))}{child("letterSpacing", "dimension", t("자간", "Letter spacing"))}</div>{child("lineHeight", "number", t("행간 배수", "Line-height ratio"))}</>;
  if (type === "shadow") {
    if (Array.isArray(value)) return <>{value.map((item, i) => <fieldset className="value-group" key={i}><legend>{t(`그림자 ${i + 1}`, `Shadow ${i + 1}`)}</legend><ValueFields {...props} path={`${path}/${i}`} value={item} onChange={next => onChange(value.map((entry, j) => j === i ? next : entry))} /><Button tone="subtle" icon="trash" disabled={disabled} onClick={() => onChange(value.filter((_, j) => j !== i))}>{t("그림자 제거", "Remove shadow")}</Button></fieldset>)}<Button icon="plus" disabled={disabled} onClick={() => onChange([...value, defaultTokenValue("shadow")])}>{t("그림자 추가", "Add shadow")}</Button></>;
    return <><div className="shadow-geometry">{([['offsetX', 'X'], ['offsetY', 'Y'], ['blur', t('흐림', 'Blur')], ['spread', t('퍼짐', 'Spread')]] as const).map(([key, label]) => { const dim = obj(record[key] ?? defaultTokenValue("dimension")); return <div className="dimension-property" key={key}><Numeric {...props} path={`${path}/${key}/value`} label={label} value={dim.value ?? 0} onChange={next => onChange({ ...record, [key]: { ...dim, value: next } })} /><Select aria-label={`${label} ${t("단위", "unit")}`} disabled={disabled} value={String(dim.unit ?? "px")} title={t("크기를 유지해 단위 변환 · 1rem = 16px 기준", "Convert quantity · 1rem = 16px reference")} onChange={event => onChange({ ...record, [key]: convertTokenMeasurement(dim, event.target.value) })}><option>px</option><option>rem</option></Select></div>; })}</div><label className="check-row"><input type="checkbox" disabled={disabled} checked={record.inset === true} onChange={event => onChange({ ...record, inset: event.target.checked })} />{t("안쪽 그림자", "Inset shadow")}</label>{child("color", "color", t("색", "Color"))}<Button tone="subtle" disabled={disabled} onClick={() => onChange([value])}>{t("그림자 목록으로 전환", "Make a shadow list")}</Button></>;
  }
  if (type === "gradient") return <>{array(value).map((item, i, stops) => <fieldset className="value-group" key={i}><legend>{t(`색 지점 ${i + 1}`, `Color stop ${i + 1}`)}</legend><Numeric locale={locale} disabled={disabled} path={`${path}/${i}/position`} onValidity={onValidity} label={t("위치 (0–1)", "Position (0–1)")} value={obj(item).position ?? 0} slider={{ min: 0, max: 1, step: .01, variant: "ruler" }} onChange={position => onChange(stops.map((stop, j) => i === j ? { ...obj(stop), position } : stop))} /><ValueFields {...props} type="color" path={`${path}/${i}/color`} value={obj(item).color ?? defaultTokenValue("color")} onChange={color => onChange(stops.map((stop, j) => i === j ? { ...obj(stop), color } : stop))} /><Button tone="subtle" icon="trash" disabled={disabled} onClick={() => onChange(stops.filter((_, j) => j !== i))}>{t("지점 제거", "Remove stop")}</Button></fieldset>)}<Button icon="plus" disabled={disabled} onClick={() => onChange([...array(value), { color: defaultTokenValue("color"), position: 1 }])}>{t("색 지점 추가", "Add color stop")}</Button></>;
  return null;
}

export function TokenValueEditor({ type, value, onChange, locale, disabled, onValidityChange, numericRange }: { type: FoundationTokenType; value: JsonValue; onChange(value: JsonValue): void; locale: Locale; disabled?: boolean; onValidityChange?(valid: boolean): void; numericRange?: SliderOptions | undefined }) {
  const invalid = useRef(new Set<string>()), [version, setVersion] = useState(0);
  const onValidity = useCallback((path: string, valid: boolean) => { const had = invalid.current.has(path); if (valid) invalid.current.delete(path); else invalid.current.add(path); if (had !== !valid) setVersion(n => n + 1); }, []);
  const report = validateTokenEditorValue(type, value), valid = report.valid && invalid.current.size === 0;
  useEffect(() => { onValidityChange?.(valid); }, [valid, version, onValidityChange]);
  return <div className="token-value-editor"><ValueFields type={type} value={value} onChange={onChange} locale={locale} disabled={disabled} path="value" onValidity={onValidity} numericRange={numericRange} />{!valid && <div className="inline-error" role="status">{copy(locale, "값을 확인하세요. 입력은 유지되며 올바른 값이 될 때까지 반영되지 않습니다.", "Check the value. Your input is kept and cannot be applied until valid.")}{report.diagnostics.filter(item => item.severity === "error").slice(0, 4).map((item, i) => <p key={i}><code>{item.path?.replace("/tokens/0/value/literal", "") || "/"}</code> {item.message}</p>)}</div>}{report.diagnostics.some(item => item.severity === "warning") && <details className="field-hint"><summary>{copy(locale, "값 해석 시 주의사항", "Value interpretation notes")}</summary>{report.diagnostics.filter(item => item.severity === "warning").slice(0, 4).map((item, i) => <p key={i}>{item.message}</p>)}</details>}</div>;
}
