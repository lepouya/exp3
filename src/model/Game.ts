import React from "react";

import { Storage } from "@ionic/storage";

import { decode, encode } from "../utils/encoding";
import genRegistry from "../utils/registry";
import { ResourceManager as RM } from "./Resource";

function Game() {
  const [, setTimerId] = React.useState<NodeJS.Timeout | undefined>();
  const rm = Game.useResourceManager();

  React.useEffect(() => {
    document.addEventListener("keydown", Game.ShortCut.process);
    return () => document.removeEventListener("keydown", Game.ShortCut.process);
  }, []);

  React.useEffect(() => {
    Game.Database.initialize();
  }, []);

  const clearTimers = React.useCallback(
    (...timers: (NodeJS.Timeout | undefined)[]) => {
      timers.forEach((t) => clearInterval(t));
      setTimerId((timerId) => {
        clearInterval(timerId);
        return undefined;
      });
    },
    [setTimerId],
  );

  React.useEffect(
    function () {
      clearTimers();
      const newTimerId = setInterval(function () {
        RM.tick(
          undefined,
          "tick",
          Game.ResourceManager.save,
          Game.ResourceManager.signalUpdate,
        );
      }, 1000.0 / rm.ticksPerSecond);
      setTimerId(newTimerId);

      return () => {
        clearTimers(newTimerId);
      };
    },
    [rm.ticksPerSecond, clearTimers, setTimerId],
  );

  return null;
}

module Game {
  export module ShortCut {
    const BLOCKED_DOM_ELEMS = ["TEXTAREA", "INPUT"];
    type ShortcutCallback = (event: KeyboardEvent) => boolean;
    const shortcuts: Record<string, ShortcutCallback[]> = {};

    function registerShortcut(key: string, callback: ShortcutCallback) {
      key = key.toLowerCase().replace(/\W/g, "");
      shortcuts[key] ??= [];
      if (!shortcuts[key].includes(callback)) {
        shortcuts[key].push(callback);
      }
    }

    export function process(event: KeyboardEvent) {
      if (
        event.target &&
        BLOCKED_DOM_ELEMS.includes(
          (event.target as HTMLElement).tagName.toUpperCase(),
        )
      ) {
        return;
      }

      const callbacks = shortcuts[event.key.toLowerCase()];
      if (callbacks && callbacks.length > 0) {
        callbacks.forEach((cb) => {
          if (cb(event)) {
            event.preventDefault();
            event.stopPropagation();
          }
        });
      }
    }

    export function register(key: string, callback: ShortcutCallback) {
      registerShortcut(key, callback);
    }
  }

  export module Tab {
    type TabProps = {
      path: string;
      content: React.ReactNode;

      icon?: string;
      label?: string;
      title?: string;

      from?: string;
    };
    const tabRegistry = genRegistry<Record<string, TabProps>>({});

    export const useTabs = tabRegistry.useHook;

    export function register(tab: TabProps) {
      tabRegistry.get()[tab.path] = tab;
      tabRegistry.signal();
    }

    export function unregister(tab: TabProps | string) {
      delete tabRegistry.get()[typeof tab === "string" ? tab : tab.path];
      tabRegistry.signal();
    }
  }

  export module Database {
    const storage = { db: undefined as Storage | undefined };

    export async function initialize() {
      if (!storage.db) {
        storage.db = new Storage();
        storage.db = await storage.db.create();
      }
      return storage.db;
    }

    export function getStorage() {
      initialize();
      return storage.db;
    }

    export async function write<T>(key: string, value: T, pretty = false) {
      let data = encode(value, pretty);
      await initialize();
      return await storage.db?.set(key, data);
    }

    export async function read<T>(key: string): Promise<T | undefined> {
      await initialize();
      const data = await storage.db?.get(key);
      return decode(data);
    }

    export async function clear() {
      await initialize();
      await storage.db?.clear();
    }
  }

  export module ResourceManager {
    const resourceManagerRegistry = genRegistry(() => RM.singleton);

    export const useHook = resourceManagerRegistry.useHook;
    export const signalUpdate = resourceManagerRegistry.signal;

    export async function save(debug = false) {
      const rm = resourceManagerRegistry.get();
      rm.tick(undefined, "save");
      return await Database.write("ResourceManager", rm.save(), debug);
    }

    export async function load() {
      const rm = resourceManagerRegistry.get();
      rm.load(await Database.read("ResourceManager"));
      rm.tick(undefined, "load");
      resourceManagerRegistry.signal();
      return rm;
    }
  }

  export function useTabs() {
    const tabs = Tab.useTabs();
    return Object.values(tabs);
  }

  export function useDatabase() {
    return Database.getStorage();
  }

  export function useResourceManager() {
    return ResourceManager.useHook();
  }
}

export default Game;
