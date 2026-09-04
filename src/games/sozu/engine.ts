import {
  CLACK_RANGE,
  DUMP_STEPS,
  type Cell,
  type Deer,
  type Facing,
  type Packet,
  type SimEvent,
  type SimResult,
  type Stage,
} from "./types";

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
  if (cell.type === "bamboo") {
    const next = cloneGrid(grid);
    next[r][c] = { ...cell, facing: toggleFacing(cell.facing) };
    return next;
  }
  if (cell.type === "sozu") {
    const next = cloneGrid(grid);
    next[r][c] = { ...cell, dump: toggleFacing(cell.dump) };
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

function chebyshev(
  a: { r: number; c: number },
  b: { r: number; c: number },
): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
}

function deerAt(deer: Deer[], r: number, c: number): Deer | undefined {
  return deer.find((d) => d.r === r && d.c === c);
}

function scareNear(
  deer: Deer[],
  origin: { r: number; c: number },
  t: number,
  events: SimEvent[],
  stage: Stage,
): void {
  for (const d of deer) {
    if (chebyshev(origin, d) > CLACK_RANGE) continue;
    const from = { r: d.r, c: d.c };
    if (d.flee && inBounds(stage, d.flee.r, d.flee.c)) {
      const occupied = deerAt(deer, d.flee.r, d.flee.c);
      if (occupied && occupied.id !== d.id) {
        d.r = -99;
        d.c = -99;
        events.push({ t, kind: "hop", from, to: null });
      } else {
        d.r = d.flee.r;
        d.c = d.flee.c;
        events.push({ t, kind: "hop", from, to: { r: d.r, c: d.c } });
      }
    } else {
      d.r = -99;
      d.c = -99;
      events.push({ t, kind: "hop", from, to: null });
    }
  }
}

function enqueue(
  packets: Packet[],
  t: number,
  r: number,
  c: number,
  amount: number,
  stage: Stage,
  events: SimEvent[],
  leakFrom: { r: number; c: number },
): void {
  if (amount <= 0) return;
  if (!inBounds(stage, r, c)) {
    events.push({ t, kind: "leak", r: leakFrom.r, c: leakFrom.c, amount });
    return;
  }
  packets.push({ t, r, c, amount });
}

export function simulate(stage: Stage, grid = stage.grid): SimResult {
  const cells = resetSozuFill(cloneGrid(grid));
  const deer = cloneDeer(stage.deer);
  const events: SimEvent[] = [];
  const packets: Packet[] = [];

  events.push({ t: 0, kind: "spawn", amount: stage.drops });
  const first = step(stage.source.r, stage.source.c, stage.source.facing);
  enqueue(
    packets,
    1,
    first.r,
    first.c,
    stage.drops,
    stage,
    events,
    stage.source,
  );

  let pond = 0;
  let tCursor = 0;

  while (packets.length > 0) {
    packets.sort((a, b) => a.t - b.t || a.r - b.r || a.c - b.c);
    const t = packets[0].t;
    tCursor = t;
    const grouped = new Map<string, number>();
    while (packets.length > 0 && packets[0].t === t) {
      const p = packets.shift()!;
      const key = cellKey(p.r, p.c);
      grouped.set(key, (grouped.get(key) ?? 0) + p.amount);
    }

    for (const [key, amount] of grouped) {
      const [rs, cs] = key.split(",");
      const r = Number(rs);
      const c = Number(cs);
      routeArrival({
        stage,
        cells,
        deer,
        events,
        packets,
        t,
        r,
        c,
        amount,
        pondRef: {
          get value() {
            return pond;
          },
          set value(v: number) {
            pond = v;
          },
        },
      });
    }
  }

  const win = pond >= stage.need;
  events.push({ t: tCursor + 1, kind: "end", win, pond });
  return { events, win, pond };
}

function routeArrival(args: {
  stage: Stage;
  cells: Cell[][];
  deer: Deer[];
  events: SimEvent[];
  packets: Packet[];
  t: number;
  r: number;
  c: number;
  amount: number;
  pondRef: { value: number };
}): void {
  const { stage, cells, deer, events, packets, t, r, c, amount } = args;
  events.push({ t, kind: "arrive", r, c, amount });

  const drink = deerAt(deer, r, c);
  if (drink) {
    events.push({ t, kind: "drink", r, c, amount });
    return;
  }

  if (r === stage.pond.r && c === stage.pond.c) {
    args.pondRef.value += amount;
    events.push({
      t,
      kind: "pond",
      amount,
      total: args.pondRef.value,
    });
    return;
  }

  const cell = cells[r][c];

  if (cell.type === "empty" || cell.type === "rock") {
    events.push({ t, kind: "leak", r, c, amount });
    return;
  }

  if (cell.type === "bamboo") {
    const remaining = amount - cell.crack;
    if (remaining <= 0) {
      events.push({ t, kind: "leak", r, c, amount });
      return;
    }
    if (cell.crack > 0) {
      events.push({ t, kind: "leak", r, c, amount: cell.crack });
    }
    const dest = step(r, c, cell.facing);
    enqueue(packets, t + 1, dest.r, dest.c, remaining, stage, events, {
      r,
      c,
    });
    return;
  }

  if (cell.type === "split") {
    const se = Math.ceil(amount / 2);
    const sw = Math.floor(amount / 2);
    const destSE = step(r, c, "SE");
    const destSW = step(r, c, "SW");
    enqueue(packets, t + 1, destSE.r, destSE.c, se, stage, events, { r, c });
    enqueue(packets, t + 1, destSW.r, destSW.c, sw, stage, events, { r, c });
    return;
  }

  if (cell.type === "sozu") {
    cell.fill += amount;
    events.push({
      t,
      kind: "sozu",
      r,
      c,
      fill: cell.fill,
      threshold: cell.threshold,
    });
    if (cell.fill >= cell.threshold) {
      events.push({ t, kind: "clack", r, c });
      scareNear(deer, { r, c }, t, events, stage);
      const dumped = cell.fill;
      cell.fill = 0;
      const dest = step(r, c, cell.dump, DUMP_STEPS);
      enqueue(packets, t + 1, dest.r, dest.c, dumped, stage, events, { r, c });
    }
  }
}

export function isRotatable(cell: Cell | undefined): boolean {
  return cell?.type === "bamboo" || cell?.type === "sozu";
}

export type PlayProjection = {
  deer: Deer[];
  sozuFill: Map<string, number>;
  water: Map<string, number>;
  pond: number;
  clacking: Set<string>;
  leaks: Map<string, number>;
};

export function projectPlay(
  stage: Stage,
  events: SimEvent[],
  tick: number,
): PlayProjection {
  const deer = cloneDeer(stage.deer);
  const sozuFill = new Map<string, number>();
  const water = new Map<string, number>();
  const leaks = new Map<string, number>();
  const clacking = new Set<string>();
  let pond = 0;

  for (const ev of events) {
    if (ev.t > tick) break;
    if (ev.kind === "hop") {
      const d = deer.find((x) => x.r === ev.from.r && x.c === ev.from.c);
      if (d) {
        if (ev.to) {
          d.r = ev.to.r;
          d.c = ev.to.c;
        } else {
          d.r = -99;
          d.c = -99;
        }
      }
    }
    if (ev.kind === "sozu") {
      sozuFill.set(cellKey(ev.r, ev.c), ev.fill);
      if (ev.fill >= ev.threshold) sozuFill.set(cellKey(ev.r, ev.c), 0);
    }
    if (ev.kind === "clack" && ev.t === tick) {
      clacking.add(cellKey(ev.r, ev.c));
    }
    if (ev.kind === "arrive" && ev.t === tick) {
      water.set(cellKey(ev.r, ev.c), ev.amount);
    }
    if (ev.kind === "leak" && ev.t === tick) {
      leaks.set(cellKey(ev.r, ev.c), ev.amount);
    }
    if (ev.kind === "pond") pond = ev.total;
  }

  return { deer, sozuFill, water, pond, clacking, leaks };
}
