import type { Pack, PrereqGroup } from "../api/types";

export class PackValidationError extends Error {
  readonly packId: string;
  readonly errors: readonly string[];

  constructor(packId: string, errors: readonly string[]) {
    super(`Pack '${packId}' failed validation:\n${errors.join("\n")}`);
    this.name = "PackValidationError";
    this.packId = packId;
    this.errors = errors;
  }
}

export function validateOrThrow(pack: Pack): void {
  const errors = validate(pack);
  if (errors.length > 0) {
    throw new PackValidationError(pack.game.id, errors);
  }
}

/** Splits a prereq ref into its item id and optional option id. */
export function parseRef(ref: string): { itemId: string; optionId: string | null } {
  const colon = ref.indexOf(":");
  return colon === -1
    ? { itemId: ref, optionId: null }
    : { itemId: ref.slice(0, colon), optionId: ref.slice(colon + 1) };
}

/** Structural validation, fail fast at load. Collects every error before reporting. */
export function validate(pack: Pack): string[] {
  const errors: string[] = [];

  for (const [order, count] of countBy(pack.positions.map((p) => p.order))) {
    if (count > 1) {
      errors.push(`duplicate position order ${order}`);
    }
  }

  for (const [id, count] of countBy(pack.positions.map((p) => p.id))) {
    if (count > 1) {
      errors.push(`duplicate position id '${id}'`);
    }
  }

  for (const [id, count] of countBy(pack.items.map((i) => i.id))) {
    if (count > 1) {
      errors.push(`duplicate item id '${id}'`);
    }
  }

  const orders = new Set(pack.positions.map((p) => p.order));
  const items = new Map(pack.items.map((i) => [i.id, i] as const));
  const declaredVersions = new Set((pack.game.versions ?? []).map((v) => v.id));

  // The position stepper advances by ±1; a gap in the orders would make the
  // Advance button target a beat that doesn't exist.
  const sortedOrders = [...orders].sort((a, b) => a - b);
  for (let i = 1; i < sortedOrders.length; i++) {
    if (sortedOrders[i] !== sortedOrders[i - 1] + 1) {
      errors.push(
        `position orders are not contiguous: ${sortedOrders[i - 1]} is followed by ${sortedOrders[i]}`,
      );
    }
  }

  for (const position of pack.positions) {
    if (
      Array.isArray(position.tips) &&
      position.tips.some((t) => typeof t !== "string" || t.trim() === "")
    ) {
      errors.push(`position '${position.id}' has an empty tip`);
    }
  }

  // Trackers: unique ids, unique value ids, beats that exist.
  const trackerKeys = new Set<string>();
  for (const [id, count] of countBy(pack.trackers.map((t) => t.id))) {
    if (count > 1) {
      errors.push(`duplicate tracker id '${id}'`);
    }
  }
  for (const tracker of pack.trackers) {
    if (tracker.values.length === 0) {
      errors.push(`tracker '${tracker.id}' has no values`);
    }
    for (const [id, count] of countBy(tracker.values.map((v) => v.id))) {
      if (count > 1) {
        errors.push(`tracker '${tracker.id}' has duplicate value id '${id}'`);
      }
    }
    for (const value of tracker.values) {
      trackerKeys.add(`${tracker.id}.${value.id}`);
      if (!Number.isInteger(value.start)) {
        errors.push(
          `tracker '${tracker.id}' value '${value.id}' has a non-integer start`,
        );
      }
    }
    if (!orders.has(tracker.opensAt)) {
      errors.push(
        `tracker '${tracker.id}' opensAt ${tracker.opensAt} references a missing position order`,
      );
    }
    if (tracker.locksAt != null && !orders.has(tracker.locksAt)) {
      errors.push(
        `tracker '${tracker.id}' locksAt ${tracker.locksAt} references a missing position order`,
      );
    }
    if (tracker.locksAt != null && tracker.locksAt < tracker.opensAt) {
      errors.push(
        `tracker '${tracker.id}' locksAt ${tracker.locksAt} is before opensAt ${tracker.opensAt}`,
      );
    }
  }

  const checkEffects = (owner: string, effects: Record<string, number>) => {
    for (const [key, delta] of Object.entries(effects)) {
      if (!trackerKeys.has(key)) {
        errors.push(`${owner} has an effect on unknown tracker value '${key}'`);
      }
      if (!Number.isInteger(delta) || delta === 0) {
        errors.push(`${owner} has an invalid effect delta for '${key}'`);
      }
    }
  };

  for (const item of pack.items) {
    for (const group of item.prereqs) {
      if (group.length === 0) {
        errors.push(`item '${item.id}' has an empty prereq group`);
      }
      for (const ref of group) {
        const { itemId, optionId } = parseRef(ref);
        const target = items.get(itemId);
        if (target === undefined) {
          errors.push(`item '${item.id}' has unknown prereq '${ref}'`);
          continue;
        }
        if (itemId === item.id) {
          errors.push(`item '${item.id}' requires itself`);
        }
        if (
          optionId !== null &&
          !target.options.some((o) => o.id === optionId)
        ) {
          errors.push(
            `item '${item.id}' prereq '${ref}' names an option '${itemId}' does not have`,
          );
        }
      }
    }

    for (const other of item.excludes.filter((ex) => !items.has(ex))) {
      errors.push(`item '${item.id}' excludes unknown item '${other}'`);
    }
    if (item.excludes.includes(item.id)) {
      errors.push(`item '${item.id}' excludes itself`);
    }

    if (!Number.isInteger(item.count) || item.count < 1) {
      errors.push(`item '${item.id}' has invalid count ${item.count}`);
    }
    if (item.steps.length > 0 && item.steps.length !== item.count) {
      errors.push(
        `item '${item.id}' declares ${item.steps.length} steps but count ${item.count}`,
      );
    }
    if (item.steps.some((s) => typeof s !== "string" || s.trim() === "")) {
      errors.push(`item '${item.id}' has an empty step label`);
    }

    if (item.options.length > 0) {
      if (item.count > 1) {
        errors.push(`item '${item.id}' cannot be both a choice and a counter`);
      }
      for (const [id, count] of countBy(item.options.map((o) => o.id))) {
        if (count > 1) {
          errors.push(`item '${item.id}' has duplicate option id '${id}'`);
        }
      }
      for (const option of item.options) {
        if (
          typeof option.id !== "string" ||
          option.id === "" ||
          option.id.includes(":")
        ) {
          errors.push(`item '${item.id}' has an option with an invalid id`);
        }
        if (typeof option.label !== "string" || option.label.trim() === "") {
          errors.push(`item '${item.id}' option '${option.id}' has no label`);
        }
        checkEffects(`item '${item.id}' option '${option.id}'`, option.effects);
      }
    }

    checkEffects(`item '${item.id}'`, item.effects);

    for (const ref of item.refs) {
      if (
        typeof ref.label !== "string" ||
        ref.label.trim() === "" ||
        typeof ref.url !== "string" ||
        !/^https?:\/\//.test(ref.url)
      ) {
        errors.push(`item '${item.id}' has a malformed reference`);
      }
    }

    for (const version of item.versions.filter(
      (v) => !declaredVersions.has(v),
    )) {
      errors.push(
        `item '${item.id}' references undeclared game version '${version}'`,
      );
    }

    if (item.windows.length === 0) {
      errors.push(`item '${item.id}' has no availability window`);
    }
    item.windows.forEach((window, index) => {
      if (!orders.has(window.opensAt)) {
        errors.push(
          `item '${item.id}' opensAt ${window.opensAt} references a missing position order`,
        );
      }
      if (window.closesAt != null && !orders.has(window.closesAt)) {
        errors.push(
          `item '${item.id}' closesAt ${window.closesAt} references a missing position order`,
        );
      }
      if (window.closesAt != null && window.closesAt < window.opensAt) {
        errors.push(
          `item '${item.id}' closesAt ${window.closesAt} is before opensAt ${window.opensAt}`,
        );
      }
      if (index > 0) {
        const previous = item.windows[index - 1];
        if (previous.closesAt == null) {
          errors.push(
            `item '${item.id}' has a window after one that never closes`,
          );
        } else if (window.opensAt <= previous.closesAt + 1) {
          errors.push(
            `item '${item.id}' windows overlap or touch (${previous.opensAt}–${previous.closesAt} then ${window.opensAt}) — merge them`,
          );
        }
      }
    });

    if (item.route != null && !orders.has(item.route.at)) {
      errors.push(
        `item '${item.id}' route.at ${item.route.at} references a missing position order`,
      );
    }
  }

  errors.push(...findPrereqCycles(pack));

  return errors;
}

function countBy<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** Every item id an item's prereqs mention, across all groups and option refs. */
function prereqItemIds(prereqs: PrereqGroup[]): string[] {
  return prereqs.flatMap((group) => group.map((ref) => parseRef(ref).itemId));
}

function findPrereqCycles(pack: Pack): string[] {
  // Duplicate ids are reported separately; keep the first so cycle detection still runs.
  const items = new Map(pack.items.map((i) => [i.id, i] as const));
  for (const item of pack.items) {
    if (!items.has(item.id)) {
      items.set(item.id, item);
    }
  }

  const state = new Map<string, "inProgress" | "done">();
  const reported = new Set<string>();

  // Any-of groups are treated conservatively: every ref is an edge, so a
  // cycle through an alternative is still reported.
  const visit = (id: string, path: string[]): void => {
    const item = items.get(id);
    if (item === undefined || state.get(id) === "done") {
      return;
    }

    if (state.get(id) === "inProgress") {
      const cycleStart = path.indexOf(id);
      const cycle = [...path.slice(cycleStart), id];
      reported.add(`prereq cycle: ${cycle.join(" -> ")}`);
      return;
    }

    state.set(id, "inProgress");
    path.push(id);

    for (const prereq of prereqItemIds(item.prereqs)) {
      visit(prereq, path);
    }

    path.pop();
    state.set(id, "done");
  };

  for (const id of items.keys()) {
    visit(id, []);
  }

  return [...reported];
}
