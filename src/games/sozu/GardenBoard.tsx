"use client";

import { step, type PlayProjection } from "./engine";
import { DUMP_STEPS, type Cell, type Facing, type Stage } from "./types";

const CELL = 58;
const GAP = 8;
const PAD = 36;

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
  crack: "#5c6e48",
};

function cellPos(r: number, c: number) {
  return { x: PAD + c * (CELL + GAP), y: PAD + r * (CELL + GAP) };
}

function boardSize(stage: Stage) {
  return {
    w: PAD * 2 + stage.cols * CELL + (stage.cols - 1) * GAP,
    h: PAD * 2 + stage.rows * CELL + (stage.rows - 1) * GAP + 24,
  };
}

export function GardenBoard({
  stage,
  grid,
  play,
  phase,
  onRotate,
  onSource,
}: {
  stage: Stage;
  grid: Cell[][];
  play: PlayProjection | null;
  phase: "idle" | "flow" | "win" | "lose";
  onRotate: (r: number, c: number) => void;
  onSource: () => void;
}) {
  const { w, h } = boardSize(stage);
  const deer = play?.deer ?? stage.deer;
  const pondFill = play?.pond ?? 0;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full max-h-[min(72vh,760px)] select-none"
      role="img"
      aria-label="garden"
    >
      <rect width={w} height={h} fill={C.paper} rx="18" />
      {Array.from({ length: stage.rows }, (_, r) =>
        Array.from({ length: stage.cols }, (_, c) => (
          <GardenCell
            key={`${r}-${c}`}
            r={r}
            c={c}
            cell={grid[r][c]}
            stage={stage}
            play={play}
            phase={phase}
            onRotate={onRotate}
            onSource={onSource}
          />
        )),
      )}
      <Pond
        stage={stage}
        fill={pondFill}
        won={phase === "win"}
        occupied={deer.some((d) => d.r === stage.pond.r && d.c === stage.pond.c)}
      />
      <Source
        stage={stage}
        drops={stage.drops}
        active={phase === "idle"}
        onSource={onSource}
      />
      {deer
        .filter((d) => d.r >= 0)
        .map((d) => (
          <DeerSprite key={d.id} r={d.r} c={d.c} />
        ))}
      <Tanuki stage={stage} flinch={phase === "flow"} />
    </svg>
  );
}

function GardenCell({
  r,
  c,
  cell,
  stage,
  play,
  phase,
  onRotate,
  onSource,
}: {
  r: number;
  c: number;
  cell: Cell;
  stage: Stage;
  play: PlayProjection | null;
  phase: "idle" | "flow" | "win" | "lose";
  onRotate: (r: number, c: number) => void;
  onSource: () => void;
}) {
  const { x, y } = cellPos(r, c);
  const isSource = r === stage.source.r && c === stage.source.c;
  const isPond = r === stage.pond.r && c === stage.pond.c;
  const key = `${r},${c}`;
  const water = play?.water.get(key) ?? 0;
  const leak = play?.leaks.get(key) ?? 0;
  const clack = play?.clacking.has(key) ?? false;
  const fill = play?.sozuFill.get(key);
  const rotatable =
    phase === "idle" && (cell.type === "bamboo" || cell.type === "sozu");

  return (
    <g
      transform={`translate(${x} ${y}) ${clack ? "rotate(-6 29 29)" : ""}`}
      onClick={() => {
        if (isSource && phase !== "flow") onSource();
        else if (rotatable) onRotate(r, c);
      }}
      style={{ cursor: rotatable || isSource ? "pointer" : "default" }}
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
          fill={fill ?? cell.fill}
          threshold={cell.threshold}
          clack={clack}
        />
      ) : null}
      {water > 0 && !isPond ? <WaterBeads n={water} /> : null}
      {leak > 0 ? <MossDrip /> : null}
      {isSource || isPond ? null : null}
    </g>
  );
}

function Bamboo({ facing, crack }: { facing: Facing; crack: number }) {
  const d =
    facing === "SE"
      ? `M 10 10 L ${CELL - 10} ${CELL - 10}`
      : `M ${CELL - 10} 10 L 10 ${CELL - 10}`;
  return (
    <g>
      <path
        d={d}
        stroke={C.bambooDark}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={d}
        stroke={C.bamboo}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={CELL / 2} cy={CELL / 2} r="3.2" fill={C.bambooDark} />
      {crack > 0 ? (
        <circle
          cx={CELL / 2 + (facing === "SE" ? 8 : -8)}
          cy={CELL / 2 + 10}
          r="3"
          fill={C.crack}
          opacity="0.85"
        />
      ) : null}
    </g>
  );
}

function Sozu({
  dump,
  fill,
  threshold,
  clack,
}: {
  dump: Facing;
  fill: number;
  threshold: number;
  clack: boolean;
}) {
  const dest = step(0, 0, dump, DUMP_STEPS);
  const angle = dump === "SE" ? 38 : -38;
  const ratio = Math.min(1, fill / Math.max(1, threshold));
  return (
    <g transform={`translate(29 29) rotate(${clack ? angle + 50 : angle})`}>
      <rect
        x="-7"
        y="-22"
        width="14"
        height="44"
        rx="6"
        fill={C.bamboo}
        stroke={C.bambooDark}
        strokeWidth="1.5"
      />
      <rect
        x="-4"
        y={14 - 28 * ratio}
        width="8"
        height={28 * ratio}
        rx="3"
        fill={C.water}
      />
      <line
        x1="0"
        y1="22"
        x2={dest.c * 6}
        y2="28"
        stroke={C.stone}
        strokeWidth="1"
        opacity="0.0"
      />
    </g>
  );
}

function SplitStone() {
  return (
    <g>
      <rect
        x="12"
        y="14"
        width="34"
        height="30"
        rx="6"
        fill={C.stoneLight}
        stroke={C.stone}
        strokeWidth="1.5"
      />
      <path
        d="M29 18 L40 40"
        stroke={C.waterDeep}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M29 18 L18 40"
        stroke={C.waterDeep}
        strokeWidth="2"
        fill="none"
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

function WaterBeads({ n }: { n: number }) {
  const count = Math.min(4, n);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={CELL / 2 + (i - (count - 1) / 2) * 9}
          cy={CELL / 2}
          r="5"
          fill={C.water}
          stroke={C.waterDeep}
          strokeWidth="1"
        />
      ))}
    </g>
  );
}

function MossDrip() {
  return (
    <g>
      <circle cx={CELL / 2} cy={CELL - 8} r="4" fill={C.moss} />
      <circle cx={CELL / 2 + 6} cy={CELL - 6} r="2.5" fill={C.mossDark} />
    </g>
  );
}

function Source({
  stage,
  drops,
  active,
  onSource,
}: {
  stage: Stage;
  drops: number;
  active: boolean;
  onSource: () => void;
}) {
  const { x, y } = cellPos(stage.source.r, stage.source.c);
  const spout = step(0, 0, stage.source.facing);
  return (
    <g
      transform={`translate(${x} ${y})`}
      onClick={onSource}
      style={{ cursor: active ? "pointer" : "default" }}
    >
      <ellipse
        cx={CELL / 2}
        cy={CELL / 2 + 6}
        rx="18"
        ry="13"
        fill={C.stone}
      />
      <ellipse
        cx={CELL / 2}
        cy={CELL / 2 + 4}
        rx="12"
        ry="8"
        fill={C.waterDeep}
      />
      {Array.from({ length: drops }, (_, i) => (
        <circle
          key={i}
          cx={CELL / 2 - 10 + i * 7}
          cy={12}
          r="3.4"
          fill={C.water}
          stroke={C.waterDeep}
          strokeWidth="0.8"
        />
      ))}
      <line
        x1={CELL / 2}
        y1={CELL / 2 + 4}
        x2={CELL / 2 + spout.c * 16}
        y2={CELL / 2 + 4 + spout.r * 16}
        stroke={C.bamboo}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {active ? (
        <circle
          cx={CELL / 2}
          cy={CELL / 2 + 4}
          r="22"
          fill="none"
          stroke={C.vermillion}
          strokeWidth="1.2"
          opacity="0.55"
        />
      ) : null}
    </g>
  );
}

function Pond({
  stage,
  fill,
  won,
  occupied,
}: {
  stage: Stage;
  fill: number;
  won: boolean;
  occupied: boolean;
}) {
  const { x, y } = cellPos(stage.pond.r, stage.pond.c);
  const ratio = Math.min(1, fill / Math.max(1, stage.need));
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: "none" }}>
      <ellipse
        cx={CELL / 2}
        cy={CELL / 2 + 6}
        rx="22"
        ry="16"
        fill={C.stone}
      />
      <ellipse
        cx={CELL / 2}
        cy={CELL / 2 + 6}
        rx="16"
        ry="11"
        fill={occupied ? C.sand : ratio > 0 ? C.waterDeep : "#cbbfa4"}
      />
      {ratio > 0 && !occupied ? (
        <ellipse
          cx={CELL / 2}
          cy={CELL / 2 + 7}
          rx={12 * ratio + 4}
          ry={7 * ratio + 3}
          fill={C.water}
          opacity="0.9"
        />
      ) : null}
      {won ? (
        <g transform={`translate(${CELL / 2 - 8} ${CELL / 2})`}>
          <ellipse cx="8" cy="8" rx="7" ry="4" fill={C.vermillion} />
          <circle cx="13" cy="8" r="1.2" fill={C.ink} />
        </g>
      ) : null}
    </g>
  );
}

function DeerSprite({ r, c }: { r: number; c: number }) {
  const { x, y } = cellPos(r, c);
  return (
    <g transform={`translate(${x + 8} ${y + 10})`} style={{ pointerEvents: "none" }}>
      <ellipse cx="22" cy="28" rx="16" ry="10" fill={C.deer} />
      <circle cx="34" cy="20" r="7" fill={C.deer} />
      <polygon points="30,14 29,4 33,12" fill={C.deerEar} />
      <polygon points="38,14 40,5 42,13" fill={C.deerEar} />
      <circle cx="36" cy="19" r="1.1" fill={C.ink} />
    </g>
  );
}

function Tanuki({ stage, flinch }: { stage: Stage; flinch: boolean }) {
  const { x, y } = cellPos(stage.pond.r, stage.pond.c);
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
