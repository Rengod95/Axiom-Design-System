# ADR-0005 — Behavior Criteria Schema Sequencing

**Status:** ACCEPTED \
**Date:** 2026-09-02 \
**Decision owners:** Axiom Foundation \
**Amends:** ADR-0002, SSOT-00, SSOT-02, SSOT-05, React Aria Behavioral Criteria Profile

## Context

Current prose assigns React Aria lockfile pinning and executable source data to
N17, while SSOT-02 assigns manifests and profiles to N32. The N15 lockfile
contains none of the provider packages, so N17 cannot truthfully publish a
current provider baseline.

## Decision

N17 owns only closed Behavior Criteria Source/Profile schemas, synthetic
structural fixtures, deterministic schema tooling, and the manifest-digest
algorithm. The digest is SHA-256 of canonical JSON with `manifestDigest`
omitted. Evidence declarations use `pinned-artifact` and a repository-relative
artifact path.

N32 pins the provider packages, records real lockfile integrity and evidence,
and generates the current source manifest, Button/Select/Dialog profiles, and
provider diff. N33 owns `behavior-projection.schema.json`, cross-coverage, and
component-local provider-to-canonical projections. N17 neither installs a
provider dependency nor creates a current behavior registry.

The N17 contracts are authoritative under this accepted sequencing decision.
