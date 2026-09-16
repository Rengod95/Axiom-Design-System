import OTPField from "./vendor/docs/src/app/(docs)/react/components/otp-field/demos/hero/css-modules/index";
import PreviewCard from "./vendor/docs/src/app/(docs)/react/components/preview-card/demos/hero/css-modules/index";

export const REFERENCE_TEMPLATES = {
  315: { sourceRow: 315, catalogId: "catalog.otpfield", docsUrl: "https://base-ui.com/react/components/otp-field", component: OTPField },
  317: { sourceRow: 317, catalogId: "catalog.previewcard", docsUrl: "https://base-ui.com/react/components/preview-card", component: PreviewCard },
} as const;
export const REFERENCE_SOURCE_ROWS = Object.keys(REFERENCE_TEMPLATES).map(Number);
