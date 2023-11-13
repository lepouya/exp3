import React from "react";

import genRegistry from "../utils/registry";
import { ResourceManager } from "./Resource";

/**
 * Keyboard shortcuts handling
 */

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

/**
 * Exports
 */

type TabProps = {
  path: string;
  content: React.ReactNode;

  icon?: string;
  label?: string;
  title?: string;

  from?: string;
};
const tabRegistry = genRegistry<Record<string, TabProps>>({});

const resourceManagerRegistry = genRegistry(() => ResourceManager.singleton);

function Game() {
  const [timerId, setTimerId] = React.useState<NodeJS.Timeout | undefined>();
  const rm = Game.useResourceManager();

  React.useEffect(() => {
    document.addEventListener("keydown", processShortcuts);
    return () => document.removeEventListener("keydown", processShortcuts);
  }, []);

  React.useEffect(
    function () {
      clearInterval(timerId);
      const newTimerId = setInterval(function () {
        ResourceManager.tick(
          undefined,
          "tick",
          (save) => console.log("Save", save),
          resourceManagerRegistry.signal,
        );
      }, 1000.0 / rm.ticksPerSecond);
      setTimerId(newTimerId);

      return () => {
        clearInterval(newTimerId);
        clearInterval(timerId);
        setTimerId(undefined);
      };
    },
    [rm, rm.ticksPerSecond],
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

  export function useTabs() {
    const tabs = tabRegistry.useHook();
    return Object.values(tabs);
  }

  export function useResourceManager() {
    return resourceManagerRegistry.useHook();
  }

  // TODO: useShortcut
}

export default Game;
