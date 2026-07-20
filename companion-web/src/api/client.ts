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
import { allPacks, getPackById } from "../packs";
import {
  appendEvent,
  readEvents,
  replaceLog,
  resetLog,
} from "../storage/eventLog";

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
  };
}

export interface ProgressEventRequest {
  type: string;
  to?: number;
  itemId?: string;
  delta?: number;
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
      if (!pack.items.some((i) => i.id === itemId)) {
        throw new Error(`Unknown item id '${itemId}'`);
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
    default:
      throw new Error(`Unknown event type '${request.type}'`);
  }
}

export const api = {
  getGames: async (): Promise<GameSummary[]> => allPacks.map((p) => p.game),

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
    appendEvent(pack.game.id, progressEvent);
    return snapshot(pack);
  },

  postReset: async (
    gameId: string,
  ): Promise<StateSnapshot & { archivedTo: string | null }> => {
    const pack = requirePack(gameId);
    const archivedTo = resetLog(pack.game.id);
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
    const events = readEvents(pack.game.id);
    if (events.length > 0) {
      replaceLog(pack.game.id, events.slice(0, -1));
    }
    return snapshot(pack);
  },
};
