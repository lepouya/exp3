import Resource from "../model/Resource";
import formatWithNotation, { Notation } from "./notation";

export default function Format(
  value?: number | string | Date | Resource | undefined | null,
  options?: NumberOptions & TimeOptions & WordOptions & ResourceOptions,
): string {
  if (value == null || value == undefined || typeof value === "string") {
    return Format.word(value ?? undefined, options);
  } else if (value instanceof Date) {
    return Format.time(value.getTime(), options);
  } else if (typeof value === "number") {
    return Format.number(value, options);
  } else if (value instanceof Resource) {
    const output: string[] = [];
    const res = Format.resource(value, options);

    if (res.active === "disabled") {
      output.push("[X]");
    } else if (res.active === "locked") {
      return "???";
    }

    if (res.name) {
      let name = res.name;
      if (res.value || res.max || res.rate) {
        name += ":";
      }
      output.push(name);
    }

    if (res.value || res.max) {
      let value = res.value || "?";
      if (res.max) {
        value += "/" + res.max;
      }
      output.push(value);
    }

    if (res.rate) {
      output.push("(" + res.rate + ")");
    }

    return output.join(" ");
  } else {
    return "";
  }
}

type NumberOptions = {
  notation?: Notation | string;
  len?: "tiny" | "short" | "long";
  prec?: number;
  expPrec?: number;
  smallPrec?: number;
  alwaysShowSign?: boolean;
};

Format.number = function (num: number, options?: NumberOptions): string {
  const prec = options?.prec ?? 0;
  const smallPrec = options?.smallPrec ?? prec;
  const expPrec =
    options?.expPrec ??
    Math.max(
      prec,
      options?.len === "tiny" ? 0 : options?.len === "short" ? 2 : 3,
    );

  let r = formatWithNotation(num, options?.notation, prec, expPrec, smallPrec);
  if (r && options?.alwaysShowSign && !"+-".includes(r[0]) && num >= 0) {
    r = "+" + r;
  }

  return r;
};

type TimeOptions = {
  len?: "tiny" | "short" | "long";
  millis?: boolean;
  epoch?: number;
  oxfordComma?: boolean;
  alwaysShowSign?: boolean;

  sep?: string;
  lastSep?: string;
  now?: string;
  never?: string;
  ago?: string;
};

Format.time = function (time: number, options?: TimeOptions): string {
  const len = options?.len ?? "long";
  const sep = options?.sep ?? len === "long" ? ", " : ":";
  const lastSep =
    (options?.oxfordComma ? sep : "") +
    (options?.lastSep ?? len === "long" ? " and " : sep);
  const now = options?.now ?? len === "long" ? "now" : "";
  const never = options?.never ?? len === "long" ? "never" : "";
  const ago = options?.ago ?? len === "long" ? "ago" : "";

  if (
    never &&
    (time < 0 ||
      (options?.epoch != undefined &&
        (options.epoch <= 0 || time - options.epoch < 0)))
  ) {
    return never;
  } else if (
    now &&
    (time === 0 || (options?.epoch != undefined && time === options.epoch))
  ) {
    return now;
  } else if (options?.epoch != undefined) {
    time -= options.epoch;
  }

  let secs = Math.floor(time / 1000);
  let msec = Math.floor(time - secs * 1000);

  let mins = Math.floor(secs / 60);
  secs -= mins * 60;

  let hours = Math.floor(mins / 60);
  mins -= hours * 60;

  let days = Math.floor(hours / 24);
  hours -= days * 24;

  let years = Math.floor(days / 365);
  days -= years * 365;

  if (!options?.millis) {
    msec = 0;
  }

  if (now != undefined && days + hours + mins + secs + msec === 0) {
    return now;
  }

  let parts = [];
  if (len !== "long") {
    parts = [
      years > 0 ? years.toFixed(0) : "",
      days > 0 ? days.toFixed(0) : "",
      hours > 0 || len === "short" ? hours.toFixed(0) : "",
      mins > 0 || len === "short" ? mins.toFixed(0) : "",
      (secs + msec / 1000).toFixed(
        !options?.millis || (len === "tiny" && msec === 0) ? 0 : 3,
      ),
    ].map((num) =>
      len === "short" && (num.length === 1 || num.indexOf(".") === 1)
        ? "0" + num
        : num,
    );
  } else {
    parts = (
      [
        [years, "year"],
        [days, "day"],
        [hours, "hour"],
        [mins, "minute"],
        [secs, "second", years + days + hours + mins === 0, msec],
      ] as const
    ).map(([num, word, allowZeros = false, fraction = 0]) =>
      num > 0 || fraction > 0 || (allowZeros && num === 0)
        ? num.toString() +
          (fraction > 0 ? "." + fraction.toString() : "") +
          " " +
          word +
          (num === 1 ? "" : "s")
        : "",
    );
  }

  parts = parts.filter((word) => !!word);
  if (parts.length > 2) {
    const pop = parts.pop();
    parts = [parts.join(sep), pop];
  }

  let r = parts.join(lastSep) + (ago ? " " + ago : "");
  if (
    r &&
    options?.alwaysShowSign &&
    time >= 0 &&
    len !== "long" &&
    !"+-".includes(r[0])
  ) {
    r = "+" + r;
  }

  return r;
};

type WordOptions = {
  name?: string;
  count?: number;
  singularName?: string;
  pluralName?: string;

  tolerance?: number;
  condition?: boolean;
  allowEmpties?: boolean;
  capitalize?: boolean;
};

Format.word = function (word?: string, options?: WordOptions): string {
  if (!word) {
    word =
      (Math.abs(Math.abs(options?.count ?? 0) - 1) <=
      (options?.tolerance ?? 0.001)
        ? options?.singularName
        : options?.pluralName) ?? options?.name;
  }

  if (!(options?.condition ?? true)) {
    return "";
  } else if (!word && !(options?.allowEmpties ?? false)) {
    return "";
  } else if (!(options?.capitalize ?? true)) {
    return word ?? "";
  } else {
    return (word ?? "")
      .replace(/([a-z])([A-Z]|_\S)/g, (_, c1, c2) => `${c1} ${c2.slice(-1)}`)
      .replace(/(?:^|\s)\w(?=\w)/g, (c) => c.toUpperCase());
  }
};

type ResourceOptions = {
  override?: Partial<Resource>;
  round?: typeof Math.round;
  useRatePercent?: boolean;
};

Format.resource = function (
  res: Partial<Resource>,
  options?: NumberOptions & TimeOptions & WordOptions & ResourceOptions,
) {
  options ||= {};
  res = options.override ? { ...res, ...options.override } : res;
  let display = res.display ?? "number";
  options.len ??= "long";
  options.now ??= "";
  options.never ??= "";
  options.ago ??= "";
  options.prec ??= display === "time" ? 3 : display === "number" ? 2 : 1;
  options.smallPrec ??= display === "number" ? 0 : options.prec;
  options.round ??= display === "number" ? Math.floor : Math.round;
  options.millis ??= options.prec > 0;
  options.notation ||= res.manager?.globalNumberFormat || "Standard";
  options.tolerance ??=
    10 ** (-options.prec - (display === "percentage" ? 2 : 0));

  const active: "active" | "locked" | "disabled" = !(res.unlocked ?? true)
    ? "locked"
    : res.disabled
    ? "disabled"
    : "active";

  let count =
    (options.override?.value
      ? options.override.value()
      : options.override?.count) ?? (res.value ? res.value() : res.count);
  if (count) {
    count = options.round(count / options.tolerance) * options.tolerance;
  }
  let value = undefined,
    valueSign = undefined;
  if (count != undefined && display !== "none") {
    if (display === "time") {
      value = Format.time(count * 1000, options);
    } else if (display === "percentage") {
      value = Format(count, options) + "%";
    } else {
      value = Format(count, options);
    }

    valueSign = signs[cmp_tolerance(count, 0, options.tolerance)];
  }

  options.count ??= count ? count : undefined;
  options.name ??= res.name;
  options.singularName ??= res.singularName ?? res.pluralName;
  options.pluralName ??= res.pluralName ?? res.singularName;
  const name = Format(options.override?.name ?? "", options) || undefined;

  const icon = res.icon;

  let max = undefined;
  if (res.maxCount) {
    max = Format(res.maxCount, options);
  }

  const extras = Object.fromEntries(
    Object.entries(res.extra || {}).map(([k, v]) => [
      Format(k, options) || undefined,
      Format(v, options),
    ]),
  );

  let rate = undefined,
    rateSign = undefined;
  if (
    res.rate?.lastCountUpdate != undefined &&
    res.rate.count != undefined &&
    display !== "none"
  ) {
    let rateValue = res.rate.count;
    options.useRatePercent ??= !!count && count >= 1000 && rateValue >= 1000;
    if (display === "number" && options.useRatePercent && count) {
      display = "percentage";
      rateValue = rateValue / count;
    }

    options.len = options.len !== "long" ? "tiny" : "short";
    options.alwaysShowSign = true;
    options.smallPrec = (options.smallPrec ?? options.prec) + 2;
    options.prec += 2;

    if (display === "time") {
      rate = Format.time(res.rate.count * 1000, options);
    } else if (display === "percentage") {
      rate = Format(rateValue * 100, options) + "%";
    } else {
      rate = Format(rateValue, options);
    }

    if (rate) {
      rate = rate + "/s";
    }

    rateSign = signs[cmp_tolerance(rateValue, 0, options.tolerance)];
  }

  return { active, name, icon, value, valueSign, max, rate, rateSign, extras };
};

const signs: Record<-1 | 0 | 1, "negative" | "zero" | "positive"> = {
  [-1]: "negative",
  [0]: "zero",
  [1]: "positive",
};

export function cmp_tolerance(
  a: number,
  b: number,
  tolerance: number,
): -1 | 0 | 1 {
  const diff = Math.abs(a - b);
  if (diff < tolerance) {
    return 0;
  } else if (a < b) {
    return -1;
  } else {
    return 1;
  }
}
