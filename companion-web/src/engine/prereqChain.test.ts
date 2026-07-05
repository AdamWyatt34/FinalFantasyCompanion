import { describe, expect, it } from "vitest";
import { classify } from "./availability";
import { at, makeItem, makePack } from "./testing/builders";

/**
 * The showcase scenario: Knights of the Round stays Blocked until every link
 * of the chocobo breeding chain is collected.
 */
const CHAIN = [
  "highwind",
  "lure",
  "stables",
  "goodgreat",
  "racing",
  "bluegreen",
  "black",
  "gold",
];

function chainPack() {
  const items = CHAIN.map((link, i) =>
    makeItem(link, { opensAt: 13, prereqs: i === 0 ? [] : [CHAIN[i - 1]] }),
  );
  items.push(makeItem("kotr", { opensAt: 13, prereqs: ["gold"] }));
  return makePack(items, 20);
}

describe("prereq chain", () => {
  it("KotR is blocked until every breeding link is collected", () => {
    const pack = chainPack();
    const kotr = pack.items.find((i) => i.id === "kotr")!;
    const have: string[] = [];

    for (const link of CHAIN) {
      expect(classify(kotr, at(13, ...have)).status).toBe("blocked");
      have.push(link);
    }

    expect(classify(kotr, at(13, ...have)).status).toBe("available");
  });

  it("KotR reports the gold chocobo as the missing link", () => {
    const pack = chainPack();
    const kotr = pack.items.find((i) => i.id === "kotr")!;

    const entry = classify(kotr, at(13, ...CHAIN.slice(0, -1)));

    expect(entry.status).toBe("blocked");
    expect(entry.missingPrereqs).toEqual(["gold"]);
  });

  it("each chain link is blocked by its direct predecessor only", () => {
    const pack = chainPack();
    const black = pack.items.find((i) => i.id === "black")!;

    const entry = classify(black, at(13));

    expect(entry.status).toBe("blocked");
    expect(entry.missingPrereqs).toEqual(["bluegreen"]);
  });
});
