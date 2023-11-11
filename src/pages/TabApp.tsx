import React from "react";
import { Redirect, Route } from "react-router-dom";

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";

type TabProps = {
  path: string;
  content: React.ReactNode;

  icon?: string;
  label?: string;
  title?: string;

  from?: string;
};

export default function TabApp({ tabs }: { tabs: TabProps[] }) {
  return (
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          {tabs.map((tab) => (
            <Route exact path={`/${tab.path}`} key={`tab-${tab.path}`}>
              <IonPage>
                <IonHeader>
                  <IonToolbar>
                    <IonTitle>{tab.title || tab.path}</IonTitle>
                  </IonToolbar>
                </IonHeader>
                <IonContent fullscreen>{tab.content}</IonContent>
              </IonPage>
            </Route>
          ))}
          {tabs
            .filter((tab) => !!tab.from)
            .map((tab) => (
              <Route exact path={tab.from} key={`default-tab-${tab.path}`}>
                <Redirect to={`/${tab.path}`} />
              </Route>
            ))}
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          {tabs.map((tab) => (
            <IonTabButton
              tab={tab.path}
              href={`/${tab.path}`}
              key={`tab-button-${tab.path}`}
            >
              {tab.icon && <IonIcon aria-hidden="true" icon={tab.icon} />}
              {tab.label && <IonLabel>{tab.label}</IonLabel>}
            </IonTabButton>
          ))}
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  );
}
