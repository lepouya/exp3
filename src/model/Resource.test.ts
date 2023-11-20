import { expect, test } from "vitest";

import { ResourceManager } from "./Resource";

test("Empty resource manager set up correctly", () => {
  const rm = ResourceManager.reset();
  expect(Object.keys(rm.resources)).to.deep.equal([]);
});

test("Creating new resource works", () => {
  const rm = ResourceManager.reset();
  const R1 = rm.upsert({ name: "test1" });

  expect(rm.resources["test1"]).to.equal(R1);
  expect(rm.resources["test1"].name).to.equal("test1");
});

test("Adding multiple fields", () => {
  const rm = ResourceManager.reset();
  const R1 = rm.upsert({ name: "test1", count: 5, maxCount: 1 });
  const R2 = rm.upsert({ name: "test2", extra: { bonus: 1 } });

  expect(rm.resources["test1"]).to.equal(R1);
  expect(rm.resources["test1"].name).to.equal("test1");
  expect(rm.resources["test1"].count).to.be.approximately(5, 0.001);
  expect(rm.resources["test1"].extra["bonus"]).to.be.undefined;
  expect(rm.resources["test1"].maxCount).to.be.approximately(1, 0.001);

  expect(rm.resources["test2"]).to.equal(R2);
  expect(rm.resources["test2"].name).to.equal("test2");
  expect(rm.resources["test2"].count).to.be.approximately(0, 0.001);
  expect(rm.resources["test2"].extra["bonus"]).to.be.approximately(1, 0.001);
  expect(rm.resources["test2"].extra["auto"]).to.be.undefined;
  expect(rm.resources["test2"].maxCount).to.be.undefined;
});

test("Overwriting fields", () => {
  const rm = ResourceManager.reset();
  const R1 = rm.upsert({ name: "test1", count: 5 });
  const R2 = rm.upsert({ name: "test1", extra: { auto: 7 }, maxCount: 1 });

  expect(rm.resources["test1"]).to.equal(R1);
  expect(rm.resources["test1"]).to.equal(R2);
  expect(rm.resources["test1"].name).to.equal("test1");
  expect(rm.resources["test1"].count).to.be.approximately(5, 0.001);
  expect(rm.resources["test1"].extra["auto"]).to.be.approximately(7, 0.001);
  expect(rm.resources["test1"].maxCount).to.be.approximately(1, 0.001);
});

test("Time is updated correctly", () => {
  const settings = { lastTick: 1000 };
  const rm = ResourceManager.reset(settings);

  rm.tick(2000);
  expect(rm.lastTick).to.be.equal(2000);

  rm.tick(3000);
  expect(rm.lastTick).to.be.equal(3000);
});

test("Time below min delta doesn't change anything", () => {
  const settings = { lastTick: 1000 };
  const rm = ResourceManager.reset(settings);

  rm.tick(1000.1);
  expect(rm.lastTick).to.be.equal(1000);
});

test("Resource ticks called corectly", () => {
  const settings = { lastTick: 0 };
  const rm = ResourceManager.reset(settings);

  rm.upsert({
    name: "test1",
    tick: (dt) => (rm.resolve("test1").count = rm.resolve("test1").count + dt),
  });
  rm.upsert({
    name: "test2",
    tick: () => (rm.resolve("test2").count = rm.resolve("test2").count + 1),
  });

  rm.tick(500);
  expect(rm.lastTick).to.be.equal(500);
  expect(rm.resources["test1"].count).to.be.equal(0.5);
  expect(rm.resources["test2"].count).to.be.equal(1);

  rm.tick(1500);
  expect(rm.lastTick).to.be.equal(1500);
  expect(rm.resources["test1"].count).to.be.equal(1.5);
  expect(rm.resources["test2"].count).to.be.equal(2);
});

test("Tick granularity works as expected", () => {
  const settings = { lastTick: 0 };
  const rm = ResourceManager.reset(settings);

  const R1 = rm.upsert({ name: "test1" });
  R1.tick = (dt) => {
    R1.count = R1.count + dt;
  };
  const R2 = rm.upsert({ name: "test2" });
  R2.tick = () => {
    R2.count = R2.count + 1;
  };

  rm.tick(0.5);
  expect(rm.lastTick).to.be.equal(0);
  expect(rm.resources["test1"].count).to.be.equal(0);
  expect(rm.resources["test2"].count).to.be.equal(0);

  rm.tick(500);
  expect(rm.lastTick).to.be.equal(500);
  expect(rm.resources["test1"].count).to.be.equal(0.5);
  expect(rm.resources["test2"].count).to.be.equal(1);

  rm.tick(1000);
  expect(rm.lastTick).to.be.equal(1000);
  expect(rm.resources["test1"].count).to.be.equal(1);
  expect(rm.resources["test2"].count).to.be.equal(2);

  rm.tick(10000);
  expect(rm.lastTick).to.be.equal(10000);
  expect(rm.resources["test1"].count).to.be.equal(10);
  expect(rm.resources["test2"].count).to.be.equal(11);
});

test("Max tick update works", () => {
  const settings = { lastTick: 0 };
  const rm = ResourceManager.reset(settings);

  rm.upsert("test1").tick = function (dt) {
    rm.resolve("test1").count = rm.resolve("test1").count + dt;
  };
  rm.upsert("test2").tick = function () {
    rm.resolve("test2").count = rm.resolve("test2").count + 1;
  };

  rm.tick(500);
  expect(rm.lastTick).to.be.equal(500);
  expect(rm.resources["test1"].count).to.be.equal(0.5);
  expect(rm.resources["test2"].count).to.be.equal(1);

  rm.tick(100000000);
  expect(rm.lastTick).to.be.equal(100000000);
  expect(rm.resources["test1"].count).to.be.equal(86400.5);
  expect(rm.resources["test2"].count).to.be.equal(86401);
});

test("Rate update works", () => {
  const settings = { lastTick: 0 };
  const rm = ResourceManager.reset(settings);

  rm.upsert({
    name: "test1",
    tick: (dt) => (rm.resolve("test1").count = rm.resolve("test1").count + dt),
  });
  rm.upsert({
    name: "test2",
    tick: () =>
      (rm.resolve("test2").count =
        rm.resolve("test2").count + rm.resolve("test1").value()),
  });

  rm.tick(1000);
  expect(rm.resources["test1"].count).to.be.equal(1);
  expect(rm.resources["test2"].count).to.be.equal(1);

  rm.tick(2000);
  expect(rm.resources["test1"].count).to.be.equal(2);
  expect(rm.resources["test1"].rate.count).to.be.equal(1);
  expect(rm.resources["test2"].count).to.be.equal(3);
  expect(rm.resources["test2"].rate.count).to.be.equal(2);

  rm.tick(5000);
  expect(rm.resources["test1"].count).to.be.equal(5);
  expect(rm.resources["test1"].rate.count).to.be.equal(1);
  expect(rm.resources["test2"].count).to.be.equal(15);
  expect(rm.resources["test2"].rate.count).to.be.equal(4);
});

test("Simple purchases", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 10 });
  const r2 = rm.upsert({ name: "r2", count: 0 });
  r2.cost = () => [{ resource: "r1", count: 1 }];

  rm.purchase([{ resource: "r2", count: 1 }]);
  expect(r1.count).to.be.approximately(9, 0.001);
  expect(r2.count).to.be.approximately(1, 0.001);

  rm.purchase([{ resource: "r2", count: 4 }]);
  expect(r1.count).to.be.approximately(5, 0.001);
  expect(r2.count).to.be.approximately(5, 0.001);
});

test("Full purchases", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 10 });
  const r2 = rm.upsert({ name: "r2", count: 0 });
  r2.cost = () => [{ resource: "r1", count: 1 }];

  rm.purchase([{ resource: "r2", count: 3 }], "full");
  expect(r1.count).to.be.approximately(7, 0.001);
  expect(r2.count).to.be.approximately(3, 0.001);

  rm.purchase([{ resource: "r2", count: 4 }], "full");
  expect(r1.count).to.be.approximately(3, 0.001);
  expect(r2.count).to.be.approximately(7, 0.001);

  rm.purchase([{ resource: "r2", count: 5 }], "full");
  expect(r1.count).to.be.approximately(3, 0.001);
  expect(r2.count).to.be.approximately(7, 0.001);
});

test("Partial purchases", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 10 });
  const r2 = rm.upsert({ name: "r2", count: 0 });
  r2.cost = () => [{ resource: "r1", count: 1 }];

  rm.purchase([{ resource: "r2", count: 3 }], "partial");
  expect(r1.count).to.be.approximately(7, 0.001);
  expect(r2.count).to.be.approximately(3, 0.001);

  rm.purchase([{ resource: "r2", count: 4 }], "partial");
  expect(r1.count).to.be.approximately(3, 0.001);
  expect(r2.count).to.be.approximately(7, 0.001);

  rm.purchase([{ resource: "r2", count: 5 }], "partial");
  expect(r1.count).to.be.approximately(0, 0.001);
  expect(r2.count).to.be.approximately(10, 0.001);
});

test("Free purchases", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 10 });
  const r2 = rm.upsert({ name: "r2", count: 0 });
  r2.cost = () => [{ resource: "r1", count: 1 }];

  rm.purchase([{ resource: "r2", count: 3 }], "free");
  expect(r1.count).to.be.approximately(10, 0.001);
  expect(r2.count).to.be.approximately(3, 0.001);
});

test("Locked purchases", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 10 });
  const r2 = rm.upsert({ name: "r2", count: 0 });
  r2.cost = () => [{ resource: "r1", count: 1 }];
  r2.unlocked = false;

  rm.purchase([{ resource: "r2", count: 3 }]);
  expect(r1.count).to.be.approximately(10, 0.001);
  expect(r2.count).to.be.approximately(0, 0.001);

  r1.unlocked = false;
  r2.unlocked = true;

  rm.purchase([{ resource: "r2", count: 3 }]);
  expect(r1.count).to.be.approximately(10, 0.001);
  expect(r2.count).to.be.approximately(0, 0.001);

  r1.unlocked = true;

  rm.purchase([{ resource: "r2", count: 3 }]);
  expect(r1.count).to.be.approximately(7, 0.001);
  expect(r2.count).to.be.approximately(3, 0.001);
});

test("Complex purchases", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 100 });
  const r2 = rm.upsert({ name: "r2", count: 20 });
  const r3 = rm.upsert({ name: "r3", count: 0 });
  r3.cost = (n) => [
    { resource: "r1", count: n ** 2 },
    { resource: "r2", count: n },
  ];

  rm.purchase([{ resource: "r3", count: 1 }]);
  expect(r1.count).to.be.approximately(99, 0.001);
  expect(r2.count).to.be.approximately(19, 0.001);
  expect(r3.count).to.be.approximately(1, 0.001);

  rm.purchase([{ resource: "r3", count: 1 }]);
  expect(r1.count).to.be.approximately(95, 0.001);
  expect(r2.count).to.be.approximately(17, 0.001);
  expect(r3.count).to.be.approximately(2, 0.001);

  rm.purchase([{ resource: "r3", count: 2 }]);
  expect(r1.count).to.be.approximately(70, 0.001);
  expect(r2.count).to.be.approximately(10, 0.001);
  expect(r3.count).to.be.approximately(4, 0.001);

  rm.purchase([{ resource: "r3", count: 2 }], "full");
  expect(r1.count).to.be.approximately(70, 0.001);
  expect(r2.count).to.be.approximately(10, 0.001);
  expect(r3.count).to.be.approximately(4, 0.001);

  rm.purchase([{ resource: "r3", count: 2 }], "partial");
  expect(r1.count).to.be.approximately(45, 0.001);
  expect(r2.count).to.be.approximately(5, 0.001);
  expect(r3.count).to.be.approximately(5, 0.001);

  rm.purchase([{ resource: "r3", count: 2 }], "free");
  expect(r1.count).to.be.approximately(45, 0.001);
  expect(r2.count).to.be.approximately(5, 0.001);
  expect(r3.count).to.be.approximately(7, 0.001);
});

test("Multiple purchases", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 100, extra: { auto: 10 } });
  const r2 = rm.upsert({ name: "r2", count: 20 });
  const r3 = rm.upsert({ name: "r3", count: 0 });
  r2.cost = (n) => [{ resource: "r1", count: n }];
  r3.cost = (n) => [
    { resource: "r1", count: n ** 2 },
    { resource: "r2", count: n },
  ];

  rm.purchase([{ resource: "r3", count: 1 }]);
  expect(r1.count).to.be.approximately(99, 0.001);
  expect(r1.extra["auto"]).to.be.approximately(10, 0.001);
  expect(r2.count).to.be.approximately(19, 0.001);
  expect(r3.count).to.be.approximately(1, 0.001);

  rm.purchase([{ resource: "r2", count: 1 }]);
  expect(r1.count).to.be.approximately(79, 0.001);
  expect(r2.count).to.be.approximately(20, 0.001);
  expect(r3.count).to.be.approximately(1, 0.001);

  rm.purchase([
    { resource: "r3", count: 2 },
    { resource: "r2", count: 2 },
  ]);
  expect(r1.count).to.be.approximately(33, 0.001);
  expect(r2.count).to.be.approximately(17, 0.001);
  expect(r3.count).to.be.approximately(3, 0.001);
});

test("Dry purchases", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 100, extra: { auto: 10 } });
  const r2 = rm.upsert({ name: "r2", count: 20 });
  const r3 = rm.upsert({ name: "r3", count: 0 });
  r2.cost = (n) => [
    { resource: "r1", count: n },
    { resource: "r1", count: 1 },
  ];
  r3.cost = (n) => [
    { resource: "r1", count: n ** 2 },
    { resource: "r2", count: n },
  ];

  let canBuy = rm.purchase([{ resource: "r3", count: 1 }], "full", true);
  expect(r1.count).to.be.approximately(100, 0.001);
  expect(r1.extra["auto"]).to.be.approximately(10, 0.001);
  expect(r2.count).to.be.approximately(20, 0.001);
  expect(r3.count).to.be.approximately(0, 0.001);
  expect(canBuy.gain).to.deep.equal([{ resource: r3, count: 1 }]);

  canBuy = rm.purchase([{ resource: "r2", count: 1 }], "full", true);
  expect(r1.count).to.be.approximately(100, 0.001);
  expect(r1.extra["auto"]).to.be.approximately(10, 0.001);
  expect(r2.count).to.be.approximately(20, 0.001);
  expect(r3.count).to.be.approximately(0, 0.001);
  expect(canBuy.gain).to.deep.equal([{ resource: r2, count: 1 }]);

  canBuy = rm.purchase(
    [
      { resource: r3, count: 10 },
      { resource: "r2", count: 10 },
    ],
    "partial",
    true,
  );
  expect(canBuy.gain).to.deep.equal([
    { resource: r3, count: 5 },
    { resource: r2, count: 4 },
  ]);
});

test("Helper methods", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 100, extra: { auto: 10 } });
  const r2 = rm.upsert({ name: "r2", count: 20 });
  const r3 = rm.upsert({ name: "r3", count: 0 });
  r1.value = () => Object.values(r1.extra).reduce((s, c) => s + c, r1.count);
  r2.cost = (n) => [
    { resource: "r1", count: n },
    { resource: "r1", count: 1 },
  ];
  r3.cost = (n) => [
    { resource: "r1", count: n ** 2 },
    { resource: "r2", count: n },
  ];

  expect(rm.resolve(r1).value()).to.be.approximately(110, 0.001);
  expect(rm.resolve("r1").extra["auto"]).to.be.approximately(10, 0.001);
  expect(rm.resolve("r2").value()).to.be.approximately(20, 0.001);
  expect(rm.resolve(r3).value()).to.be.approximately(0, 0.001);

  expect(rm.resolve("r3").canBuy().count).to.be.approximately(1, 0.001);
  expect(rm.resolve("r2").canBuy(1).count).to.be.approximately(1, 0.001);
  expect(rm.resolve(r3).canBuy(10).count).to.be.approximately(5, 0.001);
  expect(rm.resolve(r2).canBuy(10).count).to.be.approximately(4, 0.001);

  expect(rm.resolve(r1).add(3).count).to.be.approximately(3, 0.001);
  expect(rm.resolve(r1).value()).to.be.approximately(113, 0.001);
  expect(rm.resolve(r1).count).to.be.approximately(103, 0.001);
  expect(rm.resolve(r1).extra["auto"]).to.be.approximately(10, 0.001);

  expect(rm.resolve(r3).add(10).count).to.be.approximately(10, 0.001);
  expect(rm.resolve(r1).value()).to.be.approximately(113, 0.001);
  expect(rm.resolve(r2).value()).to.be.approximately(20, 0.001);
  expect(rm.resolve(r3).value()).to.be.approximately(10, 0.001);

  r1.count = 100;
  r3.count = 0;

  expect(rm.resolve(r3).buy().count).to.be.approximately(1, 0.001);
  expect(r1.count).to.be.approximately(99, 0.001);
  expect(r1.extra["auto"]).to.be.approximately(10, 0.001);
  expect(r2.count).to.be.approximately(19, 0.001);
  expect(r3.count).to.be.approximately(1, 0.001);

  expect(rm.resolve(r2).buy(1).count).to.be.approximately(1, 0.001);
  expect(r1.count).to.be.approximately(78, 0.001);
  expect(r2.count).to.be.approximately(20, 0.001);
  expect(r3.count).to.be.approximately(1, 0.001);

  expect(rm.resolve(r3).buy(2).count).to.be.approximately(2, 0.001);
  expect(rm.resolve(r2).buy(2).count).to.be.approximately(2, 0.001);
  expect(r1.count).to.be.approximately(30, 0.001);
  expect(r2.count).to.be.approximately(17, 0.001);
  expect(r3.count).to.be.approximately(3, 0.001);
});

test("Task executor enables and disabled task runs", () => {
  const settings = { lastTick: 0 };
  const rm = ResourceManager.reset(settings);

  const t1 = rm.upsert({
    name: "test1",
    tick: (dt) => dt.toString(),
    unlocked: false,
  });

  expect(rm.tick(1)).to.deep.equal([]);
  expect(t1.execution.lastTick).to.be.undefined;
  expect(t1.execution.lastAttempt).to.be.undefined;

  expect(rm.tick(2)).to.deep.equal([]);
  expect(t1.execution.lastTick).to.be.undefined;
  expect(t1.execution.lastAttempt).to.be.undefined;

  expect(rm.tick(1000)).to.deep.equal([]);
  expect(t1.execution.lastTick).to.be.undefined;
  expect(t1.execution.lastAttempt).to.be.undefined;

  t1.unlocked = true;

  expect(rm.tick(2000)).to.deep.equal(["1"]);
  expect(t1.execution.lastTick).to.be.equal(2000);
  expect(t1.execution.lastAttempt).to.be.equal(2000);

  expect(rm.tick(2001)).to.deep.equal(["0.001"]);
  expect(t1.execution.lastTick).to.be.equal(2001);
  expect(t1.execution.lastAttempt).to.be.equal(2001);

  expect(rm.tick(3000)).to.deep.equal(["0.999"]);
  expect(t1.execution.lastTick).to.be.equal(3000);
  expect(t1.execution.lastAttempt).to.be.equal(3000);

  t1.unlocked = false;

  expect(rm.tick(4000)).to.deep.equal([]);
  expect(t1.execution.lastTick).to.be.equal(3000);
  expect(t1.execution.lastAttempt).to.be.equal(3000);
});

test("Task executor schedules tasks correctly", () => {
  const settings = { maxResourceTickSecs: 5 };
  const rm = ResourceManager.reset(settings);

  const t1 = rm.upsert({
    name: "1/sec",
    shouldTick: (dt) => dt >= 1,
    tick: (dt) => t1.name + "-" + dt.toString(),
  });
  const t2 = rm.upsert({
    name: "2/sec",
    shouldTick: (dt) => dt >= 0.5,
    tick: (dt) => t2.name + "-" + dt.toString(),
  });

  expect(rm.tick(1000)).to.deep.equal([]);
  expect(rm.tick(1100)).to.deep.equal([]);
  expect(rm.tick(1200)).to.deep.equal([]);
  expect(rm.tick(1500)).to.deep.equal(["2/sec-0.5"]);
  expect(rm.tick(1750)).to.deep.equal([]);
  expect(rm.tick(2000)).to.deep.equal(["1/sec-1", "2/sec-0.5"]);
  expect(rm.tick(3000)).to.deep.equal(["1/sec-1", "2/sec-1"]);
  expect(rm.tick(5000)).to.deep.equal(["1/sec-2", "2/sec-2"]);
  expect(rm.tick(5555)).to.deep.equal(["2/sec-0.555"]);
  expect(rm.tick(15555)).to.deep.equal(["1/sec-5.555", "1/sec-5", "2/sec-5"]);
});

test("Task executor updates rates", () => {
  const settings = { maxResourceTickSecs: 5, rateUpdateSecs: 1 };
  const rm = ResourceManager.reset(settings);

  const t1 = rm.upsert({
    name: "1/sec",
    shouldTick: (dt) => dt >= 1,
    tick: (dt) => t1.name + "-" + dt.toString(),
  });
  const t2 = rm.upsert({
    name: "2/sec",
    shouldTick: (dt) => dt >= 0.5,
    tick: (dt) => t2.name + "-" + dt.toString(),
  });

  expect(t1.rate.ticks).to.be.approximately(0, 0.001);
  expect(t2.rate.ticks).to.be.approximately(0, 0.001);
  rm.tick(1000);
  expect(t1.rate.ticks).to.be.approximately(0, 0.001);
  expect(t2.rate.ticks).to.be.approximately(0, 0.001);
  rm.tick(1100);
  rm.tick(1200);
  rm.tick(1500);
  expect(t1.rate.ticks).to.be.approximately(0, 0.001);
  expect(t2.rate.ticks).to.be.approximately(0, 0.001);
  rm.tick(1750);
  expect(t1.rate.ticks).to.be.approximately(0, 0.001);
  expect(t2.rate.ticks).to.be.approximately(0, 0.001);
  rm.tick(2000);
  expect(t1.rate.ticks).to.be.approximately(1, 0.001);
  expect(t2.rate.ticks).to.be.approximately(2, 0.001);
  rm.tick(3000);
  expect(t1.rate.ticks).to.be.approximately(1, 0.001);
  expect(t2.rate.ticks).to.be.approximately(1, 0.001);
  rm.tick(5000);
  expect(t1.rate.ticks).to.equal(0.5);
  expect(t2.rate.ticks).to.equal(0.5);
  rm.tick(5555);
  expect(t1.rate.ticks).to.equal(0.5);
  expect(t2.rate.ticks).to.equal(0.5);
  rm.tick(6500);
  expect(t1.rate.ticks).to.equal(1 / 1.5);
  expect(t2.rate.ticks).to.equal(2 / 1.5);
  rm.tick(16500);
  expect(t1.rate.ticks).to.equal(0.2);
  expect(t2.rate.ticks).to.equal(0.2);
});

test("Simple multipliers", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 10 });
  const r2 = rm.upsert({ name: "r2", count: 0 });
  r2.cost = () => [{ resource: "r1", count: 1 }];

  rm.purchase([{ resource: "r2", count: 1 }]);
  expect(r1.count).to.be.approximately(9, 0.001);
  expect(r2.count).to.be.approximately(1, 0.001);

  rm.purchase([{ resource: "r2", count: 2 }], undefined, false, 2, 1);
  expect(r1.count).to.be.approximately(7, 0.001);
  expect(r2.count).to.be.approximately(5, 0.001);

  rm.purchase([{ resource: "r2", count: 2 }], undefined, false, 1, 2);
  expect(r1.count).to.be.approximately(3, 0.001);
  expect(r2.count).to.be.approximately(7, 0.001);
});

test("More complicated multipliers", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 100 });
  const r2 = rm.upsert({ name: "r2", count: 20 });
  const r3 = rm.upsert({ name: "r3", count: 0 });
  r3.cost = (n) => [
    { resource: "r1", count: n ** 2 },
    { resource: "r2", count: n },
  ];

  rm.purchase([{ resource: "r3", count: 1 }], "full", false, 10, 2);
  expect(r1.count).to.be.approximately(98, 0.001);
  expect(r2.count).to.be.approximately(18, 0.001);
  expect(r3.count).to.be.approximately(10, 0.001);

  rm.purchase([{ resource: "r3", count: 1 }], "partial", false, 2, 0.1);
  expect(r1.count).to.equal(85.9);
  expect(r2.count).to.equal(16.9);
  expect(r3.count).to.be.approximately(12, 0.001);

  rm.purchase([{ resource: "r3", count: 3 }], "partial", false, 0.5, 0.5);
  expect(r1.count).to.be.approximately(1.4, 0.001);
  expect(r2.count).to.be.approximately(10.4, 0.001);
  expect(r3.count).to.be.approximately(12.5, 0.001);
});

test("Simple buy and sell", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 10 });
  const r2 = rm.upsert({ name: "r2", count: 0 });
  r2.cost = () => [{ resource: "r1", count: 1 }];

  rm.purchase([{ resource: "r2", count: 1 }]);
  expect(r1.count).to.be.approximately(9, 0.001);
  expect(r2.count).to.be.approximately(1, 0.001);

  rm.purchase([{ resource: "r2", count: 2 }]);
  expect(r1.count).to.be.approximately(7, 0.001);
  expect(r2.count).to.be.approximately(3, 0.001);

  rm.purchase([{ resource: "r2", count: -1 }]);
  expect(r1.count).to.be.approximately(8, 0.001);
  expect(r2.count).to.be.approximately(2, 0.001);

  rm.purchase([{ resource: "r2", count: -2 }]);
  expect(r1.count).to.be.approximately(10, 0.001);
  expect(r2.count).to.be.approximately(0, 0.001);

  rm.purchase([{ resource: "r2", count: 1 }]);
  expect(r1.count).to.be.approximately(9, 0.001);
  expect(r2.count).to.be.approximately(1, 0.001);

  rm.purchase([{ resource: "r2", count: -2 }]);
  expect(r1.count).to.be.approximately(10, 0.001);
  expect(r2.count).to.be.approximately(0, 0.001);
});

test("Complex selling", () => {
  const rm = ResourceManager.reset();
  const r1 = rm.upsert({ name: "r1", count: 100, minCount: 80 });
  const r2 = rm.upsert({ name: "r2", count: 20 });
  const r3 = rm.upsert({ name: "r3", count: 0, maxCount: 5 });
  r3.cost = (n) => [
    { resource: "r1", count: n ** 2 },
    { resource: "r2", count: n },
  ];

  rm.purchase([{ resource: "r3", count: 1 }]);
  expect(r1.count).to.be.approximately(99, 0.001);
  expect(r2.count).to.be.approximately(19, 0.001);
  expect(r3.count).to.be.approximately(1, 0.001);

  rm.purchase([{ resource: "r3", count: 2 }]);
  expect(r1.count).to.be.approximately(86, 0.001);
  expect(r2.count).to.be.approximately(14, 0.001);
  expect(r3.count).to.be.approximately(3, 0.001);

  rm.purchase([{ resource: "r3", count: 2 }]);
  expect(r1.count).to.be.approximately(86, 0.001);
  expect(r2.count).to.be.approximately(14, 0.001);
  expect(r3.count).to.be.approximately(3, 0.001);

  rm.purchase([{ resource: "r3", count: -1 }]);
  expect(r1.count).to.be.approximately(95, 0.001);
  expect(r2.count).to.be.approximately(17, 0.001);
  expect(r3.count).to.be.approximately(2, 0.001);

  rm.purchase([{ resource: "r3", count: -5 }]);
  expect(r1.count).to.be.approximately(100, 0.001);
  expect(r2.count).to.be.approximately(20, 0.001);
  expect(r3.count).to.be.approximately(0, 0.001);
});
