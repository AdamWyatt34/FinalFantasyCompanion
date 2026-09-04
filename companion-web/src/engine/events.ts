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
  | { type: "versionSelected"; version: string; occurredAt: string }
  /** A choice item's outcome was picked (or re-picked — last one wins). */
  | {
      type: "choiceMade";
      itemId: string;
      optionId: string;
      occurredAt: string;
    }
  /** Manual nudge to one tracker value ("did an off-list +5 for Tifa"). */
  | {
      type: "trackerAdjusted";
      trackerId: string;
      valueId: string;
      delta: number;
      occurredAt: string;
    };

export const EVENT_TYPES: readonly ProgressEvent["type"][] = [
  "positionAdvanced",
  "positionCorrected",
  "itemCollected",
  "itemUncollected",
  "itemProgressed",
  "versionSelected",
  "choiceMade",
  "trackerAdjusted",
];
