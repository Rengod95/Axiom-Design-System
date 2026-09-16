import type { JsonValue } from "./contracts.ts";
import type { FoundationToken, FoundationTokenValue } from "./foundation-contracts.ts";
import type { FoundationRole } from "./foundation-role-registry.ts";
import { FOUNDATION_ROLE_REGISTRY } from "./foundation-role-registry.ts";
import { record, pointer } from "./foundation-internal.ts";
import { decodeFoundationPointer } from "./foundation-references.ts";

const ROLES = new Map(FOUNDATION_ROLE_REGISTRY.map(role => [role.id, role]));
const COMPOSITE_FIELDS: Record<string, Record<string, string>> = {
  "border.stroke": { color: "color.border", width: "border.width", style: "border.style" },
  "shadow.elevation": { color: "color.palette", offsetX: "spacing.margin", offsetY: "spacing.margin", blur: "spacing.length", spread: "spacing.margin" },
  "typography.style": { fontFamily: "typography.family", fontWeight: "typography.weight", fontSize: "typography.size", letterSpacing: "typography.tracking", lineHeight: "typography.line-height" },
  "motion.transition": { duration: "motion.duration", delay: "motion.delay", timingFunction: "motion.easing" },
};
export type FoundationRoleIssueSink = (path: string, message: string) => void;

/** Resolve only semantically declared composite fields, never infer purpose from token names. */
function propertyRole(roleId: string, path: string | undefined): string | undefined {
  if (!path) return roleId;
  const segments = decodeFoundationPointer(path);
  if (roleId === "shadow.elevation" && /^\d+$/.test(segments[0] ?? "")) segments.shift();
  if (roleId === "gradient.fill" && /^\d+$/.test(segments[0] ?? "") && segments.length === 2) return segments[1] === "color" ? "color.palette" : segments[1] === "position" ? "opacity.level" : undefined;
  return segments.length === 1 ? COMPOSITE_FIELDS[roleId]?.[segments[0]!] : undefined;
}

/** Inspect shape-validated literals/expressions; source validation still owns DTCG structure and cycles. */
export function inspectFoundationRoleValue(role: FoundationRole, value: FoundationTokenValue, path: string, tokens: ReadonlyMap<string, FoundationToken>, add: FoundationRoleIssueSink): void {
  const rejectNestedReferences = (item: JsonValue, at: string): void => {
    if (record(item) && record(item.ref)) { add(at, "Bind a whole typed role or a declared composite field; references inside raw scalar fields have no role contract."); return; }
    if (Array.isArray(item)) item.forEach((child, index) => rejectNestedReferences(child, pointer(at, String(index))));
    else if (record(item)) for (const [key, child] of Object.entries(item)) rejectNestedReferences(child, pointer(at, key));
  };
  const visit = (rule: FoundationRole, item: JsonValue, at: string, expressions: boolean): void => {
    if (expressions && record(item) && record(item.ref)) {
      const target = tokens.get(String(item.ref.id));
      const targetRole = target?.role && ROLES.get(target.role);
      let actual: string | undefined;
      try { actual = targetRole ? propertyRole(targetRole.id, typeof item.ref.path === "string" ? item.ref.path : undefined) : undefined; } catch { actual = undefined; }
      if (!actual || !rule.references.includes(actual)) add(`${at}/ref`, `${rule.label} requires a reference with an allowed role (${rule.references.join(", ")}).`);
      return;
    }
    const number = rule.type === "dimension" || rule.type === "duration" ? record(item) ? item.value : undefined : item;
    if (typeof number === "number") {
      if (rule.minimum !== undefined && (number < rule.minimum || rule.exclusiveMinimum && number === rule.minimum)) add(at, `${rule.label} must be ${rule.exclusiveMinimum ? "greater than" : "at least"} ${rule.minimum}.`);
      if (rule.maximum !== undefined && number > rule.maximum) add(at, `${rule.label} must be at most ${rule.maximum}.`);
      if (rule.integer && !Number.isInteger(number)) add(at, `${rule.label} requires an integer.`);
    }
    if (rule.type === "fontFamily" && (typeof item === "string" ? !item.trim() : Array.isArray(item) && (!item.length || item.some(value => typeof value === "string" && !value.trim())))) add(at, "Font family requires nonblank font names.");
    if (rule.type === "shadow" && Array.isArray(item)) { item.forEach((child, index) => visit(rule, child, pointer(at, String(index)), expressions)); return; }
    if (rule.type === "gradient" && Array.isArray(item)) {
      if (item.length < 2) add(at, "Gradient fill requires at least two stops.");
      item.forEach((child, index) => {
        if (!record(child)) return;
        if (expressions && record(child.ref)) { add(`${at}/${index}`, "Bind gradient stop color and position separately with declared roles."); return; }
        visit(ROLES.get("color.palette")!, child.color!, `${at}/${index}/color`, expressions);
        visit(ROLES.get("opacity.level")!, child.position!, `${at}/${index}/position`, expressions);
      });
      return;
    }
    const fields = COMPOSITE_FIELDS[rule.id];
    if (fields && record(item)) {
      for (const [field, childRole] of Object.entries(fields)) if (item[field] !== undefined) visit(ROLES.get(childRole)!, item[field]!, pointer(at, field), expressions);
      if (expressions) for (const [field, child] of Object.entries(item)) if (!fields[field]) rejectNestedReferences(child, pointer(at, field));
    } else if (rule.type === "strokeStyle" && record(item) && Array.isArray(item.dashArray)) {
      item.dashArray.forEach((child, index) => visit(ROLES.get("border.width")!, child, `${at}/dashArray/${index}`, expressions));
      if (expressions && item.lineCap !== undefined) rejectNestedReferences(item.lineCap, `${at}/lineCap`);
    } else if (expressions) rejectNestedReferences(item, at);
  };
  if ("literal" in value) visit(role, value.literal, `${path}/literal`, false);
  else if ("ref" in value) visit(role, value, path, true);
  else visit(role, value.composite, `${path}/composite`, true);
}
