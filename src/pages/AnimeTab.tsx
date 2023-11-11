import React from "react";

import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import ImageComposition from "../components/ImageComposition";
import RPG from "../model/RPG";

const AnimeTab: React.FC = () => {
  const title = "Anime Character Creation";
  // const data: ImageOptions[] = [
  //   {
  //     sources: [
  //       "plain:#ADD8E6",
  //       "transparent",
  //       "character/char-001-0.png",
  //       "body/body-000-1.png",
  //       "hand/hand-000-1.png",
  //       "feet/feet-000-1.png",
  //       "character/char-001-2.png",
  //       "head/head-003-2.png",
  //     ],
  //     width: 512,
  //     height: 1024,
  //   },
  // ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonList>
          {/* {data.map((props, idx) => (
            <IonItem key={idx}>
              <ImageComposition {...props} />
            </IonItem>
          ))} */}
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
      </IonContent>
    </IonPage>
  );
};

export default AnimeTab;
