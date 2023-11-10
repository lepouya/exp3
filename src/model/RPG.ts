import { ImageProps } from "../utils/composeImage";

class RPG {
  static addStats(
    ...stats: Partial<Record<RPG.StatType, number>>[]
  ): Record<RPG.StatType, number> {
    return stats.reduce(
      (acc: Record<RPG.StatType, number>, stat) => {
        if (stat) {
          for (const [key, value] of Object.entries(stat)) {
            acc[key as RPG.StatType] += value ?? 0;
          }
        }
        return acc;
      },
      { ...RPG.emptyStats },
    );
  }

  static applyBaseStatBoosts(
    stats: Record<RPG.StatType, number>,
    statTypes: RPG.StatType[],
    ...boosts: RPG.StatBoost[]
  ): Record<RPG.StatType, number> {
    boosts = boosts.filter((boost) => statTypes.includes(boost.stat));
    const res = { ...stats };
    for (const boost of boosts) {
      res[boost.stat] += boost.baseValue ?? 0;
    }
    for (const boost of boosts) {
      res[boost.stat] *= boost.multiplier ?? 1;
    }
    for (const boost of boosts) {
      res[boost.stat] += boost.addBonus ?? 0;
    }
    return res;
  }

  static applyCumulativeStatBoosts(
    stats: Record<RPG.StatType, number>,
    ...boosts: RPG.StatBoost[]
  ): Record<RPG.StatType, number> {
    return boosts
      .filter((boost) => boost.cumulativeMultiplier || boost.finalBonus)
      .reduce(
        (acc, boost) => {
          const stat = acc[boost.stat];
          const multiplier = boost.cumulativeMultiplier ?? 1;
          const finalBonus = boost.finalBonus ?? 0;

          acc[boost.stat] = stat * multiplier + finalBonus;
          return acc;
        },
        { ...stats },
      );
  }

  static computeDerivativeStats(
    stats: Record<RPG.StatType, number>,
  ): Record<RPG.StatType, number> {
    return RPG.addStats(stats, {
      ...RPG.emptyStats,
      HP: stats.STR * 10 + stats.DEX * 5 + stats.MAG * 2,
      MP: stats.STR * 2 + stats.DEX * 5 + stats.MAG * 10,
      ATK: stats.STR + stats.DEX / 2 + stats.MAG,
      DEF: stats.STR * 2 + stats.DEX,
      SPD: stats.DEX * 2 + stats.MAG,
      ACC: stats.DEX / 2 + stats.MAG / 4,
      EVA: stats.DEX / 4 + stats.MAG / 2,
    });
  }

  static computeItemStats(
    playerItem: RPG.PlayerItem,
    customBoosts: RPG.StatBoost[] = [],
  ): [Record<RPG.StatType, number>, RPG.StatBoost[]] {
    const item =
      typeof playerItem.item === "string"
        ? RPG.itemByName[playerItem.item]
        : playerItem.item;
    const rank =
      typeof playerItem.rank === "string"
        ? RPG.itemByName[playerItem.rank]
        : playerItem.rank;
    const boosts = [
      ...(item?.statBoosts ?? []),
      ...(rank?.statBoosts ?? []),
      ...(item?.rankBoosts?.[rank?.name ?? ""] ?? []),
      ...(playerItem.uniqueBoosts ?? []),
    ];

    let stats = RPG.addStats(item?.stats ?? {}, rank?.stats ?? {});
    stats = RPG.applyBaseStatBoosts(
      stats,
      ["STR", "DEX", "MAG"],
      ...boosts,
      ...customBoosts,
    );
    stats = RPG.computeDerivativeStats(stats);
    stats = RPG.applyBaseStatBoosts(
      stats,
      ["HP", "MP", "ATK", "DEF", "SPD", "ACC", "EVA"],
      ...boosts,
      ...customBoosts,
    );

    return [stats, boosts];
  }

  static computeCharacterStats(
    character: RPG.Character,
    customBoosts: RPG.StatBoost[] = [],
  ): Record<RPG.StatType, number> {
    let [stats, boosts] = Object.values(character).reduce(
      ([stats, boosts], equipment) => {
        if (!equipment) {
          return [stats, boosts];
        }

        const [equipmentStats, equipmentBoosts] = RPG.computeItemStats(
          equipment,
          customBoosts,
        );
        stats = RPG.addStats(stats, equipmentStats);
        boosts.push(...equipmentBoosts);

        return [stats, boosts];
      },
      [{ ...RPG.emptyStats }, [] as RPG.StatBoost[]],
    );

    stats = RPG.applyCumulativeStatBoosts(stats, ...boosts);

    return stats;
  }
}

module RPG {
  export type StatType =
    | "STR"
    | "DEX"
    | "MAG"
    | "HP"
    | "MP"
    | "ATK"
    | "DEF"
    | "SPD"
    | "ACC"
    | "EVA";

  export type ItemType =
    | "rank"
    | "character"
    | "body"
    | "head"
    | "feet"
    | "hand"
    | "weapon"
    | "offhand"
    | "cloak"
    | "amulet"
    | "extra";

  export interface StatBoost {
    stat: StatType;

    // Stat value is (baseValue + stat) * multiplier + addBonus
    baseValue?: number;
    multiplier?: number;
    addBonus?: number;

    // Bonus for after all the stats of the components are added up together
    // Final stat value is Sum(boosted_stats) * cumulativeMultiplier + finalBonus
    cumulativeMultiplier?: number;
    finalBonus?: number;
  }

  export interface Item {
    name: string;
    type: ItemType;
    description?: string;

    image: Record<string, ImageProps | string>;
    style?: Record<string, string>;
    className?: string | string[];

    stats?: Partial<Record<StatType, number>>;
    statBoosts?: StatBoost[];
    rankBoosts?: Record<string, StatBoost[]>;
  }

  export interface PlayerItem {
    item: Item | string;
    rank: Item | string;
    count: number;

    uniqueId?: string;
    uniqueBoosts?: StatBoost[];
  }

  export type Character = Partial<Record<ItemType, PlayerItem>>;

  export const itemByName: Record<string, Item> = {};
  export const itemsByType: Record<ItemType, Item[]> = {
    body: [],
    head: [],
    rank: [],
    character: [],
    feet: [],
    hand: [],
    weapon: [],
    offhand: [],
    cloak: [],
    amulet: [],
    extra: [],
  };

  export const emptyStats: Record<StatType, number> = {
    STR: 0,
    DEX: 0,
    MAG: 0,
    HP: 0,
    MP: 0,
    ATK: 0,
    DEF: 0,
    SPD: 0,
    ACC: 0,
    EVA: 0,
  };

  export function registerItem(item: Partial<Item>) {
    const type = item.type ?? "extra";
    const newItem: Item = {
      image: {},
      ...item,
      name: item.name || type + "-" + (Object.keys(itemByName).length + 1),
      type,
    };

    itemByName[newItem.name] = newItem;
    itemsByType[newItem.type] = itemsByType[newItem.type].filter(
      (c) => c.name !== newItem.name,
    );
    itemsByType[newItem.type].push(newItem);

    return newItem;
  }

  export function loadItems(url: string) {
    fetch(url)
      .then((res) => res.json())
      .then((items) => {
        for (const type in items) {
          for (const name in items[type]) {
            registerItem({ ...items[type][name], type, name });
          }
        }
      });
  }

  loadItems("/items.json");
}

module RPG {
  export class Player {
    static readonly registry: Record<string, Player> = {};

    name: string;
    level: number = 0;

    characters: Record<string, Character> = {};
    inventory: Record<string, PlayerItem> = {};

    specialBoosts: StatBoost[] = [];

    constructor(props: Partial<Player> | string) {
      if (typeof props === "string") {
        this.name = props;
      } else {
        this.name = props.name || "";
        this.fill(props);
      }

      if (!this.name) {
        while (!this.name || Player.registry[this.name]) {
          this.name = `player-${Math.floor(
            Date.now() * 1000000 + Math.random() * 1000000,
          )}`;
        }
      }

      if (Player.registry[this.name]) {
        throw new Error(`Player with name ${this.name} already exists`);
      }

      Player.registry[this.name] = this;
    }

    static loadPlayers(url: string) {
      fetch(url)
        .then((res) => res.json())
        .then((players) => {
          for (const name in players) {
            try {
              new Player({ name, ...players[name] });
            } catch (e) {
              console.error(e);
            }
          }
        });
    }

    static get(name: string) {
      return Player.registry[name];
    }

    fill(res: Partial<Player>): this {
      let k: keyof Player;
      for (k in res) {
        if (k !== "name" && res[k] != undefined) {
          (this as any)[k] = res[k];
        }
      }
      return this;
    }

    // TODO: Add/Remove item
    // TODO: Equip item
    // TODO: Get character stats
    // TODO: Get character image
  }
}

export default RPG;
