import { ellipse, square, triangle } from "ionicons/icons";
import React from "react";
import { Redirect, Route } from "react-router-dom";

import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";

import AnimeTab from "./pages/AnimeTab";
import DerivativesTab from "./pages/DerivativesTab";
import Tab3 from "./pages/Tab3";

const App: React.FC = () => (
  <IonReactRouter>
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/anime">
          <AnimeTab />
        </Route>
        <Route exact path="/derivatives">
          <DerivativesTab />
        </Route>
        <Route path="/nothing">
          <Tab3 />
        </Route>
        <Route exact path="/">
          <Redirect to="/anime" />
        </Route>
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="anime" href="/anime">
          <IonIcon aria-hidden="true" icon={triangle} />
          <IonLabel>Anime</IonLabel>
        </IonTabButton>
        <IonTabButton tab="derivatives" href="/derivatives">
          <IonIcon aria-hidden="true" icon={ellipse} />
          <IonLabel>d/dx</IonLabel>
        </IonTabButton>
        <IonTabButton tab="nothing" href="/nothing">
          <IonIcon aria-hidden="true" icon={square} />
          <IonLabel>Nothing</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  </IonReactRouter>
);

export default App;
