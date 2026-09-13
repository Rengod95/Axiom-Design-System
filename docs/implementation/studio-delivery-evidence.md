# Studio and source delivery evidence

Authority: [ADR-0014](../adr/0014-studio-authoring-and-target-delivery.md). Prior storage PR #28 merged at `6cdac6a9635fd481f298ae87be82c4c7365bbf7f` after successful exact-head Windows and Ubuntu CI. This increment continues the approved Foundation and the owner's editor/target request; it does not mark I1–I6 complete.

## Enforced source boundary

`foundation-studio` inherits the envelope, catalog structure and domain policy. Authoritative stage/apply/restore/Undo and direct preview/target projection validate local stable identities, reference kinds and optional revision pins, one Foundation, exact builtin archetype versions and one Web/Mobile design per component. Unknown executable obligations fail instead of becoming empty output. Malformed plain JSON, own coercion properties, accessors, duplicate stable identities, invalid graph shape and a weaker update policy cannot bypass that boundary.

The Foundation engine inspects all thirteen DTCG 2025.10 literal types, whole-token alias resolution, type compatibility, cycles, explicit theme-axis order and named selection. Resolved alias chains and override paths remain derived provenance. Original DTCG exchange bytes can be exported independently from authored data. The initial flat interchange importer preserves unsupported input and reports loss of executability; general group inheritance, property references and arbitrary DTCG Resolver execution remain incomplete. SEL01 is still a bounded experiment.

Studio limits this executable graph to 64 components, 32 named ThemeSets and 128 appearance rules per design, in addition to existing JSON/document/batch limits. Foundation context resolutions are cached per graph evaluation and reused by designs. The standalone source inspector retains its broader source limits. All six filled/outlined × default/disabled/pressed combinations are derived by the same specificity/priority evaluator. Equal-precedence competing values fail validation. Target-used colors require explicit sRGB; dimensions require bounded px with declared target mapping. Preserved types outside those mappings are not silently converted.

## Runtime and delivery observations

Core and browser integration regression fixtures exercise review/apply/one Undo, retained original source, strongest-policy inheritance, stale references and conflicting updates. Trusted IndexedDB fault injection covers an abort after the write request and a lost reply after transaction completion; reopening and retrying returns the original receipt without an extra revision or history entry.

The actual Studio Chromium runner covers local creation, transient token edits, review/apply/reject, Undo/redo, theme selection, Korean IME composition, Web/Mobile Part selection, invalid source capture, keyboard activation, accepted/declined Toast close, ko/en UI, all four ZIP downloads and process restart. `dist/evidence/studio.json` is the machine result, and `dist/evidence/studio.png` is the captured interface. The starter dark Button foreground/background contrast was adjusted from approximately 3.55:1 to 5.52:1 by sRGB luminance calculation. This is a palette check, not a claim that arbitrary user colors or every assistive-technology combination is certified.

| Output profile | Independently executed checks | Not established |
| --- | --- | --- |
| React/CSS | Strict generated-source TypeScript, escaped SSR, hydration, real Chromium pointer and Enter/Space activation once, disabled behavior, plain Card, explicit Toast host, single announcement queue, controlled close, reduced-motion removal | RSC, full AT/browser matrix, other style strategies |
| React Native/Expo | Separate React runtime, strict consumer TypeScript, Android and iOS Hermes bundle generation | Native controls, emulator/device interaction, screen readers |
| SwiftUI | Deterministic owned iOS source/package generation, inventory and source-escaping fixtures | Apple compiler, simulator, device or VoiceOver execution |
| Compose | Deterministic owned Android library source/toolchain configuration, inventory and source-escaping fixtures | Android compilation, emulator/device or TalkBack execution |

Local consumer evidence was recorded on Windows with Node 24.19.0 and Chrome 152.0.7977.83. Expo consumed 580 Android and 582 iOS modules into approximately 1.4 MB bundles each. A committed fixture lock makes the transitive package graph reviewable; the runner records its digest. Generated manifests always retain `typechecked: not-run` and `runtime: not-run` until an independent consumer verifies that exact artifact. The test result is an external evidence record and does not mutate the source manifest.

Delivery tests distinguish source generation, source installation and verified release. Whole-file three-way plans bind current hashes, preserve user-only bytes, reject competing edits and stale plans, and keep immutable receipts. Apply/rollback/recovery use a journal and lock; incomplete filesystem work requires explicit recovery. No dependency installation, remote publishing or deployment occurs in product delivery commands. Native/RN lifecycle and arbitrary filesystem interference still require broader platform evidence.

## Remaining implementation

The [roadmap](implementation-roadmap.json) retains full token-standard comparison/interchange, complete component catalog and compound behavior, rich text-engine selection, free layout and design overrides, native runtime/AT checks, other Web styles and bare RN, partial upgrade selection, AI realization, connection detection and release verification. Browser-engine/offline/eviction coverage, library version pins, schema migrations and compaction remain I1 work. This vertical provides an editor and four real source generators without claiming those remaining requirements are implemented.
