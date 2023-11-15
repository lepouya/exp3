import { ReactNode } from "react";

import Resource, { ResourceManager } from "../model/Resource";
import Format from "../utils/format";
import Icon from "./Icon";

export type ResourceRenderProps = {
  resource?: Partial<Resource> | string;
  override?: Partial<Resource>;
  epoch?: number;
  length?: "tiny" | "short" | "long";
  precision?: number;

  showLocked?: boolean;
  showIcon?: boolean;
  showName?: boolean;
  showValue?: boolean;
  showMaxValue?: boolean;
  showRate?: boolean;
  showExtras?: boolean;

  showColors?: boolean;
  showRateColors?: boolean;
  showNegatives?: boolean;
  showZeros?: boolean;
  showPlusSign?: boolean;
  showZeroRates?: boolean;
  showRatePercentages?: boolean;
  showCapitalized?: boolean;
  showChrome?: boolean;

  prefix?: string;
  suffix?: string;
  infix?: string;
  placeholder?: string;

  className?: string;
  style?: React.CSSProperties;
};

export default function ResourceRender({
  resource,
  override,
  epoch,
  length,
  precision,

  showLocked,
  showIcon = true,
  showName = true,
  showValue = true,
  showMaxValue,
  showRate,
  showExtras,

  showColors,
  showRateColors = true,
  showNegatives = true,
  showZeros = true,
  showPlusSign,
  showZeroRates,
  showRatePercentages,
  showCapitalized,
  showChrome,

  prefix,
  suffix,
  infix,
  placeholder,

  className,
  style,
}: ResourceRenderProps) {
  resource =
    typeof resource === "string"
      ? ResourceManager.get(resource)
      : resource ?? {};

  const res = Format.resource(resource, {
    override,
    useRatePercent: showRatePercentages,
    len: length,
    prec: precision,
    alwaysShowSign: showPlusSign,
    epoch,
    capitalize: showCapitalized,
  });

  let output: ReactNode[] = [];
  function mkDiv(val = "", sign = "", key = "", color = false, paren = false) {
    if (
      val &&
      (showNegatives || sign != "negative") &&
      (showZeros || sign != "zero")
    ) {
      output.push(
        <div
          key={`${key}-${output.length + 1}`}
          className={[key, color && sign].filter(Boolean).join(" ")}
        >
          {paren ? `(${val})` : val}
        </div>,
      );
    }
  }

  if ((showIcon && resource.icon) || (showName && res.name)) {
    output.push(
      <div className="name" key="name">
        {showIcon && resource.icon && (
          <Icon icon={resource.icon} size="small" />
        )}
        {showName && res.name}
        {(showValue || showRate) && (infix ?? ":")}
      </div>,
    );
  }

  if (showValue && res.value) {
    const denom = showMaxValue && res.max ? " / " + res.max : "";
    mkDiv(res.value + denom, res.valueSign, "value", showColors);
  }

  if (showRate && res.rate && (showZeroRates || res.rateSign !== "zero")) {
    mkDiv(res.rate, res.rateSign, "rate", showRateColors, showValue);
  }

  if (showExtras && res.extras && Object.keys(res.extras).length > 0) {
    for (let k in res.extras) {
      if (!k || !res.extras[k]) {
        continue;
      }

      if (output.length > 0) {
        output.push(<div className="break" key={`break-${k}`} />);
      }
      output.push(
        <div className="extra-name" key={`extra-name-${k}`}>
          {k}
          {infix ?? ":"}
        </div>,
      );
      mkDiv(res.extras[k], undefined, "extra-value");
    }
  }

  const classNames = ["resource", resource.display, showChrome && className];
  if (!showLocked && !(resource.unlocked ?? true)) {
    classNames.push("locked");
    output = [
      <div className="placeholder" key="lock">
        {placeholder}
      </div>,
    ];
  }

  const ret = (
    <div
      className={classNames.filter(Boolean).join(" ")}
      style={showChrome ? style : undefined}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      {output}
      {suffix && <div className="suffix">{suffix}</div>}
    </div>
  );

  if (showChrome) {
    return (
      <div className={classNames.filter(Boolean).join(" ")} style={style}>
        {ret}
      </div>
    );
  } else {
    return ret;
  }
}
