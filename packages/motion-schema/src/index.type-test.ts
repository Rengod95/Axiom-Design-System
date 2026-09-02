import type {
  MotionAuthoritySnapshot,
  MotionAuthorityValidationDiagnostic,
  MotionAuthorityValidationPort,
} from "./index.js";

const snapshot: MotionAuthoritySnapshot = {
  propertyRegistry: {},
  resolvedTokenManifest: {},
  tokenDomainRegistry: {},
  canonicalStateRegistry: {},
  conditionRegistry: {},
  appearance: {},
};

const diagnostic: MotionAuthorityValidationDiagnostic = {
  code: "AXS0001",
  message: "The supplied authority was rejected.",
};

const port: MotionAuthorityValidationPort = {
  validateBundle: () => [diagnostic],
};

void port.validateBundle(snapshot);
