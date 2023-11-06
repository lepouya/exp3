import { bugOutline } from "ionicons/icons";
import { useEffect, useState } from "react";

import { IonIcon, IonImg, IonSpinner } from "@ionic/react";

import composeImage, { ImageOptions } from "../utils/composeImage";

export default function ImageComposition(props: ImageOptions) {
  const [data, setData] = useState("");
  const serializedProps = JSON.stringify(props);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = await composeImage([], { ...props, returnType: "dataUrl" });
        setData(url as string);
      } catch (e) {
        setData(`error: ${e}`);
      }
    };
    fetchData();
  }, [serializedProps, setData]);

  if (!data) {
    return <IonSpinner />;
  } else if (data === "error") {
    return <IonIcon icon={bugOutline} />;
  } else {
    return <IonImg src={data} />;
  }
}
