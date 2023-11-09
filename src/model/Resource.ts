import Decimal, { DecimalSource } from "break_eternity.js";

export type DisplayType = "none" | "number" | "time" | "percentage";

export type ResourceCount<
  Resolved extends "resolved" | "mixed" = "mixed",
  Option = Resolved extends "resolved" ? never : string,
> = {
  resource: Resource | Option;
  count: DecimalSource;
};

export type PurchaseStyle = "full" | "partial" | "free";

export type PurchaseAmount =
  | DecimalSource
  | {
      minAmount: number;
      maxAmount: number;
      increments: number;
    };

export type PurchaseCost = {
  count: DecimalSource;
  style: PurchaseStyle;
  gain: ResourceCount<"resolved">[];
  cost: ResourceCount<"resolved">[];
};

export default class Resource {
  readonly manager = ResourceManager.singleton;
  readonly name: string;

  unlocked?: boolean;
  disabled?: boolean;
  priority: number = Infinity;

  icon?: string;
  display?: DisplayType;
  singularName?: string;
  pluralName?: string;
  description?: string;

  count: DecimalSource = 0;
  maxCount?: DecimalSource;
  minCount?: DecimalSource;

  extra: Record<string, any> = {};

  autoUnlock?: boolean;
  autoAward?: boolean;

  value: () => Decimal = () =>
    Decimal.clamp(this.count, this.minCount ?? 0, this.maxCount ?? Infinity);
  cost: (n: DecimalSource) => ResourceCount[] = () => [];
  unlockCost?: () => ResourceCount[];

  shouldTick?: (dt: number, source?: string) => boolean;
  tick?: (dt: number, source?: string) => any;

  gainFactor?: (m: DecimalSource) => DecimalSource;
  costFactor?: (m: DecimalSource) => DecimalSource;

  onPurchase?: (purchase: PurchaseCost) => void;
  onChange?: (count: DecimalSource, source: string) => any;

  execution: {
    lastTick?: number;
    lastResult?: any;
    lastAttempt?: number;
  } = {};

  rate: {
    count: Decimal;
    ticks: number;

    lastCountUpdate?: number;
    lastCount?: Decimal;

    lastTickUpdate?: number;
    deltaTicks?: number;

    pastCounts: Decimal[];
    pastTicks: number[];
  };

  constructor(props: Partial<Resource> | string) {
    if (typeof props === "string") {
      this.name = props;
    } else {
      this.name = props.name ?? "";
      this.fill(props);
    }

    this.rate = {
      count: Decimal.dZero,
      ticks: 0,
      pastCounts: [],
      pastTicks: [],
    };

    this.manager.upsert(this);
  }

  fill(res: Partial<Resource>): this {
    let k: keyof Resource;
    for (k in res) {
      if (k === "extra") {
        Object.assign(this[k], res[k]);
      } else if (k === "count" || k === "maxCount" || k === "minCount") {
        if (res[k] != undefined) {
          this[k] = Decimal.fromValue(res[k]!);
        }
      } else if (k !== "manager" && k !== "name" && res[k] != undefined) {
        (this as any)[k] = res[k];
      }
    }
    return this;
  }

  buy(
    amount: PurchaseAmount = 1,
    style: PurchaseStyle = "partial",
    dry: boolean = false,
    gainFactor: DecimalSource = 1,
    costFactor: DecimalSource = 1,
    countOverride?: DecimalSource,
  ): PurchaseCost {
    return this.purchase(
      amount,
      style,
      dry,
      gainFactor,
      costFactor,
      countOverride,
    );
  }

  sell(
    amount: PurchaseAmount = 1,
    style: PurchaseStyle = "full",
    dry: boolean = false,
    gainFactor: DecimalSource = 1,
    costFactor: DecimalSource = 1,
    countOverride?: DecimalSource,
  ) {
    return this.purchase(
      typeof amount !== "object" || amount instanceof Decimal
        ? Decimal.neg(amount)
        : {
            maxAmount: -amount.maxAmount,
            minAmount: -amount.minAmount,
            increments: -amount.increments,
          },
      style,
      dry,
      gainFactor,
      costFactor,
      countOverride,
    );
  }

  add(amount: PurchaseAmount = 1, gainFactor: DecimalSource = 1): PurchaseCost {
    return this.purchase(amount, "free", false, gainFactor, 0);
  }

  canBuy(
    amount: PurchaseAmount = 1,
    costFactor: DecimalSource = 1,
    countOverride?: DecimalSource,
  ): PurchaseCost {
    return this.purchase(amount, "partial", true, 1, costFactor, countOverride);
  }

  apply(rcs: ResourceCount<"resolved">[]): ResourceCount<"resolved">[] {
    return this.manager.combineAll(
      rcs
        .filter(({ resource }) => this.name === resource.name)
        .map(({ count }) => {
          const prev = this.count;
          this.count = Decimal.add(this.count, count).clamp(
            this.minCount ?? 0,
            this.maxCount ?? Infinity,
          );
          return [{ resource: this, count: this.count.minus(prev) }];
        })
        .flat(),
    );
  }

  getCount(override?: DecimalSource): Decimal {
    let count = override ?? this.count;
    if (typeof override === "string" && this.extra[override] != null) {
      count = this.extra[override];
    }
    return Decimal.fromValue_noAlloc(count);
  }

  getPurchaseCost(
    amount: DecimalSource = 1,
    style: PurchaseStyle = "full",
    dry: boolean = false,
    gainFactor: DecimalSource = 1,
    costFactor: DecimalSource = 1,
    countOverride?: DecimalSource,
  ): PurchaseCost {
    if (Decimal.eq(amount, 0)) {
      return { count: 0, style, gain: [], cost: [] };
    }

    let start = this.getCount(countOverride);
    let target = start
      .plus(amount)
      .clamp(this.minCount ?? 0, this.maxCount ?? Infinity);

    if (style === "free") {
      const diff = target.minus(start);
      return {
        count: diff,
        style,
        gain: [{ resource: this, count: diff.mul(gainFactor) }],
        cost: [],
      };
    }

    if (start.gt(target)) {
      [start, target] = [target, start];
      [gainFactor, costFactor] = [
        Decimal.neg(gainFactor),
        Decimal.neg(costFactor).mul(this.manager.globalSellRatio ?? 1),
      ];
    }

    let cost: ResourceCount<"resolved">[] = [];
    if (!(this.unlocked ?? true) && this.unlockCost) {
      cost = this.manager.resolveAll(this.unlockCost());
    }

    const s = start.floor().toNumber(),
      t = target.floor().toNumber();
    if (!isFinite(s) || !isFinite(t) || Math.abs(t - s) > 1000) {
      return { count: 0, style, gain: [], cost: [] };
    }

    let partialCount = 0;
    for (let i = s; i < t; i++) {
      const curCost = this.manager.resolveAll(this.cost(i + 1));
      curCost.forEach((rc) => (rc.count = Decimal.mul(rc.count, costFactor)));
      const partialCost = this.manager.combineAll([...cost, ...curCost]);

      if (style === "partial" && !this.manager.canAfford(partialCost)) {
        break;
      } else {
        partialCount++;
        cost = partialCost;
      }
    }

    if (
      (!dry && !this.manager.canAfford(cost)) ||
      (style === "full" && partialCount !== t - s)
    ) {
      return { count: 0, style, gain: [], cost: [] };
    } else {
      return {
        count: partialCount * Decimal.sign(gainFactor),
        style,
        gain: [
          { resource: this, count: Decimal.mul(gainFactor, partialCount) },
        ],
        cost,
      };
    }
  }

  purchase(
    amount: PurchaseAmount,
    style: PurchaseStyle = "partial",
    dry: boolean = false,
    gainFactor: DecimalSource = 1,
    costFactor: DecimalSource = 1,
    countOverride?: DecimalSource,
  ): PurchaseCost {
    if (typeof amount !== "object" || amount instanceof Decimal) {
      return this.manager.purchase(
        [{ resource: this, count: amount }],
        style,
        dry,
        gainFactor,
        costFactor,
        countOverride,
      );
    }

    const current = this.getCount(countOverride).toNumber();
    if (
      !isFinite(current) ||
      Math.abs(amount.minAmount) > Math.abs(amount.maxAmount) ||
      Math.abs(amount.maxAmount) > 1000 ||
      amount.increments === 0
    ) {
      return { count: 0, style, gain: [], cost: [] };
    }

    const minCount = this.minCount ?? 0,
      maxCount = this.maxCount ?? Infinity,
      increment = amount.increments;
    function adjust(c: number) {
      return Decimal.minus(
        Decimal.clamp(
          Math.floor((current + c) / increment) * increment,
          minCount,
          maxCount,
        ),
        current,
      ).toNumber();
    }

    // Try to buy max amount allowed
    let toBuy = this.manager.purchase(
      [{ resource: this, count: adjust(amount.maxAmount) }],
      "partial",
      true,
      gainFactor,
      costFactor,
      countOverride,
    );
    let pCount = (toBuy.count as Decimal).toNumber();

    // Something partial came back, so adjust it to increments
    if (pCount % increment !== 0) {
      toBuy = this.manager.purchase(
        [{ resource: this, count: adjust(pCount) }],
        "partial",
        true,
        gainFactor,
        costFactor,
        countOverride,
      );
      pCount = (toBuy.count as Decimal).toNumber();
    }

    // Can't afford anything
    if (
      pCount === 0 ||
      (amount.minAmount >= 0 && pCount < amount.minAmount) ||
      (amount.minAmount < 0 && pCount > amount.minAmount)
    ) {
      if (!dry) {
        return { count: 0, style, gain: [], cost: [] };
      }

      const adjusted = adjust(
        Decimal.clamp(
          increment,
          Math.min(amount.minAmount, amount.maxAmount),
          Math.max(amount.minAmount, amount.maxAmount),
        ).toNumber(),
      );
      toBuy = this.manager.purchase(
        [
          {
            resource: this,
            count: adjusted === 0 ? Math.sign(increment) : adjusted,
          },
        ],
        "full",
        true,
        gainFactor,
        costFactor,
        countOverride,
      );
      pCount = (toBuy.count as Decimal).toNumber();
    }

    if (dry) {
      return toBuy;
    } else {
      return this.manager.purchase(
        [{ resource: this, count: pCount }],
        style,
        dry,
        gainFactor,
        costFactor,
        countOverride,
      );
    }
  }
}

export class ResourceManager {
  static singleton = new ResourceManager();
  private constructor(..._: any[]) {}

  readonly resources: Record<string, Resource> = {};

  rateUpdateSecs = 0.1;
  rateHistoryWindow = 10;
  minResourceUpdateSecs = 0.001;
  maxResourceUpdateSecs = 24 * 60 * 60;
  maxResourceTickSecs = 1;
  timeDilation = 1.0;
  lastUpdate?: number;

  globalSellRatio: DecimalSource = 1;

  gainFactor?: (m: DecimalSource) => DecimalSource;
  costFactor?: (m: DecimalSource) => DecimalSource;

  onTickComplete?: (
    changes: Record<string, Decimal>,
    dt: number,
    source: string,
  ) => any;

  execution: Record<
    string,
    {
      lastTick: number;
      lastDelta: number;
      lastResult: any[];
      lastChanges: Record<string, Decimal>;
    }
  > = {};

  static reset(settings?: Partial<ResourceManager>) {
    const rm = new ResourceManager();
    if (settings) {
      let k: keyof ResourceManager;
      for (k in settings) {
        if (k === "resources" || k === "execution") {
          Object.assign(rm[k], settings[k]);
        } else if (settings[k] != undefined) {
          (rm as any)[k] = settings[k];
        }
      }
    }

    ResourceManager.singleton = rm;
    return rm;
  }

  upsert(props: Partial<Resource> | string): Resource {
    const name = typeof props === "string" ? props : props.name ?? "";
    const res =
      props instanceof Resource
        ? props
        : this.resources[name] ?? new Resource(name);

    if (typeof props !== "string" && props !== res) {
      res.fill(props);
    }
    if (res.name) {
      this.resources[res.name] = res;
    }

    return res;
  }

  resolve(res: Partial<Resource> | string): Resource {
    return (
      this.resources[typeof res === "string" ? res : res.name ?? ""] ??
      this.upsert(res)
    );
  }

  resolveAll(rcs: ResourceCount[]): ResourceCount<"resolved">[] {
    return rcs
      .map(({ resource, count }) => ({
        resource: this.resolve(resource),
        count,
      }))
      .filter(({ resource, count }) => resource && Decimal.neq(count, 0));
  }

  combineAll(rcs: ResourceCount<"resolved">[]): ResourceCount<"resolved">[] {
    const res: Record<string, ResourceCount<"resolved">> = {};
    rcs.forEach(({ resource, count }) => {
      res[resource.name] ??= { resource, count: 0 };
      res[resource.name].count = Decimal.add(res[resource.name].count, count);
    });
    return Object.values(res).filter(({ count }) => Decimal.neq(count, 0));
  }

  canAfford(cost: ResourceCount<"resolved">[], toSpend = true): boolean {
    return this.combineAll(cost).every(
      ({ resource, count }) =>
        (resource.unlocked ?? true) &&
        Decimal.sub(resource.count, count).gte(
          toSpend ? resource.minCount ?? 0 : 0,
        ),
    );
  }

  purchase(
    toBuy: ResourceCount[],
    style: PurchaseStyle = "partial",
    dry: boolean = false,
    gainFactor: DecimalSource = 1,
    costFactor: DecimalSource = 1,
    countOverride?: DecimalSource,
  ): PurchaseCost {
    gainFactor = this.gainFactor ? this.gainFactor(gainFactor) : gainFactor;
    costFactor = this.costFactor ? this.costFactor(costFactor) : costFactor;

    const costs = this.resolveAll(toBuy).map(({ resource, count }) => {
      const rcCost = resource.getPurchaseCost(
        count,
        style,
        dry,
        resource.gainFactor ? resource.gainFactor(gainFactor) : gainFactor,
        resource.costFactor ? resource.costFactor(costFactor) : costFactor,
        countOverride,
      );

      if (dry || Decimal.eq(rcCost.count, 0)) {
        return rcCost;
      } else {
        if (!(resource.unlocked ?? true)) {
          if (resource.unlockCost) {
            resource.unlocked = true;
          } else {
            return { count: 0, style, gain: [], cost: [] };
          }
        }

        const gain = resource.apply(rcCost.gain);
        const cost = rcCost.cost
          .map(({ resource, count }) =>
            resource.apply([{ resource, count: Decimal.neg(count) }]),
          )
          .flat();

        const purchaseCost = { ...rcCost, gain, cost };
        if (resource.onPurchase) {
          resource.onPurchase(purchaseCost);
        }
        return purchaseCost;
      }
    });

    return {
      count: costs.reduce((count, rc) => count.plus(rc.count), Decimal.dZero),
      style,
      gain: this.combineAll(costs.map((rcCost) => rcCost.gain).flat()),
      cost: this.combineAll(costs.map((rcCost) => rcCost.cost).flat()),
    };
  }

  purchaseAll(
    resources: Record<string, DecimalSource | undefined>,
    amount: PurchaseAmount,
    style: PurchaseStyle = "partial",
    dry: boolean = false,
    gainFactor: DecimalSource = 1,
    costFactor: DecimalSource = 1,
    countOverride?: DecimalSource,
  ): PurchaseCost {
    let toBuy = Object.values(ResourceManager.singleton.resources).filter(
      (res) => (res.unlocked ?? true) && !res.disabled,
    );
    const limits = Object.keys(resources);
    if (limits.length > 0) {
      toBuy = toBuy.filter((res) => limits.includes(res.name));
    }

    const costs = toBuy.map((res) => {
      return res.purchase(
        amount,
        style,
        dry,
        gainFactor,
        costFactor,
        resources[res.name] ?? countOverride,
      );
    });

    return {
      count: costs.reduce((count, rc) => count.plus(rc.count), Decimal.dZero),
      style,
      gain: this.combineAll(costs.map((rcCost) => rcCost.gain).flat()),
      cost: this.combineAll(costs.map((rcCost) => rcCost.cost).flat()),
    };
  }

  tick(now: number = Date.now(), source: string = "unknown"): any[] {
    // Figure out how long it's been since last tick
    let dt = Math.min(
      Math.max((now - (this.lastUpdate ?? now)) / 1000, 0),
      this.maxResourceUpdateSecs,
    );
    if (dt < this.minResourceUpdateSecs && this.lastUpdate != undefined) {
      return [];
    }

    this.lastUpdate = now;
    const epoch = now - dt * 1000;
    const cache: Record<string, Decimal> = {};

    // Automatically unlock resources whose unlock cost can be afforded
    Object.values(this.resources).forEach((res) => {
      if (res.autoUnlock && !res.disabled && !(res.unlocked ?? true)) {
        if (
          this.canAfford(
            this.resolveAll((res.unlockCost ?? res.cost)(1)),
            false,
          )
        ) {
          res.unlocked = true;
        }
      }
    });

    // Figure out what needs to be updated
    const resources = Object.values(this.resources)
      .filter((res) => (res.unlocked ?? true) && !res.disabled)
      .sort((a, b) => a.priority - b.priority);

    // Update rates and execution
    resources.forEach((res) => {
      cache[res.name] = Decimal.fromValue_noAlloc(res.count);

      res.rate.lastCountUpdate ??= epoch;
      res.rate.lastCount ??= cache[res.name];
      res.execution.lastTick = Math.min(
        Math.max(
          res.execution.lastTick ?? epoch,
          now - this.maxResourceUpdateSecs * 1000,
        ),
        now,
      );
      res.execution.lastAttempt = now;
    });

    // tick all resources
    const results: Record<string, any[]> = {};
    const tickResources = resources.filter((res) => res.tick);
    const tickScale = 1 / 1000 / this.timeDilation;
    while (dt > 0) {
      dt -= Math.min(
        Math.max(dt, this.minResourceUpdateSecs),
        this.maxResourceTickSecs,
      );
      const slice = now - dt * 1000;

      tickResources.forEach((res) => {
        const tick = (slice - res.execution.lastTick!) * tickScale;

        if (tick > 0 && (!res.shouldTick || res.shouldTick(tick, source))) {
          res.execution.lastResult = res.tick!(tick, source);
          res.execution.lastTick = slice;
          res.rate.deltaTicks = (res.rate.deltaTicks ?? 0) + 1;
          res.rate.lastTickUpdate ??= slice;

          if (res.execution.lastResult) {
            if (!results[res.name]) {
              results[res.name] = [];
            }

            if (!results[res.name].includes(res.execution.lastResult)) {
              results[res.name].push(res.execution.lastResult);
            }
          }
        }
      });
    }

    // Automatically award resources whose cost can be afforded
    resources.forEach((res) => {
      if (
        res.autoAward &&
        !res.disabled &&
        Decimal.lt(res.count, res.maxCount ?? 0)
      ) {
        const req = res.cost(Decimal.add(res.count, 1));
        if (this.canAfford(this.resolveAll(req), false)) {
          res.count = Decimal.add(res.count, 1);

          if (res.onPurchase) {
            res.onPurchase({
              count: 1,
              style: "free",
              gain: [{ resource: res, count: 1 }],
              cost: [],
            });
          }
        }
      }
    });

    // Update rates
    resources.forEach((res) => {
      const rateDt = (now - (res.rate.lastCountUpdate ?? 0)) / 1000;
      if (
        res.rate.lastCountUpdate == undefined ||
        res.rate.lastCount == undefined ||
        rateDt >= this.rateUpdateSecs
      ) {
        res.rate.count = Decimal.minus(res.count, res.rate.lastCount ?? 0).div(
          rateDt,
        );
        res.rate.lastCount = Decimal.fromValue_noAlloc(res.count);
        res.rate.lastCountUpdate = now;
        res.rate.pastCounts.unshift(res.rate.count);
        res.rate.pastCounts.splice(this.rateHistoryWindow);
      }

      const tickRateDt = (now - (res.rate.lastTickUpdate ?? 0)) / 1000;
      if (
        res.rate.lastTickUpdate == undefined ||
        res.rate.deltaTicks == undefined ||
        tickRateDt >= this.rateUpdateSecs
      ) {
        res.rate.ticks = (res.rate.deltaTicks ?? 0) / tickRateDt;
        res.rate.deltaTicks = 0;
        res.rate.lastTickUpdate = now;
        res.rate.pastTicks.unshift(res.rate.ticks);
        res.rate.pastTicks.splice(this.rateHistoryWindow);
      }
    });

    // Call the onChange callbacks on all resources that changed
    resources.forEach((res) => {
      cache[res.name] = Decimal.minus(res.count, cache[res.name] ?? 0);
      if (cache[res.name].eq(0)) {
        delete cache[res.name];
      }

      if (res.onChange && cache[res.name]) {
        const changeResult = res.onChange(res.count, source);
        if (changeResult && !results[res.name].includes(changeResult)) {
          results[res.name].push(changeResult);
        }
      }
    });

    // Update execution status
    this.execution[source] = {
      lastTick: now,
      lastDelta: (now - epoch) / 1000,
      lastResult: Object.values(results)
        .flat()
        .filter((value, index, self) => self.indexOf(value) === index),
      lastChanges: cache,
    };

    // Call the onUpdateComplete callback
    if (this.onTickComplete) {
      const updateResult = this.onTickComplete(
        cache,
        (now - epoch) / 1000,
        source,
      );
      if (updateResult) {
        results["__ResourceManager_onUpdateComplete"] = [updateResult];
      }
    }

    return this.execution[source].lastResult;
  }
}
