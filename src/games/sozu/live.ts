import { cellCenter } from "./layout";
import {
  CLACK_RANGE,
  type Cell,
  type Deer,
  type Facing,
  type SimResult,
  type SozuPhase,
  type Stage,
} from "./types";
import { cellKey, cloneDeer, cloneGrid, inBounds, resetSozuFill, step } from "./engine";

export const CELL_TRAVEL = 0.4;
export const DUMP_TRAVEL = 0.58;
export const EMIT_EVERY = 0.12;
/** Slow tip so the empty-and-pour is readable, not a blink. */
export const POUR_TIME = 2.7;
/** Hold the struck pose; the snap itself is CLACK_SNAP. */
export const CLACK_TIME = 1.4;
export const CLACK_SNAP = 0.32;
export const RECOVER_TIME = 1.15;
export const STARTLE_TIME = 0.38;
export const RUN_TIME = 1.75;
export const HOP_TIME = STARTLE_TIME + RUN_TIME;

export function streamSeconds(drops: number): number {
  return 14 + drops * 1.4;
}

export type VfxBurst = {
  id: number;
  x: number;
  y: number;
  kind: "splash" | "drip" | "fork" | "clack" | "pond" | "pour" | "dust";
  age: number;
  life: number;
};

export type Droplet = {
  id: number;
  r: number;
  c: number;
  nr: number;
  nc: number;
  progress: number;
  dump: boolean;
};

export type LiveDeer = Deer & {
  visR: number;
  visC: number;
  hop: {
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
    t: number;
  } | null;
};

export type SozuLive = {
  fill: number;
  phase: SozuPhase;
  t: number;
};

export type LiveState = {
  flowing: boolean;
  reservoir: number;
  reservoirMax: number;
  emitAcc: number;
  droplets: Droplet[];
  bursts: VfxBurst[];
  sozu: Map<string, SozuLive>;
  deer: LiveDeer[];
  pondHit: boolean;
  won: boolean;
  lost: boolean;
  nextId: number;
};

export type LiveHooks = {
  onClack?: () => void;
  onPond?: () => void;
};

function chebyshev(
  a: { r: number; c: number },
  b: { r: number; c: number },
): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
}

export function createLive(stage: Stage): LiveState {
  const reservoirMax = streamSeconds(stage.drops);
  return {
    flowing: true,
    reservoir: reservoirMax,
    reservoirMax,
    emitAcc: 0,
    droplets: [],
    bursts: [],
    sozu: new Map(),
    deer: cloneDeer(stage.deer).map((d) => ({
      ...d,
      visR: d.r,
      visC: d.c,
      hop: null,
    })),
    pondHit: false,
    won: false,
    lost: false,
    nextId: 1,
  };
}

/** Pour stays inside the sozu tile. Water never hops to a neighbor. */
export function sozuPourPos(
  r: number,
  c: number,
  dump: Facing,
): { x: number; y: number } {
  const p = cellCenter(r, c);
  const s = dump === "SE" ? 1 : -1;
  return { x: p.x + s * 6, y: p.y + 8 };
}

export function dropletPos(
  d: Pick<Droplet, "r" | "c" | "nr" | "nc" | "progress" | "dump">,
  t = d.progress,
): { x: number; y: number } {
  const a = cellCenter(d.r, d.c);
  const b = cellCenter(d.nr, d.nc);
  const u = Math.min(1, Math.max(0, t));
  if (d.dump) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - 36;
    const s = 1 - u;
    return {
      x: s * s * a.x + 2 * s * u * mx + u * u * b.x,
      y: s * s * a.y + 2 * s * u * my + u * u * b.y,
    };
  }
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

function burst(
  live: LiveState,
  x: number,
  y: number,
  kind: VfxBurst["kind"],
  life = 0.45,
) {
  live.bursts.push({ id: live.nextId++, x, y, kind, age: 0, life });
}

function spawnTransit(
  live: LiveState,
  r: number,
  c: number,
  nr: number,
  nc: number,
  dump = false,
) {
  live.droplets.push({
    id: live.nextId++,
    r,
    c,
    nr,
    nc,
    progress: 0,
    dump,
  });
}

function kill(live: LiveState, id: number) {
  live.droplets = live.droplets.filter((d) => d.id !== id);
}

function deerAt(live: LiveState, r: number, c: number): LiveDeer | undefined {
  return live.deer.find((d) => d.r === r && d.c === c && d.r >= 0);
}

function scare(live: LiveState, origin: { r: number; c: number }, stage: Stage) {
  for (const d of live.deer) {
    if (d.r < 0) continue;
    if (chebyshev(origin, d) > CLACK_RANGE) continue;
    const dest = d.flee;
    const fromR = d.r;
    const fromC = d.c;
    if (dest && inBounds(stage, dest.r, dest.c)) {
      const blocked = live.deer.some(
        (o) => o.id !== d.id && o.r === dest.r && o.c === dest.c,
      );
      if (!blocked) {
        d.r = dest.r;
        d.c = dest.c;
        d.hop = { fromR, fromC, toR: dest.r, toC: dest.c, t: 0 };
        const dust = cellCenter(fromR, fromC);
        burst(live, dust.x, dust.y + 8, "clack", 1.1);
        continue;
      }
    }
    d.r = -99;
    d.c = -99;
    d.hop = { fromR, fromC, toR: fromR, toC: fromC - 2, t: 0 };
  }
}

function arrive(
  live: LiveState,
  d: Droplet,
  grid: Cell[][],
  stage: Stage,
  hooks: LiveHooks,
) {
  d.r = d.nr;
  d.c = d.nc;
  const pos = cellCenter(d.r, d.c);

  if (!inBounds(stage, d.r, d.c)) {
    burst(live, pos.x, pos.y, "splash");
    kill(live, d.id);
    return;
  }

  const sipping = deerAt(live, d.r, d.c);
  if (sipping) {
    burst(live, pos.x, pos.y, "splash", 0.55);
    kill(live, d.id);
    return;
  }

  if (d.r === stage.pond.r && d.c === stage.pond.c) {
    live.pondHit = true;
    live.won = true;
    burst(live, pos.x, pos.y, "pond", 0.9);
    hooks.onPond?.();
    kill(live, d.id);
    return;
  }

  const cell = grid[d.r][d.c];

  if (cell.type === "empty" || cell.type === "rock") {
    burst(live, pos.x, pos.y, "splash");
    kill(live, d.id);
    return;
  }

  if (cell.type === "bamboo") {
    if (cell.crack > 0) {
      burst(live, pos.x, pos.y + 6, "drip", 0.55);
      const below = { r: d.r + 1, c: d.c };
      if (!inBounds(stage, below.r, below.c)) {
        burst(live, pos.x, pos.y + 18, "splash");
        kill(live, d.id);
        return;
      }
      d.nr = below.r;
      d.nc = below.c;
      d.progress = 0;
      d.dump = true;
      return;
    }
    const dest = step(d.r, d.c, cell.facing);
    if (!inBounds(stage, dest.r, dest.c)) {
      burst(live, pos.x, pos.y, "splash");
      kill(live, d.id);
      return;
    }
    d.nr = dest.r;
    d.nc = dest.c;
    d.progress = 0;
    d.dump = false;
    return;
  }

  if (cell.type === "split") {
    const se = step(d.r, d.c, "SE");
    const sw = step(d.r, d.c, "SW");
    burst(live, pos.x, pos.y, "fork", 0.4);
    const seOk = inBounds(stage, se.r, se.c);
    const swOk = inBounds(stage, sw.r, sw.c);
    if (seOk && swOk) {
      d.nr = se.r;
      d.nc = se.c;
      d.progress = 0;
      d.dump = false;
      spawnTransit(live, d.r, d.c, sw.r, sw.c);
      return;
    }
    if (seOk) {
      d.nr = se.r;
      d.nc = se.c;
      d.progress = 0;
      return;
    }
    if (swOk) {
      d.nr = sw.r;
      d.nc = sw.c;
      d.progress = 0;
      return;
    }
    burst(live, pos.x, pos.y, "splash");
    kill(live, d.id);
    return;
  }

  if (cell.type === "sozu") {
    const key = cellKey(d.r, d.c);
    const cur = live.sozu.get(key) ?? {
      fill: 0,
      phase: "fill" as const,
      t: 0,
    };
    if (cur.phase !== "fill") {
      burst(live, pos.x, pos.y, "splash", 0.35);
      kill(live, d.id);
      return;
    }
    cur.fill += 1;
    live.sozu.set(key, cur);
    kill(live, d.id);
    if (cur.fill >= cell.threshold) {
      cur.phase = "pour";
      cur.t = 0;
      live.sozu.set(key, cur);
      const splash = sozuPourPos(d.r, d.c, cell.dump);
      burst(live, splash.x, splash.y, "pour", 0.7);
    }
  }
}

export function stepLive(
  live: LiveState,
  dt: number,
  grid: Cell[][],
  stage: Stage,
  hooks: LiveHooks = {},
): void {
  const clamped = Math.min(dt, 0.05);
  live.bursts = live.bursts.filter((b) => {
    b.age += clamped;
    return b.age < b.life;
  });

  for (const d of live.deer) {
    if (!d.hop) continue;
    d.hop.t += clamped;
    const { fromR, fromC, toR, toC } = d.hop;
    if (d.hop.t < STARTLE_TIME) {
      d.visR = fromR;
      d.visC = fromC + Math.sin(d.hop.t * 58) * 0.14;
      continue;
    }
    const u = Math.min(1, (d.hop.t - STARTLE_TIME) / RUN_TIME);
    const ease = u * u * (3 - 2 * u);
    const gallop = Math.abs(Math.sin(u * Math.PI * 3.4)) * 0.2;
    d.visR = fromR + (toR - fromR) * ease - gallop;
    d.visC = fromC + (toC - fromC) * ease;
    if (
      Math.floor(d.hop.t * 9) !== Math.floor((d.hop.t - clamped) * 9)
    ) {
      const p = cellCenter(d.visR, d.visC);
      burst(live, p.x, p.y + 14, "dust", 0.45);
    }
    if (d.hop.t >= HOP_TIME) {
      d.visR = d.r < 0 ? toR : d.r;
      d.visC = d.r < 0 ? toC : d.c;
      d.hop = null;
    }
  }

  for (const [key, s] of live.sozu) {
    if (s.phase === "fill") continue;
    s.t += clamped;
    const [rs, cs] = key.split(",");
    const r = Number(rs);
    const c = Number(cs);
    const cell = grid[r]?.[c];
    if (!cell || cell.type !== "sozu") continue;
    const splash = sozuPourPos(r, c, cell.dump);
    const origin = cellCenter(r, c);

    if (s.phase === "pour") {
      if (Math.floor(s.t * 7) !== Math.floor((s.t - clamped) * 7)) {
        burst(live, splash.x, splash.y + 2, "pour", 0.5);
      }
      if (s.t < POUR_TIME) continue;
      s.phase = "clack";
      s.t = 0;
      s.fill = 0;
      burst(live, origin.x, origin.y + 12, "clack", 1.2);
      scare(live, { r, c }, stage);
      hooks.onClack?.();
      continue;
    }

    if (s.phase === "clack") {
      if (s.t < CLACK_TIME) continue;
      s.phase = "recover";
      s.t = 0;
      continue;
    }

    if (s.phase === "recover") {
      if (s.t < RECOVER_TIME) continue;
      s.phase = "fill";
      s.t = 0;
      s.fill = 0;
    }
  }

  if (live.flowing) {
    live.reservoir = Math.max(0, live.reservoir - clamped);
    live.emitAcc += clamped;
    while (live.emitAcc >= EMIT_EVERY && live.reservoir > 0) {
      live.emitAcc -= EMIT_EVERY;
      const dest = step(stage.source.r, stage.source.c, stage.source.facing);
      spawnTransit(live, stage.source.r, stage.source.c, dest.r, dest.c);
    }

    const moving = [...live.droplets];
    for (const d of moving) {
      if (!live.droplets.some((x) => x.id === d.id)) continue;
      d.progress += clamped / (d.dump ? DUMP_TRAVEL : CELL_TRAVEL);
      if (d.progress < 1) continue;
      arrive(live, d, grid, stage, hooks);
    }
  }

  const sozuBusy = [...live.sozu.values()].some((s) => s.phase !== "fill");
  const deerBusy = live.deer.some((d) => d.hop);
  if (
    live.flowing &&
    live.reservoir <= 0 &&
    live.droplets.length === 0 &&
    !sozuBusy &&
    !deerBusy &&
    !live.pondHit
  ) {
    live.lost = true;
    live.flowing = false;
  }
}

export function simulate(stage: Stage, grid = stage.grid): SimResult {
  const live = createLive(stage);
  const cells = resetSozuFill(cloneGrid(grid));
  const dt = 1 / 30;
  for (let i = 0; i < 8000; i++) {
    stepLive(live, dt, cells, stage);
    if (live.won || live.lost) break;
  }
  return {
    events: [],
    win: live.won,
    pond: live.pondHit ? 1 : 0,
  };
}

export type BoardSnap = {
  reservoir: number;
  reservoirMax: number;
  pondHit: boolean;
  deer: LiveDeer[];
  sozu: Record<string, SozuLive>;
};

export function takeSnap(live: LiveState): BoardSnap {
  const sozu: BoardSnap["sozu"] = {};
  for (const [k, v] of live.sozu) sozu[k] = { ...v };
  return {
    reservoir: live.reservoir,
    reservoirMax: live.reservoirMax,
    pondHit: live.pondHit,
    deer: live.deer.map((d) => ({ ...d, hop: d.hop ? { ...d.hop } : null })),
    sozu,
  };
}

export function facingAngle(facing: Facing): number {
  return facing === "SE" ? Math.PI / 4 : (Math.PI * 3) / 4;
}
