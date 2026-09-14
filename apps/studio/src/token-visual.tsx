import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { FoundationTokenType, JsonValue } from "../../../modules/ads-core/src/index.ts";
import { colorHex, object } from "./ui-utils.ts";
import { copy } from "./ui.tsx";
import type { Locale } from "./locales.ts";
import { Icon } from "./icons.tsx";

const finite = (value: unknown, fallback = 0): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function specimenDimension(value: unknown): number {
  return object(value) ? finite(value.value) * (value.unit === "rem" ? 16 : 1) : 0;
}
/** CSS color syntax preserves the token's color space and alpha; it never rewrites source values. */
export function specimenColor(value: unknown): string | undefined {
  if (!object(value) || !Array.isArray(value.components) || value.components.length !== 3) return undefined;
  const space = String(value.colorSpace), values = value.components;
  if (!values.every(v => v === "none" || typeof v === "number" && Number.isFinite(v))) return undefined;
  const channel = (i: number, scale = 1, suffix = "") => values[i] === "none" ? "none" : `${finite(values[i]) * scale}${suffix}`;
  const alpha = clamp(finite(value.alpha, 1), 0, 1);
  if (space === "hsl" || space === "hwb") return `${space}(${channel(0)} ${channel(1, 1, "%")} ${channel(2, 1, "%")} / ${alpha})`;
  if (["lab", "lch", "oklab", "oklch"].includes(space)) return `${space}(${values.join(" ")} / ${alpha})`;
  if (!["srgb", "srgb-linear", "display-p3", "a98-rgb", "prophoto-rgb", "rec2020", "xyz-d50", "xyz-d65"].includes(space)) return undefined;
  return `color(${space} ${values.join(" ")} / ${alpha})`;
}
/** Human-readable source measurements accompany the bounded visual projection. */
export function specimenSummary(type: FoundationTokenType, value: JsonValue | undefined, locale: Locale = "en"): string {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const measure = (item: unknown) => object(item) && typeof item.value === "number" ? `${item.value}${String(item.unit ?? "")}` : "—";
  if (value === undefined) return t("해석되지 않은 값", "Unresolved value");
  const record = object(value) ? value : {};
  if (type === "color") {
    const hex = colorHex(value);
    return hex ? `${hex.toUpperCase()}${typeof record.alpha === "number" && record.alpha < 1 ? ` / ${Math.round(record.alpha * 100)}%` : ""}` : specimenColor(value) ?? t("색상 값 확인", "Check color value");
  }
  if (type === "dimension" || type === "duration") return measure(value);
  if (type === "shadow") {
    const layers = (Array.isArray(value) ? value : [value]).filter(object), first = layers[0];
    if (!first) return t("그림자 없음", "No shadow");
    return `${layers.length > 1 ? `${layers.length} ${t("레이어", "layers")} · ` : ""}${first.inset === true ? `${t("안쪽", "Inset")} · ` : ""}X ${measure(first.offsetX)} · Y ${measure(first.offsetY)} · ${t("흐림", "Blur")} ${measure(first.blur)} · ${t("퍼짐", "Spread")} ${measure(first.spread)}`;
  }
  if (type === "typography") return `${Array.isArray(record.fontFamily) ? record.fontFamily.join(", ") : String(record.fontFamily ?? "—")} · ${String(record.fontWeight ?? "—")} · ${measure(record.fontSize)} / ${String(record.lineHeight ?? "—")}`;
  if (type === "border") return `${measure(record.width)} · ${typeof record.style === "string" ? record.style : t("사용자 대시", "Custom dash")}`;
  if (type === "strokeStyle" && object(value)) return `${t("대시", "Dash")} ${Array.isArray(record.dashArray) ? record.dashArray.map(measure).join(" / ") : "—"} · ${String(record.lineCap ?? "butt")}`;
  if (type === "transition") return `${measure(record.duration)} · ${t("지연", "Delay")} ${measure(record.delay)} · ${Array.isArray(record.timingFunction) ? record.timingFunction.join(", ") : "—"}`;
  if (type === "gradient" && Array.isArray(value)) return `${value.length} ${t("색상 지점", "stops")} · ${value.filter(object).map(stop => `${finite(stop.position) * 100}%`).join(" → ")}`;
  if (type === "cubicBezier" && Array.isArray(value)) return `(${value.join(", ")})`;
  if (Array.isArray(value)) return value.map(String).join(", ");
  return typeof value === "string" || typeof value === "number" ? String(value) : "—";
}
export function specimenShadow(value: unknown): string {
  return (Array.isArray(value) ? value : [value]).filter(object).map(shadow => `${shadow.inset === true ? "inset " : ""}${specimenDimension(shadow.offsetX)}px ${specimenDimension(shadow.offsetY)}px ${Math.max(0, specimenDimension(shadow.blur))}px ${specimenDimension(shadow.spread)}px ${specimenColor(shadow.color) ?? "transparent"}`).join(", ") || "none";
}
export function specimenTiming(type: FoundationTokenType, value: unknown) {
  const curve = type === "cubicBezier" ? value : object(value) ? value.timingFunction : null;
  const points = Array.isArray(curve) && curve.length === 4 && curve.every(v => typeof v === "number" && Number.isFinite(v)) ? curve as number[] : [.22, 1, .36, 1];
  const time = (v: unknown, fallback: number) => object(v) ? finite(v.value, fallback) * (v.unit === "s" ? 1000 : 1) : fallback;
  return { points, easing: `cubic-bezier(${points.join(",")})`, duration: time(type === "duration" ? value : object(value) ? value.duration : null, 600), delay: time(object(value) ? value.delay : null, 0) };
}
const fontFamily = (v: unknown) => (Array.isArray(v) ? v : [v]).filter((v): v is string => typeof v === "string").map(v => /^[-\w]+$/.test(v) ? v : `"${v.replace(/["\\\r\n]/g, "")}"`).join(", ");
const fontWeight = (v: unknown): number => typeof v === "number" ? v : ({ thin: 100, hairline: 100, "extra-light": 200, "ultra-light": 200, light: 300, normal: 400, regular: 400, book: 400, medium: 500, "semi-bold": 600, "demi-bold": 600, bold: 700, "extra-bold": 800, "ultra-bold": 800, black: 900, heavy: 900, "extra-black": 950, "ultra-black": 950 }[String(v)] ?? 400);

export function specimenTypography(type: FoundationTokenType, value: JsonValue | undefined, name = ""): CSSProperties {
  const record = object(value) ? value : {};
  if (type === "typography") return { fontFamily: fontFamily(record.fontFamily), fontWeight: fontWeight(record.fontWeight), fontSize: clamp(specimenDimension(record.fontSize), 1, 256), lineHeight: Math.max(.1, finite(record.lineHeight, 1.4)), letterSpacing: specimenDimension(record.letterSpacing) };
  if (type === "fontFamily") return { fontFamily: fontFamily(value), fontSize: 42, fontWeight: 450 };
  if (type === "fontWeight") return { fontSize: 40, fontWeight: fontWeight(value) };
  if (type === "dimension") return /spacing/i.test(name) ? { fontSize: 28, letterSpacing: specimenDimension(value) } : { fontSize: clamp(specimenDimension(value), 1, 256) };
  return { fontSize: 24, lineHeight: Math.max(.1, finite(value, 1.4)) };
}

/** Material specimens are bounded display projections, not target capability claims. */
export function TokenVisual({ type, value, domain = "", name = "", locale = "en", interactive = false, presentation = "standard" }: { type: FoundationTokenType; value: JsonValue | undefined; domain?: string; name?: string; locale?: Locale; interactive?: boolean; presentation?: "standard" | "editorial" | "line" | "bare" }) {
  const track = useRef<HTMLDivElement>(null), animation = useRef<Animation | null>(null);
  const obj = object(value) ? value : {}, domainName = domain.toLowerCase();
  const isMotion = ["duration", "cubicBezier", "transition"].includes(type), timing = specimenTiming(type, value);
  useEffect(() => { if (!isMotion || !interactive) return; const reduced = matchMedia("(prefers-reduced-motion: reduce)"); const stop = () => animation.current?.cancel(); reduced.addEventListener("change", stop); return () => { stop(); reduced.removeEventListener("change", stop); }; }, [value, type, interactive, isMotion]);
  const replay = () => {
    animation.current?.cancel();
    if (!track.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dot = track.current.querySelector<HTMLElement>(".motion-dot");
    if (dot) animation.current = dot.animate([{ transform: "translateX(0)" }, { transform: `translateX(${Math.max(0, track.current.clientWidth - 16)}px)` }], { duration: clamp(timing.duration, 0, 10000), delay: clamp(timing.delay, 0, 3000), easing: type === "duration" ? "linear" : timing.easing, fill: "none" });
  };
  let content;
  if (value === undefined) content = <span className="visual-unresolved">{copy(locale, "해석되지 않은 값", "Unresolved value")}</span>;
  else if (type === "color") content = <div className="visual-color" style={{ backgroundColor: specimenColor(value) }} />;
  else if (type === "gradient") content = <div className="visual-color" style={{ backgroundImage: Array.isArray(value) ? `linear-gradient(110deg, ${value.filter(object).map(stop => `${specimenColor(stop.color) ?? "transparent"} ${finite(stop.position) * 100}%`).join(", ")})` : "none" }} />;
  else if (type === "shadow") content = <div className="visual-shadow" style={{ boxShadow: specimenShadow(value) }} />;
  else if (presentation === "editorial" && (domainName === "typography" || ["typography", "fontFamily", "fontWeight"].includes(type))) content = <span className="visual-typography editorial-type" style={specimenTypography(type, value, name)}>{type === "fontWeight" ? "Sphinx 012345" : type === "fontFamily" ? "Form follows feeling." : /display|heading|title/i.test(name) ? copy(locale, "형태가 만드는 리듬", "A rhythm of form.") : copy(locale, "작은 차이가 만드는 새로운 감각. 가나다 Aa", "The details make the difference. Aa Bb Cc")}{type === "number" && <><br />{copy(locale, "문장 사이에 여유를 더합니다.", "Give every line room to breathe.")}</>}</span>;
  else if (type === "dimension") {
    const px = specimenDimension(value);
    content = domainName === "typography" ? <span className="visual-typography" style={/spacing/i.test(name) ? { letterSpacing: clamp(px, -3, 8) } : { fontSize: clamp(px, 8, 56) }}>Aa 가</span>
      : domainName.includes("radius") ? <div className="visual-radius" style={{ borderTopLeftRadius: clamp(px, 0, 64) }}><span>{finite(obj.value)}{String(obj.unit ?? "")}</span></div>
      : /siz/.test(domainName) ? <div className="visual-size" style={{ width: clamp(px, 8, 140), height: clamp(px, 8, 84) }} />
      : <div className="visual-ruler"><i style={{ width: clamp(px, 1, 180) }} /><span>{finite(obj.value)} {String(obj.unit ?? "")}</span></div>;
  } else if (["typography", "fontFamily", "fontWeight"].includes(type)) {
    const style: CSSProperties = type === "typography" ? { fontFamily: fontFamily(obj.fontFamily), fontWeight: fontWeight(obj.fontWeight), fontSize: clamp(specimenDimension(obj.fontSize), 8, 56), lineHeight: clamp(finite(obj.lineHeight, 1.4), .8, 2), letterSpacing: clamp(specimenDimension(obj.letterSpacing), -3, 8) }
      : { fontFamily: type === "fontFamily" ? fontFamily(value) : undefined, fontWeight: type === "fontWeight" ? fontWeight(value) : 450 };
    content = <span className="visual-typography" style={style}>{type === "fontWeight" ? "Ag 012" : copy(locale, "가나다 Aa", "Form & type")}</span>;
  } else if (type === "border" || type === "strokeStyle") {
    const stroke = type === "border" ? obj.style : value;
    const dash = object(stroke) && Array.isArray(stroke.dashArray) ? stroke.dashArray.map(item => specimenDimension(item)).join(" ") : stroke === "dashed" ? "8 5" : stroke === "dotted" ? "1 5" : undefined;
    content = presentation === "line" ? typeof stroke === "string" ? <div className="visual-border-line" style={{ borderTopStyle: stroke as CSSProperties["borderTopStyle"], borderTopWidth: type === "border" ? clamp(specimenDimension(obj.width), 0, 32) : 2, borderTopColor: type === "border" ? specimenColor(obj.color) : undefined }} /> : <svg className="visual-border-line-svg" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true"><path d="M 1 30 H 599" fill="none" stroke={type === "border" ? specimenColor(obj.color) ?? "currentColor" : "currentColor"} strokeWidth={type === "border" ? clamp(specimenDimension(obj.width), 0, 32) : 2} strokeDasharray={dash} strokeLinecap={object(stroke) && stroke.lineCap === "round" ? "round" : "butt"} vectorEffect="non-scaling-stroke" /></svg> : typeof stroke === "string" ? <div className="visual-border-box" style={{ borderStyle: stroke as CSSProperties["borderStyle"], borderWidth: type === "border" ? clamp(specimenDimension(obj.width), 0, 16) : 4, borderColor: type === "border" ? specimenColor(obj.color) : undefined }} /> : <svg className="visual-border" viewBox="0 0 180 80" aria-hidden="true"><rect x="12" y="12" width="156" height="56" rx="8" fill="none" stroke={type === "border" ? specimenColor(obj.color) ?? "currentColor" : "currentColor"} strokeWidth={type === "border" ? clamp(specimenDimension(obj.width), 0, 16) : 2} strokeDasharray={dash} strokeLinecap={object(stroke) && stroke.lineCap === "round" ? "round" : "butt"} /></svg>;
  } else if (isMotion) {
    const [x1, y1, x2, y2] = timing.points;
    content = <>{type === "duration" ? <span className="visual-duration">{finite(obj.value)}<small>{String(obj.unit ?? "ms")}</small></span> : <svg className="visual-curve" viewBox="0 0 160 88" aria-hidden="true"><path className="curve-guide" d="M 12 12 V 76 H 148 M 12 76 L 148 12" /><path d={`M 12 76 C ${12 + x1! * 136} ${76 - y1! * 64} ${12 + x2! * 136} ${76 - y2! * 64} 148 12`} /></svg>}<div className="motion-track" ref={track}><i className="motion-dot" /></div></>;
  } else if (type === "number" && domainName === "typography") content = <span className="visual-lineheight" style={{ lineHeight: clamp(finite(value, 1.4), .8, 2) }}>Form & type<br />가나다 Aa</span>;
  else if (type === "number" && /opacity/.test(domainName)) content = <div className="visual-opacity"><i style={{ opacity: clamp(finite(value), 0, 1) }} /><span>{Math.round(finite(value) * 100)}%</span></div>;
  else if (type === "number" && /layer|z.index/.test(domainName)) content = <div className="visual-layers"><i /><i /><i /><span>{finite(value)}</span></div>;
  else content = <span className="visual-number">{typeof value === "number" || typeof value === "string" ? String(value) : "—"}</span>;
  return <div className={`token-visual token-kind-${type} visual-presentation-${presentation}`} data-visual-type={type} data-visual-domain={domainName}>{content}{isMotion && interactive && <button type="button" className="specimen-replay" onClick={replay} aria-label={copy(locale, "모션 재생", "Replay motion")} title={copy(locale, "최대 10초의 미리보기 · 동작 줄이기 적용", "Preview up to 10 seconds · respects reduced motion")}><Icon name="play" size={14} /></button>}</div>;
}
