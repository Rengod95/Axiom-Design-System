# Axiom Foundation Gap Analysis & Stabilization Plan

**Date:** 2026-08-31
**Reviewed commit:** `c48d292`
**Status:** HISTORICAL REVIEW / SUPERSEDED PLAN
**Gate A status:** **NOT READY**

> 이 문서는 ADR-0001 이전 레포 상태를 기록한 감사 자료다. 제안한 작은
> target-independent Canonical Property 모델과 당시 open 범위는
> [ADR-0001](../adr/0001-css-native-appearance-profile-and-v0.1-scope.md)에서
> 대체되었다. 현재 규범과 실행 순서는
> [docs index](../README.md)와
> [2026-09-01 active implementation plan](../plans/2026-09-01-v0.1-foundation-and-implementation-plan.md)을 따른다.

---

## 1. Executive Verdict

현재 레포는 “두 개의 vertical slice가 end-to-end로 실행되는 architecture spike”로서는 가치가 있다. 그러나 세 SSOT가 정의한 Pre-Adapter Foundation 구현으로 간주할 수는 없다.

핵심 문제는 토큰 개수가 55개로 적다는 사실 자체보다 다음 다섯 가지다.

1. **권한 순서 역전** — N0~N5 schema/registry가 없는데 Tailwind Adapter와 React binding이 먼저 구현되었다.
2. **토큰 축 혼합** — DTCG type, Axiom domain, primitive/semantic tier, theme context가 분리된 모델로 존재하지 않는다.
3. **실제 DTCG 2025.10 비준수** — local parser가 표준의 일부 type과 syntax만 흉내 내고 color value조차 2025.10 구조와 다르다.
4. **Appearance vocabulary의 target leakage와 부족한 표현력** — registry가 JSON authority가 아닌 TypeScript table이고, CSS에 가까운 property/value를 직접 Core에 노출한다.
5. **Authoring/IR/Adapter 경계 붕괴** — Recipe authoring object가 사실상 IR처럼 사용되고 Adapter가 이를 직접 import한다.

따라서 다음 단계는 token을 즉시 대량 추가하거나 새 component를 만드는 것이 아니다. **기존 downstream 구현을 spike로 동결하고, Foundation vocabulary와 normative schema를 먼저 재구축한 뒤 token/property coverage를 확장**해야 한다.

---

## 2. What Exists Today

### 2.1 Repository snapshot

| 영역 | 현재 상태 |
| --- | --- |
| Token source | `packages/tokens/src/source/tokens.json` 단일 파일 |
| Resolved tokens | 55개 |
| Top-level roots | 6개: `border`, `color`, `font`, `radius`, `size`, `space` |
| Local token type names | 5개: `color`, `dimension`, `fontFamily`, `fontWeight`, `number` |
| Theme contexts | 0개 |
| Canonical properties | TypeScript table 33개 |
| Machine-readable Axiom schemas | 0개 |
| Token Domain Registry | 없음 |
| Canonical State Registry | 없음 |
| Normalized Appearance IR schema | 없음 |
| Recipe fixtures | Button, Select 2개 |
| Required Dialog fixture | 없음 |
| Adapter | 이미 구현됨 |
| React provider binding | React Aria로 이미 구현됨 |

### 2.2 Current token distribution

| Root | Count | 문제 |
| --- | ---: | --- |
| `color` | 31 | primitive와 semantic이 같은 subtree에 혼재 |
| `space` | 5 | 전부 scale 성격이나 `scale` tier/path가 없음 |
| `size` | 6 | control/icon/popover 의미가 한 root에 섞이며 tier 식별 불가 |
| `radius` | 3 | scale 성격이나 semantic recipe에서 직접 사용 |
| `border` | 2 | SSOT domain `borderWidth`와 root 불일치 |
| `font` | 8 | SSOT domain `typography`와 root 불일치; atomic/composite 정책 없음 |

---

## 3. Critical Divergences from the SSOT Baseline

### P0 — Gate/authority violations

| SSOT requirement | Current implementation | Impact |
| --- | --- | --- |
| N0~N5 before Adapter | `spec/`와 normative schemas/registries가 없음 | TypeScript 구현이 사실상 SSOT가 됨 |
| Adapter consumes normalized IR only | Adapter generator가 `buttonRecipe`, `selectRecipe`를 직접 import | authoring shape가 Adapter 계약을 결정 |
| Provider decision deferred | React Aria package와 React binding이 이미 선택됨 | provider independence 검증 전 구현 편향 |
| Gate fixtures: Button/Select/Dialog | Button/Select만 존재 | overlay/positioning boundary 검증 불가 |
| Adapter capability/diagnostic contract | descriptor, capability, diagnostic interface 없음 | unsupported feature를 표준 방식으로 보고 불가 |

### P0 — Token model violations

| SSOT requirement | Current implementation | Impact |
| --- | --- | --- |
| DTCG 2025.10 source | hex string color와 자체 local parser | 표준 Color Module value shape를 처리하지 못함 |
| `.tokens.json` source set | `tokens.json` 단일 파일 | source role과 resolver set 구성이 드러나지 않음 |
| primitive / semantic tier | tier field/source ownership 없음 | tooling이 tier를 신뢰성 있게 판별 불가 |
| domain root grammar | `border`, `font` 등 합의 registry와 불일치 | domain validation 불가능 |
| Theme via DTCG Resolver | resolver document와 light/dark set 없음 | theme가 architecture에만 있고 실행 계약에는 없음 |
| Resolved Token Manifest contract | `{path: {type,value,cssVariable}}` | `tier`, `domain`, `dtcgType`, `deprecated`, `source`, `context` 누락 |
| Recipe → Semantic → Primitive | Recipe가 `space.2`, `radius.md`, `color.primitive.*`를 직접 참조 | theme/customization boundary 우회 |

### P0 — Appearance/IR violations

| SSOT requirement | Current implementation | Impact |
| --- | --- | --- |
| `{kind:"token", path}` | `{$type:"token", path}` | IR representation 불일치 및 DTCG `$type`과 혼동 |
| target-independent canonical property | `backgroundColor`, `borderRadius`, `flex-start`, `space-between` | Web/CSS vocabulary가 Core에 유입 |
| Property validates Axiom domain | DTCG token type만 검사 | `space`와 `size`가 모두 `dimension`이라 교차 오용 허용 |
| Canonical State Registry | Recipe별 arbitrary string | provider projection과 IR validation의 공통 authority 부재 |
| Authoring model != IR | `RecipeDefinition` object를 resolver/adapter가 직접 사용 | schema round-trip, normalization, collision diagnostic 부재 |
| Core evaluation = Base→Variant→State→Compound | recipe-engine에 adapter extension과 consumer override 포함 | downstream escape hatch가 Core semantics에 유입 |
| simple recipe need not force root | validator가 모든 recipe에 `root` 강제 | SSOT Slot contract와 충돌 |
| compound simple OR | 현재 variant condition은 단일 string만 지원 | 합의된 OR representation 미지원 |

### P1 — Governance and test gaps

- JSON Schema 2020-12와 Ajv validation이 없다.
- `@terrazzo/parser`가 없다.
- diagnostic code namespace가 없다.
- negative fixture가 일부 runtime validation test에만 존재한다.
- 별도 `tsc` fixture project와 `@ts-expect-error` type conformance suite가 없다.
- IR serialize → parse → schema validate → semantic equality test가 없다.
- generated header에 SOURCE, GENERATOR, SCHEMA VERSION이 없다.
- exact Node LTS pin이 없고 `>=22` 범위만 있다.
- current README와 `docs/architecture.md`가 SSOT보다 낮은 문서임을 표시하지 않는다.

---

## 4. The Layer Model That Should Be Frozen

사용자가 기억한 `foundation`, `semantic`, `themes`, `appearance`는 같은 종류의 레이어가 아니다. 이를 모두 token tier로 놓으면 다시 혼합된다.

권장 모델:

| 축 | 값 | 의미 |
| --- | --- | --- |
| Standard/Profile | DTCG 2025.10, Axiom profile | 허용 syntax와 normative validation |
| Token Tier | `primitive`, `semantic`, optional promoted `component` | token의 organizational/semantic distance |
| Token Domain | `color`, `space`, `size`, ... | token이 표현하는 Axiom 의미와 허용 property |
| DTCG Type | `color`, `dimension`, `shadow`, ... | serialized value shape |
| Resolver Context | `theme=light|dark`, future modifiers | 동일 token ID의 context별 resolution |
| Appearance Foundation | property/state/value registries | token을 component appearance에 적용하는 규칙 |
| Recipe/IR | base/variant/state/compound | appearance 선택과 precedence |

### Naming decision

- **Token Foundation**: primitive + semantic + theme source/resolver를 포함하는 L1 subsystem 이름
- **Primitive**: raw scale tier 이름
- **Semantic**: usage-purpose tier 이름
- **Theme**: tier가 아닌 resolver context/override
- **Appearance Foundation**: Token Foundation의 다음 domain
- **Component Token**: 기본 layer가 아니라 evidence-based promotion 결과

이 정의를 채택하면 “Foundation과 Semantic이 같은 레벨인가?”라는 혼란이 사라진다. Foundation은 subsystem이고 Semantic은 그 안의 tier다.

---

## 5. Token Type Support: Standard Completeness vs Product Vocabulary

두 범위를 분리해야 한다.

1. **Parser/Normalizer support**: 고정한 DTCG 2025.10 type을 온전히 이해해야 한다.
2. **Axiom Domain/Profile support**: Axiom이 실제 authoring에 허용할 domain/type 조합은 별도 registry로 제한한다.

DTCG 2025.10 Format/Color Module 기준 type surface:

| DTCG type | Current local support | Foundation recommendation |
| --- | --- | --- |
| `color` | 이름만 지원; value shape 비준수 | P0 strict support |
| `dimension` | 부분 지원 | P0 strict support |
| `fontFamily` | 지원 | P0 strict support |
| `fontWeight` | 지원 | P0 strict support |
| `duration` | 없음 | P0 parser support; motion domain policy 별도 |
| `cubicBezier` | 없음 | P0 parser support; easing domain 허용 |
| `number` | 지원 | P0 strict support |
| `strokeStyle` | 없음 | P1 parser/domain review |
| `border` | 없음 | P1 parser/domain review |
| `transition` | 없음 | P1 parser/domain review |
| `shadow` | 없음 | P0 parser/domain support |
| `gradient` | 없음 | P1 parser/domain review |
| `typography` | 없음 | P0 parser/domain support |

현재는 13종 중 5종의 이름만 local union에 존재한다. 그 5종도 DTCG 전체 syntax, `$root`, `$extends`, `$deprecated`, `$extensions`, composite reference를 포괄하지 않으므로 “5/13 conformance”라고 부를 수는 없다.

**Recommendation:** 표준 parsing은 직접 재구현하지 말고 `@terrazzo/parser` behind a port로 교체한다. Axiom은 parser가 반환한 표준 token을 domain/tier/context manifest로 normalize하는 책임만 소유한다.

---

## 6. Token Domain Registry: Required Revision

SSOT-01의 초기 11개 domain은 현재 구현보다 낫지만 그대로 schema로 고정하기 전에 보강해야 한다.

### 6.1 Proposed baseline domains

| Group | Proposed domains | DTCG types | Status |
| --- | --- | --- | --- |
| Paint | `color`, `gradient` | color, gradient | color P0; gradient review |
| Geometry | `space`, `size`, `radius`, `borderWidth` | dimension | P0 |
| Typography atomic | `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` | fontFamily, dimension, fontWeight, number/dimension | decision required |
| Typography composite | `typography` | typography | P0 |
| Stroke | `strokeStyle`, `border` | strokeStyle, border | P1 review |
| Effects | `shadow`, `opacity` | shadow, number | P0 |
| Motion | `duration`, `easing`, `transition` | duration, cubicBezier, transition | parser P0; Appearance integration open |
| Stacking | `layer` | number | P0 |

### 6.2 Typography is a blocking model decision

초기 SSOT는 `typography → typography` composite만 정의한다. 하지만 실제 component appearance는 font family, size, weight, line height를 독립적으로 변경할 수 있다.

두 선택지가 있다.

| Option | Model | Trade-off |
| --- | --- | --- |
| A — split atomic domains **(recommended)** | `fontSize.*`, `fontWeight.*` 등과 `typography.*` composite 병존 | property-domain validation이 정밀하고 partial override 가능 |
| B — one typography root | `typography` root 아래 여러 DTCG type 허용 | path root만으로 value semantics를 보장할 수 없어 registry가 복잡해짐 |

Option A를 권장한다. 동일한 `dimension`이어도 `space`, `fontSize`, `radius`를 구분하는 것이 Axiom Domain을 만든 이유와 일치한다.

---

## 7. Token Vocabulary Coverage That Makes the System Usable

토큰 수를 임의로 늘리지 않고, component family가 공통으로 요구하는 semantic axis를 먼저 닫는다.

### 7.1 Primitive coverage

- Color palettes: neutral + brand + red/danger + green/success + amber/warning + blue/info; 각 palette의 usable tonal scale
- Space scale: zero부터 layout spacing까지 일관된 step
- Size scale: control, icon에 alias 가능한 base scale
- Radius scale: none/sm/md/lg/xl/full
- Border width scale: zero/hairline/default/strong/focus
- Typography primitives: families, sizes, weights, line heights, letter spacing
- Shadow primitives: elevation building blocks 또는 완성 composite scale
- Opacity scale
- Duration/easing primitives
- Layer numeric scale

### 7.2 Semantic coverage

| Domain | Minimum semantic families |
| --- | --- |
| Color | canvas/surface/elevated/overlay; text/icon; border/divider/focus; action primary/secondary/neutral/destructive; status info/success/warning/danger; link/selection |
| Space | control inset/inline/block; layout stack/inline/gutter/section; overlay inset |
| Size | control, icon, touch target, field, overlay min/max |
| Radius | control, surface, overlay, round |
| Typography | body, label, title, heading, code; size/emphasis variants |
| Shadow | surface/elevated/popover/dialog/toast |
| Opacity | disabled, muted, overlay/scrim |
| Motion | instant/fast/normal/slow and productive/expressive easing |
| Layer | base/raised/sticky/dropdown/overlay/modal/toast/tooltip |

### 7.3 Semantic path grammar must be explicit

현재 `<domain>.<semantic-path>`는 primitive에도 적용되어 용어가 부정확하다.

권장 grammar:

```text
Primitive
<domain>.<scale-family>.<step>

Semantic
<domain>.<role>.<subrole?>.<variant?>.<state?>
```

단, 모든 domain에 억지로 동일 segment 수를 강제하지 않는다. Domain별 vocabulary registry와 examples/negative fixtures를 함께 둔다.

---

## 8. Theme and Resolver Foundation

Theme을 `dark.tokens.json` 같은 파일 한 장으로 끝내면 부족하다. 다음 계약이 필요하다.

### Blocking v0.1 contract

- modifier name: `theme`
- contexts: `light`, `dark`
- explicit default context
- source sets: primitive, semantic-base, theme-light override, theme-dark override
- deterministic resolution order
- context permutation별 complete manifest
- 동일 token ID 유지
- domain/type/tier 불변 validation
- unresolved alias, collision, missing semantic token diagnostics
- theme output golden fixtures

### Future-compatible modifier registry

`contrast`, `brand`, `density` 같은 modifier를 이후 추가할 수 있도록 resolver/manifest의 context를 generic record로 유지한다. 다만 v0.1 source에는 실제 사용 근거가 없는 modifier를 미리 넣지 않는다.

### Theme authoring rule

Recipe는 semantic token만 참조하고 theme 파일을 알지 못한다. Theme은 semantic token value를 override하며 primitive scale을 직접 교체하지 않는 것을 기본으로 한다.

---

## 9. Appearance Foundation: Coverage and Model Gaps

### 9.1 Property Registry needs domain validation, not type validation

현재 `backgroundColor`는 `color` DTCG type을 검사하고 `gap`은 `dimension`을 검사한다. 이 모델은 `gap`에 `size.control.md`를 넣는 것을 막을 수 없다.

필수 registry shape:

```json
{
  "name": "background",
  "category": "paint",
  "valueKinds": [
    {
      "kind": "token",
      "domains": ["color"]
    }
  ]
}
```

Property validation은 manifest의 `domain`과 `dtcgType`을 모두 사용할 수 있어야 한다.

### 9.2 Recommended property coverage groups

최종 목록은 component fixture evidence로 확정하되 다음 그룹이 빠져서는 안 된다.

| Group | Required review surface |
| --- | --- |
| Paint | background, foreground, border/outline color, icon/fill/stroke policy |
| Spacing | padding/margin logical axes, gap/row/column gap |
| Sizing | inline/block min/max, aspect ratio policy |
| Layout | display, flow direction/wrap, alignment, distribution, positioning/inset |
| Shape/Stroke | radius, per-corner policy, border/outline width and style |
| Typography | composite typography plus independently overridable atomic fields |
| Effects | shadow, opacity, visibility; blur/filter policy |
| Layering | layer/z-order abstraction, overflow axes |
| Interaction affordance | cursor, user selection, pointer event policy |
| Motion | duration/easing/transition application policy; IR DSL remains deferred |

### 9.3 Canonical values must also be target-independent

Property 이름만 바꾸고 enum에 `flex-start`, `space-between`을 남기면 target leakage가 계속된다.

권장 canonical enum:

```text
start / center / end / stretch
between / around / evenly
```

Web Adapter가 이를 `flex-start`, `space-between` 등으로 번역한다.

### 9.4 Value kinds need one more pass

기존 SSOT의 `token | enum`은 arbitrary raw CSS를 막는다는 점에서 옳다. 다만 다음을 결정해야 한다.

- unitless closed numbers를 모두 token으로 강제할지
- `flexGrow: 0|1` 같은 값에 `closedNumber` kind를 허용할지
- `transparent`, `currentColor`를 canonical enum으로 둘지 semantic token으로 둘지
- `auto`, intrinsic size, percentage 같은 값의 ownership

권장 기본은 **token + closed enum + narrowly registered scalar**다. `string`, arbitrary number, raw target value는 허용하지 않는다.

---

## 10. Recipe and IR Corrections

1. `defineRecipe()` authoring types와 JSON-compatible `AppearanceIR`을 별도 package로 분리한다.
2. Adapter와 recipe evaluator는 normalized IR만 받는다.
3. Object maps를 ordered array IR로 normalize한다.
4. global State Registry를 참조해 state name/value kind를 검증한다.
5. compound rule의 simple OR를 지원한다.
6. collision diagnostic을 생성한다.
7. Core evaluation order는 Base → Variant → State → Compound에서 끝낸다.
8. adapter extension과 consumer override는 downstream binding contract로 이동한다.
9. single-slot `root`는 convention이지 validation mandatory가 아니다.
10. direct primitive token reference를 recipe validation error 또는 최소 warning으로 처리한다.

---

## 11. Gate A Scorecard

| Gate condition | Status at reviewed commit |
| --- | --- |
| SSOT-00/01/02 present and approved | 이번 문서 작업으로 present, approval pending |
| Token Domain Registry | missing |
| Property Registry authority | TypeScript spike only; normative JSON missing |
| State Registry | missing |
| Appearance IR JSON Schema | missing |
| Button normalized fixture | missing |
| Select normalized fixture | missing |
| Dialog normalized fixture | missing |
| Negative conformance fixtures | incomplete |
| TypeScript inference fixtures | missing |
| IR round-trip | missing |

**Conclusion:** existing Adapter/React code가 동작하더라도 Gate A를 통과한 것으로 볼 수 없다.

---

## 12. Stabilization Plan

### Phase F0 — Preserve and stop downstream drift

**Goal:** 현재 spike의 증거 가치는 보존하되 Core authority로 사용하지 않는다.

Deliverables:

- SSOT-00/01/02 Markdown baseline
- 본 gap analysis
- current executable spike tag/branch 보존
- Adapter/React 신규 기능 동결
- README에서 normative authority와 spike status 명시

Exit criteria:

- 삭제 없이 현재 동작을 재현할 수 있음
- 이후 Core decision은 docs/spec에서 시작함

### Phase F1 — Foundation vocabulary reconciliation

**Goal:** schema를 작성하기 전에 axis와 이름을 확정한다.

Deliverables:

- Token tier/context/domain/type terminology matrix
- revised Token Domain Registry proposal
- domain별 path grammar와 positive/negative examples
- token inventory/coverage matrix
- property coverage matrix
- Decision Records D-01~D-08

Exit criteria:

- 어떤 항목이 tier/domain/type/context인지 모든 예시에서 기계적으로 판별 가능
- typography atomic/composite 정책 확정
- theme modifier와 override policy 확정

### Phase F2 — N0~N5 normative authority

**Goal:** language-neutral SSOT를 구현한다.

Order:

```text
N0 schema skeleton + common definitions
N1 token domain registry
N2 canonical property registry + schema
N3 canonical state registry + schema
N4 resolved token context/manifest schema
N5 normalized appearance IR schema
```

Exit criteria:

- JSON Schema 2020-12 validation
- stable `$id` and schema version policy
- prose ↔ schema reconciliation report
- registries are data, not inferred TypeScript objects

### Phase F3 — Token Foundation implementation

**Goal:** primitive/semantic/theme source에서 context manifest까지 표준 파이프라인을 만든다.

Target layout:

```text
packages/tokens/src/source/
  primitive/
    color.tokens.json
    dimension.tokens.json
    typography.tokens.json
    effect.tokens.json
    motion.tokens.json
  semantic/
    color.tokens.json
    layout.tokens.json
    typography.tokens.json
    effect.tokens.json
    motion.tokens.json
  themes/
    light.tokens.json
    dark.tokens.json
  resolver/
    axiom.resolver.json
```

Deliverables:

- `@terrazzo/parser` port
- Axiom profile validator
- light/dark resolution
- tier/domain/type/source/deprecated/context manifest
- DTCG-compliant color values
- TokenPathByDomain generation
- positive/negative/golden fixtures

Exit criteria:

- direct local DTCG parser removed or reduced to a port wrapper
- all source tokens validate against frozen DTCG/Axiom profile
- byte-stable context manifests

### Phase F4 — Appearance Foundation implementation

**Goal:** 충분히 넓지만 target-independent한 property/state vocabulary를 확정한다.

Deliverables:

- registry-generated reference TypeScript types
- `{kind:"token", path}` value representation
- domain-aware property validation
- canonical enum mapping tests
- diagnostic namespace implementation
- property coverage fixtures across Button/Select/Dialog

Exit criteria:

- wrong-domain token assignment fails at schema/runtime/type test levels
- Web property 이름 없이 Core fixture 작성 가능

### Phase F5 — Recipe Authoring and Normalized IR

**Goal:** authoring ergonomics와 compiler input을 분리한다.

Deliverables:

- `defineRecipe()` SDK
- normalizer
- deterministic ordering
- collision diagnostics
- Button/Select/Dialog authoring + normalized JSON fixtures
- negative/type/round-trip suite

Exit criteria:

- Adapter package import 없이 모든 Gate A conformance test 통과
- serialized IR semantic equality 보장

### Phase F6 — Reconciliation and Gate A

**Goal:** Foundation을 닫고 Adapter 재진입 여부를 판정한다.

Review lenses:

- SSOT ↔ schema ↔ registry ↔ fixture ↔ TypeScript consistency
- domain/property coverage sufficiency
- theme permutation completeness
- primitive leakage
- target/provider leakage
- determinism and diagnostics

Gate result:

- PASS: Tailwind Adapter를 normalized IR compiler backend로 재작성
- FAIL: deficiency를 ADR로 기록하고 Foundation만 수정

---

## 13. Decisions Requiring Discussion

| ID | Question | Recommendation | Blocking phase |
| --- | --- | --- | --- |
| D-01 | Foundation/Primitive/Semantic/Theme 관계 | Foundation=subsystem, primitive/semantic=tier, theme=context | F1 |
| D-02 | Component Token 기본 layer 여부 | 기본 제외; evidence-based promotion | F1/F5 |
| D-03 | Typography domain 구조 | atomic domains + composite typography 병존 | F1 |
| D-04 | DTCG support 범위 | parser는 13 type 전체; Axiom domain은 allowlist | F1/F3 |
| D-05 | Property value kinds | token + enum + narrowly registered scalar | F1/F2 |
| D-06 | Primitive direct reference in Recipe | 금지; migration 동안 warning 후 error | F1/F5 |
| D-07 | Theme modifiers | v0.1 `theme=light|dark`; generic context record 유지 | F1/F3 |
| D-08 | Existing Adapter/React code 처리 | 삭제하지 않고 executable spike로 동결 | F0 |
| D-09 | Motion tokens vs motion DSL | token parsing/domain은 포함, Recipe motion DSL은 deferred | F1/F2 |
| D-10 | Consumer/adapter overrides | Core IR 밖 downstream policy로 이동 | F1/F5 |

이 중 D-01, D-03, D-04, D-05, D-07은 N0~N5 schema shape를 바꾸므로 F2 이전에 결정해야 한다.

---

## 14. Recommended Immediate Next Work

다음 구현 세션은 `N0`부터 바로 시작하지 않는다. 먼저 F1에서 아래 네 산출물을 순서대로 만든다.

1. **Token Taxonomy & Naming Specification**
   tier/domain/type/context 정의, domain registry revision, path grammar
2. **Token Coverage Matrix v0.1**
   primitive/semantic/theme별 required vocabulary와 fixture usage
3. **Appearance Property & Value Model Proposal**
   property group, allowed domain, value kind, target mapping boundary
4. **Foundation Decision Ledger**
   D-01~D-10의 accepted/rejected/deferred 상태

이 네 문서가 승인되면 N0~N5 schema를 작성한다. 그 전에는 token JSON을 대량 확장하지 않는다. 그렇지 않으면 새 token도 현재의 혼합된 경로와 불완전한 domain model을 그대로 증식시킨다.

---

## References

- [SSOT-00 — System Architecture & Standards Profile](../ssot/00-system-architecture-and-standards-profile.md)
- [SSOT-01 — Foundation & Domain Contracts](../ssot/01-foundation-and-domain-contracts.md)
- [SSOT-02 — Adapter Contract, Readiness & Governance](../ssot/02-adapter-contract-readiness-and-governance.md)
- [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [Design Tokens Color Module 2025.10](https://www.designtokens.org/TR/2025.10/color/)
- [Design Tokens Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)
