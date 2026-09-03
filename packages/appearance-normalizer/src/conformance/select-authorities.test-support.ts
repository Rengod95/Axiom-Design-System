import type { CSSAppearanceIR } from "@axiom/motion-schema";

import { createFoundationAppearanceInput, createFoundationMotionInput } from "./foundation-authorities.test-support.js";

const SELECT_EXECUTION_DOMAINS = ["color", "duration", "layer", "opacity", "radius", "shadow", "size", "space"] as const;

/** Supplies exact explicit N20/N21 authority inputs for the Select-only Appearance proof. */
export const createSelectAppearanceInput = () => createFoundationAppearanceInput(SELECT_EXECUTION_DOMAINS);

/** Supplies the explicit N23 authority bundle that binds Select Motion to one normalized Appearance result. */
export const createSelectMotionInput = (appearance: CSSAppearanceIR) => createFoundationMotionInput(appearance);
