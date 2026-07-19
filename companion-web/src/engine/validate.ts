import type { Pack } from "../api/types";

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
  const itemIds = new Set(pack.items.map((i) => i.id));

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

  for (const item of pack.items) {
    for (const prereq of item.prereqs.filter((pr) => !itemIds.has(pr))) {
      errors.push(`item '${item.id}' has unknown prereq '${prereq}'`);
    }

    if (!orders.has(item.opensAt)) {
      errors.push(
        `item '${item.id}' opensAt ${item.opensAt} references a missing position order`,
      );
    }

    if (item.closesAt != null && !orders.has(item.closesAt)) {
      errors.push(
        `item '${item.id}' closesAt ${item.closesAt} references a missing position order`,
      );
    }

    if (item.closesAt != null && item.closesAt < item.opensAt) {
      errors.push(
        `item '${item.id}' closesAt ${item.closesAt} is before opensAt ${item.opensAt}`,
      );
    }

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

    for (const prereq of item.prereqs) {
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
