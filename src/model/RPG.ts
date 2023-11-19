import composeImage, { ImageOptions, ImageProps } from "../utils/composeImage";

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
    const item = RPG.itemByName[playerItem.item];
    const rank = RPG.itemByName[playerItem.rank];
    const boosts = [
      ...(item?.statBoosts ?? []),
      ...(rank?.statBoosts ?? []),
      ...(item?.rankBoosts?.[rank?.name ?? ""] ?? []),
      ...(playerItem.uniqueBoosts ?? []),
    ];

    let stats = RPG.addStats(item?.stats ?? {}, rank?.stats ?? {});
    stats = RPG.applyBaseStatBoosts(
      stats,
      [...RPG.PrimaryStatTypes],
      ...boosts,
      ...customBoosts,
    );
    stats = RPG.computeDerivativeStats(stats);
    stats = RPG.applyBaseStatBoosts(
      stats,
      [...RPG.SecondaryStatTypes],
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

    stats = RPG.applyCumulativeStatBoosts(stats, ...boosts, ...customBoosts);

    return stats;
  }

  static getCharacterImage(
    character: RPG.Character,
    layer: keyof typeof RPG.ImageLayers = "main",
    initOptions: Partial<ImageOptions> = {},
  ): ImageOptions {
    const options = { ...initOptions };
    const layerDims = RPG.ImageLayers[layer];
    options.sources ||= [];
    options.width ||= layerDims.width;
    options.height ||= layerDims.height;

    type OrderedImage = {
      zIndex: number;
      order: number;
      type: string;
      img: ImageProps;
    };
    const images: OrderedImage[] = [];

    let mainRank: RPG.Item =
      RPG.itemByName[
        character["rank"]?.item || character["character"]?.rank || "none"
      ] || RPG.itemByName["none"];

    for (const type of RPG.ItemTypes) {
      const item =
        type === "rank"
          ? mainRank
          : RPG.itemByName[character[type]?.item || ""];

      let firstLayerFactor = 1;
      for (const [zIndex, img] of Object.entries(item?.images?.[layer] || {})) {
        const imageProps = typeof img === "string" ? { src: img } : { ...img };

        if (type !== "rank" && item.dominantColor) {
          const filter = (imageProps.filter = Array.isArray(imageProps.filter)
            ? imageProps.filter
            : imageProps.filter
            ? [imageProps.filter]
            : []);
          const color = [
            item.dominantColor.r,
            item.dominantColor.g,
            item.dominantColor.b,
          ]
            .map((c) => c.toString(16).padStart(2, "0"))
            .join("");
          const factor = layerDims.width / RPG.ImageLayers.main.width;
          const addShadow = (x: number, y: number) =>
            filter.push(
              `drop-shadow(${x * factor}px ${y * factor}px ${
                (Math.max(x, y) * factor) / 2
              }px #${color})`,
            );

          addShadow(firstLayerFactor * (item.stiching?.right ?? 5), 0);
          addShadow(-firstLayerFactor * (item.stiching?.left ?? 5), 0);
          addShadow(0, firstLayerFactor * (item.stiching?.bottom ?? 5));
          addShadow(0, -firstLayerFactor * (item.stiching?.top ?? 5));
          firstLayerFactor = 0.5;
        }

        images.push({
          zIndex: parseInt(zIndex),
          order: RPG.ItemsOrder[item.type],
          type: item.type,
          img: imageProps,
        });
      }
    }

    images.sort((a, b) => {
      if (a.zIndex !== b.zIndex) {
        return a.zIndex - b.zIndex;
      }
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.type.localeCompare(b.type);
    });

    options.sources.push(...images.map((img) => img.img));
    return options;
  }

  static getItemImage(
    item: RPG.Item | RPG.Item[],
    layer: keyof typeof RPG.ImageLayers = "main",
  ): ImageOptions {
    const items = Array.isArray(item) ? item : [item];
    const character: RPG.Character = {};
    for (const item of items) {
      character[item.type] = { item: item.name, rank: "none", count: 1 };
    }
    return RPG.getCharacterImage(character, layer);
  }
}

module RPG {
  export type StatType = (typeof StatTypes)[number];
  export const PrimaryStatTypes = <const>["STR", "DEX", "MAG"];
  export const SecondaryStatTypes = <const>[
    "HP",
    "MP",
    "ATK",
    "DEF",
    "SPD",
    "ACC",
    "EVA",
  ];
  export const StatTypes = <const>[...PrimaryStatTypes, ...SecondaryStatTypes];

  export type ItemType = (typeof ItemTypes)[number];
  export const ItemTypes = <const>[
    "rank",
    "character",
    "body",
    "head",
    "feet",
    "hand",
    "weapon",
    "offhand",
    "cloak",
    "amulet",
    "extra",
  ];

  export const ImageLayers = <const>{
    main: { width: 512, height: 1024 },
    icon: { width: 64, height: 64 },
    small: { width: 128, height: 256 },
  };

  export const ItemsOrder: Record<ItemType, number> = <const>{
    rank: 0,
    cloak: 1,
    character: 2,
    feet: 3,
    hand: 3,
    body: 4,
    head: 5,
    amulet: 6,
    extra: 6,
    offhand: 7,
    weapon: 8,
  };

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

    images: Record<string, Record<string, ImageProps | string>>;
    style?: Record<string, string>;
    className?: string | string[];

    dominantColor?: { r: number; g: number; b: number };
    stiching?: Partial<Record<"left" | "right" | "top" | "bottom", number>>;

    stats?: Partial<Record<StatType, number>>;
    statBoosts?: StatBoost[];
    rankBoosts?: Record<string, StatBoost[]>;
  }

  export interface PlayerItem {
    item: string;
    rank: string;
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
      images: {},
      ...item,
      name: item.name || type + "-" + (Object.keys(itemByName).length + 1),
      type,
    };

    // Registration
    itemByName[newItem.name] = newItem;
    itemsByType[newItem.type] = itemsByType[newItem.type].filter(
      (c) => c.name !== newItem.name,
    );
    itemsByType[newItem.type].push(newItem);

    // Handle other layers if not present
    if (!newItem.images.small && newItem.images.main) {
      newItem.images.small = {};
      for (const [z, img] of Object.entries(newItem.images.main)) {
        const src = typeof img === "string" ? { src: img } : { ...img };
        newItem.images.small[z] = src;
        if (src.src !== "transparent" && !src.src.startsWith("plain:")) {
          newItem.images.small[z] = { ...src, ..._main2small };
        }
      }
    }
    if (!newItem.images.icon && newItem.images.main) {
      newItem.images.icon = {};
      for (const [z, img] of Object.entries(newItem.images.main)) {
        const src = typeof img === "string" ? { src: img } : { ...img };
        newItem.images.icon[z] = src;
        if (src.src !== "transparent" && !src.src.startsWith("plain:")) {
          newItem.images.icon[z] = { ...src, ..._main2icon[newItem.type] };
        }
      }
    }

    return newItem;
  }

  export async function loadItems(
    props: string | Record<ItemType, Record<string, Partial<Item>>>,
  ) {
    if (typeof props === "string") {
      const res = await fetch(props);
      if (res.ok) {
        const json = await res.json();
        await loadItems(json);
      } else {
        console.error(res);
      }
    } else {
      let type: ItemType;
      for (type in props) {
        for (const name in props[type]) {
          try {
            const item = registerItem({ ...props[type][name], type, name });
            if (!item.dominantColor) {
              const img = RPG.getItemImage(item);
              const composed = await composeImage([], img);
              const dominantColor = await composed.dominantColor;
              item.dominantColor = dominantColor;
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  }
}

module RPG {
  export class PlayerException extends Error {}

  export class Player {
    static readonly registry: Record<string, Player> = {};

    name: string;
    level: number = 0;

    characters: Record<string, Character> = {};
    inventory: Record<string, PlayerItem> = {};

    specialBoosts: StatBoost[] = [];

    constructor(props?: Partial<Player> | string) {
      if (typeof props === "string") {
        this.name = props;
      } else if (typeof props === "object") {
        this.name = props.name || "";
        this.fill(props);
      } else {
        this.name = "";
      }

      if (!this.name) {
        while (!this.name || Player.registry[this.name]) {
          this.name = `player-${Math.floor(
            Date.now() * 1000000 + Math.random() * 1000000,
          )}`;
        }
      }

      if (Player.registry[this.name]) {
        throw new PlayerException(
          `Player with name ${this.name} already exists`,
        );
      }

      Player.registry[this.name] = this;
    }

    static async load(props: string | Record<string, Partial<Player>>) {
      if (typeof props === "string") {
        const res = await fetch(props);
        if (res.ok) {
          const json = await res.json();
          await Player.load(json);
        } else {
          console.error(res);
        }
      } else {
        for (const name in props) {
          try {
            new Player({ name, ...props[name] });
          } catch (e) {
            console.error(e);
          }
        }
      }
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

    addItem(item: PlayerItem) {
      if (item.count === 0) {
        return true;
      }

      const itemKey =
        item.item +
        ":" +
        item.rank +
        (item.uniqueId ? ":" + item.uniqueId : "");
      if (!this.inventory[itemKey]) {
        if (item.count < 0) {
          throw new PlayerException("Insufficient number of items");
        }
        this.inventory[itemKey] = { ...item, count: 0 };
      }

      const curItem = this.inventory[itemKey];
      if (curItem.count + item.count < 0) {
        throw new PlayerException("Insufficient number of items");
      } else if (curItem.count + item.count > 1 && curItem.uniqueId) {
        throw new PlayerException(
          "Cannot have more than one unique item of this type",
        );
      }

      curItem.count += item.count;
      if (curItem.count === 0) {
        delete this.inventory[itemKey];
      }
      return true;
    }

    removeItem(item: PlayerItem) {
      return this.addItem({ ...item, count: -item.count });
    }

    unequip(itemName?: string, fromCharacter?: string) {
      const character = this.characters[fromCharacter || itemName || ""];
      const item = RPG.itemByName[itemName || ""];
      if (!character || !item) {
        throw new PlayerException("Equipment not found");
      }

      if (item.type === "rank") {
        throw new PlayerException("Cannot unequip rank");
      } else if (item.type === "character") {
        if (fromCharacter && fromCharacter !== item.name) {
          throw new PlayerException(
            "Cannot unequip character from another character",
          );
        }
        if (!character.character || character.character.item !== item.name) {
          throw new PlayerException("Character not found");
        }
        // Unequip all items this character is wearing
        for (const type of RPG.ItemTypes) {
          if (
            type !== "rank" &&
            type !== "character" &&
            character[type] &&
            !this.unequip(character[type]?.item, item.name)
          ) {
            throw new PlayerException(
              "Failed to unequip all of the character's equipment",
            );
          }
        }
        // Return the character to the inventory
        if (!this.addItem(character.character)) {
          throw new PlayerException("Failed to return character to inventory");
        }
        delete this.characters[item.name];
        return true;
      }

      const playerItem = character[item.type];
      if (!playerItem || playerItem.item !== item.name) {
        throw new PlayerException("Equipment not found");
      }
      if (!this.addItem(playerItem)) {
        throw new PlayerException("Failed to return item to inventory");
      }
      delete character[item.type];

      return true;
    }

    equip(equipment: PlayerItem, toCharacter?: string) {
      const item = RPG.itemByName[equipment.item];
      const rank = RPG.itemByName[equipment.rank];
      if (!item || !rank) {
        throw new PlayerException("Equipment not found");
      }

      if (item.type === "rank") {
        throw new PlayerException("Cannot equip rank");
      } else if (item.type === "character") {
        if (toCharacter && toCharacter !== item.name) {
          throw new PlayerException(
            "Cannot equip character to another character",
          );
        }
        if (this.characters[item.name]) {
          throw new PlayerException("Character already equipped");
        }
        if (!this.removeItem(equipment)) {
          throw new PlayerException(
            "Failed to remove character from inventory",
          );
        }

        this.characters[item.name] = { character: equipment };
        return true;
      }

      const character = this.characters[toCharacter || item.name];
      if (!character) {
        throw new PlayerException("Character not found ");
      }

      if (
        character[item.type] &&
        !this.unequip(character[item.type]?.item, character.character?.item)
      ) {
        throw new PlayerException("Failed to unequip previous equipment");
      }
      if (!this.removeItem(equipment)) {
        throw new PlayerException("Failed to remove item from inventory");
      }
      character[item.type] = equipment;
      return true;
    }

    getStats(characterName?: string) {
      const character = this.characters[characterName || ""];
      if (!character) {
        throw new PlayerException("Character not found");
      }

      // TODO: Probably something with player level here

      return RPG.computeCharacterStats(character, this.specialBoosts);
    }

    getImage(
      characterName?: string,
      layer: keyof typeof RPG.ImageLayers = "main",
      initOptions: Partial<ImageOptions> = {},
    ): ImageOptions {
      const character = this.characters[characterName || ""];
      if (!character || !character.character) {
        throw new PlayerException("Character not found");
      }

      let renderChar = character;
      if (layer === "icon") {
        renderChar = { character: character.character, rank: character.rank };
      }
      return RPG.getCharacterImage(renderChar, layer, initOptions);
    }
  }
}

export default RPG;

const _main2small: Partial<ImageProps> = {
  stretch: {
    sx: RPG.ImageLayers.small.width / RPG.ImageLayers.main.width,
    sy: RPG.ImageLayers.small.height / RPG.ImageLayers.main.height,
  },
};

function _iconCrop(cx: number, cy: number, size: number) {
  return {
    position: {
      x: 0,
      y: 0,
    },
    crop: {
      x: cx - size / 2,
      y: cy - size / 2,
      w: size,
      h: size,
    },
    stretch: {
      sx: RPG.ImageLayers.icon.width / size,
      sy: RPG.ImageLayers.icon.height / size,
    },
    smoothing: <ImageSmoothingQuality>"high",
  };
}
const _main2icon: Record<RPG.ItemType, Partial<ImageProps>> = {
  character: _iconCrop(256, 150, 200),
  rank: _iconCrop(256, 512, 256),
  body: _iconCrop(256, 370, 400),
  head: _iconCrop(256, 128, 200),
  feet: _iconCrop(256, 870, 200),
  hand: _iconCrop(128, 480, 128),
  weapon: _iconCrop(128, 480, 256),
  offhand: _iconCrop(384, 480, 256),
  cloak: _iconCrop(256, 370, 400),
  amulet: _iconCrop(256, 220, 200),
  extra: _iconCrop(256, 160, 256),
};
