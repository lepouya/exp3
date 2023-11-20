import { settingsOutline } from "ionicons/icons";
import React from "react";

import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonGrid,
  IonRange,
  IonRow,
  IonText,
  IonTextarea,
} from "@ionic/react";

import Game from "../model/Game";
import { ResourceManager } from "../model/Resource";
import { decode, encode } from "../utils/encoding";
import Format from "../utils/format";
import formatWithNotation from "../utils/notation";

export default function SettingsTab() {
  return (
    <IonGrid>
      <GameDataPanel />
      <NumberFormatPanel />
      <AdvancedPanel />
    </IonGrid>
  );
  // TODO: reset
  // TODO: debug
}

SettingsTab.init = () => {
  Game.Tab.register({
    path: "settings",
    content: <SettingsTab />,
    icon: settingsOutline,
    label: "Settings",
    title: "Game Settings",
  });
};

function GameDataPanel() {
  const rm = Game.useResourceManager();
  const [textContents, setTextContents] = React.useState("");
  const debug = window.location.search.toLowerCase().includes("debug");

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonRow>
            <IonCol size="12" className="ion-text-center">
              <IonText>Game Data</IonText>
            </IonCol>
          </IonRow>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonRow>
          <IonCol size="12">
            You started this game{" "}
            {Format.time(rm.lastTick ?? 0, { epoch: rm.lastReset })}
          </IonCol>
          <IonCol size="12">
            This session started{" "}
            {Format.time(rm.lastTick ?? 0, { epoch: rm.lastLoaded })}
          </IonCol>
          <IonCol size="12">
            Game was last saved{" "}
            {Format.time(rm.lastTick ?? 0, { epoch: rm.lastSaved })}
          </IonCol>
        </IonRow>
        <IonRow>
          <IonCol size="6">
            <IonButton
              onClick={() => Game.ResourceManager.load()}
              expand="block"
            >
              Load Game
            </IonButton>
          </IonCol>
          <IonCol size="6">
            <IonButton
              onClick={() => Game.ResourceManager.save(debug)}
              expand="block"
            >
              Save Game
              {debug && " [debug]"}
            </IonButton>
          </IonCol>
          <IonCol size="6">
            <IonButton onClick={loadFile} expand="block">
              Load from File
            </IonButton>
          </IonCol>
          <IonCol size="6">
            <IonButton onClick={saveFile} expand="block">
              Save to File
              {debug && " [debug]"}
            </IonButton>
          </IonCol>
          <IonCol size="6">
            <IonButton
              onClick={() => {
                rm.load(decode(textContents));
                Game.ResourceManager.signalUpdate();
              }}
              expand="block"
            >
              Import Text
            </IonButton>
          </IonCol>
          <IonCol size="6">
            <IonButton
              onClick={() => setTextContents(encode(rm.save(), debug))}
              expand="block"
            >
              Export Text
              {debug && " [debug]"}
            </IonButton>
          </IonCol>
          <IonCol size="12">
            <IonTextarea
              label="Game data for import/export"
              labelPlacement="floating"
              fill="outline"
              rows={5}
              value={textContents}
              onIonInput={(e) => setTextContents(e.detail.value ?? "")}
            ></IonTextarea>
          </IonCol>
        </IonRow>
      </IonCardContent>
    </IonCard>
  );
}

function NumberFormatPanel() {
  const rm = ResourceManager.singleton;
  const [format, setFormat] = React.useState(
    rm.globalNumberFormat || "Standard",
  );

  React.useEffect(() => {
    rm.globalNumberFormat = format;
  }, [format]);

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonRow>
            <IonCol size="12" className="ion-text-center">
              <IonText>Number Format</IonText>
            </IonCol>
          </IonRow>
        </IonCardTitle>
        <IonCardSubtitle>
          <IonRow>
            <IonCol size="6" className="ion-text-right">
              Current number format is:
            </IonCol>
            <IonCol size="6" className="ion-text-left">
              {formatWithNotation.all[format].name}
            </IonCol>
          </IonRow>
        </IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <IonRow>
          {Object.values(formatWithNotation.all).map((notation) => (
            <IonCol
              size="6"
              key={`notation-${notation.name}`}
              className="ion-text-center"
            >
              <IonButton
                onClick={() => setFormat(notation.name)}
                fill="outline"
                expand="block"
              >
                <IonRow>
                  <IonCol
                    size="12"
                    className="ion-text-center"
                    style={{ textTransform: "none" }}
                  >
                    {notation.name}
                  </IonCol>
                  {[123456.789, 123.456e89].map((num, idx) => (
                    <IonCol
                      key={`sample-${notation.name}-${idx}`}
                      size="12"
                      className="ion-text-center"
                      style={{ textTransform: "none" }}
                    >
                      <IonText color="secondary">
                        {formatWithNotation(num, notation, 3)}
                      </IonText>
                    </IonCol>
                  ))}
                </IonRow>
              </IonButton>
            </IonCol>
          ))}
        </IonRow>
      </IonCardContent>
    </IonCard>
  );
}

function AdvancedPanel() {
  const rm = Game.useResourceManager();
  const [tps, setTps] = React.useState(rm.ticksPerSecond);
  const [fps, setFps] = React.useState(rm.rendersPerSecond);
  const [sps, setSps] = React.useState(rm.saveFrequencySecs);

  React.useEffect(() => {
    setTps(rm.ticksPerSecond);
  }, [rm.ticksPerSecond]);

  React.useEffect(() => {
    setFps(rm.rendersPerSecond);
  }, [rm.rendersPerSecond]);

  React.useEffect(() => {
    setSps(rm.saveFrequencySecs);
  }, [rm.saveFrequencySecs]);

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonRow>
            <IonCol size="12" className="ion-text-center">
              <IonText>Advanced Settings</IonText>
            </IonCol>
          </IonRow>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonRow>
          <IonCol size="12">
            If you are having performance issues, increase the time between
            updates. Faster updating frequncies lead to better game experience
            but might use a lot of CPU.
          </IonCol>
          <IonCol size="6" className="ion-text-right">
            Updating frequency:
          </IonCol>
          <IonCol size="6" className="ion-text-center">
            {Math.floor(1000.0 / rm.ticksPerSecond)}ms
          </IonCol>
          <IonCol size="6"></IonCol>
          <IonCol size="6">
            <IonRange
              min={1}
              max={60}
              step={1}
              pin={true}
              pinFormatter={(value) => `${Math.floor(1000.0 / value)}ms`}
              value={tps}
              onIonInput={(e) => setTps(e.detail.value as number)}
              onIonChange={(e) => {
                rm.ticksPerSecond = e.detail.value as number;
                Game.ResourceManager.signalUpdate();
              }}
              className="ion-no-padding"
            ></IonRange>
          </IonCol>
          <IonCol size="6" className="ion-text-right">
            Rendering frequency:
          </IonCol>
          <IonCol size="6" className="ion-text-center">
            {Math.floor(1000.0 / rm.rendersPerSecond)}ms
          </IonCol>
          <IonCol size="6"></IonCol>
          <IonCol size="6">
            <IonRange
              min={1}
              max={60}
              step={1}
              pin={true}
              pinFormatter={(value) => `${Math.floor(1000.0 / value)}ms`}
              value={fps}
              onIonInput={(e) => setFps(e.detail.value as number)}
              onIonChange={(e) => {
                rm.rendersPerSecond = e.detail.value as number;
                Game.ResourceManager.signalUpdate();
              }}
              className="ion-no-padding"
            ></IonRange>
          </IonCol>
        </IonRow>
        <IonRow>
          <IonCol size="12">
            Change how often the game is saved in the background. More frequent
            saving leads to faster backups, but increases CPU and I/O usage
          </IonCol>
          <IonCol size="6" className="ion-text-right">
            Saving frequency:
          </IonCol>
          <IonCol size="6" className="ion-text-center">
            {Format.time(1000 * rm.saveFrequencySecs, { ago: "" })}
          </IonCol>
          <IonCol size="6"></IonCol>
          <IonCol size="6">
            <IonRange
              min={1}
              max={60}
              step={1}
              pin={true}
              pinFormatter={(value) =>
                Format.time(1000 * (600 / value), {
                  ago: "",
                  len: "tiny",
                }).replace(":", "m:") + "s"
              }
              value={600 / sps}
              onIonInput={(e) => setSps(600 / (e.detail.value as number))}
              onIonChange={(e) => {
                rm.saveFrequencySecs = 600 / (e.detail.value as number);
                Game.ResourceManager.signalUpdate();
              }}
              className="ion-no-padding"
            ></IonRange>
          </IonCol>
        </IonRow>
      </IonCardContent>
    </IonCard>
  );
}

function saveFile() {
  const rm = ResourceManager.singleton;
  const debug = window.location.search.toLowerCase().includes("debug");
  const name = (import.meta.env.NAME as string).replace(/\W/g, "_");
  const version = (import.meta.env.VERSION as string).replace(/\W/g, "_");
  const date = new Date()
    .toISOString()
    .replace(/\D/g, " ")
    .trim()
    .replace(/\D/g, "-");
  const fileName = `${name}-v${version}-${date}`;
  const fileData = encode(rm.save(), debug);
  const contents = new Blob([fileData], { type: "text/plain" });

  const url = URL.createObjectURL(contents);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function loadFile() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.addEventListener(
    "change",
    function (changeEvent) {
      const files = (changeEvent.target as HTMLInputElement).files;
      if (!files || files.length === 0 || !files[0]) {
        return;
      }

      const reader = new FileReader();
      reader.onload = function (loadEvent) {
        const contents = loadEvent.target?.result;
        if (!contents || typeof contents !== "string") {
          return;
        }

        const rm = ResourceManager.singleton;
        rm.load(decode(contents));
        rm.tick(undefined, "load");
        Game.ResourceManager.signalUpdate();
      };

      reader.readAsText(files[0]);
    },
    false,
  );

  fileInput.click();
}
