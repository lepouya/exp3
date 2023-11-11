import { expect, test } from "vitest";

import RPG from "./RPG";

RPG.registerItem({ name: "r0", type: "rank" });
RPG.registerItem({
  name: "c1",
  type: "character",
  stats: { STR: 5, DEX: 5, MAG: 5, HP: 10, MP: 10 },
});
RPG.registerItem({
  name: "w1",
  type: "weapon",
  stats: { ATK: 10, SPD: 10 },
});
RPG.registerItem({
  name: "b1",
  type: "body",
  stats: { STR: 10, DEX: 10 },
});

test("correct stats on item", () => {
  expect(
    RPG.computeItemStats({ item: "w1", rank: "r0", count: 1 })[0],
  ).to.deep.equal({
    ...RPG.emptyStats,
    ATK: 10,
    SPD: 10,
  });
});

test("correct derivative stats on base", () => {
  expect(
    RPG.computeItemStats({ item: "b1", rank: "r0", count: 1 })[0],
  ).to.deep.equal({
    STR: 10,
    DEX: 10,
    MAG: 0,
    HP: 150,
    MP: 70,
    ATK: 15,
    DEF: 30,
    SPD: 20,
    ACC: 5,
    EVA: 2.5,
  });
});

test("correct derivative stats on character", () => {
  expect(
    RPG.computeItemStats({ item: "c1", rank: "r0", count: 1 })[0],
  ).to.deep.equal({
    STR: 5,
    DEX: 5,
    MAG: 5,
    HP: 95,
    MP: 95,
    ATK: 12.5,
    DEF: 15,
    SPD: 15,
    ACC: 3.75,
    EVA: 3.75,
  });
});

test("correct stats on character", () => {
  expect(
    RPG.computeCharacterStats({
      character: { item: "c1", rank: "r0", count: 1 },
      body: { item: "b1", rank: "r0", count: 1 },
      weapon: { item: "w1", rank: "r0", count: 1 },
    }),
  ).to.deep.equal({
    STR: 15,
    DEX: 15,
    MAG: 5,
    HP: 245,
    MP: 165,
    ATK: 37.5,
    DEF: 45,
    SPD: 45,
    ACC: 8.75,
    EVA: 6.25,
  });
});

RPG.registerItem({ name: "r0", type: "rank" });
RPG.registerItem({ name: "r1", type: "rank", stats: { ATK: 10, DEF: 10 } });
RPG.registerItem({
  name: "r2",
  type: "rank",
  stats: { ATK: 20, DEF: 20, SPD: 10, ACC: 5, EVA: 5 },
  statBoosts: [
    { stat: "STR", multiplier: 1.25 },
    { stat: "DEX", multiplier: 1.25 },
    { stat: "MAG", multiplier: 1.25 },
  ],
});
RPG.registerItem({
  name: "c1",
  type: "character",
  stats: { STR: 5, DEX: 5, MAG: 5, HP: 10, MP: 10 },
});
RPG.registerItem({
  name: "w1",
  type: "weapon",
  stats: { ATK: 10, SPD: 10 },
});
RPG.registerItem({
  name: "b1",
  type: "body",
  stats: { STR: 10, DEX: 10 },
});

test("correct stats on item with rank boosts", () => {
  expect(
    RPG.computeItemStats({ item: "w1", rank: "r1", count: 1 })[0],
  ).to.deep.equal({
    ...RPG.emptyStats,
    ATK: 20,
    DEF: 10,
    SPD: 10,
  });
  expect(
    RPG.computeItemStats({ item: "w1", rank: "r2", count: 1 })[0],
  ).to.deep.equal({
    ...RPG.emptyStats,
    ATK: 30,
    DEF: 20,
    SPD: 20,
    ACC: 5,
    EVA: 5,
  });
});

test("correct derivative stats with rank boosts", () => {
  expect(
    RPG.computeItemStats({ item: "b1", rank: "r1", count: 1 })[0],
  ).to.deep.equal({
    STR: 10,
    DEX: 10,
    MAG: 0,
    HP: 150,
    MP: 70,
    ATK: 25,
    DEF: 40,
    SPD: 20,
    ACC: 5,
    EVA: 2.5,
  });
  expect(
    RPG.computeItemStats({ item: "b1", rank: "r2", count: 1 })[0],
  ).to.deep.equal({
    STR: 12.5,
    DEX: 12.5,
    MAG: 0,
    HP: 187.5,
    MP: 87.5,
    ATK: 38.75,
    DEF: 57.5,
    SPD: 35,
    ACC: 11.25,
    EVA: 8.125,
  });
});
