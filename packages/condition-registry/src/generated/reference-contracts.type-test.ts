import type {
  CanonicalState,
  ConditionExpression,
  ContainerCondition,
  ReducedMotionCondition,
  ViewportCondition,
} from "./reference-contracts.js";

type EnvironmentCondition = ViewportCondition | ContainerCondition | ReducedMotionCondition;

const state = {
  id: "pressed",
  axis: "state",
  valueType: "boolean",
  applicableComponents: ["button"],
  usage: ["appearance", "motion"],
} as const satisfies CanonicalState;

const condition = {
  id: "preference.reducedMotion",
  kind: "preference",
  feature: "prefers-reduced-motion",
  equals: "reduce",
} as const satisfies EnvironmentCondition;

const expression = ({ all: [condition.id, { any: ["viewport.compact"] }] } as const) satisfies ConditionExpression;

void state;
void condition;
void expression;

const lifecycleEnumState = {
  id: "entering",
  axis: "lifecycle",
  valueType: "enum",
  values: ["yes", "no"],
  applicableComponents: ["dialog"],
  usage: ["motion"],
} as const;

// @ts-expect-error Lifecycle State entries are boolean-only in the canonical registry schema.
const invalidLifecycleState: CanonicalState = lifecycleEnumState;

const missingContainer = {
  id: "container.compact",
  kind: "container",
  feature: "inline-size",
  comparison: ">=",
  value: { kind: "token", path: "breakpoint.semantic.compact" },
} as const;

// @ts-expect-error Container conditions require an explicit container identity.
const invalidContainerCondition: EnvironmentCondition = missingContainer;

void invalidLifecycleState;
void invalidContainerCondition;
