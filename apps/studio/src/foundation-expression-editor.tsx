import { useEffect, useState } from "react";
import { foundationValueReferences, parseJson } from "../../../modules/ads-core/src/index.ts";
import type { FoundationTokenRow, FoundationTokenValue, JsonValue } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Field, copy } from "./ui.tsx";
import { tokenValueSummary } from "./token-value-editor.tsx";

const pointers = (value: JsonValue | undefined, path = "", result: { path: string; label: string }[] = []) => {
  if (value === undefined || result.length >= 128) return result;
  result.push({ path, label: `${path || "$value"} · ${tokenValueSummary(value)}` });
  if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) pointers(child, `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`, result);
  return result;
};

/** Structured binding controls retain stable identities; raw expressions are an optional escape hatch. */
export function FoundationExpressionEditor({ value, tokens, ownerId, locale, onChange, onValidityChange }: {
  value: FoundationTokenValue; tokens: FoundationTokenRow[]; ownerId?: string; locale: Locale;
  onChange(value: FoundationTokenValue): void; onValidityChange(valid: boolean): void;
}) {
  const t = (ko: string, en: string) => copy(locale, ko, en), [raw, setRaw] = useState(JSON.stringify(value, null, 2)), [error, setError] = useState(false);
  useEffect(() => { setRaw(JSON.stringify(value, null, 2)); setError(false); }, [value]);
  const references = foundationValueReferences(value);
  const update = (index: number, id: string, path?: string) => {
    const next = structuredClone(value), ref = foundationValueReferences(next)[index]!.ref;
    ref.id = id; if (path) ref.path = path; else delete ref.path;
    onValidityChange(true); onChange(next);
  };
  return <div className="expression-editor">
    <p className="field-hint">{t("연결한 원본이 바뀌면 이 값도 함께 갱신됩니다. 전체 값이나 개별 속성을 선택하세요.", "Changes to a source update this value. Bind its whole value or one property.")}</p>
    {references.map(({ ref, path }, index) => {
      const target = tokens.find(item => item.id === ref.id), choices = pointers(target?.resolvedValue);
      return <div className="expression-binding" key={path}>
        <Field label={t("원본 토큰", "Source token")}><select aria-label={`${t("연결 원본", "Binding source")} ${index + 1}`} value={ref.id} onChange={event => update(index, event.target.value)}><option value="">{t("토큰 선택", "Choose a token")}</option>{tokens.filter(item => item.id !== ownerId).map(item => <option value={item.id} key={item.id}>{item.name} · {item.typeRef.id}</option>)}</select></Field>
        <Field label={t("가져올 속성", "Source property")}><select aria-label={`${t("연결 속성", "Binding property")} ${index + 1}`} value={ref.path ?? ""} onChange={event => update(index, ref.id, event.target.value)}>{choices.length === 0 && <option value="">$value</option>}{ref.path && !choices.some(item => item.path === ref.path) && <option value={ref.path}>{ref.path}</option>}{choices.map(item => <option value={item.path} key={item.path}>{item.label}</option>)}</select></Field>
        {"composite" in value && <code className="field-hint">{path.replace(/^\/composite/, "").replace(/\/ref$/, "") || "$value"}</code>}
      </div>;
    })}
    <details><summary>{t("표현식 JSON 편집", "Edit expression JSON")}</summary><textarea aria-label={t("연결 표현식", "Binding expression")} rows={8} maxLength={32768} spellCheck={false} value={raw} aria-invalid={error} onChange={event => {
      const next = event.target.value; setRaw(next);
      try {
        const parsed = parseJson(next);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).length !== 1 || !("ref" in parsed || "composite" in parsed)) throw new Error("Expression required");
        const shape = (item: JsonValue, depth = 0): void => {
          if (depth > 32) throw new Error("Expression depth");
          if (!item || typeof item !== "object") return;
          if (!Array.isArray(item) && "ref" in item) {
            const ref = item.ref;
            if (Object.keys(item).length !== 1 || !ref || typeof ref !== "object" || Array.isArray(ref) || typeof ref.id !== "string" || ref.expectedKind !== "token" || ref.path !== undefined && typeof ref.path !== "string") throw new Error("Invalid reference");
          } else for (const child of Object.values(item)) shape(child, depth + 1);
        };
        shape(parsed);
        // Detailed type and cycle checks run through the shared authoring planner on apply.
        onChange(parsed as unknown as FoundationTokenValue); onValidityChange(true); setError(false);
      } catch { setError(true); onValidityChange(false); }
    }} />{error && <p role="alert" className="field-error">{t("ref 또는 composite 표현식 JSON을 확인하세요.", "Enter a valid ref or composite JSON expression.")}</p>}</details>
  </div>;
}
