import Decimal from "break_eternity.js";
import { calculatorOutline } from "ionicons/icons";
import React from "react";

import { IonCol, IonGrid, IonRow } from "@ionic/react";

import BuyButton from "../components/BuyButton";
import Icon from "../components/Icon";
import Game from "../model/Game";
import Resource, { ResourceManager } from "../model/Resource";
import Format from "../utils/format";

const derivatives = [] as Resource[];

export default function DerivativesTab() {
  const rm = Game.useResourceManager();
  const [main, ...rest] = React.useMemo(
    () => derivatives.map((res) => rm.resolve(res)),
    [rm],
  );
  if (!rm || !main || !rest.length) {
    return null;
  }

  return (
    <IonGrid>
      <RenderTitle resource={main} rest={rest} />
      {rest[0].count.gt(0) && <RenderHeader />}
      {rest.map((res) => (
        <RenderDerivative key={res.name} resource={res} />
      ))}
      {rest[0].count.gte(10) && (
        <IonRow>
          <IonCol size="12" className="ion-text-right">
            Buy multiples: &nbsp;
            <BuyButton.BuyAmountButtons />
          </IonCol>
        </IonRow>
      )}
    </IonGrid>
  );
}

DerivativesTab.init = () => {
  derivatives.push(...genDerivatives("x", 10));
  Game.ShortCut.register("x", buyAllDerivatives);
  Game.Tab.register({
    path: "derivatives",
    content: <DerivativesTab />,
    icon: calculatorOutline,
    label: "d/dx",
    title: "Derivatives",
  });
};

function genDerivatives(name = "x", cnt = 0) {
  const supers = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  const res = [];

  for (let d = 0; d <= cnt; d++) {
    const dSuper = Array.from(d <= 1 ? "" : d.toFixed()).reduce(
      (c, n) => c + supers[parseInt(n)],
      "",
    );
    res.push(
      ResourceManager.upsert({
        name: `${name}_${d}`,
        singularName: d ? `d${dSuper}/dt${dSuper} . ${name}` : name,
        priority: d,

        count: Decimal.dZero,
        extra: { base: 0 },
        value(this: Resource) {
          return this.count;
        },

        unlocked: d === 0,
        autoUnlock: true,
        unlockCost() {
          return [
            { resource: `${name}_${0}`, count: Decimal.pow10(d - 0.3) },
            { resource: `${name}_${d - 1}`, count: 1 },
          ];
        },

        cost(n) {
          if (!d) {
            return [];
          }
          return [
            {
              resource: `${name}_${0}`,
              count: Decimal.sub(n, 1)
                .div(10)
                .add(1)
                .floor()
                .mul(Math.floor(d ** 1.5) + 1)
                .sub(1)
                .floor()
                .pow10(),
            },
          ];
        },

        onPurchase(this: Resource, purchase) {
          if (purchase.style !== "free") {
            this.extra.base =
              (this.extra.base ?? 0) +
              Decimal.fromValue(purchase.count).toNumber();
            if (d > 0) {
              this.extra.factor = Decimal.div(this.extra.base, 10)
                .floor()
                .pow_base(Decimal.dTwo)
                .round()
                .toNumber();
            }
          }
        },

        tick(this: Resource, dt) {
          if (d > 0) {
            this.manager
              .resolve(`${name}_${d - 1}`)
              .add(
                this.count.multiply(this.extra.factor ?? 0).multiply(0.1 * dt),
              );
          }
        },
      }),
    );
  }

  return res;
}

function RenderTitle(props: { resource: Resource; rest: Resource[] }) {
  const fmt = Format.resource(props.resource);

  return (
    <IonRow>
      <IonCol size="12" className="ion-text-center">
        {fmt.icon && <Icon icon={fmt.icon} size="small" />}
        {fmt.name?.toUpperCase()}
        &nbsp;: &nbsp;
        {fmt.value}
      </IonCol>
      <IonCol size="3">
        <BuyButton
          resource={props.resource}
          overrideBuyAmount="+1"
          prefix="Add"
        />
      </IonCol>
      <IonCol size="6" className="ion-text-center">
        {fmt.rateSign !== "zero" && (
          <div className={fmt.rateSign}>{`(${fmt.rate})`}</div>
        )}
      </IonCol>
      <IonCol size="3">
        {props.rest[0].count.gt(10) && (
          <BuyButton.BuyAllButton
            resources={props.rest}
            showNames={false}
            overrideCount="base"
            all={`all ${fmt.name}'s`}
          />
        )}
      </IonCol>
      <hr className="underlined" />
    </IonRow>
  );
}

function RenderHeader() {
  return (
    <>
      <div className="quarter">
        <div className="full">Derivative</div>
        <div className="zero three-quarters right">Boost Multi</div>
      </div>
      <div className="quarter">
        <div className="full">Value</div>
        <div className="zero three-quarters right">(# Bought)</div>
      </div>
      <div className="quarter">
        <div className="positive">(Gain Rate)</div>
      </div>
      <div className="quarter right"></div>
      <hr className="dotted" />
    </>
  );
}

function RenderDerivative(props: { resource: Resource }) {
  if (!(props.resource.unlocked ?? true) || props.resource.disabled) {
    return null;
  }

  const fmt = Format.resource(props.resource);
  if (fmt.active !== "active") {
    return <div className="full">{fmt.active}</div>;
  }

  return (
    <>
      <div className="quarter">
        <div className="full">
          {fmt.icon && <Icon icon={fmt.icon} size="small" />}
          {fmt.name}
        </div>
        {props.resource.extra.factor > 0 && (
          <div className="zero three-quarters right">
            {`x${fmt.extras["Factor"]}`}
          </div>
        )}
      </div>
      <div className="quarter">
        <div className="full">{fmt.value}</div>
        {props.resource.extra.base > 0 && (
          <div className="zero three-quarters right">
            {`(${fmt.extras["Base"]})`}
          </div>
        )}
      </div>
      <div className="quarter">
        {fmt.rateSign !== "zero" && (
          <div className={fmt.rateSign}>{`(${fmt.rate})`}</div>
        )}
      </div>
      <div className="quarter">
        <BuyButton resource={props.resource} overrideCount="base" />
      </div>
      <hr className="dotted" />
    </>
  );
}

function buyAllDerivatives() {
  const ress = Object.fromEntries(
    derivatives.slice(1).map((r) => [r.name, "base"]),
  );
  ResourceManager.purchaseAll(ress, {
    minAmount: 1,
    maxAmount: 1000,
    increments: 10,
  });
  ResourceManager.purchaseAll(ress, 10);
  return true;
}
