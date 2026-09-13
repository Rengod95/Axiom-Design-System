# Axiom Design System

Axiom is being developed as a code-based Design System Builder in Axiom Studio. The approved Foundation defines the complete product. The local ADS kernel now captures erroneous source drafts, validates common envelopes, reviews existing-document updates, preserves Undo/redo across restarts, and exports originals beside normalized documents.

- [Foundation 1.0.0 — full documentation](docs/foundation/README.md)
- [56-document index](docs/foundation/document-index.md)
- [Baseline review and evidence boundaries](docs/foundation/baseline-review.md)
- [Repository documentation and lifecycle](docs/README.md)
- [Pinned pre-Studio reference](reference/pre-studio/README.md)
- [Run the document kernel](docs/implementation/kernel-quickstart.md)
- [Implementation scope and evidence](docs/implementation/kernel-evidence.md)
- [Self-review and remaining implementation](docs/implementation/initial-kernel-review.md)

The full documentation passed the [56-document quality review](docs/foundation/audits/completeness-review.md) after 22 finding groups were repaired, and PR #25 merged on 2026-09-13. [ADR-0009](docs/adr/0009-ads-kernel-implementation-bootstrap.md) and [ADR-0010](docs/adr/0010-source-preserving-draft-authoring.md) record the bounded I1 profile and continuation. Domain semantics, Studio and platform output remain unimplemented and unverified. Existing LICENSE and Git history are preserved.

Structural domain checks and selected local references are available through the explicit `--structural` authoring profile and read-only `validate` query. See [profile evidence](docs/implementation/structural-domain-evidence.md) for enforced constraints and unresolved types.
