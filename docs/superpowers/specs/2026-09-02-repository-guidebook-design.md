# Axiom Repository Guidebook Design

**Status:** Approved for implementation\
**Baseline:** `main` at `4546147ba7537aee9188a82b3f35fe266f2f1422`\
**Audience:** Axiom을 처음 접하는 contributor, reviewer, adapter/compiler author\
**Language:** 한국어 본문과 영문 code identifier, signature, path

## 1. Purpose

Axiom에는 authority를 소유하는 ADR·SSOT·machine-readable spec과 현재 구현을
요약하는 architecture 문서가 있지만, 처음 온 사람이 저장소를 처음부터 끝까지
읽으며 하나의 mental model을 형성할 수 있는 연속적인 안내서는 없다. 새 가이드북은
다음 질문을 읽는 순서대로 답한다.

1. Axiom은 무엇을 만들고 있으며 왜 contract-first인가?
2. 어떤 자료가 결정을 소유하고 구현은 그 결정을 어떻게 따른다?
3. Token, CSS property, Condition, State, Appearance IR 데이터는 어디에서 시작해
   어떤 검증·생성 경계를 통과하는가?
4. 각 root directory, package, source directory, module은 무엇을 소유하는가?
5. 각 function, class, constructor, method, exported contract는 어떤 입력을 받고
   무엇을 반환하며, 어떤 실패·side effect를 가질 수 있는가?
6. 특정 변경을 하려면 어디서 시작하고 어떤 artifact와 test를 함께 갱신해야 하는가?

가이드북은 설명용 entry point다. ADR, SSOT, schema, registry의 authority를 대체하거나
동일한 규범을 별도 문장으로 재정의하지 않는다.

## 2. Success criteria

가이드북은 다음 조건을 모두 만족해야 한다.

- 저장소를 처음 보는 독자가 위에서 아래로 한 번 읽어 현재 N0–N15 architecture와
  legal dependency direction을 설명할 수 있다.
- root directory와 직접 관리하는 source/configuration 영역의 역할을 빠짐없이 찾을 수
  있다.
- 현재 4개 workspace package와 package 내부 source directory의 책임, 입력, 출력,
  dependency, public entry point를 찾을 수 있다.
- 패키지 비테스트 source module 44개, 기존 repository policy script 3개와 이번
  작업에서 추가하는 guidebook coverage script를 모두 설명한다.
- handwritten module의 named top-level function, arrow-function constant, class,
  constructor, method, getter, setter와 exported contract의 역할을 찾을 수 있다.
- generated module은 모든 generated union member를 복제하지 않고 source,
  generator, provenance, consumer, drift gate를 설명한다.
- 각 구현 module에서 관련 test, fixture, schema, registry, owning SSOT로 이동할 수 있다.
- 새로운 non-test source module이 추가됐지만 가이드북에 등록되지 않은 경우 CI가
  이를 감지한다.
- `pnpm check`, `pnpm test`, `pnpm build`가 기존과 동일하게 통과한다.

## 3. Scope

### 3.1 Included

- root mental model, authority order, lifecycle, dependency direction
- root files와 `docs/`, `spec/`, `fixtures/`, `tokens/`, `packages/`, `scripts/` 역할
- `spec/`의 schema, registry, fixture 관계와 manifest-driven validation flow
- Token source → parse → normalize → validate → resolve → manifest/type generation flow
- Webref → sparse policy → effective CSS registry → binding coverage/type generation flow
- Condition, State, declaration, Appearance IR의 현재 N15 validation flow
- 4개 package의 public API와 internal module reference
- repository policy scripts와 quality command의 실행 순서
- 변경 유형별 navigation recipe와 impact checklist
- glossary, diagnostics model, generated-file policy, NodeNext `.js` import 이유

### 3.2 Excluded

- ADR·SSOT·schema 문구를 가이드북이 새 authority로 재정의하는 일
- 635개 Token path, 818개 CSS property, 모든 JSON Schema property, fixture body의
  전면 복제
- `dist/`, `node_modules/`, `.git/`의 generated or external internals
- test callback과 anonymous inline callback을 function reference 항목으로 열거하는 일
- N16 이후 아직 구현되지 않은 package, compiler, runtime API를 현재 구현처럼 설명하는 일
- 이번 변경에서 source implementation이나 normative contract를 수정하는 일
- 모든 기존 function에 TSDoc을 소급 추가하는 일. 가이드북은 향후 source-level TSDoc
  규칙을 보완하지만 대신하지 않는다.

## 4. Chosen approach

### 4.1 Progressive all-in-one guide with a coverage gate

`docs/guidebook.md` 하나를 reader-facing artifact로 둔다. 본문은 concept에서 detail로
내려가며, 같은 파일 안에서 overview와 module/API reference를 anchor link로 연결한다.
별도의 `scripts/check-guidebook-coverage.mjs`는 현재 source tree와 module catalog를
대조해 새 module이 설명 없이 추가되는 것을 막는다.

이 방식은 한 파일을 처음부터 끝까지 읽을 수 있다는 요청을 지키면서, 계속 진행될
N16–N28 작업으로 문서가 조용히 낡는 위험을 줄인다.

### 4.2 Considered alternatives

| Approach | Advantage | Rejected reason |
| --- | --- | --- |
| 수동 단일 Markdown만 작성 | 구현이 가장 단순함 | 새 module 추가 시 누락을 자동 감지하지 못함 |
| package별 여러 문서로 분할 | 각 package owner가 관리하기 쉬움 | 처음부터 끝까지 읽는 all-in-one 경로가 분산됨 |
| API 문서 생성기를 도입 | symbol coverage를 자동화할 수 있음 | 현재 규모에 비해 dependency와 generated noise가 크고 narrative mental model을 만들지 못함 |

API generator는 도입하지 않는다. 작은 coverage script와 사람이 작성한 설명을 결합한다.

## 5. Deliverables

| File | Responsibility |
| --- | --- |
| `docs/guidebook.md` | 유일한 reader-facing 올인원 가이드북 |
| `scripts/check-guidebook-coverage.mjs` | source module catalog와 현재 tree의 누락·stale path 검사 |
| `package.json` | `guidebook:check` command와 aggregate `check` 연결 |
| `README.md` | 처음 온 독자를 guidebook으로 안내 |
| `docs/README.md` | documentation authority index에서 guidebook의 비규범적 위치를 명시 |

coverage script는 가이드북 내용을 생성하거나 수정하지 않는다. 문서에 기록된 module
catalog를 읽고 실제 tree와 비교하는 read-only policy check다.

## 6. Guidebook information architecture

`docs/guidebook.md`는 아래 순서를 고정한다.

1. **How to read this book** — 대상 독자, normative/non-normative 경계, 현재 baseline
2. **Axiom in one mental model** — contract-first 개념과 authority cascade
3. **Repository map** — root file과 directory ownership
4. **System topology** — 현재 package graph와 금지된 dependency direction
5. **Core concepts** — Token tier/context, CSS property policy, State, Condition,
   declaration, Appearance IR, diagnostic, fixture, generated artifact
6. **End-to-end flows** — Token lane, CSS lane, spec validation lane, Appearance IR lane
7. **Workspace and commands** — pnpm, TypeScript project references, Vitest, check/build
8. **Package guide: `@axiom/tokens`**
9. **Package guide: `@axiom/token-tooling`**
10. **Package guide: `@axiom/css-property-profile`**
11. **Package guide: `@axiom/spec-tooling`**
12. **Repository policy scripts**
13. **Normative data directories** — `tokens/`, `spec/`, `fixtures/`
14. **Change recipes** — Token, schema/registry, parser, CSS property policy,
    semantic validator, generated artifact 변경 절차
15. **Failure and diagnostics guide** — error/diagnostic 경계와 흔한 gate failure
16. **Testing and review map** — unit, fixture, drift, type/build validation
17. **Glossary and reading paths** — 역할별 다음 읽기 경로
18. **Complete module and API index** — 모든 module anchor와 identifier 역색인

앞 절은 narrative 설명이고, package guide부터는 reference 성격을 강화한다. 독자는
처음부터 읽거나 마지막 index에서 필요한 module로 바로 이동할 수 있다.

## 7. Documentation unit contracts

### 7.1 Package entry

각 package는 같은 형식으로 설명한다.

- 한 문장 responsibility
- owns / does not own
- input / output contracts
- direct dependency와 허용된 consumer
- public entry point와 `package.json#exports`
- source directory tree
- end-to-end flow에서의 위치
- module reference
- related ADR, SSOT, schema, registry, fixture, test
- safe extension points와 금지된 dependency

### 7.2 Directory entry

각 directory는 `Purpose`, `Contains`, `Authority`, `Change together`를 설명한다.
단순히 하위 파일명을 나열하지 않고, 왜 해당 경계가 별도 owner인지 밝힌다.

### 7.3 Module entry

모든 대상 module은 다음 정보를 가진다.

```markdown
#### `packages/example/src/example.ts`

- **Role:** 이 module이 소유하는 한 가지 책임
- **Inputs:** 신뢰 경계와 입력 contract
- **Outputs:** 반환값, artifact, diagnostic
- **Dependencies:** import 방향과 사용 이유
- **Side effects:** filesystem/process I/O 또는 `none`
- **Related evidence:** test, fixture, schema, registry, SSOT

| Identifier | Visibility | Responsibility | Failure/side effect |
| --- | --- | --- | --- |
| `exampleFunction(input): Output` | public | ... | ... |
```

`index.ts`, `constants.ts`, `contracts.ts`, `cli.ts`, generated modules도 생략하지 않고
각각 export boundary, static ownership, serializable contract, orchestration,
generated provenance 관점에서 설명한다.

### 7.4 Identifier coverage

가이드북에서 개별 역할을 설명할 대상은 다음과 같다.

- named top-level `function` declaration
- named top-level `const` whose initializer is an arrow/function expression
- `class`, `constructor`, named method, getter, setter
- exported `type`, `interface`, error class, protocol/policy constant group
- `index.ts`가 노출하는 re-export

anonymous callback은 호출하는 named operation의 algorithm 설명에 포함한다. 단순
상수 하나하나를 반복 설명하지 않고 책임이 같은 constant group으로 묶되, externally
observable protocol version과 diagnostic code owner는 명시한다.

## 8. Coverage and freshness design

### 8.1 Machine-readable module catalog

가이드북의 module heading은 아래 HTML comment를 바로 앞에 둔다.

```markdown
<!-- guidebook-module: packages/tokens/src/domain/identity.ts -->
#### `identity.ts`
```

`scripts/check-guidebook-coverage.mjs`는 다음 집합을 비교한다.

- actual: `packages/*/src/**/*.ts` 중 `*.test.ts`를 제외한 파일과 `scripts/*.mjs`
- documented: `guidebook-module` marker에 기록된 path

두 집합이 다르거나 marker가 중복되거나 존재하지 않는 path를 가리키면 실패한다.
generated source도 actual set에 포함한다. `dist/`, dependency, test module은 제외한다.

### 8.2 Human-reviewed symbol coverage

TypeScript 7 compiler API의 unstable surface나 새 parser dependency에 문서 gate를
묶지 않는다. 최초 작성 시 source module별 named declaration inventory를 추출해
수동으로 대조하고, review checklist에 identifier coverage를 남긴다. 이후 module이
변경될 때 contributor는 해당 module entry를 함께 검토한다.

향후 stable AST API나 repository-wide code index가 확정되면 symbol-level gate는 별도
ADR 없이 internal tooling improvement로 제안할 수 있지만, 이번 scope에는 포함하지
않는다.

### 8.3 Baseline statements

가이드북은 `main`의 구현 checkpoint를 명시하되 숫자를 영구 architecture처럼 쓰지
않는다. 4 packages, 44 package source modules, 기존 policy scripts 3개,
N0–N15라는 값은 설계 시점의 inventory임을 표시한다. 구현 후에는 새 guidebook
coverage script를 포함한 policy scripts 4개를 설명한다. Token/property/schema 수는
생성 command로 재확인하는 방법과 함께 기록한다.

## 9. Data-flow presentation

관계가 많은 부분만 compact Mermaid diagram으로 표현한다.

- authority cascade
- current package dependency graph
- Token source-to-artifact flow
- CSS Webref-to-profile flow
- spec manifest-to-diagnostic flow

정확한 path/owner mapping은 Markdown table을 사용한다. 두 단계 이하의 단순 관계나
API 목록은 diagram으로 만들지 않는다. diagram label은 domain noun과 action을 짧게
유지하며 아직 존재하지 않는 N16+ package를 current topology에 넣지 않는다.

## 10. Normative safety

- 모든 규범 문장은 owning ADR, SSOT, schema, registry로 link한다.
- 가이드북 자체에는 `Non-normative orientation` label을 둔다.
- authority conflict가 발견되면 가이드북 문구로 봉합하지 않고 기존 reconciliation
  protocol에 따라 작업을 중단한다.
- historical implementation report는 provenance 설명에만 사용하고 current behavior의
  근거로 사용하지 않는다.
- source code의 역할 설명은 관찰한 구현을 요약하되, 보장 사항은 public contract나
  normative source가 존재할 때만 보장으로 표현한다.
- NodeNext relative `.js` import처럼 오해하기 쉬운 결정은 이유와 변경 조건을 함께
  설명한다.

## 11. Verification strategy

### 11.1 Coverage check behavior

checker 구현 시 최소 다음 동작을 검증한다.

- 현재 source module catalog가 모두 있으면 exit code `0`
- actual module 하나가 catalog에서 빠지면 실패하고 path를 출력
- 존재하지 않는 stale path가 catalog에 있으면 실패하고 path를 출력
- duplicate marker가 있으면 실패
- test와 `dist/` module은 actual set에서 제외

### 11.2 Documentation checks

- 모든 local Markdown link target이 존재하는지 검사
- 모든 48개 target module marker가 정확히 한 번 존재하는지 검사
- source inventory와 package/directory/API checklist를 재대조
- guidebook에서 미래 package를 현재 구현으로 서술하지 않았는지 확인
- 미완성 표식, placeholder와 깨진 anchor를 검사
- `git diff --check`

### 11.3 Repository gates

최종 tree에서 다음을 새로 실행한다.

```bash
pnpm guidebook:check
pnpm check
pnpm test
pnpm build
```

## 12. Implementation sequence

1. source tree와 named declaration inventory를 고정한다.
2. coverage checker의 failure cases를 먼저 검증한다.
3. guidebook skeleton과 module marker contract를 작성한다.
4. mental model, authority, topology, end-to-end flow를 작성한다.
5. root directory와 normative data directory guide를 작성한다.
6. 4개 package의 44개 source module/API reference를 작성한다.
7. 3개 policy script, commands, change recipes, diagnostics, test map을 작성한다.
8. complete index와 glossary를 작성한다.
9. root/documentation index에서 가이드북으로 연결한다.
10. coverage, links, inventory, full repository gates를 실행한다.

## 13. Review checklist

- [ ] 본문은 한국어이고 code identifier, signature, path는 영문 원문이다.
- [ ] narrative에서 reference로 자연스럽게 깊어지는 reading order다.
- [ ] guidebook은 non-normative이며 authority를 복제하거나 변경하지 않는다.
- [ ] 4 packages, 44 source modules, 최종 policy scripts 4개를 모두 다룬다.
- [ ] 대상 named function, class, method, exported contract의 역할이 설명된다.
- [ ] generated artifact는 provenance와 drift gate로 설명된다.
- [ ] dependency direction과 forbidden boundary가 명확하다.
- [ ] change recipe가 authority-first 순서를 지킨다.
- [ ] module coverage gate가 새 source module의 문서 누락을 막는다.
- [ ] N16+ planned scope를 current implementation으로 오해하게 하지 않는다.
