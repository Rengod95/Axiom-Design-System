import type {
  AppearanceNormalizationResult,
  AppearanceNormalizer,
} from "./index.js";

declare const normalizer: AppearanceNormalizer;
declare const result: AppearanceNormalizationResult;

void normalizer;
void result.trace;
