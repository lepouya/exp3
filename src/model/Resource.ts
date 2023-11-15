import Decimal, { DecimalSource } from "break_eternity.js";

/**
 * The type of display for a resource.
 */
export type DisplayType = "none" | "number" | "time" | "percentage";

/**
 * A resource count, with a resource and a count.
 * @template Resolved Whether the resource is resolved or only the name.
 */
export type ResourceCount<
  Resolved extends "resolved" | "mixed" = "mixed",
  Option = Resolved extends "resolved" ? never : string,
> = {
  resource: Resource | Option;
  count: DecimalSource;
};

/**
 * Represents the purchase style of a resource.
 */
export type PurchaseStyle = "full" | "partial" | "free";

/**
 * Represents the amount of a purchase, which can be either a decimal number or
 * an object with a minimum amount, maximum amount, and increments.
 * In the case of an object, the purchase will be made in increments of the
 * given amount, starting at the minimum amount and ending at the maximum amount.
 */
export type PurchaseAmount =
  | DecimalSource
  | {
      minAmount: number;
      maxAmount: number;
      increments: number;
    };

/**
 * Represents the cost of purchasing a resource.
 */
export type PurchaseCost = {
  count: DecimalSource;
  style: PurchaseStyle;
  gain: ResourceCount<"resolved">[];
  cost: ResourceCount<"resolved">[];
};

/**
 * Represents a resource in the game.
 */
export default class Resource {
  /// The resource manager that updates this resource.
  readonly manager = ResourceManager.singleton;
  /// Unique name of the resource.
  readonly name: string;

  /// Whether the resource is unlocked and can be used.
  unlocked?: boolean;
  /// Whether the resource is disabled and cannot be updated.
  disabled?: boolean;
  /// The priority of the resource, used to determine update order. Lower is better.
  priority: number = Infinity;

  /// The icon to display when rendering the resource.
  icon?: string;
  /// The display style of the resource when rendering.
  display?: DisplayType;
  /// The singular name of the resource, used when rendering.
  singularName?: string;
  /// The plural name of the resource, used when rendering.
  pluralName?: string;
  /// The description of the resource, used when rendering.
  description?: string;

  /// The current count of the resource. The main reason why we need resource management.
  count: Decimal = Decimal.dZero;
  /// The maximum count the resource can take.
  maxCount?: DecimalSource;
  /// The minimum count the resource can take.
  minCount?: DecimalSource;

  /// Extra data for the resource. Can be used for tick updates or rendering.
  extra: Record<string, any> = {};

  /// Whether the resource should be automatically unlocked when its unlock cost can be afforded.
  autoUnlock?: boolean;
  /// Whether the resource should be automatically awarded when its cost can be afforded.
  autoAward?: boolean;

  /// Customized value return for the resource. In most cases the default is fine.
  value: () => Decimal = () =>
    Decimal.clamp(this.count, this.minCount ?? 0, this.maxCount ?? Infinity);
  /// Customized cost function for the resource. Returns the resource costs for
  /// purchasing the n'th count of the resource. Not cumulative.
  cost: (n: DecimalSource) => ResourceCount[] = () => [];
  /// Customized unlock cost function for the resource. Returns the resource
  /// costs for unlocking the resource. If not unlocked already.
  unlockCost?: () => ResourceCount[];

  /// Pre-check when the manager is updating this resource. Returns true if the
  /// resource should be updated, false otherwise.
  shouldTick?: (dt: number, source?: string) => boolean;
  /// The resource tick function. This is where updates to the resource should
  /// be made. The return value is collected along with all other resources to
  /// be returned by the manager.
  tick?: (dt: number, source?: string) => any;

  /// Customized gain factor for the resource. Used when calculating the gain
  /// from a purchase.
  gainFactor?: (m: DecimalSource) => DecimalSource;
  /// Customized cost factor for the resource. Used when calculating the cost
  /// for a purchase.
  costFactor?: (m: DecimalSource) => DecimalSource;

  /// Callback for when the resource is purchased. The purchase cost is passed
  /// in as an argument.
  onPurchase?: (purchase: PurchaseCost) => void;
  /// Callback for when the resource is changed. The new count and the source
  /// of the change is passed in as arguments.
  onChange?: (count: DecimalSource, source: string) => any;

  /// The last execution status of the resource.
  execution: {
    lastTick?: number;
    lastResult?: any;
    lastAttempt?: number;
  } = {};

  /// The last rate update of the resource.
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
      if (k === "extra" || k === "rate" || k === "execution") {
        Object.assign(this[k], res[k]);
      } else if (k === "count" || k === "maxCount" || k === "minCount") {
        if (res[k] != undefined) {
          this[k] = Decimal.fromValue(res[k]!);
        }
      } else if (k !== "manager" && k !== "name" && res[k] != undefined) {
        (this as any)[k] = res[k];
      }
    }

    // Fix things that should have been Decimal
    if (this.count && !(this.count instanceof Decimal)) {
      this.count = Decimal.fromValue(this.count);
    }
    if (this.rate.count && !(this.rate.count instanceof Decimal)) {
      this.rate.count = Decimal.fromValue(this.rate.count);
    }
    if (this.rate.lastCount && !(this.rate.lastCount instanceof Decimal)) {
      this.rate.lastCount = Decimal.fromValue(this.rate.lastCount);
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

  withTimer({
    kind = "",
    tickSource = "",

    minValue = 0.0,
    maxValue = +Infinity,
    direction = 1.0,

    streakKind = "current",
    maxStreakKind = "max",
    minStreakKind = "min",
    resetStreakSource = "",
  } = {}): this {
    this.tick = function (dt: number, src?: string) {
      if (!tickSource || src === tickSource) {
        let cur =
          (kind && this.extra ? this.extra[kind] : this.count?.toNumber()) ?? 0;
        if (
          (cur > minValue || direction > 0) &&
          (cur < maxValue || direction < 0)
        ) {
          cur = Math.min(Math.max(cur + direction * dt, minValue), maxValue);
          if (kind && this.extra) {
            this.extra[kind] = cur;
          } else {
            this.count = Decimal.fromNumber(cur);
          }

          if (streakKind && this.extra && this.extra[streakKind] != null) {
            this.extra[streakKind] = Math.min(
              Math.max(this.extra[streakKind] + direction * dt, minValue),
              maxValue,
            );

            if (
              maxStreakKind &&
              this.extra[maxStreakKind] != null &&
              this.extra[maxStreakKind] < this.extra[streakKind]
            ) {
              this.extra[maxStreakKind] = this.extra[streakKind];
            }

            if (
              minStreakKind &&
              this.extra[minStreakKind] != null &&
              this.extra[minStreakKind] > this.extra[streakKind]
            ) {
              this.extra[minStreakKind] = this.extra[streakKind];
            }
          }
        }
      } else if (!resetStreakSource || src === resetStreakSource) {
        if (streakKind && this.extra) {
          this.extra[streakKind] =
            direction > 0 ? minValue : direction < 0 ? maxValue : 0;
        }
      }

      return null;
    };

    return this;
  }
}

export class ResourceManager {
  static singleton = new ResourceManager();
  private constructor(..._: any[]) {}

  readonly resources: Record<string, Resource> = {};

  ticksPerSecond: number = 50;
  rendersPerSecond: number = 10;
  saveFrequencySecs: number = 60;

  lastReset: number = Date.now();
  lastSaved: number = 0;
  lastLoaded: number = Date.now();
  lastRender: number = 0;
  lastTick?: number;

  rateUpdateSecs = 0.1;
  rateHistoryWindow = 10;
  minResourceUpdateSecs = 0.001;
  maxResourceUpdateSecs = 24 * 60 * 60;
  maxResourceTickSecs = 1;

  globalTimeDilation = 1.0;
  globalNumberFormat?: string;
  globalSellRatio: DecimalSource = 1;
  globalBuyAmount: string = "+1";

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
    rm.load(settings);
    ResourceManager.singleton = rm;
    return rm;
  }

  static load(settings?: Partial<ResourceManager> | string) {
    return ResourceManager.singleton.load(settings);
  }

  static save() {
    return ResourceManager.singleton.save();
  }

  static upsert(props: Partial<Resource> | string) {
    return ResourceManager.singleton.upsert(props);
  }

  static get(res: Partial<Resource> | string) {
    return ResourceManager.singleton.resolve(res);
  }

  static resolveAll(rcs: ResourceCount[]) {
    return ResourceManager.singleton.resolveAll(rcs);
  }

  static combineAll(rcs: ResourceCount<"resolved">[]) {
    return ResourceManager.singleton.combineAll(rcs);
  }

  static canAfford(cost: ResourceCount<"resolved">[], toSpend = true) {
    return ResourceManager.singleton.canAfford(cost, toSpend);
  }

  static purchase(
    toBuy: ResourceCount[],
    style: PurchaseStyle = "partial",
    dry: boolean = false,
    gainFactor: DecimalSource = 1,
    costFactor: DecimalSource = 1,
    countOverride?: DecimalSource,
  ) {
    return ResourceManager.singleton.purchase(
      toBuy,
      style,
      dry,
      gainFactor,
      costFactor,
      countOverride,
    );
  }

  static purchaseAll(
    resources: Record<string, DecimalSource | undefined>,
    amount: PurchaseAmount,
    style: PurchaseStyle = "partial",
    dry: boolean = false,
    gainFactor: DecimalSource = 1,
    costFactor: DecimalSource = 1,
    countOverride?: DecimalSource,
  ) {
    return ResourceManager.singleton.purchaseAll(
      resources,
      amount,
      style,
      dry,
      gainFactor,
      costFactor,
      countOverride,
    );
  }

  static tick(
    now?: number,
    source?: string,
    onSave?: () => void,
    onRender?: () => void,
  ) {
    return ResourceManager.singleton.tick(now, source, onSave, onRender);
  }

  load(settings?: Partial<ResourceManager> | string): this {
    if (!settings) {
      return this;
    }

    if (typeof settings === "string") {
      return this.load(JSON.parse(settings));
    }

    let k: keyof ResourceManager;
    for (k in settings) {
      if (settings[k] == undefined || settings[k] == null) {
        continue;
      } else if (k === "resources") {
        Object.values(settings[k] ?? {}).forEach((res) => this.upsert(res));
      } else if (k === "execution") {
        Object.assign(this[k], settings[k]);
      } else {
        (this as any)[k] = settings[k];
      }
    }

    this.lastLoaded = Date.now();
    return this;
  }

  save(): Partial<ResourceManager> {
    this.lastSaved = Date.now();
    return this;
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

  tick(
    now: number = Date.now(),
    source: string = "unknown",
    onSave?: (rm?: this) => void,
    onRender?: (rm?: this) => void,
  ): any[] {
    // Figure out how long it's been since last tick
    let dt = Math.min(
      Math.max((now - (this.lastTick ?? now)) / 1000, 0),
      this.maxResourceUpdateSecs,
    );
    if (dt < this.minResourceUpdateSecs && this.lastTick != undefined) {
      return [];
    }

    this.lastTick = now;
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
      cache[res.name] = res.count;

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
    const tickScale = 1 / 1000 / this.globalTimeDilation;
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
        res.rate.lastCount = res.count;
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

    // Callbacks for save and render in game loop
    if (
      onSave &&
      this.lastTick - this.lastSaved >= this.saveFrequencySecs * 1000 &&
      this.lastTick - this.lastLoaded >= this.saveFrequencySecs * 1000
    ) {
      this.lastSaved = this.lastTick;
      onSave(this);
    }

    if (
      onRender &&
      this.lastTick - this.lastRender >= 1000.0 / this.rendersPerSecond
    ) {
      this.lastRender = this.lastTick;
      onRender(this);
    }

    return this.execution[source].lastResult;
  }
}
