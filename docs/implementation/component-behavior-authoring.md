# Component behavior authoring

The behavior inspector edits a bounded event → condition → ordered action contract. It follows [CMP03](../foundation/components/values-events-and-expressions.md), [CMP04](../foundation/components/state-and-request-lifecycle.md), [CMP06](../foundation/components/behavior-and-input-profiles.md) and [UX06](../foundation/experience/component-editing-panels.md). This is an executable increment, not completion of every behavior obligation in those documents.

## Authored contract

An optional `studioBehavior` component field contains version `1.0.0` and up to 32 rules. A rule has a stable ID, display name, an existing element identity, a normalized `press`, `change`, `focus` or `blur` trigger, an optional scalar comparison and 1–8 ordered actions. The existing catalog behavior profile and required semantic contracts stay intact.

Conditions read existing boolean, string, finite-number or enum value ports. Equality requires the same declared type; greater/less comparisons require numbers. Set and toggle may modify only locally owned scalar ports. Emit sends a literal payload matching an existing declared event. Consumer-owned values remain externally controlled; sending a request does not adopt its requested value.

A catalog's protected input handlers retain ownership of their built-in request events. An authored rule cannot emit that same semantic request on an input path that already owns it, such as Button press → activate or Checkbox change → checkedChangeRequest. Validation explains the duplicate and asks for a different trigger or separate event. This avoids duplicate delivery without suppressing the catalog's required semantics.

Unknown fields, operators, elements, values, event identities, wrong payload types, unsupported versions and budget violations reject the complete proposal. No arbitrary JavaScript, external fetch, ambient clock, randomness or recursive event dispatch is part of the source language.

## Editing and execution

The inspector uses the shared draft registry. A partial number or invalid JSON stays visible and blocks applying the rule; Reset restores its prior source. Apply stages an ordinary component mutation for review, saving, Undo and Redo. Local state can be created with a name and explicit boolean, number or text type. Rules expose element, input, optional condition and ordered action controls rather than requiring source JSON for the whole graph. Event payload JSON remains an explicit advanced field.

The simulator executes the same pure interpreter as the generated React helper. It displays local/app-owned values, matching-rule counts and declared event payloads. Restart restores defaults. Simulation does not change the authored source or its defaults.

For one input, all guards observe its initial value snapshot. Matching actions run in stored rule/action order. A later action may replace an earlier local assignment. Evaluation produces a new value snapshot and a list of emissions atomically. Emissions do not recursively trigger rules. An invalid runtime state cannot partially update its caller's values.

React integration captures normalized input at the component root, finds the deepest authored element with a matching trigger, ignores disabled controls and isolates nested behavior roots. Moving focus inside the same authored scope does not re-enter that scope. Pointer and keyboard activation use the native click path. Local state is exposed on the generated root as `data-state-<lowercase-name>` attributes; it does not insert unrequested visible controls into the consumer's component. Names that collide after this mapping are rejected by target generation.

Duplicate component sources remap rule, element, value and event identities explicitly. Literal event payloads are preserved as data. Removing a referenced element or local value fails validation until its rules are updated or removed.

## Evidence and remaining scope

Core tests cover reviewed plans, source preservation, repeated toggle, pre-event guards, ordered actions, request ownership, malformed declarations, bounded evaluation, atomic failures, target interpreter parity, deletion protection and duplication. Generated helper tests compile strict TypeScript against the installed React declarations and execute capture handlers with descendant, disabled, batched, nested-instance and focus-scope cases. The workbench helper separately exercises actual editor creation, review, simulation, payload recovery, Undo and reload in a dedicated Chromium database. A helper's presence is not a passing browser result; the delivery verification record owns the completed gate result.

Full request queues and cancellation identities, arbitrary typed expression ASTs, dynamic payload expressions, behavior-driven appearance bindings, focus/motion actions, host coordination, graph-layout editing and native behavior execution remain separate work. Native targets must reject authored behavior until a corresponding runtime adapter and execution evidence exist. Browser simulation and generated source tests are not native device or assistive-technology certification.
