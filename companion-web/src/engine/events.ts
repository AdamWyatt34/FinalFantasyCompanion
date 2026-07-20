/** The progress event log entries. `occurredAt` is provenance only — folding ignores it. */
export type ProgressEvent =
  | { type: "positionAdvanced"; to: number; occurredAt: string }
  | { type: "positionCorrected"; to: number; occurredAt: string }
  | { type: "itemCollected"; itemId: string; occurredAt: string }
  | { type: "itemUncollected"; itemId: string; occurredAt: string }
  | {
      type: "itemProgressed";
      itemId: string;
      delta: number;
      occurredAt: string;
    }
  | { type: "versionSelected"; version: string; occurredAt: string };
