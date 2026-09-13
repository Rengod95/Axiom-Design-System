# Axiom repository instructions

These instructions apply to every file in this repository.

## Current phase

Read `docs/README.md`, ADR-0006 and ADR-0007 before changing this repository. The active tree contains the approved Foundation, maintenance records and the bounded implementation authorized below. The earlier executable implementation is preserved only in Git at the commit recorded in `reference/pre-studio/snapshot.json`.

The owner authorized implementation after a successful 56-document quality review and PR #25 merge. That gate was fulfilled on 2026-09-13, followed by an explicit request to improve the initial implementation and continue the remaining work. Read accepted ADR-0009, ADR-0010 and docs/implementation/ads-kernel-profile.json before changing product code. The bounded I1 document kernel now includes source-preserving draft/update/export and the generated common-envelope schema. Additional scope follows the existing Foundation contracts and extends the profile explicitly.

Do not interpret removed ADRs, SSOT, plans or passing reference tests as current Studio authority. Restore the full snapshot outside the active checkout for historical investigation. Do not cherry-pick historical instruction files into current authority without review.

## Documentation and maintenance rules

- Keep owner responses, interpretations, proposals, open questions and verified evidence distinct.
- Keep compatibility versions in data or metadata, not source identifiers or directory names.
- Preserve LICENSE and `.gitignore` byte-for-byte during retirement.
- Keep snapshot paths, blob identifiers, hashes and restoration evidence verifiable. The pinned commit is authoritative; a branch is movable.
- Record removed manifests, schemas, fixtures, generators, locks and CI. Never report removed pnpm checks as passing here.
- New planning Markdown and JSON may be added under `docs/`. ADR-0009 defines the approved source roots and explicit replacement root toolchain files; preserve its boundary and tests when extending implementation.
- Apply general engineering principles in `docs/standards/source-code-and-module-structure.md`. ADR-0009 defines the current module and NodeNext profile; historical package paths apply only to the restored reference.

Before handing off changes, run:

```sh
python3 scripts/verify-retirement.py
python3 scripts/verify-retirement.py --self-test
python3 scripts/verify-foundation.py --self-test
pnpm check
pnpm test
pnpm build
```

The Python checks validate retirement and documentation integrity; the pnpm checks validate the bounded kernel implementation. Neither proves Studio behavior or platform readiness. Do not weaken the checks to allow implementation outside the accepted profile.
