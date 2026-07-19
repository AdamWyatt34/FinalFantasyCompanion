import { describe, expect, it } from "vitest";
import { kv } from "./kv";
import { readRevealed, writeRevealed } from "./revealed";

describe("revealed-spoilers persistence", () => {
  it("round-trips a set per game", () => {
    writeRevealed("ff7", new Set(["kotr", "emerald"]));

    expect(readRevealed("ff7")).toEqual(new Set(["kotr", "emerald"]));
    expect(readRevealed("ff9")).toEqual(new Set());
  });

  it("an empty set removes the key entirely", () => {
    writeRevealed("ff7", new Set(["kotr"]));
    writeRevealed("ff7", new Set());

    expect(kv.get("ffcompanion.ff7.revealed")).toBeNull();
  });

  it("tolerates corrupt or non-array stored values", () => {
    kv.set("ffcompanion.ff7.revealed", "{not json");
    expect(readRevealed("ff7")).toEqual(new Set());

    kv.set("ffcompanion.ff7.revealed", JSON.stringify({ a: 1 }));
    expect(readRevealed("ff7")).toEqual(new Set());

    kv.set("ffcompanion.ff7.revealed", JSON.stringify(["ok", 42, null]));
    expect(readRevealed("ff7")).toEqual(new Set(["ok"]));

    kv.remove("ffcompanion.ff7.revealed");
  });
});
