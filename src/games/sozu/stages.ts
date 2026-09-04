import { cellKey } from "./engine";
import type { Cell, Facing, Stage } from "./types";

function emptyGrid(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: "empty" as const })),
  );
}

function bamboo(facing: Facing, crack = 0): Cell {
  return { type: "bamboo", facing, crack };
}

function sozu(dump: Facing, threshold: number): Cell {
  return { type: "sozu", dump, threshold, fill: 0 };
}

function rock(): Cell {
  return { type: "rock" };
}

function split(): Cell {
  return { type: "split" };
}

function put(grid: Cell[][], r: number, c: number, cell: Cell): void {
  grid[r][c] = cell;
}

function sol(
  ...entries: Array<[number, number, Facing]>
): Record<string, Facing> {
  return Object.fromEntries(entries.map(([r, c, f]) => [cellKey(r, c), f]));
}

export const STAGES: Stage[] = [
  {
    id: 1,
    rows: 4,
    cols: 5,
    drops: 1,
    need: 1,
    source: { r: 0, c: 1, facing: "SE" },
    pond: { r: 2, c: 3 },
    grid: (() => {
      const g = emptyGrid(4, 5);
      put(g, 1, 2, bamboo("SW"));
      put(g, 2, 0, rock());
      put(g, 3, 4, rock());
      return g;
    })(),
    deer: [],
    solution: sol([1, 2, "SE"]),
  },
  {
    id: 2,
    rows: 5,
    cols: 6,
    drops: 1,
    need: 1,
    source: { r: 0, c: 2, facing: "SE" },
    pond: { r: 3, c: 3 },
    grid: (() => {
      const g = emptyGrid(5, 6);
      put(g, 1, 3, bamboo("SW"));
      put(g, 2, 4, bamboo("SE"));
      put(g, 4, 1, rock());
      return g;
    })(),
    deer: [],
    solution: sol([1, 3, "SE"], [2, 4, "SW"]),
  },
  {
    id: 3,
    rows: 5,
    cols: 7,
    drops: 1,
    need: 1,
    source: { r: 0, c: 3, facing: "SE" },
    pond: { r: 3, c: 4 },
    grid: (() => {
      const g = emptyGrid(5, 7);
      put(g, 1, 4, bamboo("SE"));
      put(g, 2, 3, bamboo("SE"));
      put(g, 2, 5, rock());
      put(g, 3, 6, rock());
      return g;
    })(),
    deer: [],
    solution: sol([1, 4, "SW"], [2, 3, "SE"]),
  },
  {
    id: 4,
    rows: 6,
    cols: 7,
    drops: 1,
    need: 1,
    source: { r: 0, c: 2, facing: "SE" },
    pond: { r: 4, c: 4 },
    grid: (() => {
      const g = emptyGrid(6, 7);
      put(g, 1, 3, bamboo("SW"));
      put(g, 2, 4, bamboo("SE"));
      put(g, 3, 3, bamboo("SW"));
      put(g, 5, 0, rock());
      put(g, 5, 6, rock());
      return g;
    })(),
    deer: [],
    solution: sol([1, 3, "SE"], [2, 4, "SW"], [3, 3, "SE"]),
  },
  {
    id: 5,
    rows: 4,
    cols: 6,
    drops: 3,
    need: 2,
    source: { r: 0, c: 2, facing: "SE" },
    pond: { r: 2, c: 4 },
    grid: (() => {
      const g = emptyGrid(4, 6);
      put(g, 1, 3, bamboo("SE", 1));
      return g;
    })(),
    deer: [],
    solution: sol([1, 3, "SE"]),
  },
  {
    id: 6,
    rows: 7,
    cols: 8,
    drops: 3,
    need: 2,
    source: { r: 0, c: 3, facing: "SE" },
    pond: { r: 5, c: 4 },
    grid: (() => {
      const g = emptyGrid(7, 8);
      put(g, 1, 4, bamboo("SE"));
      put(g, 2, 5, bamboo("SE", 1));
      put(g, 3, 6, bamboo("SW", 1));
      put(g, 4, 5, bamboo("SW"));
      put(g, 2, 3, bamboo("SE"));
      put(g, 3, 4, bamboo("SW"));
      put(g, 4, 3, bamboo("SE"));
      put(g, 6, 7, rock());
      return g;
    })(),
    deer: [],
    solution: sol(
      [1, 4, "SW"],
      [2, 5, "SE"],
      [3, 6, "SW"],
      [4, 5, "SW"],
      [2, 3, "SE"],
      [3, 4, "SW"],
      [4, 3, "SE"],
    ),
  },
  {
    id: 7,
    rows: 7,
    cols: 8,
    drops: 4,
    need: 3,
    source: { r: 0, c: 3, facing: "SE" },
    pond: { r: 5, c: 4 },
    grid: (() => {
      const g = emptyGrid(7, 8);
      put(g, 1, 4, bamboo("SE"));
      put(g, 2, 5, split());
      put(g, 3, 4, bamboo("SE"));
      put(g, 4, 5, bamboo("SW"));
      put(g, 2, 3, bamboo("SW"));
      put(g, 3, 2, bamboo("SE"));
      put(g, 4, 3, bamboo("SE"));
      put(g, 3, 6, rock());
      return g;
    })(),
    deer: [],
    solution: sol(
      [1, 4, "SW"],
      [3, 4, "SE"],
      [4, 5, "SW"],
      [2, 3, "SW"],
      [3, 2, "SE"],
      [4, 3, "SE"],
    ),
  },
  {
    id: 8,
    rows: 6,
    cols: 7,
    drops: 1,
    need: 1,
    source: { r: 0, c: 2, facing: "SE" },
    pond: { r: 4, c: 2 },
    grid: (() => {
      const g = emptyGrid(6, 7);
      put(g, 1, 3, bamboo("SE"));
      put(g, 2, 4, sozu("SW", 1));
      put(g, 3, 3, rock());
      put(g, 3, 5, rock());
      return g;
    })(),
    deer: [],
    solution: sol([1, 3, "SE"], [2, 4, "SW"]),
  },
  {
    id: 9,
    rows: 6,
    cols: 8,
    drops: 1,
    need: 1,
    source: { r: 0, c: 2, facing: "SE" },
    pond: { r: 4, c: 2 },
    grid: (() => {
      const g = emptyGrid(6, 8);
      put(g, 1, 3, bamboo("SE"));
      put(g, 2, 4, sozu("SE", 1));
      put(g, 3, 3, rock());
      put(g, 3, 5, rock());
      put(g, 4, 6, rock());
      return g;
    })(),
    deer: [],
    solution: sol([1, 3, "SE"], [2, 4, "SW"]),
  },
  {
    id: 10,
    rows: 6,
    cols: 8,
    drops: 1,
    need: 1,
    source: { r: 0, c: 2, facing: "SE" },
    pond: { r: 4, c: 2 },
    grid: (() => {
      const g = emptyGrid(6, 8);
      put(g, 1, 3, bamboo("SW"));
      put(g, 2, 2, bamboo("SE"));
      put(g, 2, 4, sozu("SW", 1));
      put(g, 3, 1, rock());
      put(g, 3, 3, rock());
      put(g, 3, 5, rock());
      return g;
    })(),
    deer: [],
    solution: sol([1, 3, "SE"], [2, 2, "SE"], [2, 4, "SW"]),
  },
  {
    id: 11,
    rows: 8,
    cols: 9,
    drops: 1,
    need: 1,
    source: { r: 0, c: 2, facing: "SE" },
    pond: { r: 6, c: 4 },
    grid: (() => {
      const g = emptyGrid(8, 9);
      put(g, 1, 3, bamboo("SE"));
      put(g, 2, 4, sozu("SW", 1));
      put(g, 4, 6, sozu("SE", 1));
      put(g, 3, 5, rock());
      put(g, 5, 5, rock());
      return g;
    })(),
    deer: [],
    solution: sol([1, 3, "SE"], [2, 4, "SE"], [4, 6, "SW"]),
  },
  {
    id: 12,
    rows: 6,
    cols: 7,
    drops: 3,
    need: 1,
    source: { r: 0, c: 2, facing: "SE" },
    pond: { r: 4, c: 2 },
    grid: (() => {
      const g = emptyGrid(6, 7);
      put(g, 1, 3, bamboo("SW", 1));
      put(g, 2, 4, sozu("SW", 2));
      put(g, 3, 3, rock());
      return g;
    })(),
    deer: [],
    solution: sol([1, 3, "SE"], [2, 4, "SW"]),
  },
  {
    id: 13,
    rows: 6,
    cols: 7,
    drops: 1,
    need: 1,
    source: { r: 0, c: 2, facing: "SE" },
    pond: { r: 4, c: 2 },
    grid: (() => {
      const g = emptyGrid(6, 7);
      put(g, 1, 3, bamboo("SE"));
      put(g, 2, 4, sozu("SE", 1));
      put(g, 3, 3, rock());
      put(g, 3, 5, rock());
      return g;
    })(),
    deer: [{ id: "d1", r: 4, c: 2, flee: { r: 4, c: 0 } }],
    solution: sol([1, 3, "SE"], [2, 4, "SW"]),
  },
  {
    id: 14,
    rows: 7,
    cols: 9,
    drops: 2,
    need: 1,
    source: { r: 0, c: 4, facing: "SE" },
    pond: { r: 5, c: 3 },
    grid: (() => {
      const g = emptyGrid(7, 9);
      put(g, 1, 5, split());
      put(g, 2, 6, sozu("SE", 1));
      put(g, 2, 4, bamboo("SW"));
      put(g, 3, 5, bamboo("SE"));
      put(g, 4, 4, bamboo("SW"));
      put(g, 3, 7, rock());
      return g;
    })(),
    deer: [{ id: "d1", r: 4, c: 4, flee: { r: 4, c: 2 } }],
    solution: sol(
      [2, 6, "SW"],
      [2, 4, "SE"],
      [3, 5, "SW"],
      [4, 4, "SW"],
    ),
  },
  {
    id: 15,
    rows: 7,
    cols: 10,
    drops: 4,
    need: 1,
    source: { r: 0, c: 4, facing: "SE" },
    pond: { r: 5, c: 7 },
    grid: (() => {
      const g = emptyGrid(7, 10);
      put(g, 1, 5, split());
      put(g, 2, 6, bamboo("SE"));
      put(g, 3, 7, sozu("SE", 2));
      put(g, 2, 4, bamboo("SW"));
      put(g, 3, 5, bamboo("SE"));
      put(g, 4, 6, bamboo("SE"));
      put(g, 4, 8, rock());
      return g;
    })(),
    deer: [{ id: "d1", r: 4, c: 6, flee: { r: 4, c: 4 } }],
    solution: sol(
      [2, 6, "SE"],
      [3, 7, "SE"],
      [2, 4, "SE"],
      [3, 5, "SE"],
      [4, 6, "SE"],
    ),
  },
  {
    id: 16,
    rows: 6,
    cols: 8,
    drops: 2,
    need: 1,
    source: { r: 0, c: 3, facing: "SE" },
    pond: { r: 4, c: 1 },
    grid: (() => {
      const g = emptyGrid(6, 8);
      put(g, 1, 4, bamboo("SE"));
      put(g, 2, 5, sozu("SW", 2));
      put(g, 2, 3, sozu("SW", 2));
      put(g, 3, 4, rock());
      put(g, 3, 6, rock());
      return g;
    })(),
    deer: [{ id: "d1", r: 4, c: 1, flee: { r: 5, c: 0 } }],
    solution: sol([1, 4, "SW"], [2, 5, "SW"], [2, 3, "SW"]),
  },
];

export function getStage(id: number): Stage {
  const stage = STAGES.find((s) => s.id === id);
  if (!stage) throw new Error(`Unknown stage ${id}`);
  return stage;
}
