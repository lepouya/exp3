import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonGrid,
  IonRow,
  IonText,
} from "@ionic/react";

import BuyButton from "../components/BuyButton";
import Icon from "../components/Icon";
import Game from "../model/Game";
import Resource, { ResourceManager } from "../model/Resource";
import Format from "../utils/format";

export default function DerivativesTab() {
  const rm = Game.useResourceManager();
  const [main, ...rest] = [...Array(11)].map((_, i) => rm.resolve(`x_${i}`));
  if (!rm || !main || !rest.length) {
    return null;
  }

  return (
    <IonGrid>
      {rest[0].count > 10 && rest[1].count > 1 && <RenderBuyMulti />}
      <RenderTitle resource={main} rest={rest} />
      {rest.map((res) => (
        <RenderDerivative key={res.name} resource={res} />
      ))}
    </IonGrid>
  );
}

DerivativesTab.init = () => {
  genDerivatives("x", 10);
  Game.ShortCut.register("x", buyAllDerivatives);
  Game.Tab.register({
    path: "derivatives",
    content: <DerivativesTab />,
    icon: "calculatorOutline",
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

        count: 0,
        extra: { base: 0 },
        value(this: Resource) {
          return this.count;
        },

        unlocked: d === 0,
        autoUnlock: true,
        unlockCost() {
          return [
            { resource: `${name}_${0}`, count: 10 ** (d - 0.3) },
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
              count:
                10 **
                Math.floor(
                  Math.floor((n - 1) / 10 + 1) * (Math.floor(d ** 1.5) + 1) - 1,
                ),
            },
          ];
        },

        onPurchase(this: Resource, purchase) {
          if (purchase.style !== "free") {
            this.extra.base = (this.extra.base ?? 0) + purchase.count;
            if (d > 0) {
              this.extra.factor = Math.round(
                2 ** Math.floor(this.extra.base / 10),
              );
            }
          }
        },

        tick(this: Resource, dt) {
          if (d > 0) {
            this.manager
              .resolve(`${name}_${d - 1}`)
              .add(this.count * (this.extra.factor ?? 0) * (0.1 * dt));
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
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonRow>
            <IonCol size="6" className="ion-text-right">
              {fmt.icon && <Icon icon={fmt.icon} size="small" />}
              {fmt.name}
              {": "}
            </IonCol>
            <IonCol size="6" className="ion-text-left">
              {fmt.value ?? ""}
            </IonCol>
          </IonRow>
        </IonCardTitle>
        <IonCardSubtitle>
          <IonRow>
            <IonCol size="6" className="ion-text-right">
              {" "}
            </IonCol>
            {fmt.rate && (
              <IonCol size="6" className="ion-text-left">
                <IonText color={rateColor[fmt.rateSign ?? "zero"]}>
                  {`(${fmt.rate})`}
                </IonText>
              </IonCol>
            )}
          </IonRow>
        </IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <IonCol size="12" className="ion-text-center">
          {props.rest[0].count > 10 && props.rest[1].count > 1 ? (
            <BuyButton.BuyAllButton
              resources={props.rest}
              showNames={false}
              overrideCount="base"
              all={`all ${fmt.name}'s`}
              fill="outline"
              style={{ width: "100%" }}
            />
          ) : (
            <BuyButton
              resource={props.resource}
              overrideBuyAmount="+1"
              prefix="Add"
              fill="outline"
              style={{ width: "100%" }}
            />
          )}
        </IonCol>
      </IonCardContent>
    </IonCard>
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
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonRow>
            <IonCol size="6" className="ion-text-right">
              {fmt.icon && <Icon icon={fmt.icon} size="small" />}
              {fmt.name}
              {": "}
            </IonCol>
            <IonCol size="6" className="ion-text-left">
              {fmt.value ?? ""}
            </IonCol>
          </IonRow>
        </IonCardTitle>
        <IonCardSubtitle>
          <IonRow>
            {fmt.rate && (
              <>
                <IonCol size="6" className="ion-text-right">
                  {" "}
                </IonCol>
                <IonCol size="6" className="ion-text-left">
                  <IonText color={rateColor[fmt.rateSign ?? "zero"]}>
                    {`(${fmt.rate})`}
                  </IonText>
                </IonCol>
              </>
            )}
            <IonCol size="6" className="ion-text-left">
              {fmt.extras["Factor"] &&
                `Boost factor: x${fmt.extras["Factor"] ?? 0}`}
            </IonCol>
            <IonCol size="6" className="ion-text-right">
              {props.resource.extra.base > 0 &&
                `Manual buys: x${fmt.extras["Base"] ?? 0}`}
            </IonCol>
          </IonRow>
        </IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <IonRow>
          <IonCol size="12" className="ion-text-center">
            <BuyButton
              resource={props.resource}
              overrideCount="base"
              fill="outline"
              style={{ width: "100%" }}
            />
          </IonCol>
        </IonRow>
      </IonCardContent>
    </IonCard>
  );
}

function RenderBuyMulti() {
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonRow>
            <IonCol size="12" className="ion-text-center">
              Buy multiples
            </IonCol>
          </IonRow>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonRow>
          <IonCol size="12" className="ion-text-center">
            <BuyButton.BuyAmountButtons />
          </IonCol>
        </IonRow>
      </IonCardContent>
    </IonCard>
  );
}

function buyAllDerivatives() {
  const derivatives = [...Array(11)].map((_, i) =>
    ResourceManager.get(`x_${i}`),
  );
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

const rateColor = {
  negative: "danger",
  zero: "medium",
  positive: "success",
};
