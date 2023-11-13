import Decimal, { DecimalSource } from "break_eternity.js";
import { MouseEvent } from "react";
import { useLocation } from "react-router";

import Resource, { ResourceCount, ResourceManager } from "../model/Resource";
import Format from "../utils/format";
import Icon from "./Icon";

export type BuyButtonProps = {
  resource: string | Resource;
  enabled?: boolean;
  allowUnlocking?: boolean;

  maxNum?: number;
  minNum?: number;
  increment?: number;
  precision?: number;

  gainFactor?: DecimalSource;
  costFactor?: DecimalSource;
  mode?: "buy" | "sell";

  overrideCount?: DecimalSource;
  overrideBuyAmount?: string;

  prefix?: string;
  suffix?: string;
  infix?: string;
  and?: string;

  className?: string;
  style?: React.CSSProperties;

  onPurchase?: (resource: Resource, bought: DecimalSource) => void;
};

export default function BuyButton({
  resource,
  enabled = true,
  allowUnlocking = false,

  maxNum,
  minNum,
  increment,
  precision = 0,

  gainFactor = 1,
  costFactor = 1,
  mode = "buy",

  overrideCount,
  overrideBuyAmount,

  prefix = "Buy",
  suffix = "",
  infix = "for",
  and = "&",

  className,
  style,
  onPurchase,
}: BuyButtonProps) {
  const location = useLocation();
  const debug = location.search.toLowerCase().includes("debug");
  const res = ResourceManager.get(resource);
  const buyAmount =
    buyAmounts[
      overrideBuyAmount ?? ResourceManager.singleton.globalBuyAmount ?? "+1"
    ] ?? buyAmounts["+1"];
  const amount = {
    minAmount: minNum ?? buyAmount.min,
    maxAmount: maxNum ?? buyAmount.max,
    increments: increment ?? buyAmount.inc,
  };

  if (!(res.unlocked ?? true)) {
    if (allowUnlocking) {
      amount.minAmount = amount.maxAmount = amount.increments = 1;
    } else {
      amount.minAmount = amount.maxAmount = amount.increments = 0;
      enabled = false;
    }
  }

  function renderResourceCounts(rcs: ResourceCount[], Factor = 1) {
    return rcs.map(({ resource, count }, i) => {
      resource = ResourceManager.get(resource);
      const res = Format.resource(resource, {
        override: { count: Decimal.mul(count, Factor) },
        prec: precision,
        alwaysShowSign: true,
      });
      return (
        <div className="resource" key={res.name}>
          {i > 0 && <div className="prefix">{and}</div>}
          <div className={res.valueSign}>{res.value}</div>
          <div>
            {resource.icon && <Icon icon={resource.icon} size="1em" />}
            {res.name}
          </div>
        </div>
      );
    });
  }

  function doPurchase(amount: DecimalSource, event: MouseEvent) {
    event.preventDefault();
    if (!enabled || Decimal.eq(amount, 0)) {
      return;
    }

    const bought = res.buy(
      amount,
      "partial",
      false,
      gainFactor,
      costFactor,
      overrideCount,
    );

    if (onPurchase && bought.gain.length > 0) {
      onPurchase(res, bought.gain[0].count);
    }
  }

  const tx =
    mode === "buy"
      ? res.buy(amount, "partial", true, gainFactor, costFactor, overrideCount)
      : res.sell(amount, "full", true, 1, costFactor, overrideCount);
  const active = ResourceManager.canAfford(tx.cost);
  const hasGain = tx.gain.some(({ count }) => Decimal.neq(count, 0));
  const hasCost = tx.cost.some(({ count }) => Decimal.neq(count, 0));
  const classNames = [className, "buy-button", active ? null : "inactive"];

  if (!hasGain && !debug) {
    return null;
  }
  return (
    <button
      onClick={(e) => doPurchase(active && enabled ? tx.count : 0, e)}
      disabled={!active || !enabled}
      className={classNames.filter(Boolean).join(" ")}
      style={style}
      id={`button-buy-${res.name}`}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      {renderResourceCounts(tx.gain)}
      {hasCost && enabled && infix && <div className="infix">{infix}</div>}
      {hasCost && enabled && renderResourceCounts(tx.cost, -1)}
      {suffix && <div className="suffix">{suffix}</div>}
      {debug && (
        <div className="full debug">
          {JSON.stringify(tx, (k, v) => (k === "resource" ? v.name : v), 2)}
        </div>
      )}
    </button>
  );
}

BuyButton.BuyAmountButtons = () => {
  return (
    <>
      {Object.keys(buyAmounts)
        .sort((a, b) => a.substring(1).localeCompare(b.substring(1)))
        .map((value) => (
          <button
            value={value}
            key={value}
            className={[
              "buy-amount-button",
              value === ResourceManager.singleton.globalBuyAmount && "selected",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={(e: any) =>
              (ResourceManager.singleton.globalBuyAmount = e.target.value)
            }
            id={`button-${value.replace(/\W/g, "")}`}
          >
            {buyIcons[value[0]] && <Icon icon={buyIcons[value[0]]} />}
            {value.replace(/^[+x]/, "").toUpperCase()}
          </button>
        ))}
    </>
  );
};

export type BuyAllButtonProps = {
  resources?:
    | Record<string, DecimalSource | undefined>
    | Array<Resource | string>;
  enabled?: boolean;
  showNames?: boolean;

  maxNum?: number;
  minNum?: number;
  increment?: number;

  overrideCount?: DecimalSource;
  overrideBuyAmount?: string;

  gainFactor?: DecimalSource;
  costFactor?: DecimalSource;

  prefix?: string;
  infix?: string;
  suffix?: string;
  and?: string;
  all?: string;

  className?: string;
  style?: React.CSSProperties;

  onPurchase?: (rc: ResourceCount[]) => void;
};

BuyButton.BuyAllButton = ({
  resources = {},
  enabled = true,
  showNames = true,

  maxNum,
  minNum,
  increment,

  overrideCount,
  overrideBuyAmount,

  gainFactor = 1,
  costFactor = 1,

  prefix = "Buy",
  suffix = "",
  infix = "of",
  and = " & ",
  all = "all",

  className,
  style,
  onPurchase,
}: BuyAllButtonProps) => {
  const buyAmount =
    overrideBuyAmount || ResourceManager.singleton.globalBuyAmount || "+1";
  const predefAmounts = buyAmounts[buyAmount] ?? buyAmounts["+1"];
  const amount = {
    minAmount: minNum ?? predefAmounts.min,
    maxAmount: maxNum ?? predefAmounts.max,
    increments: increment ?? predefAmounts.inc,
  };

  let names = all;
  const limits = Array.isArray(resources) ? resources : Object.keys(resources);
  if (showNames && limits.length > 0) {
    names = limits
      .map((res) => ResourceManager.get(res))
      .map((res) => res.singularName ?? res.pluralName ?? res.name)
      .filter((name) => !!name)
      .join(and);
  }

  function doPurchase(event: MouseEvent) {
    event.preventDefault();
    if (!enabled) {
      return;
    }

    if (Array.isArray(resources)) {
      resources = Object.fromEntries(
        resources.map((n) => [typeof n === "string" ? n : n.name, undefined]),
      );
    }

    const bought = ResourceManager.purchaseAll(
      resources,
      amount,
      "partial",
      false,
      gainFactor,
      costFactor,
      overrideCount,
    );

    if (onPurchase && bought.gain.length > 0) {
      onPurchase(bought.gain);
    }
  }

  return (
    <button
      onClick={doPurchase}
      disabled={!enabled}
      className={["buy-all-button", className].filter(Boolean).join(" ")}
      style={style}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      {buyIcons[buyAmount[0]] && (
        <div className="icon">
          <Icon icon={buyIcons[buyAmount[0]]} />
        </div>
      )}
      <div className="amount">
        {buyAmount.replace(/^[+x]/, "").toUpperCase()}
      </div>
      {enabled && names && infix && <div className="infix">{infix}</div>}
      {enabled && names && <div className="names">{names}</div>}
      {suffix && <div className="suffix">{suffix}</div>}
    </button>
  );
};

const buyAmounts: Record<string, { min: number; max: number; inc: number }> = {
  "+1": { min: 1, max: 1, inc: 1 },
  x10: { min: 1, max: 10, inc: 10 },
  x100: { min: 1, max: 100, inc: 100 },
  "+10": { min: 10, max: 10, inc: 1 },
  "+100": { min: 100, max: 100, inc: 1 },
  max: { min: 1, max: 1000, inc: 1 },
};

const buyIcons: Record<string, string> = {
  x: "ti:arrow-bar-to-right",
  "+": "ti:x",
};
