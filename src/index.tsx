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
/* Theme variables */
import "./theme.css";

import React from "react";
import { createRoot } from "react-dom/client";

import { IonApp, setupIonicReact } from "@ionic/react";

import App from "./App";
import ImageComposition from "./components/ImageComposition";
import RPG from "./model/RPG";

setupIonicReact();

window.addEventListener(
  "load",
  async () => {
    const div = document.createElement("div");
    div.id = "root";
    document.body.appendChild(div);
    const root = createRoot(div);

    root.render(<ImageComposition />);
    await RPG.loadItems("/items.json");

    root.render(
      <React.StrictMode>
        <IonApp>
          <App />
        </IonApp>
      </React.StrictMode>,
    );
  },
  false,
);
