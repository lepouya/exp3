import "./Grid.scss";

import {
  CSSProperties,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  useState,
} from "react";

type GridShape = {
  aspectRatio: number;
  horizontalBevel: number;
  verticalBevel: number;
  interlaced: boolean;
};

type CellProps<Cell> = {
  cell: Cell;

  cells: Cell[][];
  row: number;
  col: number;
};

type GridProps<Cell> = {
  id?: string;
  shape?: GridShape | keyof typeof gridShapes;
  cells: Cell[][];

  cellSize?: string | number;
  cellGap?: string | number;
  fixedColumns?: number;

  render?: (cellProps: CellProps<Cell>) => ReactNode;
  onClick?: (event: MouseEvent, cellProps: CellProps<Cell>) => void;

  className?: string;
  style?: CSSProperties;
  cellClass?: (cellProps: CellProps<Cell>) => string | undefined;
  cellStyle?: (cellProps: CellProps<Cell>) => CSSProperties | undefined;
};

export default function Grid<Cell>({
  id,
  shape = gridShapes.Square,
  cells,

  cellSize,
  cellGap,
  fixedColumns,

  render,
  onClick,

  className,
  style,
  cellClass,
  cellStyle,

  children,
}: PropsWithChildren<GridProps<Cell>>) {
  const [gridId, _] = useState(
    () => id || "grid-" + Math.random().toString(36).substring(2, 10),
  );

  if (typeof shape === "string") {
    shape = gridShapes[shape ?? "Square"] ?? gridShapes["Square"];
  }

  if (!fixedColumns) {
    fixedColumns = Math.max(1, ...cells.map((row) => row.length));
  }

  if (typeof cellGap === "number") {
    cellGap = `${cellGap}px`;
  } else if (!cellGap) {
    cellGap = "0px";
  }

  if (typeof cellSize === "number") {
    cellSize = `${cellSize}px`;
  } else if (!cellSize) {
    const margin = 1 - 2 * shape.horizontalBevel;
    const cellRatio =
      1.0 / Math.max(1, cells.length, fixedColumns) / (1 + margin);
    const vwRatio = Math.floor(cellRatio * 95);
    const vhRatio = Math.floor((cellRatio / shape.aspectRatio) * 80);
    cellSize = `min(${vwRatio}vw, ${vhRatio}vh)`;
  }

  return (
    <div
      id={gridId}
      className="grid"
      style={{
        "--columns": fixedColumns,
        "--cell-size": cellSize,
        "--cell-gap": cellGap,
        "--interlaced": shape.interlaced ? 1 : 0,
        "--aspect-ratio": shape.aspectRatio,
        "--horizontal-bevel": shape.horizontalBevel,
        "--vertical-bevel": shape.verticalBevel,
      }}
    >
      <div
        className={["grid-body", className].filter(Boolean).join(" ")}
        style={style}
      >
        {cells.map((r, row) =>
          r.map((cell, col) => {
            const cellProps = { cells, cell, row, col };
            return (
              <div
                key={`cell:${row}:${col}`}
                id={`${gridId}-cell-${row}-${col}`}
                className={["grid-cell", cellClass && cellClass(cellProps)]
                  .filter(Boolean)
                  .join(" ")}
                style={cellStyle && cellStyle(cellProps)}
                onClick={onClick && ((e) => onClick(e, cellProps))}
                onDoubleClick={onClick && ((e) => onClick(e, cellProps))}
                onContextMenu={onClick && ((e) => onClick(e, cellProps))}
              >
                {render && render(cellProps)}
              </div>
            );
          }),
        )}
      </div>
      {children}
    </div>
  );
}

const gridShapes = {
  Square: {
    aspectRatio: 1,
    horizontalBevel: 1 / 2,
    verticalBevel: 0,
    interlaced: false,
  },
  Diamond: {
    aspectRatio: 1,
    horizontalBevel: 1 / 2,
    verticalBevel: 1 / 2,
    interlaced: true,
  },
  Zigzag: {
    aspectRatio: 1,
    horizontalBevel: 1 / 2,
    verticalBevel: 0,
    interlaced: true,
  },
  Drape: {
    aspectRatio: 1,
    horizontalBevel: 0,
    verticalBevel: 1 / 2,
    interlaced: true,
  },
  Checkerboard: {
    aspectRatio: 1,
    horizontalBevel: 0,
    verticalBevel: 0,
    interlaced: true,
  },
  Hexagon: {
    aspectRatio: 1 / Math.cos(Math.PI / 6),
    horizontalBevel: 1 / 2,
    verticalBevel: Math.sin(Math.PI / 6) / 2,
    interlaced: true,
  },
  Honeycomb: {
    aspectRatio: Math.cos(Math.PI / 6),
    horizontalBevel: Math.sin(Math.PI / 6) / 2,
    verticalBevel: 1 / 2,
    interlaced: true,
  },
  Octagon: {
    aspectRatio: 1,
    horizontalBevel: 1 / (2 + Math.sqrt(2)),
    verticalBevel: 1 / (2 + Math.sqrt(2)),
    interlaced: true,
  },
};
