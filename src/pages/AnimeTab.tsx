import React from "react";

import { IonItem, IonLabel, IonList } from "@ionic/react";

import ImageComposition from "../components/ImageComposition";
import RPG from "../model/RPG";

export default function AnimeTab() {
  return (
    <IonList>
      {Object.entries(RPG.itemByName).map(([name, item], idx) => (
        <React.Fragment key={idx}>
          <IonItem>
            <IonLabel>
              {item.type}: {name}
            </IonLabel>
            <ImageComposition {...RPG.getItemIcon(item)} />
          </IonItem>
          <IonItem>
            <ImageComposition
              {...RPG.getCharacterImage(
                Object.fromEntries([
                  [item.type, { item: item.name, rank: "F", count: 1 }],
                ]),
              )}
            />
          </IonItem>
        </React.Fragment>
      ))}
    </IonList>
  );
}
