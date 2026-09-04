import type {
  AdvanceImpact,
  Availability,
  GameSummary,
  Pack,
  RouteView,
  StateSnapshot,
} from "./types";
import type { ProgressEvent } from "../engine/events";
import { projectAvailability } from "../engine/availability";
import { computeImpact } from "../engine/impact";
import { projectRoute } from "../engine/route";
import { fold, type PlaythroughState } from "../engine/state";
import { getPackById, listPacks } from "../packs";
import {
  appendEvent,
  readEvents,
  replaceLog,
  resetLog,
} from "../storage/eventLog";
import { withLock } from "../storage/lock";

/**
 * Same surface the HTTP client had, computed locally: the TypeScript engine
 * replays the localStorage event log per call. Every method is `async` so any
 * synchronous failure surfaces as a rejection, exactly like a failed fetch did.
 */

function requirePack(gameId: string): Pack {
  const pack = getPackById(gameId);
  if (pack === undefined) {
    throw new Error(`Unknown game '${gameId}'`);
  }
  return pack;
}

function stateOf(pack: Pack): PlaythroughState {
  return fold(pack, readEvents(pack.game.id));
}

function snapshot(pack: Pack): StateSnapshot {
  const state = stateOf(pack);
  return {
    position: state.position,
    collected: [...state.collected],
    progress: Object.fromEntries(state.progress),
    choices: Object.fromEntries(state.choices),
  };
}

const lockName = (pack: Pack) => `ffcompanion.${pack.game.id}.log`;

export interface ProgressEventRequest {
  type: string;
  to?: number;
  itemId?: string;
  delta?: number;
  version?: string;
  optionId?: string;
  trackerId?: string;
  valueId?: string;
}

function toProgressEvent(
  pack: Pack,
  request: ProgressEventRequest,
): ProgressEvent {
  const occurredAt = new Date().toISOString();

  switch (request.type) {
    case "positionAdvanced":
    case "positionCorrected": {
      if (request.to === undefined) {
        throw new Error(`Event type '${request.type}' requires 'to'`);
      }
      if (!pack.positions.some((p) => p.order === request.to)) {
        throw new Error(`No story position with order ${request.to}`);
      }
      return { type: request.type, to: request.to, occurredAt };
    }
    case "itemCollected":
    case "itemUncollected": {
      if (request.itemId === undefined) {
        throw new Error(`Event type '${request.type}' requires 'itemId'`);
      }
      const itemId = request.itemId;
      const item = pack.items.find((i) => i.id === itemId);
      if (item === undefined) {
        throw new Error(`Unknown item id '${itemId}'`);
      }
      if (request.type === "itemCollected" && item.options.length > 0) {
        throw new Error(
          `Item '${itemId}' is a choice — record it with 'choiceMade'`,
        );
      }
      return { type: request.type, itemId, occurredAt };
    }
    case "itemProgressed": {
      if (request.itemId === undefined) {
        throw new Error(`Event type 'itemProgressed' requires 'itemId'`);
      }
      const itemId = request.itemId;
      const item = pack.items.find((i) => i.id === itemId);
      if (item === undefined) {
        throw new Error(`Unknown item id '${itemId}'`);
      }
      if (item.count <= 1) {
        throw new Error(`Item '${itemId}' is not a counter item`);
      }
      if (
        request.delta === undefined ||
        !Number.isInteger(request.delta) ||
        request.delta === 0
      ) {
        throw new Error(
          `Event type 'itemProgressed' requires a non-zero integer 'delta'`,
        );
      }
      return {
        type: "itemProgressed",
        itemId,
        delta: request.delta,
        occurredAt,
      };
    }
    case "choiceMade": {
      if (request.itemId === undefined || request.optionId === undefined) {
        throw new Error(
          `Event type 'choiceMade' requires 'itemId' and 'optionId'`,
        );
      }
      const itemId = request.itemId;
      const optionId = request.optionId;
      const item = pack.items.find((i) => i.id === itemId);
      if (item === undefined) {
        throw new Error(`Unknown item id '${itemId}'`);
      }
      if (!item.options.some((o) => o.id === optionId)) {
        throw new Error(`Item '${itemId}' has no option '${optionId}'`);
      }
      return { type: "choiceMade", itemId, optionId, occurredAt };
    }
    case "trackerAdjusted": {
      if (request.trackerId === undefined || request.valueId === undefined) {
        throw new Error(
          `Event type 'trackerAdjusted' requires 'trackerId' and 'valueId'`,
        );
      }
      const trackerId = request.trackerId;
      const valueId = request.valueId;
      const tracker = pack.trackers.find((t) => t.id === trackerId);
      if (tracker === undefined) {
        throw new Error(`Unknown tracker '${trackerId}'`);
      }
      if (!tracker.values.some((v) => v.id === valueId)) {
        throw new Error(`Tracker '${trackerId}' has no value '${valueId}'`);
      }
      if (
        request.delta === undefined ||
        !Number.isInteger(request.delta) ||
        request.delta === 0
      ) {
        throw new Error(
          `Event type 'trackerAdjusted' requires a non-zero integer 'delta'`,
        );
      }
      return {
        type: "trackerAdjusted",
        trackerId,
        valueId,
        delta: request.delta,
        occurredAt,
      };
    }
    case "versionSelected": {
      const declared = pack.game.versions ?? [];
      if (declared.length === 0) {
        throw new Error(
          `Game '${pack.game.id}' does not have selectable versions`,
        );
      }
      if (
        request.version === undefined ||
        !declared.some((v) => v.id === request.version)
      ) {
        throw new Error(`Unknown game version '${request.version}'`);
      }
      return { type: "versionSelected", version: request.version, occurredAt };
    }
    default:
      throw new Error(`Unknown event type '${request.type}'`);
  }
}

export const api = {
  getGames: async (): Promise<GameSummary[]> => listPacks().map((p) => p.game),

  getPack: async (gameId: string): Promise<Pack> => requirePack(gameId),

  getAvailability: async (gameId: string): Promise<Availability> => {
    const pack = requirePack(gameId);
    return projectAvailability(pack, stateOf(pack));
  },

  getRoute: async (gameId: string): Promise<RouteView> => {
    const pack = requirePack(gameId);
    return projectRoute(pack, stateOf(pack));
  },

  getAdvanceImpact: async (
    gameId: string,
    to: number,
  ): Promise<AdvanceImpact> => {
    const pack = requirePack(gameId);
    if (!pack.positions.some((p) => p.order === to)) {
      throw new Error(`No story position with order ${to}`);
    }
    return computeImpact(pack, stateOf(pack), to);
  },

  postEvent: async (
    gameId: string,
    event: ProgressEventRequest,
  ): Promise<StateSnapshot> => {
    const pack = requirePack(gameId);
    const progressEvent = toProgressEvent(pack, event);
    // The append is a read-modify-write of the whole log; the lock keeps two
    // tabs on the same game from dropping each other's taps.
    await withLock(lockName(pack), () =>
      appendEvent(pack.game.id, progressEvent),
    );
    return snapshot(pack);
  },

  postReset: async (
    gameId: string,
  ): Promise<StateSnapshot & { archivedTo: string | null }> => {
    const pack = requirePack(gameId);
    const archivedTo = await withLock(lockName(pack), () =>
      resetLog(pack.game.id),
    );
    return { ...snapshot(pack), archivedTo };
  },

  getEvents: async (gameId: string): Promise<ProgressEvent[]> => {
    requirePack(gameId);
    return readEvents(gameId);
  },

  /**
   * Removes the newest event. Truncation, not an inverse event: undo exists to
   * erase a mis-tap, and appending a correction would leave the mis-tap in the
   * history it is trying to clean up.
   */
  postUndo: async (gameId: string): Promise<StateSnapshot> => {
    const pack = requirePack(gameId);
    await withLock(lockName(pack), () => {
      const events = readEvents(pack.game.id);
      if (events.length > 0) {
        replaceLog(pack.game.id, events.slice(0, -1));
      }
    });
    return snapshot(pack);
  },
};
