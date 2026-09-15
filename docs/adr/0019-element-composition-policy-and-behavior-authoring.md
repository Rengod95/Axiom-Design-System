# ADR 0019 — Element composition, policies and behavior authoring

Status: ACCEPTED for the owner's 2026-09-15 implementation and merge request.

## Decision

Extend the existing reviewed editor with real Box, Frame and Text elements, free positioning, nested component instances, Foundation policy authoring, deterministic input rules and an executable native verification path. Keep the Foundation ownership boundaries and the current Impeccable Operate direction.

- Custom layout definitions retain logical Parts. Element addition allocates source identities and both category mappings. Frames may use `free` layout; child positions are finite design coordinates. Automatic layout remains available. Text maps to a real paragraph, supports inline editing and retains escaped user content in generated React output.
- Optional `studioComposition` stores up to 64 instances per owning definition. Each instance has its own ID, destination element/content slot, pinned component and Web/Mobile design revisions, consumer value overrides and text slot contents. It never copies its source definition. Cycles, more than eight levels, over 1,024 expanded instances per root, invalid content cardinality, text-container insertion and incompatible values are rejected.
- An edited or missing source makes an instance explicitly stale. Preserve its pins and authored values. Preview shows a repair placeholder and delivery rejects the unresolved instance. An explicit reviewed refresh changes the pins; incompatible retained content/values still require repair. Source editing and source deletion do not silently erase consumer data.
- React output composes the actual generated child component functions. The parent owns instance value adoption and forwards typed request notifications. Additional content slots in custom layouts are rendered at their owning elements. Native output rejects unmapped custom composition, free positioning and authored behavior rather than silently changing their semantics.
- Foundation policies use closed source predicates for minimum token inventory, layer alias structure and design-property bindings. Rule severity distinguishes advice from required delivery constraints. Drafts remain editable; required findings gate all target output. Policy source and exception limitations are documented separately.
- Optional `studioBehavior` stores bounded, typed input/condition/action rules. Local set/toggle and declared event emission execute without user JavaScript. Consumer-owned values cannot be changed by a local action. Preview, simulator and emitted React use the same deterministic runtime. Required catalog behavior remains authoritative.
- Library defaults gain semantic control geometry and token-bound filled/outlined differences. Provider references remain references, not claims of upstream runtime installation.
- A separate native workflow builds generated Compose and SwiftUI samples and attempts Android emulator/iOS simulator execution. Records distinguish source generation, compilation, mounted execution, input tests and unavailable touch/assistive-technology evidence. A workflow definition alone is not a passing native result.

## Preservation and scope

Existing documents without these optional extensions retain their behavior. User source, field drafts, import review, transaction atomicity, conflicts and Undo stay on the same controller/command path. No arbitrary application scripting, full Figma parity, external version registry, asset pipeline, general override permission engine, approved policy exceptions or complete Foundation implementation is implied. The earlier 56-document audit remains historical evidence; this increment supplies its own scoped implementation and runtime records.

The owner explicitly authorized publication and merge after the previous code-transfer rejection. Publish only reviewed repository source, tests, workflows and documentation; local browser data, tunnel operation files and private screenshots stay outside the commit.
