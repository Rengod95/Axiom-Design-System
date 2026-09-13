# 카탈로그와 타깃별 의무

상태: 검토용 정규화 목록. 2026-09-11의 공식 카탈로그 조사 330행을 239개 표기 정규화 항목으로 연결했다. 제공자 최신 버전 전수 실행 검증이나 Axiom 구현 완료 수가 아니다.

## 정규화 기준과 출시 범위

공백·구분자·대소문자만 정규화했다. 예를 들어 ComboBox/Combobox의 표기는 묶되 제공자별 계약은 providerVariants에 남긴다. 이름이 다른 동일 목적 후보도 증거 없이 합치지 않는다. 아래 항목은 컴포넌트·부품·템플릿·실행 도구를 구별한 설계 분류이며 해당 제공자의 공식 taxonomy를 대신하지 않는다.

Component는 독립 UI 목적, Part는 compound의 부품/보조 control, Template은 여러 목적의 구성, Utility는 환경·실행 지원을 뜻한다. 동일 항목의 독립 사용 여부가 달라지면 kind를 세분화한다. Utility에는 연결·수명·도구 의무를 시험한다.

초기 전체 카탈로그 요구는 유지한다. Web에서만 쓰는 구현 개념(Portal 등)은 native의 동등한 layering·host 목적을 평가하고 정확한 대응을 profile에 정의한다. 단순 N/A로 카탈로그 범위를 삭제하지 않는다. Rich editor·schedule·chart의 복잡성도 별도 profile과 공개 API·접근성 의무로 추적한다. 업무 데이터는 소비 앱이 제공한다.

## 카탈로그별 검증 의무

각 provider variant는 family의 공통 의무 + 실제 trait binding 의무 + 해당 유형의 profile 구체화 + target 요구를 모두 가진다. 그 조합과 oracle가 구현된 뒤 실제 evidence가 생긴다. 현재 모든 항목의 네 타깃 상태는 NOT_IMPLEMENTED다. 아래 링크는 당시 조사한 공식 출처이며 현재 문서 작성 중 다시 실행한 제품이 아니다.

| ID | 이름 · 종류 | family | 보존 원본 행 | 제공자 · 출처 |
|---|---|---|---|---|
| catalog.accordion | Accordion · component | disclosure | 58, 204, 294 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.actionbar | ActionBar · component | control-group | 190 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.actionicon | ActionIcon · component | command | 167 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.affix | Affix · component | layout | 191 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.agendaview | AgendaView · template | schedule | 44 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.alert | Alert · component | status-message | 59, 182 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.alertdialog | Alert Dialog · component | modal-task | 60, 295 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.alphaslider | AlphaSlider · component | color-control | 133 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.anchor | Anchor · component | navigation | 173 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.angleslider | AngleSlider · component | range-control | 134 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.appshell | AppShell · template | layout | 122 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.areachart | AreaChart · component | chart | 16 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.aspectratio | Aspect Ratio · component | layout | 61, 123 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.attachment | Attachment · component | messaging | 62 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.autocomplete | Autocomplete · component | query-choice | 157, 240, 296 | [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.avatar | Avatar · component | image | 63, 205, 297 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.backgroundimage | BackgroundImage · component | image | 206 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.badge | Badge · component | content | 64, 207 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.barchart | BarChart · component | chart | 17 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.barslist | BarsList · component | chart | 30 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.blockquote | Blockquote · component | content | 220 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.box | Box · component | layout | 229 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.breadcrumb | Breadcrumb · component | navigation | 65 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.breadcrumbs | Breadcrumbs · component | navigation | 174, 241 | [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.bubble | Bubble · component | messaging | 66 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.bubblechart | BubbleChart · component | chart | 26 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.bulletchart | BulletChart · component | chart | 31 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.burger | Burger · component | navigation | 175 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.button | Button · component | command | 67, 168, 242, 298 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.buttongroup | Button Group · component | control-group | 68 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.calendar | Calendar · component | temporal | 15, 69, 243 | [Mantine Dates](https://mantine.dev/dates/getting-started/); [shadcn/ui](https://ui.shadcn.com/docs/components); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.candlestickchart | CandlestickChart · component | chart | 20 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.card | Card · component | surface | 70, 208 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.carousel | Carousel · component | carousel | 52, 71 | [Mantine Other Extensions](https://mantine.dev/dates/getting-started/); [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.cascader | Cascader · component | hierarchical-choice | 158 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.center | Center · component | layout | 124 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.chart | Chart · component | chart | 72 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.checkbox | Checkbox · component | binary-choice | 73, 135, 244, 299 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.checkboxgroup | CheckboxGroup · component | choice-group | 245, 300 | [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.chip | Chip · component | binary-choice | 136 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.closebutton | CloseButton · component | command | 169 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.code | Code · component | content | 221 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.codehighlight | CodeHighlight · component | content | 49 | [Mantine Other Extensions](https://mantine.dev/dates/getting-started/) |
| catalog.collapse | Collapse · component | disclosure | 230 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.collapsible | Collapsible · component | disclosure | 74, 301 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.colorarea | ColorArea · component | color-control | 246 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.colorfield | ColorField · component | color-control | 247 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.colorinput | ColorInput · component | color-control | 137 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.colorpicker | ColorPicker · component | color-control | 138, 248 | [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.colorslider | ColorSlider · component | color-control | 249 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.colorswatch | ColorSwatch · component | image | 209, 250 | [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.colorswatchpicker | ColorSwatchPicker · component | color-control | 251 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.colorwheel | ColorWheel · component | color-control | 252 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.combobox | Combobox · component | query-choice | 75, 159, 253, 302 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.comboboxpopover | ComboboxPopover · part | floating-surface | 160 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.command | Command · component | search-command | 76 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.compositechart | CompositeChart · component | chart | 19 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.container | Container · component | layout | 125 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.contextmenu | Context Menu · component | command-menu | 77, 303 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.copybutton | CopyButton · component | command | 170 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.datalist | DataList · component | content | 210 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.datatable | Data Table · component | tabular | 78 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.datefield | DateField · component | temporal | 254 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.dateinput | DateInput · component | temporal | 5 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.datepicker | DatePicker · component | temporal | 1, 79, 255 | [Mantine Dates](https://mantine.dev/dates/getting-started/); [shadcn/ui](https://ui.shadcn.com/docs/components); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.datepickerinput | DatePickerInput · component | temporal | 2 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.daterangepicker | DateRangePicker · component | temporal | 256 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.datetimepicker | DateTimePicker · component | temporal | 3 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.dayview | DayView · template | schedule | 39 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.dialog | Dialog · component | floating-surface | 80, 192, 304 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.direction | Direction · utility | environment | 81 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.disclosure | Disclosure · component | disclosure | 257 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.disclosuregroup | DisclosureGroup · component | disclosure | 258 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.divider | Divider · component | separator | 231 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.donutchart | DonutChart · component | chart | 21 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.drawer | Drawer · component | floating-surface | 82, 193, 305 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.dropdownmenu | Dropdown Menu · component | command-menu | 83 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.dropzone | Dropzone · component | file-intake | 54, 259 | [Mantine Other Extensions](https://mantine.dev/dates/getting-started/); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.empty | Empty · component | surface | 84 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.emptystate | EmptyState · component | surface | 183 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.field | Field · component | field-container | 85, 306 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.fieldset | Fieldset · component | field-container | 139, 307 | [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.filebutton | FileButton · part | file-intake | 171 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.fileinput | FileInput · component | file-intake | 140 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.filetrigger | FileTrigger · part | file-intake | 260 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.flex | Flex · component | layout | 126 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.floatingindicator | FloatingIndicator · component | environment | 194 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.floatingwindow | FloatingWindow · component | floating-surface | 195 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.focustrap | FocusTrap · utility | environment | 232 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.form | Form · component | form-flow | 261, 308 | [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.funnelchart | FunnelChart · component | chart | 23 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.gaugechart | GaugeChart · component | chart | 32 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.grid | Grid · component | layout | 127 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.gridlist | GridList · component | list-choice | 262 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.group | Group · component | field-container, layout | 128, 263 | [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.heatmap | Heatmap · component | chart | 29 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.highlight | Highlight · component | content | 222 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.hovercard | Hover Card · component | context-help | 86, 196 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.hueslider | HueSlider · component | color-control | 141 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.image | Image · component | image | 211 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.indicator | Indicator · component | status-message | 212 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.inlinedatetimepicker | InlineDateTimePicker · component | temporal | 4 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.input | Input · component | text-field | 87, 142, 309 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.inputgroup | Input Group · component | field-container | 88 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.inputotp | Input OTP · component | text-field | 89 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.item | Item · part | surface | 90 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.jsoninput | JsonInput · component | text-field | 143 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.kbd | Kbd · component | content | 91, 213 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.label | Label · part | field-container | 92 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.lightbox | Lightbox · component | carousel | 53 | [Mantine Other Extensions](https://mantine.dev/dates/getting-started/) |
| catalog.linechart | LineChart · component | chart | 18 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.link | Link · component | navigation | 264 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.list | List · component | content | 223 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.listbox | ListBox · component | list-choice | 265 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.loader | Loader · component | loading | 184 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.loadingoverlay | LoadingOverlay · component | loading | 197 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.mark | Mark · component | content | 224 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.marker | Marker · component | messaging | 93 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.marquee | Marquee · component | scroll | 233 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.maskinput | MaskInput · component | text-field | 144 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.matrixchart | MatrixChart · component | chart | 37 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.menu | Menu · component | command-menu | 198, 266, 310 | [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.menubar | Menubar · component | command-menu | 94, 199, 311 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.message | Message · component | messaging | 95 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.messagescroller | Message Scroller · template | scroll | 96 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.meter | Meter · component | measurement | 267, 312 | [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.minicalendar | MiniCalendar · component | temporal | 14 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.mobilemonthview | MobileMonthView · template | schedule | 43 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.modal | Modal · component | modal-task | 200, 268 | [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.modalsmanager | Modals manager · utility | environment | 56 | [Mantine Other Extensions](https://mantine.dev/dates/getting-started/) |
| catalog.monthpicker | MonthPicker · component | temporal | 6 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.monthpickerinput | MonthPickerInput · component | temporal | 7 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.monthview | MonthView · template | schedule | 40 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.multiselect | MultiSelect · component | token-choice | 161 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.nativeselect | Native Select · component | list-choice | 97, 145 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.navigationmenu | Navigation Menu · component | navigation | 98, 313 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.navigationprogress | NavigationProgress · component | progress | 55 | [Mantine Other Extensions](https://mantine.dev/dates/getting-started/) |
| catalog.navigationtree | NavigationTree · component | tree | 269 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.navlink | NavLink · component | navigation | 176 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.notification | Notification · component | status-message | 185 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.notificationssystem | Notifications system · utility | toast-system | 50 | [Mantine Other Extensions](https://mantine.dev/dates/getting-started/) |
| catalog.numberfield | NumberField · component | number-field | 270, 314 | [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.numberformatter | NumberFormatter · component | content | 214 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.numberinput | NumberInput · component | number-field | 146 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.otpfield | OTP Field · component | text-field | 315 | [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.overflowlist | OverflowList · component | virtualization | 215 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.overlay | Overlay · component | environment | 201 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.pagination | Pagination · component | navigation | 99, 177 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.paper | Paper · component | surface | 234 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.passwordinput | PasswordInput · component | text-field | 147 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.piechart | PieChart · component | chart | 22 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.pill | Pill · component | token-choice | 162 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.pillsinput | PillsInput · component | token-choice | 163 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.pininput | PinInput · component | text-field | 148 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.popover | Popover · component | floating-surface | 100, 202, 271, 316 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.portal | Portal · utility | environment | 235 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.previewcard | Preview Card · component | context-help | 317 | [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.previewtrigger | PreviewTrigger · part | context-help | 272 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.progress | Progress · component | progress | 101, 186, 318 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.progressbar | ProgressBar · component | progress | 273 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.questionnaire | Questionnaire · template | form-flow | 102 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.radarchart | RadarChart · component | chart | 24 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.radialbarchart | RadialBarChart · component | chart | 27 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.radio | Radio · component | binary-choice | 149, 319 | [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.radiogroup | Radio Group · component | choice-group | 103, 274 | [shadcn/ui](https://ui.shadcn.com/docs/components); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.rangecalendar | RangeCalendar · component | temporal | 275 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.rangeslider | RangeSlider · component | range-control | 150 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.rating | Rating · component | range-control | 151 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.resizable | Resizable · component | resize | 104 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.resourcesdayview | ResourcesDayView · template | schedule | 45 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.resourcesmonthview | ResourcesMonthView · template | schedule | 47 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.resourcesschedule | ResourcesSchedule · template | schedule | 48 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.resourcesweekview | ResourcesWeekView · template | schedule | 46 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.richtexteditor | Rich text editor · component | rich-editor | 57 | [Mantine Other Extensions](https://mantine.dev/dates/getting-started/) |
| catalog.ringprogress | RingProgress · component | progress | 187 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.rollingnumber | RollingNumber · component | content | 216 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.sankeychart | SankeyChart · component | chart | 36 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.scatterchart | ScatterChart · component | chart | 25 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.schedule | Schedule · template | schedule | 38 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.scrollarea | Scroll Area · component | scroll | 105, 236, 320 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.scroller | Scroller · component | scroll | 237 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.searchfield | SearchField · component | text-field | 276 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.segmentedcontrol | SegmentedControl · component | choice-group | 152 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.select | Select · component | list-choice | 106, 164, 277, 321 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.semicircleprogress | SemiCircleProgress · component | progress | 188 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.separator | Separator · component | separator | 107, 278, 322 | [shadcn/ui](https://ui.shadcn.com/docs/components); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.sheet | Sheet · component | floating-surface | 108 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.sidebar | Sidebar · template | navigation | 109 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.simplegrid | SimpleGrid · component | layout | 129 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.skeleton | Skeleton · component | loading | 110, 189 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.slider | Slider · component | range-control | 111, 153, 279, 323 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.space | Space · component | layout | 130 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.sparkline | Sparkline · component | chart | 28 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.spinner | Spinner · component | loading | 112 | [shadcn/ui](https://ui.shadcn.com/docs/components) |
| catalog.splitter | Splitter · component | resize | 131 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.spoiler | Spoiler · component | disclosure | 217 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.spotlight | Spotlight · component | search-command | 51 | [Mantine Other Extensions](https://mantine.dev/dates/getting-started/) |
| catalog.stack | Stack · component | layout | 132 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.stepper | Stepper · component | navigation | 178 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.sunburstchart | SunburstChart · component | chart | 35 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.switch | Switch · component | binary-choice | 113, 154, 280, 324 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.table | Table · component | tabular | 114, 225, 281 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.tableofcontents | TableOfContents · component | navigation | 179 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.tabs | Tabs · component | tabs | 115, 180, 282, 325 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.taggroup | TagGroup · component | token-choice | 283 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.tagsinput | TagsInput · component | token-choice | 165 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.text | Text · component | content | 226 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.textarea | Textarea · component | text-field | 116, 155 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.textfield | TextField · component | text-field | 284 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.textinput | TextInput · component | text-field | 156 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.themeicon | ThemeIcon · component | image | 218 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.timefield | TimeField · component | temporal | 285 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.timegrid | TimeGrid · template | temporal | 12 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.timeinput | TimeInput · component | temporal | 10 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.timeline | Timeline · component | content | 219 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.timepicker | TimePicker · component | temporal | 11 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.timevalue | TimeValue · component | temporal | 13 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.title | Title · component | content | 227 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.toast | Toast · component | toast-system | 117, 286, 326 | [shadcn/ui](https://ui.shadcn.com/docs/components); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.toggle | Toggle · component | binary-choice | 118, 327 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.togglebutton | ToggleButton · component | binary-choice | 287 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.togglebuttongroup | ToggleButtonGroup · component | choice-group | 288 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.togglegroup | Toggle Group · component | choice-group | 119, 328 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.tokenfield | TokenField · component | token-choice | 289 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.toolbar | Toolbar · component | control-group | 290, 329 | [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.tooltip | Tooltip · component | context-help | 120, 203, 291, 330 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button); [Base UI](https://base-ui.com/react/overview/quick-start) |
| catalog.transition | Transition · utility | environment | 238 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.tree | Tree · component | tree | 181, 292 | [Mantine Core](https://mantine.dev/core/package/); [React Aria](https://react-aria.adobe.com/Button) |
| catalog.treemap | Treemap · component | chart | 34 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.treeselect | TreeSelect · component | hierarchical-choice | 166 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.typography | Typography · component | content | 121, 228 | [shadcn/ui](https://ui.shadcn.com/docs/components); [Mantine Core](https://mantine.dev/core/package/) |
| catalog.unstyledbutton | UnstyledButton · component | command | 172 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.virtualizer | Virtualizer · utility | virtualization | 293 | [React Aria](https://react-aria.adobe.com/Button) |
| catalog.visuallyhidden | VisuallyHidden · utility | environment | 239 | [Mantine Core](https://mantine.dev/core/package/) |
| catalog.wafflechart | WaffleChart · component | chart | 33 | [Mantine Charts](https://mantine.dev/charts/getting-started/) |
| catalog.weekview | WeekView · template | schedule | 41 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |
| catalog.yearpicker | YearPicker · component | temporal | 8 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.yearpickerinput | YearPickerInput · component | temporal | 9 | [Mantine Dates](https://mantine.dev/dates/getting-started/) |
| catalog.yearview | YearView · template | schedule | 42 | [Mantine Schedule](https://mantine.dev/dates/getting-started/) |

## 검토·변경 절차

새 제공자 목록을 가져올 때 source date·URL·원문 hash와 신규/삭제/이름 변경을 비교한다. 기존 stable ID는 이름이 바뀌어도 유지한다. 의미 동일성 확인 없이 family 숫자를 줄이지 않는다. 제거·범위 변경은 제품 책임자의 승인 대상이다.

각 항목의 전체 trait/role/policy 후보·profile 조건·타깃 상태는 [component-catalog.json](component-catalog.json)에 들어 있다. [어휘 registry](extension-registry.json)의 ID와 연결되며 누락 참조는 문서 QA 오류다. 이 구조는 새 catalog 항목을 어디에 추가하고 어떤 구현·시험이 필요한지 결정하는 출발점이다.
