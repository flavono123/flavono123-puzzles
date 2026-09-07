import type { Cell, Deer, Facing, Stage } from "./types";

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function toggleFacing(facing: Facing): Facing {
  return facing === "SE" ? "SW" : "SE";
}

export function step(
  r: number,
  c: number,
  facing: Facing,
  n = 1,
): { r: number; c: number } {
  return facing === "SE"
    ? { r: r + n, c: c + n }
    : { r: r + n, c: c - n };
}

export function inBounds(stage: Stage, r: number, c: number): boolean {
  return r >= 0 && c >= 0 && r < stage.rows && c < stage.cols;
}

export function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function cloneDeer(deer: Deer[]): Deer[] {
  return deer.map((d) => ({
    ...d,
    flee: d.flee ? { ...d.flee } : null,
  }));
}

export function resetSozuFill(grid: Cell[][]): Cell[][] {
  return grid.map((row) =>
    row.map((cell) => (cell.type === "sozu" ? { ...cell, fill: 0 } : cell)),
  );
}

export function rotateAt(
  grid: Cell[][],
  r: number,
  c: number,
): Cell[][] | null {
  const cell = grid[r]?.[c];
  if (!cell) return null;
  if (cell.type === "bamboo" && cell.crack > 0) return null;
  if (cell.type === "bamboo") {
    const next = cloneGrid(grid);
    next[r][c] = { ...cell, facing: toggleFacing(cell.facing) };
    return next;
  }
  return null;
}

export function applyFacings(
  grid: Cell[][],
  facings: Record<string, Facing>,
): Cell[][] {
  const next = cloneGrid(grid);
  for (const [key, facing] of Object.entries(facings)) {
    const [rs, cs] = key.split(",");
    const r = Number(rs);
    const c = Number(cs);
    const cell = next[r]?.[c];
    if (!cell) continue;
    if (cell.type === "bamboo") next[r][c] = { ...cell, facing };
    if (cell.type === "sozu") next[r][c] = { ...cell, dump: facing };
  }
  return next;
}

export function isRotatable(cell: Cell | undefined): boolean {
  if (!cell) return false;
  if (cell.type === "sozu") return false;
  return cell.type === "bamboo" && cell.crack <= 0;
}
