# Axiom Design System

Axiom is being developed as a code-based Design System Builder in Axiom Studio. The approved Foundation defines the complete product. The first implementation is a local ADS document kernel with review/apply, persistent Undo/redo, a filesystem adapter and a CLI.

- [Foundation 1.0.0 — full documentation](docs/foundation/README.md)
- [56-document index](docs/foundation/document-index.md)
- [Baseline review and evidence boundaries](docs/foundation/baseline-review.md)
- [Repository documentation and lifecycle](docs/README.md)
- [Pinned pre-Studio reference](reference/pre-studio/README.md)
- [Run the document kernel](docs/implementation/kernel-quickstart.md)
- [Implementation scope and evidence](docs/implementation/kernel-evidence.md)

The full documentation passed the [56-document quality review](docs/foundation/audits/completeness-review.md) after 22 finding groups were repaired, and PR #25 merged on 2026-09-13. [ADR-0009](docs/adr/0009-ads-kernel-implementation-bootstrap.md) records the bounded I1 implementation profile. Imported documents receive envelope-only validation; domain semantics, Studio and platform output remain unimplemented and unverified. Existing LICENSE and Git history are preserved.
