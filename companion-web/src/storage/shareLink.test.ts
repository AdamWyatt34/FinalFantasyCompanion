import { describe, expect, it } from "vitest";
import {
  decodeShareFragment,
  encodeShareFragment,
  type SharedRun,
} from "./shareLink";

const run: SharedRun = {
  gameId: "ff7",
  position: 15,
  version: null,
  collected: ["kotr", "goldchocobo", "beta"],
  progress: { flyers: 4 },
};

describe("share links", () => {
  it("round-trips a run snapshot", async () => {
    const fragment = await encodeShareFragment(run);

    expect(fragment).toMatch(/^[dj]\./);
    // URL-fragment safe: no characters needing encoding.
    expect(fragment).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(await decodeShareFragment(fragment)).toEqual(run);
  });

  it("round-trips the plain-base64 fallback scheme too", async () => {
    const json = JSON.stringify(run);
    const plain = `j.${btoa(json)
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "")}`;

    expect(await decodeShareFragment(plain)).toEqual(run);
  });

  it("rejects garbage and shape mismatches", async () => {
    await expect(decodeShareFragment("x.nope")).rejects.toThrow(
      "Not a share link.",
    );
    const bad = `j.${btoa(JSON.stringify({ hello: "world" })).replace(/=+$/, "")}`;
    await expect(decodeShareFragment(bad)).rejects.toThrow("Not a share link.");
  });
});
