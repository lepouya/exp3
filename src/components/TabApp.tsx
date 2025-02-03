import { ComponentType, Fragment, ReactNode } from "react";
import { Redirect, Route } from "react-router-dom";

import {
  IonChip,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { IonReactHashRouter } from "@ionic/react-router";

import genRegistry from "../utils/registry";
import Icon from "./Icon";

type TabProps = {
  path: string;
  content: ReactNode;
  alwaysMounted?: boolean;

  icon?: string;
  label?: string;
  title?: string;

  from?: string;
};

export default function TabApp() {
  const tabs = TabApp.useTabs();
  const IonTabs_FIXED = IonTabs as ComponentType<any>;
  const IonTabButton_FIXED = IonTabButton as ComponentType<any>;

  return (
    <IonReactHashRouter>
      <IonTabs_FIXED>
        <IonRouterOutlet>
          {tabs.map((tab) => (
            <Route exact path={`/${tab.path}`} key={`tab-${tab.path}`}>
              <IonPage>
                <IonHeader>
                  <IonToolbar>
                    <IonTitle slot="start">{tab.title || tab.path}</IonTitle>
                    <IonChip slot="end" color="success">
                      &#169; 2024 &nbsp;
                      <a
                        href="https://github.com/lepouya"
                        target="_blank"
                        style={{ textDecoration: "none" }}
                      >
                        @lepouya
                      </a>
                    </IonChip>
                  </IonToolbar>
                </IonHeader>
                <IonContent id="tab-contents">{tab.content}</IonContent>
                {tabs
                  .filter((t) => t.alwaysMounted && t !== tab)
                  .map((t) => (
                    <Fragment key={`page-${t.path}`}>{t.content}</Fragment>
                  ))}
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
          {tabs.map(
            (tab) =>
              (tab.icon || tab.label) && (
                <IonTabButton_FIXED
                  tab={tab.path}
                  href={`/${tab.path}`}
                  key={`tab-button-${tab.path}`}
                >
                  {tab.icon && <Icon aria-hidden="true" icon={tab.icon} />}
                  {tab.label && <IonLabel>{tab.label}</IonLabel>}
                </IonTabButton_FIXED>
              ),
          )}
        </IonTabBar>
      </IonTabs_FIXED>
    </IonReactHashRouter>
  );
}

const tabRegistry = genRegistry<Record<string, TabProps>>({});

TabApp.register = function (tab: TabProps) {
  tabRegistry.get()[tab.path] = tab;
  tabRegistry.signal();
};

TabApp.unregister = function (tab: TabProps | string) {
  delete tabRegistry.get()[typeof tab === "string" ? tab : tab.path];
  tabRegistry.signal();
};

TabApp.useTabs = function () {
  const tabs = tabRegistry.useHook();
  return Object.values(tabs);
};
