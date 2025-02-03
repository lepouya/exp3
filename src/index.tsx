/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";
/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "@ionic/react/css/palettes/dark.system.css";
/* Theme variables */
import "./theme.css";

import React, { ComponentType } from "react";
import { createRoot } from "react-dom/client";

import { IonApp, IonLoading, setupIonicReact } from "@ionic/react";

import AppEvents from "./components/AppEvents";
import TabApp from "./components/TabApp";

setupIonicReact();

const div = document.createElement("div");
div.id = "root";
document.body.appendChild(div);
const root = createRoot(div);

root.render(
  <IonLoading
    isOpen={true}
    message="Loading game assets..."
    spinner="lines-sharp"
  />,
);

window.addEventListener(
  "load",
  async () => {
    await AppEvents.initialize();
    const IonApp_FIXED = IonApp as ComponentType<any>;
    root.render(
      <React.StrictMode>
        <IonApp_FIXED>
          <AppEvents />
          <TabApp />
        </IonApp_FIXED>
      </React.StrictMode>,
    );
  },
  false,
);
