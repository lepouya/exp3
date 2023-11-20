import React, { MouseEvent } from "react";

import { IonButton, IonChip } from "@ionic/react";

import Game from "../model/Game";
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

  gainFactor?: number;
  costFactor?: number;
  mode?: "buy" | "sell";

  overrideCount?: number | string;
  overrideBuyAmount?: string;

  prefix?: string;
  suffix?: string;
  infix?: string;
  and?: string;

  shape?: "round" | "square";
  fill?: "clear" | "outline" | "solid";
  size?: "small" | "default" | "large";
  color?: string;
  expand?: "full" | "block";

  className?: string;
  style?: React.CSSProperties;

  onPurchase?: (resource: Resource, bought: number) => void;
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

  shape,
  fill,
  size,
  color,
  expand,

  className,
  style,
  onPurchase,
}: BuyButtonProps) {
  const rm = Game.useResourceManager();
  const res = rm.resolve(resource);
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
        override: { count: count * Factor },
        prec: precision,
        alwaysShowSign: true,
      });
      return (
        <React.Fragment key={res.name}>
          {i > 0 && <div className="prefix">{and}</div>}
          <IonChip
            color={chipColor[res.valueSign ?? "zero"]}
            style={{ textTransform: "none" }}
          >
            {res.value?.replace(/[+-]/g, "")}{" "}
            {res.icon && <Icon icon={res.icon} size="small" />}
            {res.name}
          </IonChip>
        </React.Fragment>
      );
    });
  }

  function doPurchase(amount: number, event: MouseEvent) {
    event.preventDefault();
    if (!enabled || amount === 0) {
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
  const hasGain = tx.gain.some(({ count }) => count !== 0);
  const hasCost = tx.cost.some(({ count }) => count !== 0);
  const classNames = [className, "buy-button", active ? null : "inactive"];

  if (!hasGain) {
    return null;
  }
  return (
    <IonButton
      onClick={(e) => doPurchase(active && enabled ? tx.count : 0, e)}
      disabled={!active || !enabled}
      className={classNames.filter(Boolean).join(" ")}
      style={style}
      id={`button-buy-${res.name}`}
      shape={shape === "round" ? "round" : undefined}
      fill={fill}
      size={size}
      color={color}
      expand={expand}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      {renderResourceCounts(tx.gain)}
      {hasCost && enabled && infix && <div className="infix">{infix}</div>}
      {hasCost && enabled && renderResourceCounts(tx.cost, -1)}
      {suffix && <div className="suffix">{suffix}</div>}
    </IonButton>
  );
}

BuyButton.BuyAmountButtons = () => {
  const rm = Game.useResourceManager();
  return (
    <>
      {Object.keys(buyAmounts)
        .sort((a, b) => a.substring(1).localeCompare(b.substring(1)))
        .map((value) => (
          <IonButton
            key={value}
            fill={value === rm.globalBuyAmount ? "solid" : "outline"}
            onClick={() => (rm.globalBuyAmount = value)}
            id={`button-${value.replace(/\W/g, "")}`}
            style={{ height: "2.5em", width: "4em" }}
            size="small"
          >
            {buyIcons[value[0]] && (
              <Icon icon={buyIcons[value[0]]} size="small" />
            )}
            {value.replace(/^[+x]/, "").toUpperCase()}
          </IonButton>
        ))}
    </>
  );
};

export type BuyAllButtonProps = {
  resources?: Record<string, number | undefined> | Array<Resource | string>;
  enabled?: boolean;
  showNames?: boolean;

  maxNum?: number;
  minNum?: number;
  increment?: number;

  overrideCount?: number | string;
  overrideBuyAmount?: string;

  gainFactor?: number;
  costFactor?: number;

  prefix?: string;
  infix?: string;
  suffix?: string;
  and?: string;
  all?: string;

  shape?: "round" | "square";
  fill?: "clear" | "outline" | "solid";
  size?: "small" | "default" | "large";
  color?: string;
  expand?: "full" | "block";

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

  shape,
  fill,
  size,
  color,
  expand,

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
    <IonButton
      onClick={doPurchase}
      disabled={!enabled}
      className={["buy-all-button", className].filter(Boolean).join(" ")}
      style={style}
      shape={shape === "round" ? "round" : undefined}
      fill={fill}
      size={size}
      color={color}
      expand={expand}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      <IonChip color={chipColor["positive"]} style={{ textTransform: "none" }}>
        {buyIcons[buyAmount[0]] && (
          <Icon icon={buyIcons[buyAmount[0]]} size="small" />
        )}
        {buyAmount.replace(/^[+x]/, "").toUpperCase()}
        {enabled && names && (infix ? ` ${infix}` : "") + " " + names}
      </IonChip>
      {suffix && <div className="suffix">{suffix}</div>}
    </IonButton>
  );
};

const chipColor = {
  negative: "danger",
  zero: "medium",
  positive: "success",
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
  x: "caretForwardOutline",
  "+": "addOutline",
};
