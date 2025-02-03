import { expect, test } from "vitest";

import RPG from "../RPG";

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

test("addItem should add items to the inventory", () => {
  const player = new RPG.Player();
  const item: RPG.PlayerItem = {
    item: "w1",
    rank: "r0",
    count: 1,
  };

  player.addItem(item);

  expect(player.inventory).to.deep.equal({
    "w1:r0": {
      item: "w1",
      rank: "r0",
      count: 1,
    },
  });
});

test("addItem should increase the count of existing items in the inventory", () => {
  const player = new RPG.Player();
  const item: RPG.PlayerItem = {
    item: "w1",
    rank: "r0",
    count: 1,
  };

  player.addItem(item);
  player.addItem({ ...item, count: 2 });

  expect(player.inventory).to.deep.equal({
    "w1:r0": {
      item: "w1",
      rank: "r0",
      count: 3,
    },
  });
});

test("addItem should remove items from the inventory when count reaches zero", () => {
  const player = new RPG.Player();
  const item: RPG.PlayerItem = {
    item: "w1",
    rank: "r0",
    count: 1,
  };

  player.addItem(item);
  player.addItem(item);
  player.addItem({ ...item, count: -2 });

  expect(player.inventory).to.deep.equal({});
});

test("addItem should throw an error when count is negative and there are not enough items in the inventory", () => {
  const player = new RPG.Player();
  const item: RPG.PlayerItem = {
    item: "w1",
    rank: "r0",
    count: 1,
  };

  expect(() => player.removeItem(item)).to.throw();
});

test("addItem should throw an error when count is positive and there is already a unique item of the same type in the inventory", () => {
  const player = new RPG.Player();
  const item: RPG.PlayerItem = {
    item: "w1",
    rank: "r0",
    count: 1,
    uniqueId: "12345",
  };

  player.addItem(item);

  expect(() => player.addItem(item)).to.throw();
});

RPG.registerItem({
  name: "c2",
  type: "character",
  stats: { STR: 10, DEX: 10, MAG: 10 },
});

function setupPlayer() {
  const player = new RPG.Player();
  const character: RPG.Character = {
    character: { item: "c1", rank: "r0", count: 1 },
    body: { item: "b1", rank: "r0", count: 1 },
    weapon: { item: "w1", rank: "r0", count: 1 },
  };
  player.characters["c1"] = character;

  player.addItem({ item: "c1", rank: "r0", count: 1 });
  player.addItem({ item: "c2", rank: "r2", count: 1 });
  player.addItem({ item: "b1", rank: "r0", count: 2 });
  player.addItem({ item: "b1", rank: "r1", count: 2 });
  return player;
}

test("equip should throw an error if equipment is not found", () => {
  const player = setupPlayer();
  const equipment: RPG.PlayerItem = {
    item: "invalidItem",
    rank: "r0",
    count: 1,
  };

  expect(() => player.equip(equipment)).to.throw();
});

test("equip should throw an error if trying to equip a rank", () => {
  const player = setupPlayer();
  const equipment: RPG.PlayerItem = {
    item: "r0",
    rank: "r0",
    count: 1,
  };

  expect(() => player.equip(equipment)).to.throw();
});

test("equip should throw an error if trying to equip character to another character", () => {
  const player = setupPlayer();
  const equipment: RPG.PlayerItem = {
    item: "c2",
    rank: "r0",
    count: 1,
  };

  expect(() => player.equip(equipment, "c1")).to.throw();
});

test("equip should throw an error if character is already equipped", () => {
  const player = setupPlayer();
  const equipment: RPG.PlayerItem = {
    item: "c2",
    rank: "r2",
    count: 1,
  };

  player.equip(equipment);

  expect(() => player.equip(equipment)).to.throw();
});

test("equip should throw an error if failed to remove character from inventory", () => {
  const player = setupPlayer();
  const equipment: RPG.PlayerItem = {
    item: "c1",
    rank: "r0",
    count: 1,
  };

  expect(() => player.equip(equipment)).to.throw();
});

test("equip should throw an error if character is not found", () => {
  const player = setupPlayer();
  const equipment: RPG.PlayerItem = {
    item: "w1",
    rank: "r0",
    count: 1,
  };

  expect(() => player.equip(equipment)).to.throw();
});

test("equip should throw an error if failed to unequip previous equipment", () => {
  const player = setupPlayer();
  const equipment: RPG.PlayerItem = {
    item: "w1",
    rank: "r0",
    count: 1,
  };

  expect(() => player.equip(equipment)).to.throw();
});

test("equip should throw an error if failed to remove item from inventory", () => {
  const player = setupPlayer();
  const equipment: RPG.PlayerItem = {
    item: "w1",
    rank: "r0",
    count: 1,
  };

  expect(() => player.equip(equipment)).to.throw();
});

test("equip should equip the item successfully", () => {
  const player = setupPlayer();
  expect(player.equip({ item: "c2", rank: "r2", count: 1 })).to.be.true;
  expect(player.characters["c2"]).to.deep.equal({
    character: { item: "c2", rank: "r2", count: 1 },
  });

  expect(player.equip({ item: "b1", rank: "r1", count: 1 }, "c2")).to.be.true;
  expect(player.characters["c2"].body).to.deep.equal({
    item: "b1",
    rank: "r1",
    count: 1,
  });
  expect(player.characters["c2"].weapon).to.be.undefined;
  expect(player.removeItem({ item: "b1", rank: "r1", count: 1 })).to.be.true;
  expect(() =>
    player.removeItem({ item: "b1", rank: "r1", count: 1 }),
  ).to.throw();
});
