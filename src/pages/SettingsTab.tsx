import { createBrowserHistory } from "history";
import React, { useEffect, useState } from "react";

import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonCol,
  IonGrid,
  IonLabel,
  IonRange,
  IonRow,
  IonText,
  IonTextarea,
} from "@ionic/react";

import TabApp from "../components/TabApp";
import State from "../model/State";
import { decode, encode } from "../utils/codec";
import database from "../utils/database";
import format from "../utils/format";
import Notation from "../utils/notation";

export default function SettingsTab() {
  return (
    <IonGrid>
      <DataPanel />
      <NumberFormatPanel />
      <AdvancedPanel />
      <ResetPanel />
      <DebugPanel />
    </IonGrid>
  );
}

SettingsTab.init = () => {
  TabApp.register({
    path: "settings",
    content: <SettingsTab />,
    icon: "settingsOutline",
    label: "Settings",
    title: "Settings",
  });
};

function DataPanel() {
  const state = State.useHook();
  const [textContents, setTextContents] = React.useState("");

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonRow>
            <IonCol size="12" className="ion-text-center">
              <IonText>Data</IonText>
            </IonCol>
          </IonRow>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonRow>
          <IonCol size="12">
            Started{" "}
            {format.time(state.lastTick ?? 0, { epoch: state.lastReset })}
          </IonCol>
          <IonCol size="12">
            This session started{" "}
            {format.time(state.lastTick ?? 0, {
              epoch: state.lastLoaded,
            })}
          </IonCol>
          <IonCol size="12">
            Last saved{" "}
            {format.time(state.lastTick ?? 0, { epoch: state.lastSaved })}
          </IonCol>
        </IonRow>
        <IonRow>
          <IonCol size="6">
            <IonButton
              onClick={() => {
                State.load().then(State.save).then(reload);
              }}
              expand="block"
            >
              Load
            </IonButton>
          </IonCol>
          <IonCol size="6">
            <IonButton onClick={() => State.save()} expand="block">
              Save
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
            </IonButton>
          </IonCol>
          <IonCol size="6">
            <IonButton
              onClick={() => {
                state.load(decode(textContents));
                State.save().then(reload);
              }}
              expand="block"
            >
              Import Text
            </IonButton>
          </IonCol>
          <IonCol size="6">
            <IonButton
              onClick={() =>
                setTextContents(encode(state.save(), State.isDebug()))
              }
              expand="block"
            >
              Export Text
            </IonButton>
          </IonCol>
          <IonCol size="12">
            <IonTextarea
              label="Data for import/export"
              labelPlacement="floating"
              fill="outline"
              rows={5}
              autoGrow={true}
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
  const state = State.useHook();
  const defaultNotation = Notation.get(state.formatOptions.notation);

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
      </IonCardHeader>
      <IonCardContent>
        <IonRow>
          <IonCol size="12">
            <IonText>Current number format is </IonText>
            <IonText color="primary">{defaultNotation.name}</IonText>
          </IonCol>
        </IonRow>
        <IonRow>
          {Object.values(Notation.all).map((notation) => (
            <IonCol size="6" key={notation.name}>
              <IonButton
                onClick={() =>
                  state.set({
                    formatOptions: { notation: notation.name },
                  })
                }
                color={
                  defaultNotation.name === notation.name
                    ? "secondary"
                    : "primary"
                }
                expand="block"
              >
                <IonGrid>
                  <IonRow>
                    <IonCol size="12" className="ion-text-center">
                      <IonLabel>{notation.name}</IonLabel>
                    </IonCol>
                  </IonRow>
                  <IonRow>
                    {[
                      // "0.123456",
                      "123456.789",
                      // "12345678901234567890.1234567890",
                      // "123.456e78.9",
                    ].map((num, idx) => (
                      <IonCol
                        key={`sample-${notation.name}-${idx}`}
                        size="12"
                        className="ion-text-center"
                      >
                        <IonText>{notation.format(num, 3, 3, 3)}</IonText>
                      </IonCol>
                    ))}
                  </IonRow>
                </IonGrid>
              </IonButton>
            </IonCol>
          ))}
        </IonRow>
      </IonCardContent>
    </IonCard>
  );
}

function AdvancedPanel() {
  const state = State.useHook();
  const [tps, setTps] = useState(state.ticksPerSec);
  const [fps, setFps] = useState(state.rendersPerSec);
  const [sps, setSps] = useState(state.saveFrequencySecs);

  useEffect(() => {
    setTps(state.ticksPerSec);
  }, [state.ticksPerSec]);

  useEffect(() => {
    setFps(state.rendersPerSec);
  }, [state.rendersPerSec]);

  useEffect(() => {
    setSps(state.saveFrequencySecs);
  }, [state.saveFrequencySecs]);

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
            updates. Faster updating frequncies lead to better experience but
            might use a lot of CPU.
          </IonCol>
          <IonCol size="6" className="ion-text-right">
            Updating frequency:
          </IonCol>
          <IonCol size="6" className="ion-text-center">
            {Math.floor(1000.0 / state.ticksPerSec)}ms
          </IonCol>
          <IonCol size="6"></IonCol>
          <IonCol size="6">
            <IonRange
              min={6}
              max={100}
              step={1}
              pin={true}
              pinFormatter={(value) => `${Math.floor(1000.0 / value)}ms`}
              value={tps}
              onIonInput={(e) => setTps(e.detail.value as number)}
              onIonChange={(e) => {
                state.set({ ticksPerSec: e.detail.value as number });
              }}
              className="ion-no-padding"
            ></IonRange>
          </IonCol>
          <IonCol size="6" className="ion-text-right">
            Rendering frequency:
          </IonCol>
          <IonCol size="6" className="ion-text-center">
            {Math.floor(1000.0 / state.rendersPerSec)}ms
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
                state.set({ rendersPerSec: e.detail.value as number });
              }}
              className="ion-no-padding"
            ></IonRange>
          </IonCol>
        </IonRow>
        <IonRow>
          <IonCol size="12">
            Change how often the session is saved in the background. More
            frequent saving leads to faster backups, but increases CPU and I/O
            usage
          </IonCol>
          <IonCol size="6" className="ion-text-right">
            Saving frequency:
          </IonCol>
          <IonCol size="6" className="ion-text-center">
            {format.time(1000 * state.saveFrequencySecs, { ago: "" })}
          </IonCol>
          <IonCol size="6"></IonCol>
          <IonCol size="6">
            <IonRange
              min={1}
              max={60}
              step={1}
              pin={true}
              pinFormatter={(value) =>
                format
                  .time(1000 * (600 / value), {
                    ago: "",
                    len: "tiny",
                  })
                  .replace(":", "m:") + "s"
              }
              value={600 / sps}
              onIonInput={(e) => setSps(600 / (e.detail.value as number))}
              onIonChange={(e) => {
                state.set({
                  saveFrequencySecs: 600 / (e.detail.value as number),
                });
              }}
              className="ion-no-padding"
            ></IonRange>
          </IonCol>
        </IonRow>
      </IonCardContent>
    </IonCard>
  );
}

function ResetPanel() {
  const [resetAcknowledged, setResetAcknowledged] = useState(false);

  function resetAll() {
    if (!resetAcknowledged) {
      return;
    }
    setResetAcknowledged(false);
    State.reset();
    database.clear().then(reload);
  }

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonRow>
            <IonCol size="12" className="ion-text-center">
              <IonText>Reset</IonText>
            </IonCol>
          </IonRow>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonRow>
          <IonCol size="12">
            <IonText color="danger">
              WARNING: this will completely reset your settings and delete all
              saved progress. Only use this if you want to restart from the
              beginning, or if something in the settings is so messed up that it
              is unusable.
            </IonText>
          </IonCol>
          <IonCol size="12">
            <IonCheckbox
              justify="end"
              checked={resetAcknowledged}
              onIonChange={() => setResetAcknowledged((a) => !a)}
            >
              I understand what this means and still want to reset
            </IonCheckbox>
          </IonCol>
          <IonCol size="12" class="ion-text-right">
            <IonButton
              onClick={resetAll}
              disabled={!resetAcknowledged}
              color={resetAcknowledged ? "danger" : "medium"}
            >
              Reset everything
            </IonButton>
          </IonCol>
        </IonRow>
      </IonCardContent>
    </IonCard>
  );
}

function DebugPanel() {
  const state = State.useHook();
  if (!State.isDebug()) {
    return null;
  }

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonRow>
            <IonCol size="12" className="ion-text-center">
              <IonText>Debug Context</IonText>
            </IonCol>
          </IonRow>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonRow>
          <IonCol size="12">
            <IonTextarea
              autoGrow={true}
              readonly={true}
              value={encode(state, true)}
            ></IonTextarea>
          </IonCol>
        </IonRow>
      </IonCardContent>
    </IonCard>
  );
}

function saveFile() {
  const state = State.global;
  const name = (import.meta.env.NAME as string).replace(/\W/g, "_");
  const version = (import.meta.env.VERSION as string).replace(/\W/g, "_");
  const date = new Date()
    .toISOString()
    .replace(/\D/g, " ")
    .trim()
    .replace(/\D/g, "-");
  const fileName = `${name}-v${version}-${date}`;
  const fileData = encode(state.save(), State.isDebug());
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

        const state = State.global;
        state.load(decode(contents));
        state.tick(undefined, "load");
        State.save().then(reload);
      };

      reader.readAsText(files[0]);
    },
    false,
  );

  fileInput.click();
}

function reload() {
  const history = createBrowserHistory();
  history.push("#/");
  window.location.reload();
}
