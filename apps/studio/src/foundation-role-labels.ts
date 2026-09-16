import type { FoundationRole } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";

const LABELS: Record<string, string> = {
  "color.palette": "팔레트 색상", "color.surface": "배경과 표면", "color.content": "글과 아이콘", "color.action": "액션", "color.border": "테두리 색상", "color.focus": "포커스", "color.feedback": "피드백",
  "spacing.length": "간격", "spacing.margin": "여백 · 음수 허용",
  "sizing.length": "크기 스케일", "sizing.icon": "아이콘 크기", "sizing.control": "컨트롤 크기", "sizing.container": "컨테이너 크기", "sizing.target": "최소 터치 영역",
  "radius.corner": "모서리", "radius.pill": "완전히 둥근 모서리",
  "border.width": "선 두께", "border.style": "선 모양", "border.stroke": "테두리 스타일",
  "shadow.elevation": "그림자와 높이",
  "typography.family": "글꼴", "typography.weight": "글자 굵기", "typography.size": "글자 크기", "typography.line-height": "줄 높이", "typography.tracking": "자간", "typography.style": "텍스트 스타일",
  "motion.duration": "지속 시간", "motion.delay": "시작 지연", "motion.reduced": "모션 줄이기", "motion.easing": "속도 곡선", "motion.transition": "전환 효과",
  "opacity.level": "불투명도", "gradient.fill": "그라디언트 채우기", "layer.order": "겹침 순서",
};

export function foundationRoleLabel(role: FoundationRole, locale: Locale): string {
  return locale === "ko" ? LABELS[role.id] ?? role.label : role.label;
}
