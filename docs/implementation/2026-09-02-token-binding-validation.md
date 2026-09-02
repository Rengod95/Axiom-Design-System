# N21 Token Binding Validation

Status: **COMPLETE — declaration-aware Token semantic boundary**.

`@axiom/appearance-authoring` requires explicit resolved Token, Domain,
projector, canonical-digest, serializer, projector, and CSS property-policy
source inputs. It composes the public profile policy validator with
every-context identity, exact serializer and projector checks,
direct/template/negation grammar proof, and projector output revalidation. The
frozen receipt is not CSS, class output, collision analysis, or Appearance IR.
It records the manifest source identity and complete validated context set,
while each binding keeps source-ordered per-Token Domain/type/serializer
evidence and an escaped structural pointer.

Injected digest, serializer, and projector ports are verified through typed
diagnostics. Composite projector Domains use their registered projector
identity as the serializer evidence; they do not require a redundant direct
Token serializer port. Token-derived and parameter-derived projector outputs
re-enter the appropriate Token or CSS-literal policy path respectively.

`css.shadow.v1` is authoritative. Projector blueprints preserve unresolved
Token references or transition parameter CSS literals and field lineage for
N22. `@axiom/tokens` exports schema-faithful Domain/projector contracts and
reusable manifest indexing/digest helpers without importing CSS policy.

The receipt binds the exact canonical digest of the full Effective CSS Property
Registry and its exact `{ policy, bindings }` source in addition to
`profileInputDigest`. N21 verifies the source digest against
`profile.policySourceDigest` and derives `conditionOnlyDomains` only from that
authenticated Catalog. This makes resolved property and condition-only policy
N21 authority: unchanged Webref metadata or a caller-replaced Domain list
cannot authorize a receipt after policy changes. N21 owns its closed
authority-shape and semantic checks because importing the upward spec harness
would violate the package graph; generated Tokens helpers remain the reusable
downward boundary.
