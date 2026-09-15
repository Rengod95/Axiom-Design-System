import { useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Locale } from "./locales.ts";

const PAGE_STEPS = 10;
const KEYBOARD_PRECISION = 12;
const DEFAULT_TICKS = 21;

export interface StudioSliderProps {
  label: string;
  sliderLabel?: string | undefined;
  value: number | string;
  min: number;
  max: number;
  step?: number;
  onChange(value: string): void;
  locale?: Locale;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  testId?: string | undefined;
  unit?: string | undefined;
  variant?: "value" | "gradient" | "ruler";
  gradient?: string | undefined;
  ticks?: number;
  precision?: boolean;
}

/** Native pointer bounds and deterministic keyboard increments share one finite, decimal-safe value. */
export function sliderKeyboardValue(key: string, value: number, min: number, max: number, step: number): number | null {
  if (![value, min, max, step].every(Number.isFinite) || max <= min || step <= 0) return null;
  if (key === "Home") return min;
  if (key === "End") return max;
  const direction = key === "ArrowRight" || key === "ArrowUp" ? 1 : key === "ArrowLeft" || key === "ArrowDown" ? -1 : key === "PageUp" ? PAGE_STEPS : key === "PageDown" ? -PAGE_STEPS : 0;
  if (!direction) return null;
  const next = min + (Math.round((value - min) / step) + direction) * step;
  return Math.min(max, Math.max(min, Number(next.toFixed(KEYBOARD_PRECISION))));
}

/** Controlled numeric text stays with the owning form; rendering, focus and blur never submit an edit.
 * The slider bounds its gesture window. Precision entry preserves exact text and the caller's validation,
 * including authored values outside that window and incomplete or rejected numeric input.
 */
export function StudioSlider({ label, sliderLabel, value, min, max, step = 1, onChange, locale = "en", disabled, invalid, testId, unit, variant = "value", gradient, ticks = DEFAULT_TICKS, precision = true }: StudioSliderProps) {
  const id = useId(), text = String(value), number = text.trim() ? Number(text) : NaN;
  const composing = useRef(false), [compositionText, setCompositionText] = useState<string | null>(null);
  const hasRange = Number.isFinite(min) && Number.isFinite(max) && max > min && Number.isFinite(step) && step > 0;
  const lower = hasRange ? min : 0, upper = hasRange ? max : 1;
  const clamped = Number.isFinite(number) ? Math.min(upper, Math.max(lower, number)) : lower;
  const position = hasRange ? Math.min(upper, Math.max(lower, Number((lower + Math.round((clamped - lower) / step) * step).toFixed(KEYBOARD_PRECISION)))) : lower;
  const percent = (position - lower) / (upper - lower) * 100;
  const style = { "--slider-progress": `${percent}%`, ...(gradient ? { "--slider-gradient": gradient } : {}) } as CSSProperties;
  const change = (next: string) => { if (next !== text) onChange(next); };
  const count = Number.isFinite(ticks) ? Math.min(41, Math.max(2, Math.round(ticks))) : DEFAULT_TICKS;
  return <div className="studio-slider" data-variant={variant} data-invalid={invalid || undefined} data-disabled={disabled || undefined} data-precision={precision} style={style}>
    <div className="studio-slider-controls">
    <div className="studio-slider-track">
      <input className="studio-slider-range" type="range" aria-label={sliderLabel ?? `${label} · ${locale === "ko" ? "슬라이더" : "slider"}`} aria-describedby={id} aria-valuetext={`${position}${unit ? ` ${unit}` : ""}`} min={lower} max={upper} step={hasRange ? step : 1} value={position} disabled={disabled || !hasRange} data-testid={testId ? `${testId}-slider` : undefined}
        onChange={event => change(String(event.currentTarget.valueAsNumber))}
        onKeyDown={event => { const next = sliderKeyboardValue(event.key, position, lower, upper, step); if (next !== null) { event.preventDefault(); if (next !== number) change(String(next)); } }} />
      <span className="studio-slider-visual" aria-hidden="true"><span className="studio-slider-rail" /><span className="studio-slider-travel">
        {variant === "ruler" && <span className="studio-slider-ticks">{Array.from({ length: count }, (_, index) => <i key={index} style={{ left: `${index / (count - 1) * 100}%` }} data-major={index % 5 === 0 || index === count - 1 || undefined} />)}</span>}
        <span className="studio-slider-thumb" />
      </span></span>
    </div>
    {precision && <div className="studio-slider-precision"><input className="studio-slider-value" type="text" inputMode="decimal" aria-label={label} aria-invalid={invalid} aria-describedby={id} value={compositionText ?? text} disabled={disabled} data-testid={testId}
      onCompositionStart={() => { composing.current = true; setCompositionText(text); }}
      onCompositionEnd={event => { composing.current = false; setCompositionText(null); change(event.currentTarget.value); }}
      onChange={event => { if (composing.current) setCompositionText(event.currentTarget.value); else change(event.currentTarget.value); }} />{unit && <span aria-hidden="true">{unit}</span>}</div>}
    </div>
    <span id={id} className="sr-only">{locale === "ko" ? `슬라이더 범위 ${min}–${max}, 간격 ${step}. 정확한 값은 숫자 입력으로 편집합니다.` : `Slider range ${min}–${max}, step ${step}. Edit the number for an exact value.`}</span>
  </div>;
}
