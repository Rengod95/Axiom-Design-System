# UX02 · Canvas 선택·좌표·직접 조작

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: UX/UI 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 직접 조작의 대상은 정본의 의미 있는 부품이다

Canvas는 실제 컴포넌트의 배치와 내부 부위를 조작하는 공간이다. 전체 컴포넌트를 하나의 이미지나 사각형으로만 선택하게 해서는 안 된다. root, Part, Slot 내용, instance의 경계를 geometry와 stable ID로 연결한다.

클릭은 상위 편집 단위를 선택하고 더 깊은 선택·키 조합·레이어 트리·breadcrumb으로 내부에 접근한다. 중첩과 가려짐이 있으면 대상 목록을 제공한다. 편집/실행 모드와 잠시 실행하는 단축 조작을 명확히 표시하고 preview 클릭이 문서를 이동시키지 않게 한다.

## 초기 도구 계약

| 도구 | 문서에 남는 결과 | 필요한 피드백 |
|---|---|---|
| 이동·drag | 자유 배치 위치 또는 auto layout 순서 | 예상 부모·삽입 지점 |
| resize | fixed/hug/fill 규칙 또는 크기 | 부모 제약·min/max |
| rotate | 허용된 visual transform | pivot·layout box 차이 |
| 다중 선택·정렬·분배 | 같은 좌표계의 변경 묶음 | 혼합 부모·불가능한 조합 |
| snap | 일시 가이드에 따른 최종 값 | 끄기·정밀 입력 |
| lock/hide | 편집 잠금·디자인 표시 설정 | 실행의 disabled/hidden과 구별 |
| frame/group | 공간·구조 묶음 | 읽기 순서·부모 제약 |

Figma에 익숙한 도구·단축키 관습을 가능한 범위에서 참고하되 브라우저·OS 예약 단축키를 침범하지 않는다. 숨김의 “편집 중 숨김”과 실제 사용자에게 내용이 사라지는 “디자인 조건 숨김”은 별도 설정이다.

## 좌표와 선택 계약

좌표는 screen→viewport camera→artboard→parent local→node geometry 변환을 명시한다. zoom·scroll·rotation·iframe 경계를 역변환해 hit test한다. 브라우저 layout 좌표를 ADS의 절대 좌표로 매 프레임 저장하지 않는다.

Pointer gesture는 시작 snapshot, transient preview, commit/cancel로 나눈다. 드래그 중 수백 번 움직여도 최종 사용자 의도는 한 Undo 단위다. Escape·pointer cancel·패널 전환·선택 대상 삭제 시 중간 값을 정본으로 남길지 취소할지 일관된 규칙을 적용한다. 기본 설계안은 미완료 gesture 취소다.

## 실패와 검증

Auto layout 안에서는 재배치가 순서 변경인지 자유 위치 전환인지 보여 준다. 불가능한 reparent·순환 구조·잠긴 부모는 이유를 표시한다. geometry를 아직 측정하지 못하면 이전 박스를 최신 결과처럼 사용하지 않고 갱신 대기를 표시한다.

시험은 중첩 선택, 회전·zoom 이후 resize, 여러 부모 선택, 한글 입력 중 단축키, pointer 취소, auto layout reparent, multi-object Undo, 키보드 대체 조작을 포함한다. 엔진 선택은 이 작업의 품질·비용으로 판단하며 [ARC02 · 모듈·저장소·의존 방향](../architecture/modules-and-dependencies.md)의 비교 절차를 따른다.

## 결정 추적과 변경 영향

<a id="d23-01"></a>

**D23-01 — 확정 방향:** 클릭은 상위 단위, 더 깊은 선택·키 조합·레이어 트리로 내부 접근

<a id="d23-02"></a>

**D23-02 — 확정 방향:** 이동·크기·회전·다중 선택·정렬·분배·snap·lock/hide·frame/group + Figma에 익숙한 단축키·도구 구성을 최대한 따름

<a id="d23-03"></a>

**D23-03 — 확정 방향:** 편집/실행 모드 전환 + 눌러서 잠시 실행하는 단축 조작

전제 문서: [CMP05 · Part·slot·인스턴스·override](../components/parts-slots-and-instances.md) · [CMP10 · 외형 규칙·조건·우선순위](../components/appearance-conditions-and-precedence.md).

변경 시 함께 검토: [UX03 · 시각적 레이아웃 편집](layout-authoring.md) · [UX04 · 텍스트·폰트·벡터·이미지 편집](text-and-asset-editing.md) · [UX08 · Studio 접근성·언어·입력 품질](editor-accessibility-and-language.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
