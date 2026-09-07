export type Facing = "SE" | "SW";

export type Cell =
  | { type: "empty" }
  | { type: "rock" }
  | { type: "bamboo"; facing: Facing; crack: number }
  | { type: "split" }
  | { type: "sozu"; dump: Facing; threshold: number; fill: number };

export type Deer = {
  id: string;
  r: number;
  c: number;
  flee: { r: number; c: number } | null;
};

export type Stage = {
  id: number;
  rows: number;
  cols: number;
  drops: number;
  need: number;
  source: { r: number; c: number; facing: Facing };
  pond: { r: number; c: number };
  grid: Cell[][];
  deer: Deer[];
  /** Winning bamboo / sozu facings, keyed by "r,c". Used by the solver check only. */
  solution: Record<string, Facing>;
};

export type Packet = {
  t: number;
  r: number;
  c: number;
  amount: number;
};

export type SimEvent =
  | { t: number; kind: "spawn"; amount: number }
  | { t: number; kind: "arrive"; r: number; c: number; amount: number }
  | { t: number; kind: "leak"; r: number; c: number; amount: number }
  | { t: number; kind: "drink"; r: number; c: number; amount: number }
  | { t: number; kind: "pond"; amount: number; total: number }
  | {
      t: number;
      kind: "sozu";
      r: number;
      c: number;
      fill: number;
      threshold: number;
    }
  | { t: number; kind: "clack"; r: number; c: number }
  | {
      t: number;
      kind: "hop";
      from: { r: number; c: number };
      to: { r: number; c: number } | null;
    }
  | { t: number; kind: "end"; win: boolean; pond: number };

export type SimResult = {
  events: SimEvent[];
  win: boolean;
  pond: number;
};

/** Adjacent cells only. The clack is not a wide scare field. */
export const CLACK_RANGE = 1;
export const TICK_MS = 320;

export type SozuPhase = "fill" | "pour" | "clack" | "recover";
