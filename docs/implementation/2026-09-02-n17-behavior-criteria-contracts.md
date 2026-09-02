# N17 Behavior Criteria Contracts

**Status:** COMPLETE \
**Date:** 2026-09-02

N17 adds two closed schemas, two structural fixture suites, and semantic
validation for reproducible source-manifest digest and criteria projection
shape. Fixtures use visibly synthetic provider package data; no provider package
or current source/profile registry is installed.

The accepted sequencing assigns lockfile pinning, evidence capture, current
profiles, and provider diffs to N32. It assigns
`behavior-projection.schema.json` and evidence/projection cross-coverage to
N33. The N17 delta is +2 schemas, +0 registries, +2 fixture suites, +4 positive
fixtures, and +16 negative fixtures. The normative negative corpus covers every
N17 semantic diagnostic (`AXB1201`–`AXB1210`), digest-drifted evidence, and an
unavailable pinned artifact. Direct harness tests also cover valid bytes and a
repository-escaping symlink. Artifact validation resolves real paths before
reading bytes, so a symlink cannot bypass the repository boundary.

Related fixtures are no longer trusted as untyped JSON paths. Each relation
declares its schema and semantic validator in `spec/manifest.json`; the harness
validates that source, including its pinned artifacts, before exposing it to a
paired profile validator.
