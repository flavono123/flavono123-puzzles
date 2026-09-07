import type { Stage } from "./types";

export const CELL = 58;
export const GAP = 8;
export const PAD = 36;

export function cellOrigin(r: number, c: number): { x: number; y: number } {
  return { x: PAD + c * (CELL + GAP), y: PAD + r * (CELL + GAP) };
}

export function cellCenter(r: number, c: number): { x: number; y: number } {
  const o = cellOrigin(r, c);
  return { x: o.x + CELL / 2, y: o.y + CELL / 2 };
}

export function boardSize(stage: Stage): { w: number; h: number } {
  return {
    w: PAD * 2 + stage.cols * CELL + (stage.cols - 1) * GAP,
    h: PAD * 2 + stage.rows * CELL + (stage.rows - 1) * GAP + 24,
  };
}
