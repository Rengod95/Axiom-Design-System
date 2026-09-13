# Common-envelope schema evidence

Accepted scope: [ADR-0010](../adr/0010-source-preserving-draft-authoring.md). Owner: SYN02/ARC02. This supplies the first bounded SEL04 evidence, not completion of all ADS schemas or public type generation.

The selected JSON Schema 2020-12 common-envelope source is [document-envelope.json](../../modules/ads-core/schema/document-envelope.json). Its required fields and properties are checked against the approved Foundation field catalog; identity patterns/kinds are checked against core constants. Unknown additional fields remain data, while metadata/extensions must be objects. A nonempty future schemaVersion remains explicitly unverified. Token standards are outside this schema.

Ajv 8.20.0 is pinned with its lockfile integrity as a development dependency. A deterministic [generator](../../scripts/generate-ads-validator.mjs) produces ESM code with source/generator hashes and a [license notice](schema-compiler-notice.md). `pnpm check` reproduces and compares this code without modifying it. The runtime uses a strictly typed wrapper; it imports no Ajv runtime and performs no schema compilation, network request, coercion, default insertion or property removal.

## Evidence and limits

- [Schema tests](../../modules/ads-core/test/schema-validation.test.ts) exercise 30 explicitly expected positive/negative envelopes and compare the standalone result with an independently compiled Ajv validator. They include every known document kind, required/type failures, reserved IDs, whitespace, future version text and preserved unknown data.
- Diagnostic assertions verify JSON pointer paths and source identity; strict duplicate-key and malformed-JSON parsing remains ahead of schema validation.
- The generated validator executes in a Node VM with no Node globals and string/wasm code generation disabled. This tests the CSP-relevant execution property; it is not a browser UI integration result or an arbitrary-host-code sandbox.
- The source guard rejects runtime code generation and permits a generated-code type-check suppression only at the exact generated path. Handwritten source remains strict TypeScript. Generated-code drift and differential tests are mandatory because the compiler's JavaScript body is not manually typed.

Extending the bespoke checker would duplicate the inspectable schema authority. Runtime compilation adds initialization and Function construction that standalone generation avoids. TypeBox/Zod public authoring/type-generation, dynamic registered schemas, complete domain expression, production-browser measurements and public distribution packaging remain open comparisons. The first-envelope result does not declare SEL04 fully closed. [Ajv standalone documentation](https://ajv.js.org/standalone.html), [JSON Schema dialect](https://json-schema.org/draft/2020-12).
