# Axiom repository instructions

These instructions apply to every file in this repository.

## Current phase

Read `docs/README.md`, ADR-0006 and ADR-0007 before changing this repository. The active tree contains lifecycle and planning documents, a reference inventory and a repository verifier. The earlier executable implementation is preserved only in Git at the commit recorded in `reference/pre-studio/snapshot.json`.

The owner authorized retirement separately from new product implementation. Follow the confirmation sequence: task decisions, document index and development direction, complete documentation baseline, then implementation. Do not create new product packages, schemas, renderers or adapters before the final gate.

Do not interpret removed ADRs, SSOT, plans or passing reference tests as current Studio authority. Restore the full snapshot outside the active checkout for historical investigation. Do not cherry-pick historical instruction files into current authority without review.

## Documentation and maintenance rules

- Keep owner responses, interpretations, proposals, open questions and verified evidence distinct.
- Keep compatibility versions in data or metadata, not source identifiers or directory names.
- Preserve LICENSE and `.gitignore` byte-for-byte during retirement.
- Keep snapshot paths, blob identifiers, hashes and restoration evidence verifiable. The pinned commit is authoritative; a branch is movable.
- Record removed manifests, schemas, fixtures, generators, locks and CI. Never report removed pnpm checks as passing here.
- New planning Markdown and JSON may be added under `docs/`. Changing the phase guard requires an accepted ADR and the owner's implementation authorization.
- Apply general engineering principles in `docs/standards/source-code-and-module-structure.md` to maintenance code. Its old package and NodeNext rules apply to the restored reference until a future implementation profile is approved.

Before handing off changes, run:

```sh
python3 scripts/verify-retirement.py
python3 scripts/verify-retirement.py --self-test
```

These validate retirement and documentation integrity, not Studio behavior or platform readiness. Do not weaken the checks to allow unapproved product implementation.
