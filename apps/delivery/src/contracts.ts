import type { TargetPack, SourceFile, UpgradePlan } from "../../../modules/target-packs/src/index.ts";

export interface DeliveryConnection {
  formatVersion: string; baseline: TargetPack; installedRelease: null; generatedRelease: string;
  installedHashes: Record<string, string | null>; lastReceipt: string;
  verification: "source-installed-unverified";
}
export interface DeliveryPlan {
  formatVersion: string; kind: "init" | "upgrade"; root: string; actorId: string;
  before: DeliveryConnection | null; next: TargetPack; current: SourceFile[];
  comparison: UpgradePlan | null; digest: string;
}
export interface DeliveryChange { path: string; before: string | null; after: string | null }
export interface DeliveryReceipt {
  formatVersion: string; id: string; planDigest: string; actorId: string; kind: "init" | "upgrade" | "rollback";
  before: DeliveryConnection | null; after: DeliveryConnection | null; changes: DeliveryChange[];
  validation: "source-installed-unverified";
}
export interface DeliveryDoctor {
  root: string; connected: boolean; incomplete: boolean; sourceRevision: string | null;
  files: { path: string; status: "unchanged" | "user-modified" | "missing"; expectedDigest: string; actualDigest: string | null }[];
  dependencies: Record<string,string>; execution: "not-run";
}
export interface DeliveryOptions { fault?: (phase: "after-prepare" | "after-file" | "after-commit") => void }
