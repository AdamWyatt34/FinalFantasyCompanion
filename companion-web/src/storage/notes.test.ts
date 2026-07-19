import { beforeEach, describe, expect, it } from "vitest";
import { kv } from "./kv";
import { readNotes, writeNote } from "./notes";

beforeEach(() => {
  kv.remove("ffcompanion.ff7.notes");
});

describe("personal item notes", () => {
  it("round-trips notes per game", () => {
    writeNote("ff7", "kotr", "chain done at beat 15");
    writeNote("ff7", "beta", "grab from Zolom early");

    expect(readNotes("ff7")).toEqual({
      kotr: "chain done at beat 15",
      beta: "grab from Zolom early",
    });
    expect(readNotes("ff9")).toEqual({});
  });

  it("empty text removes the note; removing the last note removes the key", () => {
    writeNote("ff7", "kotr", "something");
    writeNote("ff7", "kotr", "   ");

    expect(readNotes("ff7")).toEqual({});
    expect(kv.get("ffcompanion.ff7.notes")).toBeNull();
  });

  it("tolerates corrupt stored values", () => {
    kv.set("ffcompanion.ff7.notes", "{oops");
    expect(readNotes("ff7")).toEqual({});

    kv.set("ffcompanion.ff7.notes", JSON.stringify({ kotr: 42, ok: "yes" }));
    expect(readNotes("ff7")).toEqual({ ok: "yes" });
  });
});
