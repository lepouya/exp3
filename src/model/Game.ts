import Decimal from "break_eternity.js";
import React from "react";

import { Storage } from "@ionic/storage";

import genRegistry from "../utils/registry";
import { ResourceManager as RM } from "./Resource";

let skipEncoding = false;
function codec(s: string): string {
  if (skipEncoding || !s) {
    return s;
  }

  const h = s.startsWith("..");
  const c = (h ? s : Math.random().toString(36)).substring(2, 10);
  return (
    (h ? "" : ".." + c) +
    (h ? s.slice(10) : s)
      .split("")
      .map((s) => s.charCodeAt(0))
      .map((s, i) => String.fromCharCode(s ^ c.charCodeAt(i % 8)))
      .join("")
  );
}

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

function processShortcuts(event: KeyboardEvent) {
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

type TabProps = {
  path: string;
  content: React.ReactNode;

  icon?: string;
  label?: string;
  title?: string;

  from?: string;
};
const tabRegistry = genRegistry<Record<string, TabProps>>({});

const resourceManagerRegistry = genRegistry(() => RM.singleton);

const storage = { db: undefined as Storage | undefined };

function Game() {
  const [, setTimerId] = React.useState<NodeJS.Timeout | undefined>();
  const rm = Game.useResourceManager();

  React.useEffect(() => {
    document.addEventListener("keydown", processShortcuts);
    return () => document.removeEventListener("keydown", processShortcuts);
  }, []);

  React.useEffect(() => {
    Game.Database.initialize();
  }, []);

  const clearTimers = React.useCallback(
    (...timers: (NodeJS.Timeout | undefined)[]) => {
      timers.forEach((t) => t && clearInterval(t));
      setTimerId((timerId) => {
        if (timerId) clearInterval(timerId);
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
          resourceManagerRegistry.signal,
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
    export function register(key: string, callback: ShortcutCallback) {
      registerShortcut(key, callback);
    }
  }

  export module Tab {
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
    export async function initialize() {
      if (!storage.db) {
        storage.db = new Storage();
        storage.db = await storage.db.create();
      }
      return storage.db;
    }

    export async function write<T>(key: string, value: T, pretty = false) {
      const seen: any[] = [];
      function replacer(k: string, v: any) {
        if (!k) {
          return v;
        } else if (k.startsWith("_")) {
          return undefined;
        } else if (!v || typeof v !== "object" || Array.isArray(v)) {
          return v;
        } else if (v instanceof Decimal || v instanceof Date) {
          return v.toJSON();
        } else if (v instanceof RM) {
          return undefined;
        } else if (Object.keys(v).length === 0) {
          // No need to save empty records
          return undefined;
        } else if (seen.includes(v)) {
          // Circular reference found, discard key
          return undefined;
        } else {
          seen.push(v);
          return v;
        }
      }

      let data = JSON.stringify(value, replacer, pretty ? 2 : undefined);
      if (!pretty) {
        data = encodeURIComponent(data);
        data = codec(data);
        data = window.btoa(data);
      }

      await initialize();
      return await storage.db?.set(key, data);
    }

    export async function read<T>(key: string): Promise<T | undefined> {
      await initialize();
      const data = await storage.db?.get(key);
      if (!data || typeof data !== "string") {
        return data ?? undefined;
      }

      let parsed: T | undefined = undefined;
      if (!parsed) {
        try {
          parsed = JSON.parse(decodeURIComponent(codec(window.atob(data))));
        } catch {
          parsed = undefined;
        }
      }
      if (!parsed) {
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = undefined;
        }
      }
      if (!parsed) {
        parsed = data as T;
      }

      return parsed;
    }
  }

  export module ResourceManager {
    export async function save() {
      return await Database.write(
        "ResourceManager",
        resourceManagerRegistry.get().save(),
      );
    }

    export async function load() {
      return resourceManagerRegistry
        .get()
        .load(await Database.read("ResourceManager"));
    }
  }

  export function useTabs() {
    const tabs = tabRegistry.useHook();
    return Object.values(tabs);
  }

  export function useDatabase() {
    return storage.db;
  }

  export function useResourceManager() {
    return resourceManagerRegistry.useHook();
  }
}

export default Game;
