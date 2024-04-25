import React from "react";

import { IonItem, IonLabel, IonList } from "@ionic/react";

import Grid from "../components/Grid";
import Game from "../model/Game";

export default function GridTab() {
  return (
    <IonList>
      {shapes.map((shape) =>
        cells.map((grid, i) => (
          <React.Fragment key={shape + "-" + i}>
            <IonItem>
              <IonLabel>
                {shape} @ {grid.length}x{grid[0].length}
              </IonLabel>
            </IonItem>
            <IonItem>
              <Grid
                cells={grid}
                render={RenderCell}
                shape={shape}
                cellGap="1px"
                cellStyle={() => ({
                  background: "linear-gradient(#aaa, #eee)",
                })}
              />
            </IonItem>
          </React.Fragment>
        )),
      )}
    </IonList>
  );
}

GridTab.init = () => {
  Game.Tab.register({
    path: "grids",
    content: <GridTab />,
    icon: "gridOutline",
    label: "Grids",
    title: "Grids Test",
  });
};

type CellProps = {
  cells: string[][];
  cell?: string;
  row: number;
  col: number;
};

function RenderCell({ row, col }: CellProps) {
  return (
    <div>
      {row + 1}:{col + 1}
    </div>
  );
}

const cells: string[][][] = [
  Array.from(Array(4)).map((_) => Array.from(Array(4)).map((_) => "")),
  Array.from(Array(10)).map((_) => Array.from(Array(10)).map((_) => "")),
];

const shapes = [
  "Square",
  "Diamond",
  "Zigzag",
  "Drape",
  "Checkerboard",
  "Hexagon",
  "Honeycomb",
  "Octagon",
] as const;
