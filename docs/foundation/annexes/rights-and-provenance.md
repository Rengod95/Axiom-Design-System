# 소스·자산 권리와 고지 관리

현재 저장소 LICENSE는 MIT이며 원본 bytes를 유지한다. 이 문서가 공개 코어의 새 라이선스나 Studio 기업 계약을 확정하지 않는다. 이미 공개한 코드의 권리는 소급 회수하지 않는다. 향후 파일별 권리와 공개 범위는 BIZ01·SEL13을 따른다.

## 산출물별 권리 표

| 대상 | 확인할 권리·조건 | 고지 위치 |
|---|---|---|
| 공개 코어 | 기여자 권한·배포/수정 소스·license 호환 | LICENSE·파일 header·package metadata |
| 비공개 Studio | 소유권·기업 감사/수정·제3자 배포 | 기업 계약·제품 이용 조건 |
| SDK·타깃 runtime | 사용자 앱 재배포·linking·소스 의무 | package notice·소비 안내 |
| 기본 template | 생성된 코드에 포함되는 부분의 사용권 | 출력 manifest·파일별 고지 |
| 사용자 ADS·소스 | 사용자 소유·이식·구독 종료 후 사용 | 이용 조건·export 안내 |
| 폰트·이미지·로고 | embedding·수정·배포·범위/기간 | asset record·bundle notices |

MPL의 파일 단위 조건과 AGPL의 네트워크 수정 소스 관련 조건은 실제 조합·배포 형태를 대조해 선택한다. OSS에 경쟁 용도 금지를 넣어 동일한 의미로 광고하지 않는다. [MPL 원문](https://www.mozilla.org/en-US/MPL/2.0/), [AGPL 원문](https://opensource.org/license/agpl-3.0), [OSI 정의](https://opensource.org/osd)

## 참조·후보 dependency 목록

아래는 채택된 dependency lock이 아니다. 기술 연구·후보 선정에 등장한 목록이다. 실제 코드 편입 전 정확한 version/commit·license text·직접/전이 의존·설치 script·notice를 고정한다. 상용 editor 소스를 읽는 행위와 코드 복사는 다르다.

| 대상 | 사용 목적 | 원본 |
|---|---|---|
| React | Studio/Web runtime candidate | [공식 자료](https://react.dev/) |
| React Aria | Web behavior candidate | [공식 자료](https://react-aria.adobe.com/customization) |
| Base UI | Web behavior candidate | [공식 자료](https://base-ui.com/react/overview/about) |
| shadcn/ui | source/template reference | [공식 자료](https://ui.shadcn.com/) |
| Mantine | catalog/UX reference | [공식 자료](https://mantine.dev/) |
| Plasmic | editor/source research | [공식 자료](https://github.com/plasmicapp/plasmic) |
| Yoga | layout candidate | [공식 자료](https://www.yogalayout.dev/docs/about-yoga) |
| Motion | Web motion candidate | [공식 자료](https://motion.dev/docs/react-animation) |
| Tiptap/ProseMirror | text candidate | [공식 자료](https://tiptap.dev/docs/editor/getting-started/overview) |
| Lexical | text candidate | [공식 자료](https://lexical.dev/) |
| Yjs | collaboration candidate | [공식 자료](https://github.com/yjs/yjs) |
| Automerge | collaboration candidate | [공식 자료](https://automerge.org/) |
| Ajv | schema validation candidate | [공식 자료](https://ajv.js.org/guide/managing-schemas.html) |
| tldraw | last-resort editor candidate | [공식 자료](https://tldraw.dev/sdk-features/license-key) |
| PixiJS Layout | last-resort rendering/layout reference | [공식 자료](https://layout.pixijs.io/) |
| Playwright/axe | testing candidate | [공식 자료](https://playwright.dev/docs/accessibility-testing) |

## 자산·고지 record

SourceRecord는 원본 URL 또는 사용자 제공 경로의 식별 정보, author, acquiredAt, content hash, 수정·파생 관계를 가진다. LicenseRecord는 license ID/text reference, copyright notice, permitted uses, redistribution/embedding constraints, rights evidence, reviewer/date를 가진다.

예를 들어 사용자 폰트는 web embedding이 가능해도 native app bundle 권리를 별도로 확인한다. rightsStatus unknown이면 해당 배포를 보류하고 대체 자산을 제안한다. 사용자가 만든 기본 로고·유료 폰트 등 실제 production asset은 현재 문서 변경에 포함되지 않았다.

Notice 생성은 선택한 dependency·복사 코드·직접/간접 asset closure에서 빠짐없이 모은다. 동일 asset bytes를 중복 제거해도 서로 다른 source/license 기록을 지우지 않는다. source export·npm·Git·native resource 각 전달 방식의 고지 포함을 검사한다.

## 변경·검증

License·version·asset이 바뀌면 소비 방식·오픈 코어/Studio 경계·출력 권리·offline 배포에 미치는 영향을 다시 검토한다. 값이 미정인 항목을 MIT라고 추측하지 않는다. tldraw 같은 후보의 production 이용 조건도 실제 채택 시 확인한다.

[권리 registry](rights-register.json)는 현재 보존한 LICENSE hash와 후보 상태를 기록한다. 구현 단계에서 실제 파일·패키지·notice 목록을 채우고 release manifest와 대조한다.
