# Guided Foundation implementation — 2026-09-16

This increment implements [ADR-0022](../adr/0022-guided-foundation-and-atomic-migration.md). It follows the owner's Semantic-first and reviewed whole-project migration decisions. It does not replace the historical 56-document baseline or claim that every future Foundation capability is implemented.

## Delivered behavior

| Requirement | Implementation and boundary |
|---|---|
| Required domains | All six versioned starter templates include Color, Spacing, Sizing, Radius, Border, Shadow, Typography, Motion, Opacity, Gradient and Layer. Readiness checks role coverage, not only the presence of domain names. |
| Purpose-driven authoring | A private role registry defines compatible types, ranges, units and property references. Raw DTCG types are absent from normal creation controls. Custom domains use a declared purpose; explicit invalid role IDs are rejected. |
| Three main views | Domains, Tokens and Themes. Policy, Files, Organization and Migration are subordinate Settings tasks. Templates belong to Domains. |
| Token navigation | Layer precedes Domain. First entry is Semantic / Color; valid project-specific context and scroll are restored. Primitive specimens and the full Relations view share the same source model. Sample component compatibility aliases are placed in the Component layer in new projects. |
| Value groups and themes | A group owns values for existing token IDs. Named themes connect domain groups; base values fill unspecified entries. Connection previews resolve the theme being edited, including nested references, rather than borrowing the Tokens view's selected theme. Group rename preserves token paths and IDs. Used groups require a valid replacement before deletion. |
| Safe editing | Off-context token drafts remain mounted and have a return action. Token and shared-group forms participate in draft validation before navigation. Invalid drafts cannot silently replace another selection. Review, discard, apply, Undo, Redo and restart recovery retain their existing transaction boundary. |
| Whole-project migration | A detached candidate adds missing baseline roles, maps classifications, retains token identities, converts known non-border px lengths at an explicit 16 px root basis, and moves ordered legacy overrides into groups. Existing shared groups stay unchanged; scope-less inherited groups preserve interleaved overrides when domain replacement would change their meaning. Named and custom context selections retain their resolved values. Ambiguous or incompatible explicit role mappings stop the entire candidate. Repeated migration is a no-op. |
| Unit preservation | Web CSS preserves rem in layout, typography, radius, composite border/shadow and table spacing. Studio keeps its 13 px chrome typography on the body, while the document root follows the browser's normal font basis so chrome density does not shrink authored rem values. Native generation uses an explicit root reference (16 px default); unsupported values still fail before source delivery. |
| Import identity and repair | Source identity plus RFC 6901 source paths identify imported tokens. A local rename survives reimport. Unrelated same-name sources cannot overwrite one another. Files exposes guided role mapping and preserves invalid text plus mappings in recoverable actor-scoped drafts. |
| Selected-theme exchange | Reference and resolved DTCG export compose the selected axis and theme groups through the same expression path as the resolver. Reference export retains aliases. Reimport is checked against the selected theme's resolved values. |
| Provider preview themes | Missing or unsupported canvas background no longer forces light mode. The provider preview inherits Studio theme, or uses the supported opaque background's relative luminance. |

## Source and compatibility contracts

`authoringProfile` version 1.0.0 is opt-in for pre-existing projects. Starter profile 2.0.0 produces guided documents. The previous pinned starter identity remains readable; arbitrary token names are never role authority. Ordinary source/import edits cannot strip an adopted authoring profile. History restoration is a distinct operation.

The resolver applies base values, ordered axis groups and legacy overrides, then explicit theme groups. A theme's explicit group replaces inherited groups for the same domain. Selecting multiple groups for the same domain is rejected. Expressions resolve after composition. Every group is checked independently, even before a theme links it; named/default contexts and explicitly selected custom contexts also undergo validation. Failures return no partial resolved token list.

Import repair drafts are separate from the adopted project. Their snapshot is read with project and authoring state in a single store read and filtered by actor and project. Saving a repair draft does not advance the project revision or discard a pending candidate. Original source text remains available.

The larger guided starter also exposed repeated full-history hashing during edits. The browser journal now interns independent text chunks after full validation and requires exact equality of every chunk before reusing that proof. Metadata and lineage remain checked on every read. Private proof identity, a 32 Mi-character unique-text budget, 262,144 total references, 32,768 references per proof and 1,024 identities bound retention. Cache misses, eviction, changed text and restart use the full validator. Storage format, commit history and Undo/Redo remain unchanged. Regression tests cover forged identities, altered ancestors, Unicode boundaries, both cache budgets and corruption after fallback.

In one local 170-token / 34-commit scenario retaining approximately 407.55 million characters of journal history, the tenth insertion's review application improved from 25.48 s to 9.65 s and a warm store read from 6.70 s to 1.03 s. Some baseline samples overlapped other tests; this is diagnostic evidence, not a service-level guarantee. Snapshot encoding and I/O remain future performance work. Reproduction inputs, profiles and results are in `dist/evidence/foundation-redesign-20260916/storage-performance-*`.

Cold reads still validate every retained commit. UTF-8 scanning now counts ASCII spans in a bounded prefix without changing malformed-Unicode/byte-limit error order. Canonical encoding uses a per-invocation cache of at most 4,096 strings and 4 Mi characters for string keys and quoted output; quoting still follows complete preflight. Whole-BMP, astral-boundary, generated first-error, exact output-limit, accessor and budget-fallback tests retain the safety boundary. In three Node samples of the same 22-commit fixture, median cold read fell from 9.94 s to 8.69 s and all restored canonical-state digests matched. This local diagnostic is recorded in `dist/evidence/foundation-redesign-20260916/canonical-performance-report.md` and does not establish a general reload guarantee.

The actual Chromium six-template workflow also retained all 41 commits and 379,949,426 characters. Cold reopen measured 20.434 s before and 18.206 s after the string-processing change. The original 30 s assertion was retained. Separate `before-*` and `after-*` profiles under the evidence directory preserve both runs; the browser suite also checks the restored component identities and authored values.

## Verification record

Meaningful regression coverage includes all six starter kits, role/type/range failures, negative tracking and delay, role-compatible property binding, rem browser/native mapping, value-group precedence, unused-group cycles, alias policies, source rename/reimport identity, atomic ambiguous migration, legacy axis plus partial group preservation, stale revisions, Undo/Redo, actor isolation and profile downgrade rejection.

Browser checks use isolated test databases and dedicated Chromium profiles. Historical editor fixtures are seeded through the same journal digest format in those test databases; the migration itself is exercised through the actual Settings, preview, review, apply and Undo controls. Browser tests continue to inspect saved source and rendered output instead of only checking that a button exists.

Manual browser review covered dark/light modes, Full HD and 1100 px widths without document overflow, draft navigation/return, invalid Files text plus mapping backup/restore, and tab state after reload. Screenshots and machine logs are generated evidence under `dist/evidence/foundation-redesign-20260916` and `dist/foundation-*-final.log`.

### Final local gate results

All gates below passed on 2026-09-16. Source-generation tests do not constitute native device execution.

| Gate | Verified result |
|---|---|
| Retirement and self-test | 442 frozen files restored and verified; LICENSE and `.gitignore` unchanged; 12 negative cases rejected. |
| Foundation documentation and self-test | 56 documents, 12 domains, 129 decisions, 2,701 checks; 17 negative cases rejected. |
| Reference integrity, self-test and built outputs | 1,138 pinned source/assets; 225 templates and 450 light/dark previews; 9 negative cases rejected. |
| `pnpm check` | Strict TypeScript and generated validator checks; 218 source files and 20 negative boundary cases. |
| `pnpm test` | 544 passed, zero failed, skipped or cancelled. |
| `pnpm build` | All four pinned provider packages and Studio's 209 inputs; no unresolved external runtime imports. |
| `pnpm test:browser` | Real Chromium IndexedDB, concurrent tabs, fault/transaction handling, reconnect and process restart. |
| `pnpm test:studio` | Actual editing, reviewed apply, Undo/Redo, source recovery, runtime controls and four source downloads. |
| `pnpm test:workbench` | 44 cases passed in 558,086 ms, including migration, role/group editing, independent theme previews, rem, source persistence and policy delivery gates. |
| `pnpm test:references` | Canonical discovery, opaque-frame isolation, original insertion/interaction/editing, sparse authored layout, Undo/Redo and six-template restart. |
| `pnpm test:targets` | Generated React SSR/hydration and browser controls; React Native typecheck plus Android/iOS Hermes bundles; SwiftUI/Compose source generation. |

The theme workflow also downloaded both reference and resolved DTCG files through the real Files controls, reimported them with the independent interchange path and compared all 170 resolved token values against the selected Dark theme. Group rename → Undo → navigation and group creation → rejected review → navigation both retain clean source without recreating a candidate.

The external preview returned HTTP 200 for HTML, JavaScript and CSS, each byte-identical to the final local build. Asset digests and the verification timestamp are in `dist/evidence/foundation-redesign-20260916/external-preview.json`. The temporary tunnel depends on this host remaining available.

## Explicit remaining limits

- This is the bounded private ADS Studio profile, not a claim of complete DTCG Format/Resolver certification. Existing interchange loss reporting remains required.
- A representative 5,000-token shallow document validates and resolves. A 20,000-token fixture exceeds the retained 1 MiB source boundary and is rejected without partial output. Worker-based incremental evaluation, cancellation, source-blob separation and large-graph UI performance are future capacity work; 20,000-token production readiness is not claimed.
- Chromium is the tested browser. Gesture and IME regressions exercise browser events; they do not certify physical input hardware. Safari/Firefox, assistive-technology certification and native device execution are not verified by these gates.
- Existing user projects are not silently migrated on page load. Settings → Migration prepares the reviewed whole-project conversion and retains Undo recovery.
- Pinned original Library templates retain their explicit provider/target capability limits; this Foundation increment does not manufacture native equivalents.
