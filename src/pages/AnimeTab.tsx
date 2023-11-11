import React from "react";

import {
  IonCol,
  IonGrid,
  IonItem,
  IonRow,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";

import ImageComposition from "../components/ImageComposition";
import RPG from "../model/RPG";
import Format from "../utils/format";

export default function AnimeTab() {
  const [char, setChar] = React.useState<Record<string, string>>({
    character: "Guy 1",
  });

  return (
    <IonGrid>
      <IonRow>
        <IonCol size="12" size-md="6" size-lg="4">
          {RPG.ItemTypes.map((type) => (
            <IonItem key={type}>
              <IonSelect
                interface="popover"
                label={Format.word(type, { capitalize: true })}
                value={char[type] || ""}
                onIonChange={(e) =>
                  setChar((char) => ({ ...char, [type]: e.detail.value }))
                }
              >
                <IonSelectOption value="">--</IonSelectOption>
                {RPG.itemsByType[type].map(
                  (item) =>
                    item.name !== "none" && (
                      <IonSelectOption value={item.name} key={item.name}>
                        {item.name}
                      </IonSelectOption>
                    ),
                )}
              </IonSelect>
              &nbsp;
              <ImageComposition
                {...RPG.getItemIcon(
                  RPG.itemByName[char[type] || "none"] ||
                    RPG.itemByName["none"] ||
                    {},
                )}
              />
            </IonItem>
          ))}
        </IonCol>
        <IonCol size="12" size-md="6" size-lg="8">
          <ImageComposition
            resetOnChange={true}
            {...RPG.getCharacterImage(
              Object.fromEntries(
                Object.entries(char)
                  .filter(([, name]) => !!name)
                  .map(([type, name]) => [
                    type as RPG.ItemType,
                    { item: name, rank: "F", count: 1 },
                  ]),
              ),
            )}
          />
        </IonCol>
      </IonRow>
    </IonGrid>
  );
}
