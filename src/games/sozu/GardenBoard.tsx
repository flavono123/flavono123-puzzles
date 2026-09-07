"use client";

import type { RefObject } from "react";
import { CELL, GAP, PAD, boardSize, cellCenter, cellOrigin } from "./layout";
import {
  type BoardSnap,
  type LiveState,
  CLACK_SNAP,
  POUR_TIME,
  STARTLE_TIME,
} from "./live";
import { type Cell, type Facing, type SozuPhase, type Stage } from "./types";
import { step, isRotatable } from "./engine";
import { WaterCanvas } from "./vfx/WaterCanvas";
import { AtlasSprite } from "./assets/Sprite";
import { PIECE_NAME, type PieceId } from "./copy";
import { usePressInspect } from "./usePressInspect";

const C = {
  paper: "#efe6d2",
  moss: "#6d875c",
  mossDark: "#4f6844",
  sand: "#ddcfb0",
  bamboo: "#c49a45",
  bambooDark: "#8a6a2a",
  water: "#5aa7b8",
  waterDeep: "#3e7a84",
  stone: "#7a736c",
  stoneLight: "#9a938a",
  ink: "#3a3530",
  deer: "#8b5e3c",
  deerEar: "#c4895a",
  tanuki: "#6b4a32",
  vermillion: "#c45c3e",
};

export function GardenBoard({
  stage,
  grid,
  snap,
  liveRef,
  phase,
  refilling,
  onRotate,
  onRestart,
  onInspect,
}: {
  stage: Stage;
  grid: Cell[][];
  snap: BoardSnap;
  liveRef: RefObject<LiveState>;
  phase: "flow" | "win" | "lose";
  refilling?: boolean;
  onRotate: (r: number, c: number) => void;
  onRestart: () => void;
  onInspect: (piece: PieceId) => void;
}) {
  const { w, h } = boardSize(stage);
  const deer = snap.deer;
  const pondHit = snap.pondHit;
  const ratio = snap.reservoirMax > 0 ? snap.reservoir / snap.reservoirMax : 1;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block h-auto w-full max-h-[min(72vh,760px)] select-none"
        role="img"
        aria-label="정원"
      >
        <rect width={w} height={h} fill={C.paper} rx="18" />
        {Array.from({ length: stage.rows }, (_, r) =>
          Array.from({ length: stage.cols }, (_, c) => (
            <GardenCell
              key={`${r}-${c}`}
              r={r}
              c={c}
              cell={grid[r][c]}
              snap={snap}
              phase={phase}
              onRotate={onRotate}
              onInspect={onInspect}
            />
          )),
        )}
        <DumpGhosts grid={grid} />
        <Pond
          stage={stage}
          wet={pondHit}
          won={phase === "win"}
          occupied={deer.some((d) => d.r === stage.pond.r && d.c === stage.pond.c)}
          onInspect={() => onInspect("pond")}
        />
        <Source
          stage={stage}
          fill={Math.max(0, ratio)}
          flowing={phase === "flow"}
          canRestart={phase === "lose"}
          refilling={Boolean(refilling)}
          onRestart={onRestart}
          onInspect={() => onInspect("source")}
        />
        {deer
          .filter((d) => d.visR > -50)
          .map((d) => {
            const hop = d.hop;
            const startling = Boolean(hop && hop.t < STARTLE_TIME);
            const running = Boolean(hop && hop.t >= STARTLE_TIME);
            const flip =
              hop != null ? hop.toC < hop.fromC : d.visC < d.c - 0.01;
            return (
              <DeerSprite
                key={d.id}
                r={d.visR}
                c={d.visC}
                hidden={d.r < 0 && !d.hop}
                drinking={
                  d.r === stage.pond.r && d.c === stage.pond.c && !d.hop
                }
                startling={startling}
                running={running}
                flip={flip}
                onInspect={() => onInspect("deer")}
              />
            );
          })}
        <Tanuki stage={stage} flinch={phase === "flow"} />
      </svg>
      <WaterCanvas
        stage={stage}
        grid={grid}
        liveRef={liveRef}
        sourceFacing={stage.source.facing}
      />
    </div>
  );
}

function GardenCell({
  r,
  c,
  cell,
  snap,
  phase,
  onRotate,
  onInspect,
}: {
  r: number;
  c: number;
  cell: Cell;
  snap: BoardSnap;
  phase: "flow" | "win" | "lose";
  onRotate: (r: number, c: number) => void;
  onInspect: (piece: PieceId) => void;
}) {
  const { x, y } = cellOrigin(r, c);
  const rotatable = phase !== "win" && isRotatable(cell);
  const sozuState = snap.sozu[`${r},${c}`];
  const piece: PieceId | null =
    cell.type === "bamboo" && cell.crack > 0
      ? "crack"
      : cell.type === "bamboo"
        ? "kakehi"
        : cell.type === "split"
          ? "split"
          : cell.type === "sozu"
            ? "sozu"
            : cell.type === "rock"
              ? "rock"
              : null;
  const press = usePressInspect(
    () => {
      if (piece) onInspect(piece);
    },
    rotatable ? () => onRotate(r, c) : undefined,
  );

  return (
    <g
      data-sozu={
        cell.type === "bamboo" && cell.crack > 0
          ? "crack"
          : cell.type === "bamboo"
            ? "bamboo"
            : cell.type === "split"
              ? "split"
              : cell.type === "sozu"
                ? "sozu"
                : cell.type === "rock"
                  ? "rock"
                  : undefined
      }
      data-piece={piece ?? undefined}
      transform={`translate(${x} ${y})`}
      {...press}
      style={{ cursor: rotatable ? "pointer" : piece ? "help" : "default" }}
    >
      <rect
        width={CELL}
        height={CELL}
        rx="14"
        fill={(r + c) % 2 === 0 ? C.sand : "#e7dcc3"}
        stroke={rotatable ? C.bambooDark : "transparent"}
        strokeWidth={rotatable ? 1.2 : 0}
      />
      {cell.type === "rock" ? <Rock /> : null}
      {cell.type === "split" ? <SplitStone /> : null}
      {cell.type === "bamboo" ? (
        <Bamboo facing={cell.facing} crack={cell.crack} />
      ) : null}
      {cell.type === "sozu" ? (
        <Sozu
          dump={cell.dump}
          fill={sozuState?.fill ?? cell.fill}
          threshold={cell.threshold}
          phase={sozuState?.phase ?? "fill"}
          t={sozuState?.t ?? 0}
        />
      ) : null}
    </g>
  );
}

function Bamboo({ facing, crack }: { facing: Facing; crack: number }) {
  const se = facing === "SE";
  const x1 = se ? 10 : CELL - 10;
  const y1 = 10;
  const x2 = se ? CELL - 10 : 10;
  const y2 = CELL - 10;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (crack > 0) {
    return (
      <g>
        <path
          d={`M ${x1} ${y1} L ${mx - dx * 0.12} ${my - dy * 0.12}`}
          stroke={C.bambooDark}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M ${mx + dx * 0.12} ${my + dy * 0.12} L ${x2} ${y2}`}
          stroke={C.bambooDark}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M ${x1} ${y1} L ${mx - dx * 0.12} ${my - dy * 0.12}`}
          stroke={C.bamboo}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M ${mx + dx * 0.12} ${my + dy * 0.12} L ${x2} ${y2}`}
          stroke={C.bamboo}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse
          className="sozu-drip"
          cx={mx}
          cy={my + 8}
          rx="2.4"
          ry="3.6"
          fill={C.water}
        />
        <ellipse
          className="sozu-drip sozu-drip-late"
          cx={mx + 2}
          cy={my + 16}
          rx="1.6"
          ry="2.6"
          fill={C.waterDeep}
        />
        <circle cx={mx - 5} cy={my + 4} r="1.7" fill={C.moss} />
        <circle cx={mx + 5} cy={my + 7} r="1.3" fill={C.mossDark} />
      </g>
    );
  }
  return (
    <g>
      <path
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        stroke={C.bambooDark}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        stroke={C.bamboo}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={CELL / 2} cy={CELL / 2} r="3.2" fill={C.bambooDark} />
    </g>
  );
}

function DumpGhosts({ grid }: { grid: Cell[][] }) {
  const crackMarks: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (cell.type === "bamboo" && cell.crack > 0) crackMarks.push({ r, c });
    }
  }
  return (
    <g style={{ pointerEvents: "none" }}>
      {crackMarks.map((m) => {
        const from = cellCenter(m.r, m.c);
        const to = cellCenter(m.r + 1, m.c);
        return (
          <g key={`${m.r}-${m.c}-crack-dump`} data-sozu="crack-ghost">
            <path
              d={`M ${from.x} ${from.y + 6} Q ${from.x + 8} ${(from.y + to.y) / 2} ${to.x} ${to.y}`}
              fill="none"
              stroke={C.water}
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.5"
            />
            <ellipse
              cx={to.x}
              cy={to.y + 4}
              rx="8"
              ry="5"
              fill="none"
              stroke={C.waterDeep}
              strokeWidth="1.4"
              strokeDasharray="2 3"
              opacity="0.75"
            />
          </g>
        );
      })}
    </g>
  );
}

function Sozu({
  dump,
  fill,
  threshold,
  phase,
  t,
}: {
  dump: Facing;
  fill: number;
  threshold: number;
  phase: SozuPhase;
  t: number;
}) {
  const se = dump === "SE";
  const rest = se ? 38 : -38;
  const poured = rest + 62;
  const hit = rest - 22;
  let angle = rest;
  let ratio = Math.min(1, fill / Math.max(1, threshold));
  if (phase === "pour") {
    const u = Math.min(1, t / POUR_TIME);
    const ease = u * u * (3 - 2 * u);
    angle = rest + ease * (poured - rest);
    ratio = 1 - u;
  } else if (phase === "clack") {
    if (t < CLACK_SNAP) {
      const u = Math.min(1, t / CLACK_SNAP);
      const snap = 1 - (1 - u) * (1 - u);
      angle = poured + snap * (hit - poured);
    } else {
      const u = Math.min(1, (t - CLACK_SNAP) / 0.28);
      angle = hit + u * (rest - 6 - hit);
    }
    ratio = 0;
  } else if (phase === "recover") {
    angle = rest;
    ratio = 0;
  }
  return (
    <g>
      <ellipse cx="29" cy="48" rx="11" ry="5" fill={C.stone} />
      <rect x="16" y="26" width="4" height="22" rx="1" fill={C.stoneLight} />
      <rect x="38" y="26" width="4" height="22" rx="1" fill={C.stoneLight} />
      <line x1="16" y1="30" x2="42" y2="30" stroke={C.stone} strokeWidth="2" />
      {phase === "clack" ? (
        <>
          <circle
            className="sozu-clack-ring"
            cx="29"
            cy="48"
            r="26"
            fill="none"
            stroke={C.ink}
            strokeWidth="2.4"
          />
          {t < 0.55 ? (
            <ellipse
              className="sozu-clack-flash"
              cx={se ? 18 : 40}
              cy="46"
              rx="7"
              ry="5"
              fill={C.paper}
              opacity="0.9"
            />
          ) : null}
        </>
      ) : null}
      <g
        transform={`translate(29 32) rotate(${angle})`}
        style={{
          transition: phase === "fill" ? "transform 280ms ease-out" : "none",
        }}
      >
        <rect
          x="-7"
          y="-24"
          width="14"
          height="40"
          rx="6"
          fill={C.bamboo}
          stroke={C.bambooDark}
          strokeWidth="1.5"
        />
        <rect
          x="-4"
          y={10 - 26 * ratio}
          width="8"
          height={26 * ratio}
          rx="3"
          fill={C.water}
        />
        <path d="M-5 16 L0 22 L5 16" fill={C.bambooDark} />
        {phase === "pour" && ratio > 0.08 ? (
          <ellipse cx="0" cy="26" rx="3.2" ry="5" fill={C.water} opacity="0.9" />
        ) : null}
      </g>
    </g>
  );
}

function SplitStone() {
  return (
    <g>
      <path
        d="M14 18 C12 28 14 40 22 46 L36 46 C44 40 46 28 44 18 C38 12 20 12 14 18 Z"
        fill={C.stone}
      />
      <path
        d="M18 20 C17 28 19 38 24 43 L34 43 C39 38 41 28 40 20 C36 16 22 16 18 20 Z"
        fill={C.stoneLight}
      />
      <path
        d="M29 17 L29 28"
        stroke={C.waterDeep}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M29 28 L42 44"
        stroke={C.water}
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M29 28 L16 44"
        stroke={C.water}
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M38 40 L46 48"
        stroke={C.bamboo}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M20 40 L12 48"
        stroke={C.bamboo}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </g>
  );
}

function Rock() {
  return (
    <ellipse
      cx={CELL / 2}
      cy={CELL / 2 + 4}
      rx="16"
      ry="12"
      fill={C.stone}
      opacity="0.9"
    />
  );
}

function Nameplate({ label }: { label: string }) {
  return (
    <foreignObject x="4" y="-16" width="72" height="20" style={{ pointerEvents: "none" }}>
      <div className="sozu-nameplate">{label}</div>
    </foreignObject>
  );
}

function Source({
  stage,
  fill,
  flowing,
  canRestart,
  refilling,
  onRestart,
  onInspect,
}: {
  stage: Stage;
  fill: number;
  flowing: boolean;
  canRestart: boolean;
  refilling: boolean;
  onRestart: () => void;
  onInspect: () => void;
}) {
  const { x, y } = cellOrigin(stage.source.r, stage.source.c);
  const spout = step(0, 0, stage.source.facing);
  const shown = refilling ? 1 : fill;
  const waterH = 18 * Math.max(0, shown);
  const press = usePressInspect(onInspect, canRestart ? onRestart : undefined);
  return (
    <g
      data-sozu="source"
      data-piece="source"
      transform={`translate(${x} ${y})`}
      {...press}
      style={{ cursor: canRestart ? "pointer" : "help" }}
    >
      <Nameplate label={PIECE_NAME.source} />
      <defs>
        <clipPath id="sozu-bowl">
          <ellipse cx={CELL / 2} cy={CELL / 2 + 5} rx="13" ry="9" />
        </clipPath>
      </defs>
      <ellipse cx={CELL / 2} cy={CELL / 2 + 8} rx="21" ry="15" fill={C.stone} />
      <ellipse cx={CELL / 2} cy={CELL / 2 + 5} rx="13" ry="9" fill="#cbbfa4" />
      <g clipPath="url(#sozu-bowl)">
        <rect
          className={refilling ? "sozu-refill-rise" : undefined}
          x={CELL / 2 - 13}
          y={CELL / 2 + 5 + 9 - waterH}
          width="26"
          height={waterH}
          fill={C.waterDeep}
        />
        {shown > 0.04 ? (
          <ellipse
            className={refilling ? "sozu-refill-sparkle" : undefined}
            cx={CELL / 2}
            cy={CELL / 2 + 5 + 9 - waterH}
            rx="12"
            ry="3.2"
            fill={C.water}
          />
        ) : null}
      </g>
      {refilling ? (
        <text
          x={CELL / 2}
          y={CELL / 2 - 18}
          textAnchor="middle"
          fill={C.waterDeep}
          fontSize="11"
          className="sozu-refill-cheer"
        >
          첨벙
        </text>
      ) : null}
      <line
        x1={CELL / 2}
        y1={CELL / 2 + 5}
        x2={CELL / 2 + spout.c * 18}
        y2={CELL / 2 + 5 + spout.r * 18}
        stroke={C.bambooDark}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1={CELL / 2}
        y1={CELL / 2 + 5}
        x2={CELL / 2 + spout.c * 18}
        y2={CELL / 2 + 5 + spout.r * 18}
        stroke={C.bamboo}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {flowing && fill > 0.04 && !refilling ? (
        <line
          x1={CELL / 2 + spout.c * 8}
          y1={CELL / 2 + 5 + spout.r * 8}
          x2={CELL / 2 + spout.c * 22}
          y2={CELL / 2 + 5 + spout.r * 22}
          stroke={C.water}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />
      ) : null}
      {canRestart ? (
        <circle
          className="sozu-restart-pulse"
          cx={CELL / 2}
          cy={CELL / 2 + 5}
          r="24"
          fill="none"
          stroke={C.vermillion}
          strokeWidth="1.8"
        />
      ) : null}
      <rect width={CELL} height={CELL} fill="transparent" pointerEvents="all" />
    </g>
  );
}

function Pond({
  stage,
  wet,
  won,
  occupied,
  onInspect,
}: {
  stage: Stage;
  wet: boolean;
  won: boolean;
  occupied: boolean;
  onInspect: () => void;
}) {
  const { x, y } = cellOrigin(stage.pond.r, stage.pond.c);
  const press = usePressInspect(onInspect);
  return (
    <g
      transform={`translate(${x} ${y})`}
      data-sozu="pond"
      data-piece="pond"
      {...press}
      style={{ cursor: "help" }}
    >
      <Nameplate label={PIECE_NAME.pond} />
      <ellipse cx={CELL / 2} cy={CELL / 2 + 10} rx="24" ry="11" fill={C.stone} />
      <ellipse cx="12" cy={CELL / 2 + 18} rx="6" ry="4" fill={C.stoneLight} />
      <ellipse cx={CELL - 10} cy={CELL / 2 + 16} rx="5" ry="3.5" fill={C.stone} />
      <ellipse
        cx={CELL / 2}
        cy={CELL / 2 + 4}
        rx="15"
        ry="10"
        fill={occupied ? C.sand : wet ? C.waterDeep : "#cbbfa4"}
        stroke={C.stone}
        strokeWidth="2.4"
      />
      {wet && !occupied ? (
        <ellipse
          cx={CELL / 2}
          cy={CELL / 2 + 5}
          rx="12"
          ry="7"
          fill={C.water}
          opacity="0.9"
        />
      ) : null}
      {won && !occupied ? (
        <g className="sozu-koi">
          <AtlasSprite name="koi" x={CELL / 2 - 16} y={CELL / 2 - 12} width={32} height={32} />
        </g>
      ) : null}
      <rect width={CELL} height={CELL} fill="transparent" pointerEvents="all" />
    </g>
  );
}

function DeerSprite({
  r,
  c,
  hidden,
  drinking,
  startling,
  running,
  flip,
  onInspect,
}: {
  r: number;
  c: number;
  hidden?: boolean;
  drinking?: boolean;
  startling?: boolean;
  running?: boolean;
  flip?: boolean;
  onInspect: () => void;
}) {
  const x = PAD + c * (CELL + GAP);
  const y = PAD + r * (CELL + GAP);
  const pose = running ? "deer-run" : drinking ? "deer-drink" : "deer-stand";
  const scale = running ? 1.22 : startling ? 1.12 : 1;
  const sx = (flip ? -1 : 1) * scale;
  const press = usePressInspect(onInspect);
  return (
    <g
      data-sozu="deer"
      data-piece="deer"
      transform={`translate(${x - 4} ${y + 4})`}
      style={{ opacity: hidden ? 0 : 1, cursor: hidden ? "default" : "help" }}
      {...(hidden ? {} : press)}
    >
      {startling ? (
        <text
          x="26"
          y="-4"
          textAnchor="middle"
          fill={C.ink}
          fontSize="14"
          fontWeight="700"
        >
          !
        </text>
      ) : null}
      <g transform={`translate(26 19) scale(${sx} ${scale}) translate(-26 -19)`}>
        {running ? (
          <g opacity="0.55" stroke={C.ink} strokeLinecap="round" fill="none">
            <path d="M-2 18 L-16 14" strokeWidth="1.6" />
            <path d="M-4 24 L-20 22" strokeWidth="1.3" />
            <path d="M0 28 L-14 32" strokeWidth="1.1" />
          </g>
        ) : null}
        {running || startling ? (
          <ellipse cx="22" cy="34" rx="10" ry="3.2" fill={C.sand} opacity="0.7" />
        ) : null}
        <AtlasSprite name={pose} width={52} height={38} />
      </g>
      <rect width="52" height="38" fill="transparent" pointerEvents={hidden ? "none" : "all"} />
    </g>
  );
}

function Tanuki({ stage, flinch }: { stage: Stage; flinch: boolean }) {
  const { x, y } = cellOrigin(stage.pond.r, stage.pond.c);
  return (
    <g
      transform={`translate(${x + CELL + 6} ${y + 8}) rotate(${flinch ? -12 : 0} 12 18)`}
      style={{ pointerEvents: "none" }}
    >
      <ellipse cx="12" cy="22" rx="11" ry="9" fill={C.tanuki} />
      <circle cx="12" cy="12" r="8" fill={C.tanuki} />
      <ellipse cx="6" cy="8" rx="3.5" ry="4.5" fill={C.ink} />
      <ellipse cx="18" cy="8" rx="3.5" ry="4.5" fill={C.ink} />
      <circle cx="9" cy="12" r="1.1" fill={C.paper} />
      <circle cx="15" cy="12" r="1.1" fill={C.paper} />
      <ellipse cx="12" cy="16" rx="3" ry="2" fill="#2b241f" />
    </g>
  );
}
