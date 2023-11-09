// Inspired by github:antimatter-dimensions/notations

import Decimal, { DecimalSource } from "break_eternity.js";

export type Notation = {
  name: string;

  infinite(): string;
  decimal(value: Decimal, prec?: number, expPrec?: number): string;
  small(value: number, prec?: number): string;
  verySmall(value: Decimal, prec?: number): string;
  negativeVerySmall(value: Decimal, prec?: number): string;
  negativeSmall(value: number, prec?: number): string;
  negativeDecimal(value: Decimal, prec?: number, expPrec?: number): string;
  negativeInfinite(): string;

  exponent?: (n: Decimal, prec?: number, expPrec?: number) => string;
};

export default function formatWithNotation(
  value: DecimalSource,
  notation?: Notation | string,
  basePrec = 0,
  expPrec = basePrec,
  smallPrec = 0,
): string {
  const decimal = Decimal.fromValue_noAlloc(value);
  notation =
    (typeof notation === "string" ? notations[notation] : notation) ?? basic;
  if (!decimal.isFinite()) {
    return decimal.sign < 0 ? notation.negativeInfinite() : notation.infinite();
  } else if (decimal.exponent < -300) {
    return decimal.sign < 0
      ? notation.negativeVerySmall(decimal.abs(), smallPrec)
      : notation.verySmall(decimal, smallPrec);
  } else if (decimal.exponent < 3) {
    return decimal.sign < 0
      ? notation.negativeSmall(decimal.abs().toNumber(), smallPrec)
      : notation.small(decimal.toNumber(), smallPrec);
  }
  return decimal.sign < 0
    ? notation.negativeDecimal(decimal.abs(), basePrec, expPrec)
    : notation.decimal(decimal, basePrec, expPrec);
}

const notations: Record<string, Notation> = {};
const settings = { prec: 3, commas: { show: true, min: 1e6, max: 1e9 } };
formatWithNotation.all = notations;
formatWithNotation.exponentSettings = settings;
formatWithNotation.register = (notation: Partial<Notation>) =>
  (notations[notation.name ?? ""] = { ...basic, ...notation });

const basic: Notation = {
  name: "System",
  infinite() {
    return Infinity.toString();
  },
  negativeInfinite() {
    return `-${this.infinite()}`;
  },
  decimal(v, p, e) {
    return v.toStringWithDecimalPlaces(p ?? e ?? 0);
  },
  negativeDecimal(v, p, e) {
    return `-${this.decimal(v, p, e)}`;
  },
  verySmall(v, p) {
    return this.small(v.toNumber(), p);
  },
  negativeVerySmall(v, p) {
    return `-${this.verySmall(v, p)}`;
  },
  small(v, p) {
    return v.toFixed(p);
  },
  negativeSmall(v, p) {
    return `-${this.small(v, p)}`;
  },
};

formatWithNotation.register(basic);
const standard = formatWithNotation.register({
  name: "Standard",
  decimal(v, p, e) {
    this.exponent ??= formatWithExp(standardAbbr, 1, 1000);
    return this.exponent(v, p, e);
  },
});

const registerMixed = (n: Notation, s = standard) =>
  formatWithNotation.register({
    name: `Mixed ${n.name}`,
    decimal: (v, p, e) => (v.exponent < 33 ? s : n).decimal(v, p, e),
  });

registerMixed(
  formatWithNotation.register({
    name: "Scientific",
    decimal(v, p, e) {
      this.exponent ??= formatWithExp(formatWithCommas(this), 1);
      return this.exponent(v, p, e);
    },
  }),
);

registerMixed(
  formatWithNotation.register({
    name: "Engineering",
    decimal(v, p, e) {
      this.exponent ??= formatWithExp(formatWithCommas(this), 3);
      return this.exponent(v, p, e);
    },
  }),
);

registerMixed(
  formatWithNotation.register({
    name: "Logarithmic",
    decimal(v, p, e) {
      this.exponent ??= formatWithCommas(this, (n, p) => n.toFixed(p));
      return `e${this.exponent(v.log10(), p, e)}`;
    },
  }),
);

const abbrs = {
  abbreviations: ["K", "M", "B", "T", "Qa", "Qt", "Sx", "Sp", "Oc", "No"],
  prefixes: [
    ["", "U", "D", "T", "Qa", "Qt", "Sx", "Sp", "O", "N"],
    ["", "Dc", "Vg", "Tg", "Qd", "Qi", "Se", "St", "Og", "Nn"],
    ["", "Ce", "Dn", "Tc", "Qe", "Qu", "Sc", "Si", "Oe", "Ne"],
  ],
  prefixes_2: ["", "MI-", "MC-", "NA-", "PC-", "FM-", "AT-", "ZP-"],
};

function standardAbbr(rawExp: Decimal): string {
  const exp = rawExp.toNumber() - 1;
  if (exp === -1) {
    return "";
  } else if (exp > settings.commas.min) {
    return Infinity.toString();
  } else if (exp < abbrs.abbreviations.length) {
    return abbrs.abbreviations[exp];
  }
  const prefix = [];
  for (let e = exp; e > 0; e = Math.floor(e / 10)) {
    prefix.push(abbrs.prefixes[prefix.length % 3][e % 10]);
  }
  while (prefix.length % 3 !== 0) {
    prefix.push("");
  }
  let abbr = "";
  for (let i = prefix.length / 3 - 1; i >= 0; i--) {
    abbr += prefix.slice(i * 3, i * 3 + 3).join("") + abbrs.prefixes_2[i];
  }
  return abbr
    .replace(/-[A-Z]{2}-/g, "-")
    .replace(/U([A-Z]{2}-)/g, "$1")
    .replace(/-$/, "");
}

function formatWithCommas(
  notation: Partial<Notation>,
  formatting: (n: number, p: number) => string = (n) => n.toString(),
): (e: Decimal, prec?: number, expPrec?: number) => string {
  return function (e, prec = settings.prec, expPrec = Math.max(2, prec)) {
    if (e.lt(settings.commas.min)) {
      return formatting(e.toNumber(), Math.max(prec, 1));
    } else if (settings.commas.show && e.lt(settings.commas.max)) {
      const decimalPointSplit = formatting(e.toNumber(), 0).split(".");
      decimalPointSplit[0] = decimalPointSplit[0].replace(/\w+$/g, (v) =>
        Array.from(Array(Math.ceil(v.length / 3)))
          .map((_, i) => (i ? v.slice(-3 * (i + 1), -3 * i) : v.slice(-3)))
          .reverse()
          .join(","),
      );
      return decimalPointSplit.join(".");
    }
    return notation.decimal!(e, expPrec, expPrec);
  };
}

function formatWithExp(
  expFormat: (e: Decimal, prec: number) => string,
  steps: number,
  base: number = 10,
): (n: Decimal, prec?: number, expPrec?: number) => string {
  return function (n, prec = 0, expPrec = 0) {
    const realBase = base ** steps;
    let exponent = n.log(realBase).floor().mul(steps);
    if (base >= 100) {
      exponent = exponent.max(Decimal.dZero);
    }
    let m = n.div(exponent.pow_base(base)).toFixed(prec);
    if (m === realBase.toFixed(prec)) {
      m = (1).toFixed(prec);
      exponent = exponent.add(steps);
    }
    if (exponent.eq(Decimal.dZero)) {
      return m;
    }
    return `${m}${base === 10 ? "e" : " "}${expFormat(exponent, expPrec)}`;
  };
}
