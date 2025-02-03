import Decimal, { DecimalSource } from "break_eternity.js";
import React from "react";

import { IonButton, IonChip } from "@ionic/react";

import Resource, { ResourceCount } from "../model/Resource";
import State from "../model/State";
import className from "../utils/className";
import Icon from "./Icon";

export type BuyButtonProps = {
  resource?: Partial<Resource> | string;

  enabled?: boolean;
  allowUnlocking?: boolean;
  mode?: "buy" | "sell";

  maxNum?: number;
  minNum?: number;
  increment?: number;
  precision?: number;
  buyAmount?: string;

  gainFactor?: DecimalSource;
  costFactor?: DecimalSource;
  countOverride?: DecimalSource;

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
  debug?: boolean;

  onPurchase?: (resource: Resource, bought: DecimalSource) => void;
};

export default function BuyButton(props: BuyButtonProps) {
  const resource = Resource.useHook(props.resource);
  const buyAmount =
    buyAmounts[props.buyAmount ?? Resource.globalSettings.buyAmount ?? "+1"] ??
    buyAmounts["+1"];
  const amount = {
    minAmount: props.minNum ?? buyAmount.min,
    maxAmount: props.maxNum ?? buyAmount.max,
    increments: props.increment ?? buyAmount.inc,
  };
  let enabled = props.enabled ?? true;

  if (resource.locked) {
    if (props.allowUnlocking) {
      amount.minAmount = amount.maxAmount = amount.increments = 1;
    } else {
      amount.minAmount = amount.maxAmount = amount.increments = 0;
      enabled = false;
    }
  }

  function renderResourceCounts(rcs: ResourceCount[], factor = 1) {
    return rcs.map(({ resource, count }, i) => {
      const res = Resource.get(resource).format({
        override: { count: Decimal.mul(count, factor) },
        prec: props.precision ?? 0,
        alwaysShowSign: true,
      });
      return (
        <React.Fragment key={res.name}>
          {i > 0 && <div className="prefix">{props.and ?? " & "}</div>}
          <IonChip
            color={chipColor[res.valueSign ?? "zero"]}
            style={{ textTransform: "none" }}
          >
            {res.value?.replace(/[+-]/g, "")}{" "}
            {res.icon && <Icon icon={res.icon} size="1ex" />}
            {res.name}
          </IonChip>
        </React.Fragment>
      );
    });
  }

  function doPurchase(amount: DecimalSource, event: React.UIEvent) {
    event.preventDefault();
    if (!enabled || Decimal.eq(amount, 0)) {
      return;
    }

    const bought = resource.buy(
      amount,
      "partial",
      props.gainFactor,
      props.costFactor,
      props.countOverride,
    );

    if (props.onPurchase && bought.gain.length > 0) {
      props.onPurchase(resource, bought.gain[0].count);
    }
  }

  const tx =
    props.mode === "sell"
      ? resource.sell(
          amount,
          "dry-full",
          1,
          props.costFactor,
          props.countOverride,
        )
      : resource.buy(
          amount,
          "dry-partial",
          props.gainFactor,
          props.costFactor,
          props.countOverride,
        );
  const active = Resource.canAfford(tx.cost);
  const hasGain = tx.gain.some(({ count }) => Decimal.neq(count, 0));
  const hasCost = tx.cost.some(({ count }) => Decimal.neq(count, 0));
  const classNames = [props.className, "buy-button", active || "inactive"];
  const prefix = props.prefix ?? "Buy";
  const suffix = props.suffix ?? "";
  const infix = props.infix ?? "for";

  if (!hasGain && !props.debug) {
    return null;
  }

  return (
    <IonButton
      onClick={(e) => doPurchase(active && enabled ? tx.count : 0, e)}
      disabled={!active || !enabled}
      className={className(classNames)}
      style={props.style}
      id={`button-buy-${resource.name}`}
      shape={props.shape === "round" ? "round" : undefined}
      fill={props.fill}
      size={props.size}
      color={props.color}
      expand={props.expand}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      {renderResourceCounts(tx.gain)}
      {hasCost && enabled && infix && <div className="infix">{infix}</div>}
      {hasCost && enabled && renderResourceCounts(tx.cost, -1)}
      {suffix && <div className="suffix">{suffix}</div>}
      {props.debug && (
        <div className="full debug">
          {JSON.stringify(tx, (k, v) => (k === "resource" ? v.name : v), 2)}
        </div>
      )}
    </IonButton>
  );
}

BuyButton.BuyAmountButtons = () => {
  const state = State.useHook();
  return (
    <>
      {Object.keys(buyAmounts)
        .sort((a, b) => a.substring(1).localeCompare(b.substring(1)))
        .map((value) => (
          <IonButton
            key={value}
            fill={value === state.buyAmount ? "solid" : "outline"}
            onClick={() => state.set({ buyAmount: value })}
            id={`button-${value.replace(/\W/g, "")}`}
            style={{ height: "2.5em", width: "5em" }}
            size="small"
          >
            {buyIcons[value[0]] && (
              <Icon icon={buyIcons[value[0]]} size="1ex" />
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
  buyAmount?: string;

  gainFactor?: number;
  costFactor?: number;
  countOverride?: number | string;

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

BuyButton.BuyAllButton = (props: BuyAllButtonProps) => {
  const buyAmount = props.buyAmount ?? State.global.buyAmount ?? "+1";
  const predefAmounts = buyAmounts[buyAmount] ?? buyAmounts["+1"];
  const amount = {
    minAmount: props.minNum ?? predefAmounts.min,
    maxAmount: props.maxNum ?? predefAmounts.max,
    increments: props.increment ?? predefAmounts.inc,
  };

  const resources = Array.isArray(props.resources)
    ? Object.fromEntries(
        props.resources.map((n) => [
          typeof n === "string" ? n : n.name,
          undefined,
        ]),
      )
    : props.resources || {};
  const enabled =
    (props.enabled ?? true) && Object.values(resources).length > 0;

  let names = props.all ?? "all";
  if (props.showNames) {
    names =
      Object.keys(resources)
        .map((res) => Resource.get(res))
        .map((res) => res.singularName ?? res.pluralName ?? res.name)
        .filter((name) => !!name)
        .join(props.and ?? " & ") || names;
  }

  function doPurchase(event: React.UIEvent) {
    event.preventDefault();
    if (!enabled) {
      return;
    }

    const bought = Resource.purchaseAll(
      resources,
      amount,
      "partial",
      props.gainFactor,
      props.costFactor,
      props.countOverride,
    );

    if (props.onPurchase && bought.gain.length > 0) {
      props.onPurchase(bought.gain);
    }
  }

  const classNames = [props.className, "buy-all-button"];
  const prefix = props.prefix ?? "Buy";
  const suffix = props.suffix ?? "";
  const infix = props.infix ?? "of";

  return (
    <IonButton
      onClick={doPurchase}
      disabled={!enabled}
      className={className(classNames)}
      style={props.style}
      shape={props.shape === "round" ? "round" : undefined}
      fill={props.fill}
      size={props.size}
      color={props.color}
      expand={props.expand}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      <IonChip color={chipColor["positive"]} style={{ textTransform: "none" }}>
        {buyIcons[buyAmount[0]] && (
          <Icon icon={buyIcons[buyAmount[0]]} size="1ex" />
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
