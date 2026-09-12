# Pre-Studio reference

This is a **reference entry point, not an executable source copy**. Earlier implementation exists only in Git. This combines cleanup choices 3 and 4 as recorded in [ADR-0007](../../docs/adr/0007-git-reference-and-documentation-phase.md).

- Snapshot: [`1b7bd6843ac638fac89da424637afa755d076144`](https://github.com/Rengod95/Axiom-Design-System/commit/1b7bd6843ac638fac89da424637afa755d076144)
- Convenience branch: [`reference/pre-studio`](https://github.com/Rengod95/Axiom-Design-System/tree/reference/pre-studio)
- Original main: [`f368ae7d208424c922637ca625ab9687a85ed5b9`](https://github.com/Rengod95/Axiom-Design-System/commit/f368ae7d208424c922637ca625ab9687a85ed5b9)
- Complete [snapshot.json](snapshot.json): 442 paths with Git blobs, SHA-256, byte sizes, grouping and disposition.

The branch can move; the exact commit is authoritative. The snapshot includes prior lifecycle notices and all ten packages, schemas, fixtures, generators and dependency locks. Nine previously removed plans remain at the separately recorded original main.

## Restore outside the active checkout

Choose a new empty sibling directory. Never overwrite an existing checkout or restore old AGENTS/SSOT into current authority.

```sh
git fetch origin reference/pre-studio
git cat-file -e 1b7bd6843ac638fac89da424637afa755d076144^{commit}
git worktree add --detach ../axiom-pre-studio-reference 1b7bd6843ac638fac89da424637afa755d076144
```

The restored instructions govern only that historical implementation. For an independent copy, use `git archive` at the same exact commit with an empty destination. The current verifier restores an archive to a temporary directory and checks every file against this inventory.

## Reproduce old checks when needed

In that restored directory, use its declared Node >=22 and pnpm 11.19.0 toolchain and lockfile:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

Its workflow used Node 24. Installation may require network and available historical dependencies. Archive integrity does not claim those checks ran again or that packages remain available indefinitely. Historical CI applies only to its tested revision and proves no new Studio/native behavior.

## Evaluate reuse after design approval

The [ledger](../../docs/maintenance/pre-studio-retirement.md) records token validation, CSS grammar, provenance and positive/negative fixture candidates. Reuse is selective and must satisfy new approved contracts. Old packages, concrete component-state registries, CSS-coupled motion and old execution sequences are not automatically adopted.
