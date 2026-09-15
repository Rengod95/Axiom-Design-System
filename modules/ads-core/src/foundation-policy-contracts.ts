import type { Diagnostic } from "./contracts.ts";
import type { FoundationTokenType } from "./foundation-contracts.ts";

/** Closed SYN03 PolicyRule subset. No script predicates or implicit exceptions execute. */
export interface FoundationPolicyRule {
  ruleId: string;
  name: string;
  scope: { kind: "foundation" } | { kind: "design"; category?: "Web" | "Mobile"; componentId?: string };
  predicate:
    | { kind: "token-minimum"; count: number; type?: FoundationTokenType; domain?: string; tier?: string }
    | { kind: "token-alias"; tier: string; targetTier?: string; domain?: string }
    | { kind: "token-binding"; properties: string[]; mode: "token-only" | "literal-only" | "any"; type?: FoundationTokenType; domain?: string; tier?: string };
  severity: "error" | "warning";
  rationale: string;
  exceptionRef: null;
}
export type FoundationPolicyEdit = { kind: "policy-create"; rule: Omit<FoundationPolicyRule, "ruleId"> }
  | { kind: "policy-update"; ruleId: string; rule: Omit<FoundationPolicyRule, "ruleId"> }
  | { kind: "policy-delete"; ruleId: string };
export interface FoundationPolicyViolation {
  ruleId: string; ruleName: string; severity: "error" | "warning"; rationale: string;
  documentId: string; path: string; message: string;
  componentId?: string; partId?: string; tokenId?: string; category?: "Web" | "Mobile";
}
export interface FoundationPolicyReport {
  valid: boolean; canDeliver: boolean; rules: FoundationPolicyRule[];
  violations: FoundationPolicyViolation[]; diagnostics: Diagnostic[]; evaluatedSites: number;
}

export const FOUNDATION_POLICY_PROPERTIES = ["background", "color", "borderColor", "borderWidth", "borderRadius", "fontSize", "opacity", "fontFamily", "fontWeight", "lineHeight", "letterSpacing", "boxShadow", "backgroundImage", "borderStyle", "border", "typography", "transitionDuration", "transitionTimingFunction", "transition", "gap", "padding", "minHeight", "motionDuration", "motionDelay", "motionEasing"] as const;
export const MAX_FOUNDATION_POLICIES = 64;
export const MAX_FOUNDATION_POLICY_VIOLATIONS = 256;
