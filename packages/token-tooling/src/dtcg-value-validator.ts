import type {
  DtcgType,
  TokenDiagnostic,
  TokenJsonValue,
  TokenSourceLocation,
} from "@axiom/tokens";

import {
  ERROR_DIAGNOSTIC_SEVERITY,
  PARSER_DIAGNOSTIC_CODE,
  TOKEN_DIAGNOSTIC_PHASE,
  TOKEN_REFERENCE_PATTERN,
} from "./constants.js";

const isRecord = (
  value: TokenJsonValue,
): value is Readonly<Record<string, TokenJsonValue>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAlias = (value: TokenJsonValue): boolean =>
  typeof value === "string" && TOKEN_REFERENCE_PATTERN.test(value);

const isFiniteNumber = (value: TokenJsonValue | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const dimension = (value: TokenJsonValue): boolean =>
  isAlias(value) ||
  (isRecord(value) &&
    isFiniteNumber(value["value"]) &&
    typeof value["unit"] === "string");

const color = (value: TokenJsonValue): boolean =>
  isAlias(value) ||
  (isRecord(value) &&
    typeof value["colorSpace"] === "string" &&
    Array.isArray(value["components"]) &&
    value["components"].length >= 3 &&
    value["components"].every(
      (entry) => entry === null || (typeof entry === "number" && Number.isFinite(entry)),
    ) &&
    isFiniteNumber(value["alpha"]));

const cubicBezier = (value: TokenJsonValue): boolean =>
  isAlias(value) ||
  (Array.isArray(value) &&
    value.length === 4 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry)));

const fontFamily = (value: TokenJsonValue): boolean =>
  isAlias(value) ||
  (typeof value === "string" && value.trim() !== "") ||
  (Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "string" && entry.trim() !== ""));

const fontWeight = (value: TokenJsonValue): boolean =>
  isAlias(value) ||
  (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 999) ||
  (typeof value === "string" && value.trim() !== "");

const strokeStyle = (value: TokenJsonValue): boolean =>
  isAlias(value) || typeof value === "string" || isRecord(value);

const border = (value: TokenJsonValue): boolean =>
  isAlias(value) ||
  (isRecord(value) &&
    value["color"] !== undefined &&
    color(value["color"]) &&
    value["width"] !== undefined &&
    dimension(value["width"]) &&
    value["style"] !== undefined &&
    strokeStyle(value["style"]));

const duration = dimension;

const transition = (value: TokenJsonValue): boolean =>
  isAlias(value) ||
  (isRecord(value) &&
    value["duration"] !== undefined &&
    duration(value["duration"]) &&
    value["delay"] !== undefined &&
    duration(value["delay"]) &&
    value["timingFunction"] !== undefined &&
    cubicBezier(value["timingFunction"]));

const shadowEntry = (value: TokenJsonValue): boolean =>
  isRecord(value) &&
  value["color"] !== undefined &&
  color(value["color"]) &&
  value["offsetX"] !== undefined &&
  dimension(value["offsetX"]) &&
  value["offsetY"] !== undefined &&
  dimension(value["offsetY"]) &&
  value["blur"] !== undefined &&
  dimension(value["blur"]) &&
  value["spread"] !== undefined &&
  dimension(value["spread"]) &&
  (value["inset"] === undefined || typeof value["inset"] === "boolean");

const shadow = (value: TokenJsonValue): boolean =>
  isAlias(value) || shadowEntry(value) || (Array.isArray(value) && value.every(shadowEntry));

const gradient = (value: TokenJsonValue): boolean =>
  isAlias(value) ||
  (Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        entry["color"] !== undefined &&
        color(entry["color"]) &&
        isFiniteNumber(entry["position"]),
    ));

const typography = (value: TokenJsonValue): boolean =>
  isAlias(value) ||
  (isRecord(value) &&
    value["fontFamily"] !== undefined &&
    fontFamily(value["fontFamily"]) &&
    value["fontSize"] !== undefined &&
    dimension(value["fontSize"]) &&
    value["fontWeight"] !== undefined &&
    fontWeight(value["fontWeight"]) &&
    value["letterSpacing"] !== undefined &&
    dimension(value["letterSpacing"]) &&
    value["lineHeight"] !== undefined &&
    (isAlias(value["lineHeight"]) || isFiniteNumber(value["lineHeight"])));

const validators: Readonly<Record<DtcgType, (value: TokenJsonValue) => boolean>> = {
  border,
  color,
  cubicBezier,
  dimension,
  duration,
  fontFamily,
  fontWeight,
  gradient,
  number: (value) => isAlias(value) || isFiniteNumber(value),
  shadow,
  strokeStyle,
  transition,
  typography,
};

export const validateDtcgValue = (
  tokenId: string,
  dtcgType: DtcgType,
  value: TokenJsonValue,
  location: TokenSourceLocation,
): readonly TokenDiagnostic[] =>
  validators[dtcgType](value)
    ? []
    : [
        {
          code: PARSER_DIAGNOSTIC_CODE.INVALID_DTCG_VALUE,
          severity: ERROR_DIAGNOSTIC_SEVERITY,
          phase: TOKEN_DIAGNOSTIC_PHASE,
          message: `Token '${tokenId}' has an invalid DTCG '${dtcgType}' value.`,
          tokenId,
          location,
        },
      ];
