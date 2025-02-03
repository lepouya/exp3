import { useEffect } from "react";

import RPG from "../model/RPG";
import State from "../model/State";
import AnimeTab from "../pages/AnimeTab";
import DerivativesTab from "../pages/DerivativesTab";
import GridTab from "../pages/Grids";
import SettingsTab from "../pages/SettingsTab";
import database from "../utils/database";
import shortcut from "../utils/shortcut";

export default function AppEvents() {
  const settings = State.useHook();

  useEffect(() => {
    shortcut.addEventListeners();
    database.initialize();
    return () => shortcut.removeEventListeners();
  }, []);

  useEffect(() => {
    State.addTickTimer();
    return () => State.removeTickTimer();
  }, [settings.ticksPerSec]);

  return null;
}

AppEvents.initialize = async function () {
  await database.initialize();
  await Promise.all([
    AnimeTab.init(),
    DerivativesTab.init(),
    GridTab.init(),
    SettingsTab.init(),
  ]);
  await State.global.initAll();
  await RPG.loadItems("/rpg/items.json");
  await State.load();
};
