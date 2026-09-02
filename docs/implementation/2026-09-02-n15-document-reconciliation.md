# N15 documentation reconciliation

**Date:** 2026-09-02 \
**Status:** COMPLETE \
**Scope:** ADR, SSOT, normative annex, active plan, and architecture alignment
before N16

## Outcome

The N0–N15 implementation and its active documentation now describe one
baseline. Token requirements approved after the original SSOT draft are
recorded through ADR-0004 and reflected in SSOT-01 v0.4.0; implementation does
not become a higher authority. N16 remains the next implementation item.

## Reconciled decisions

- Token examples now use IDs present in the 635-ID light/dark resolved
  manifest, including canonical `xs`–`xl`, OKLCH color roles, logical spacing,
  and current typography composites.
- The removed `color.semantic.action`, `color.semantic.surface.sunken`, and
  `space.semantic.overlap` families remain historical migration terms only.
- `MotionCompilerInput` now carries the Condition Registry required to verify
  `conditionRegistryDigest`.
- `preference.reducedMotion`, the Motion IR `reducedMotion` strategy, and the
  `motionSuppressed` lifecycle state have separate documented owners.
- SSOT revision versions, schema compatibility identities, source/profile
  versions, and generator provenance are no longer treated as one version
  number.
- React Aria Components 1.20.0 is a reviewed N17 candidate, not a claimed
  lockfile baseline. N17 must pin packages and generate the exact source
  manifest before the criteria profile is executable.
- The active plan and architecture map record the N15 inventory: 33 schemas,
  14 registries, 23 fixture suites, 26 positive fixtures, and 57 negative
  fixtures.

## Recovery record

PR #8 and PR #9 were marked merged against stacked feature branches rather
than `main`, so their Token and Appearance IR changes were absent from the
default branch. Recovery PR #10 recreated the PR #9 final tree on top of the
then-current `main`; merge commit `2805f56eda9567098aaa98d594338b21adb8057e`
made that tree the audit baseline. This is operational provenance, not a new
contract authority.

## Version baseline

The ADR-0004 clean break occurred before a supported external release and is
recorded as a private pre-Gate-A baseline reset. SSOT-01 v0.4.0 owns the
reconciled Token prose, Token Source Profile `0.2.0` owns the source-profile
version, and Foundation generator `0.4.0` is provenance. Existing schema IDs
become frozen compatibility identities from this baseline forward.

## Verification

The reconciliation gate checks:

- active/normative Markdown Token paths against the resolved manifest;
- local Markdown links;
- manifest counts and Token/generated-type ID equality;
- `pnpm check`;
- `pnpm test`;
- `pnpm build`;
- `git diff --check` and generated-artifact drift.

Historical implementation reports retain point-in-time names where needed and
do not override the current ADR, SSOT, registry, or manifest.
