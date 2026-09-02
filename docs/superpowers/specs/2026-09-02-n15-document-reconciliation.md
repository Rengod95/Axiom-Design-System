# N15 document reconciliation design

**Status:** APPROVED CONTINUATION \
**Date:** 2026-09-02 \
**Scope:** Documentation authority after the Token clean break and N15

## Goal

Reconcile the accepted Token clean break and implemented N0–N15 contracts into
the active ADR, SSOT, annex, architecture, and sequencing documents before N16
begins. The user's production Token requirements are decision inputs that
supersede conflicting draft prose; ADR-0004 records that decision, and the SSOT
must describe the resulting contract rather than preserve the obsolete draft.

## Authority design

The repository-wide authority order remains ADR → SSOT → machine-readable
contract → fixture → generated artifact → implementation. An explicit owner
directive is requirement input, not a permanent implementation authority. When
it changes an unreleased contract, the change is blocked at reconciliation
until an ADR records the decision and every affected SSOT and normative input
agrees. ADR-0004 is that record for the Token clean break.

Historical reports retain their point-in-time content. Active and normative
documents must identify historical paths as removed rather than presenting them
as current examples.

## Token baseline

The reconciled baseline is the tree merged through recovery PR #10:

- 635 Token IDs in each light/dark context;
- Token Source Profile `0.2.0`;
- Foundation generator `0.4.0`;
- primitive/semantic/component tiers;
- 4px spacing rhythm, 16px root type size, and 13px minimum body style;
- canonical `xs`–`xl` semantic scales;
- OKLCH authored palettes with lowercase six-digit sRGB fallbacks;
- `background`, `surface`, and `fill` responsibility separation;
- no `color.semantic.action`, `color.semantic.surface.sunken`, or
  `space.semantic.overlap` compatibility aliases.

Normative examples must use Token IDs present in the resolved manifest. Family
prefixes may appear only when explicitly marked as patterns.

## Motion boundary

N16 consumes the same Condition Registry used to produce
`conditionRegistryDigest`; `MotionCompilerInput` therefore includes the
registry. Reduced-motion names have separate owners:

- `preference.reducedMotion` is the environment Condition ID;
- `reducedMotion` is the required Motion IR strategy field;
- `motionSuppressed` is the canonical lifecycle observation after the normal
  motion path is disabled or replaced.

The compiler validates registry identity and digest. Runtime bindings observe
the preference, apply the IR strategy, and project `motionSuppressed`; none of
these names are aliases.

## Versioning boundary

Document revisions, schema compatibility identities, source/profile versions,
and generator versions are distinct. A breaking pre-1.0 schema or IR change
increments the schema compatibility line instead of mutating an already
published identity. The ADR-0004 migration is recorded as a private,
pre-Gate-A baseline reset: it had no supported external consumer and was not an
in-place public compatibility promise. The current schema identities become
the frozen starting point; later incompatible changes require new identities
and migration fixtures.

## Completion evidence

The reconciliation is complete when active/normative Markdown contains no
unmarked removed Token path, local links resolve, the manifest inventory and
N15 status are current, the React Aria text does not claim an absent lockfile
dependency, and the full repository quality gate remains green.
