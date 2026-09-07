"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyFacings,
  cloneGrid,
  isRotatable,
  rotateAt,
} from "./engine";
import { GardenBoard } from "./GardenBoard";
import {
  FailBanner,
  InspectCard,
  LockGate,
  Spotlight,
  TutorialCard,
} from "./Guide";
import { createLive, stepLive, takeSnap, type LiveState } from "./live";
import { STAGES } from "./stages";
import type { Cell } from "./types";
import {
  LEGEND,
  STAGE_TIPS,
  TIP,
  UI,
  stagePath,
  type PieceId,
  type TipId,
} from "./copy";
import {
  isStageOpen,
  lastOpenStage,
  loadProgress,
  loadSeenTips,
  saveProgress,
  saveSeenTips,
} from "./progress";

let sozuLoopGen = 0;

function bootLive(id: number): LiveState {
  const live = createLive(STAGES[id - 1]);
  live.flowing = false;
  return live;
}

function pendingTipsFor(stageId: number, seen: Set<string>): TipId[] {
  return (STAGE_TIPS[stageId] ?? []).filter((id) => !seen.has(id));
}

export default function SozuGame({
  wantedStage,
}: {
  wantedStage?: number | null;
}) {
  const router = useRouter();
  const [stageId, setStageId] = useState(1);
  const [maxCleared, setMaxCleared] = useState(0);
  const stage = STAGES[stageId - 1] ?? STAGES[0];
  const [grid, setGrid] = useState<Cell[][]>(() => cloneGrid(stage.grid));
  const [undo, setUndo] = useState<Cell[][][]>([]);
  const [phase, setPhase] = useState<"flow" | "win" | "lose">("flow");
  const [snap, setSnap] = useState(() => takeSnap(bootLive(1)));
  const [ready, setReady] = useState(false);
  const [lockWant, setLockWant] = useState<number | null>(null);
  const [tips, setTips] = useState<TipId[]>([]);
  const [tipIndex, setTipIndex] = useState(0);
  const [inspect, setInspect] = useState<PieceId | null>(null);
  const [refilling, setRefilling] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [spotlight, setSpotlight] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const liveRef = useRef<LiveState>(bootLive(1));
  const gridRef = useRef(grid);
  const stageRef = useRef(stage);
  const phaseHold = useRef(phase);
  const pausedRef = useRef(false);
  const seenTips = useRef<Set<string>>(new Set());
  const boardWrap = useRef<HTMLDivElement>(null);
  const refillTimer = useRef(0);

  const paused = lockWant != null || tips.length > 0;
  pausedRef.current = paused;

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    phaseHold.current = phase;
  }, [phase]);

  const beginTips = useCallback((id: number) => {
    const nextTips = pendingTipsFor(id, seenTips.current);
    setTips(nextTips);
    setTipIndex(0);
  }, []);

  const bootStage = useCallback(
    (id: number, keepTips = false) => {
      const next = STAGES[id - 1];
      const pipes = cloneGrid(next.grid);
      stageRef.current = next;
      gridRef.current = pipes;
      setStageId(id);
      setGrid(pipes);
      setUndo([]);
      liveRef.current = createLive(next);
      liveRef.current.flowing = false;
      setSnap(takeSnap(liveRef.current));
      phaseHold.current = "flow";
      setPhase("flow");
      setInspect(null);
      setRefilling(false);
      if (!keepTips) beginTips(id);
    },
    [beginTips],
  );

  const restart = useCallback((withShow = true) => {
    window.clearTimeout(refillTimer.current);
    const live = createLive(stageRef.current);
    live.flowing = false;
    liveRef.current = live;
    setSnap(takeSnap(live));
    phaseHold.current = "flow";
    setPhase("flow");
    setInspect(null);
    if (withShow) {
      setRefilling(true);
      refillTimer.current = window.setTimeout(() => {
        setRefilling(false);
        if (!pausedRef.current && liveRef.current) {
          liveRef.current.flowing = true;
        }
      }, 1100);
    } else if (!pausedRef.current) {
      live.flowing = true;
    }
  }, []);

  useEffect(() => {
    const p = loadProgress();
    seenTips.current = loadSeenTips();
    const requested = wantedStage ?? p.current;
    const clamped = Math.min(STAGES.length, Math.max(1, requested));
    if (!isStageOpen(clamped, p.maxCleared)) {
      const gate = lastOpenStage(p.maxCleared);
      setLockWant(clamped);
      setMaxCleared(p.maxCleared);
      bootStage(gate, true);
      setTips([]);
    } else {
      setLockWant(null);
      setMaxCleared(p.maxCleared);
      bootStage(clamped);
    }
    setReady(true);
  }, [wantedStage, bootStage]);

  useEffect(() => {
    if (!ready) return;
    saveProgress({ maxCleared, current: stageId });
  }, [maxCleared, stageId, ready]);

  useEffect(() => {
    if (!ready || lockWant != null) return;
    const path = stagePath(stageId);
    if (window.location.pathname !== path) {
      router.replace(path);
    }
  }, [ready, stageId, lockWant, router]);

  useEffect(() => {
    return () => window.clearTimeout(refillTimer.current);
  }, []);

  useEffect(() => {
    if (!ready || paused || phase !== "flow" || refilling) {
      liveRef.current.flowing = false;
      return;
    }
    liveRef.current.flowing = true;
  }, [ready, paused, phase, refilling]);

  const currentTip = tips[tipIndex] ?? null;

  useEffect(() => {
    if (!currentTip || !boardWrap.current) {
      setSpotlight(null);
      return;
    }
    const piece = TIP[currentTip].piece;
    const node = boardWrap.current.querySelector(`[data-piece="${piece}"]`);
    const wrap = boardWrap.current.getBoundingClientRect();
    if (!(node instanceof Element)) {
      setSpotlight(null);
      return;
    }
    const box = node.getBoundingClientRect();
    setSpotlight({
      left: box.left - wrap.left,
      top: box.top - wrap.top,
      width: box.width,
      height: box.height,
    });
  }, [currentTip, stageId, snap.deer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (lockWant != null) return;
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        restart();
        return;
      }
      if (e.key === "r" && e.shiftKey) {
        e.preventDefault();
        bootStage(stageRef.current.id);
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart, bootStage, lockWant]);

  useEffect(() => {
    if (!ready) return;
    const gen = ++sozuLoopGen;
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    const loop = (now: number) => {
      if (gen !== sozuLoopGen) return;
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      const live = liveRef.current;
      if (!pausedRef.current) {
        stepLive(live, dt, gridRef.current, stageRef.current, {
          onClack: playClack,
        });
        if (live.won && phaseHold.current !== "win") {
          phaseHold.current = "win";
          setPhase("win");
          setMaxCleared((m) => Math.max(m, stageRef.current.id));
        } else if (live.lost && phaseHold.current === "flow") {
          live.flowing = false;
          phaseHold.current = "lose";
          setPhase("lose");
        }
      }
      acc += dt;
      if (acc > 0.05) {
        acc = 0;
        setSnap(takeSnap(live));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      sozuLoopGen += 1;
      cancelAnimationFrame(raf);
    };
  }, [ready]);

  const goStage = useCallback(
    (id: number) => {
      if (!isStageOpen(id, maxCleared)) {
        setLockWant(id);
        return;
      }
      setLockWant(null);
      if (id === stageId) {
        bootStage(id);
        return;
      }
      router.push(stagePath(id));
    },
    [bootStage, maxCleared, router, stageId],
  );

  const rotate = (r: number, c: number) => {
    if (phase === "win" || paused) return;
    const next = rotateAt(grid, r, c);
    if (!next) return;
    gridRef.current = next;
    setUndo((stack) => [...stack, cloneGrid(grid)]);
    setGrid(next);
  };

  const undoOnce = () => {
    if (phase === "win" || paused) return;
    setUndo((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      gridRef.current = prev;
      setGrid(prev);
      return stack.slice(0, -1);
    });
  };

  const goNext = () => {
    if (stageId < STAGES.length) goStage(stageId + 1);
  };

  const advanceTip = () => {
    const current = tips[tipIndex];
    if (current) {
      seenTips.current.add(current);
      saveSeenTips(seenTips.current);
    }
    if (tipIndex + 1 >= tips.length) {
      setTips([]);
      setTipIndex(0);
      restart(true);
      return;
    }
    setTipIndex((i) => i + 1);
  };

  const shareStage = async () => {
    const url = `${window.location.origin}${stagePath(stageId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareNote(UI.shared);
    } catch {
      setShareNote(url);
    }
    window.setTimeout(() => setShareNote(null), 2200);
  };

  const cheatSolve = () => {
    if (process.env.NODE_ENV !== "development") return;
    const current = stageRef.current;
    const next = applyFacings(current.grid, current.solution);
    gridRef.current = next;
    setGrid(next);
  };

  const rotatableCount = grid.flat().filter(isRotatable).length;
  const btn =
    "min-h-10 min-w-10 rounded-full border border-[#cbbfa4] bg-[#e7dcc3] px-3 text-base leading-none disabled:opacity-40";
  const gate = lastOpenStage(maxCleared);

  if (!ready) {
    return <div className="min-h-full bg-[#efe6d2]" />;
  }

  return (
    <div
      className="flex min-h-full flex-col bg-[#efe6d2] text-[#3a3530]"
      data-sozu-phase={phase}
      data-reservoir={snap.reservoir.toFixed(2)}
      data-reservoir-max={snap.reservoirMax.toFixed(2)}
    >
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="rounded-full border border-[#cbbfa4] bg-[#e7dcc3] px-3 py-1 text-sm"
        >
          {UI.home}
        </Link>
        <div className="flex min-w-0 items-center justify-center">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
            {STAGES.map((s) => {
              const open = isStageOpen(s.id, maxCleared);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`${s.id}번 정원${open ? "" : ", 잠김"}`}
                  onClick={() => goStage(s.id)}
                  className={`min-w-7 rounded-md px-1.5 py-1 text-sm tabular-nums ${
                    s.id === stageId
                      ? "bg-[#c45c3e] text-[#efe6d2]"
                      : s.id <= maxCleared
                        ? "bg-[#6d875c] text-[#efe6d2]"
                        : "bg-[#cbbfa4] text-[#6b6560]"
                  } ${open ? "cursor-pointer" : "cursor-pointer opacity-50"}`}
                >
                  {s.id}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={shareStage}
            className={btn}
            aria-label={UI.share}
          >
            공유
          </button>
          <button
            type="button"
            onClick={undoOnce}
            disabled={undo.length === 0 || phase === "win" || paused}
            className={btn}
            aria-label={UI.undo}
          >
            {UI.undo}
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 pb-8">
        <div ref={boardWrap} className="relative w-full">
          <GardenBoard
            stage={stage}
            grid={grid}
            snap={snap}
            liveRef={liveRef}
            phase={phase}
            refilling={refilling}
            onRotate={rotate}
            onRestart={() => restart(true)}
            onInspect={(piece) => {
              if (paused) return;
              setInspect(piece);
            }}
          />
          {currentTip ? <Spotlight box={spotlight} /> : null}
          {lockWant != null ? (
            <LockGate
              want={lockWant}
              gate={gate}
              onGo={() => {
                setLockWant(null);
                goStage(gate);
              }}
            />
          ) : null}
          {currentTip ? (
            <TutorialCard
              tipId={currentTip}
              last={tipIndex === tips.length - 1}
              onNext={advanceTip}
            />
          ) : null}
          {phase === "lose" && !paused ? (
            <FailBanner onRefill={() => restart(true)} />
          ) : null}
          {inspect && !currentTip && lockWant == null ? (
            <InspectCard piece={inspect} onClose={() => setInspect(null)} />
          ) : null}
          {refilling && phase === "flow" ? (
            <p className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-[#efe6d2]/90 px-3 py-1 text-sm text-[#3e7a84]">
              {UI.refillCheer}
            </p>
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#6b6560]">
          <div className="flex min-w-0 flex-col gap-1">
            <svg viewBox="0 0 168 18" className="h-4 w-44" aria-hidden>
              <path
                d="M6 9 H162"
                stroke="#8a6a2a"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M6 9 H162"
                stroke="#c49a45"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d={`M10 9 H${10 + Math.max(0, snap.reservoirMax > 0 ? (snap.reservoir / snap.reservoirMax) * 148 : 0)}`}
                stroke="#5aa7b8"
                strokeWidth="3.4"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[11px]">샘물</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => restart(true)}
              className={`flex min-h-12 min-w-12 flex-col items-center justify-center rounded-full border px-4 text-sm leading-tight ${
                phase === "lose"
                  ? "sozu-restart-pulse border-[#c45c3e] bg-[#c45c3e] text-[#efe6d2]"
                  : "border-[#cbbfa4] bg-[#e7dcc3]"
              }`}
              aria-label={UI.refill}
            >
              {UI.refill}
            </button>
            <button
              type="button"
              onClick={() => bootStage(stageId)}
              className="min-h-12 rounded-full border border-[#cbbfa4] bg-[#e7dcc3] px-4 text-sm"
              aria-label={UI.resetBoard}
            >
              {UI.resetBoard}
            </button>
            {phase === "win" && stageId < STAGES.length ? (
              <button
                type="button"
                onClick={goNext}
                className="min-h-10 rounded-full bg-[#6d875c] px-4 text-sm text-[#efe6d2]"
              >
                {UI.next}
              </button>
            ) : null}
            {phase === "win" && stageId === STAGES.length ? (
              <span className="text-sm text-[#c45c3e]">{UI.allClear}</span>
            ) : null}
          </div>
        </div>
        {shareNote ? (
          <p className="mt-2 text-xs text-[#6d875c]">{shareNote}</p>
        ) : null}
        <div className="mt-3 grid gap-1 text-[11px] leading-relaxed text-[#6b6560] sm:grid-cols-2">
          {LEGEND.map((row) => (
            <p key={row.name}>
              <span className="font-medium text-[#8a6a2a]">{row.name}</span>
              {" · "}
              {row.line}
            </p>
          ))}
          <p className="sm:col-span-2 text-[#9a938a]">{UI.inspectHint}</p>
        </div>
        {process.env.NODE_ENV === "development" ? (
          <button
            type="button"
            onClick={cheatSolve}
            className="mt-2 self-start text-xs text-[#9a938a]"
          >
            풀기 {rotatableCount}
          </button>
        ) : null}
      </main>
    </div>
  );
}

function playClack() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = "triangle";
    thud.frequency.setValueAtTime(72, now);
    thud.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    thudGain.gain.setValueAtTime(0.16, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.55);

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "square";
    click.frequency.setValueAtTime(420, now);
    click.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    clickGain.gain.setValueAtTime(0.07, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.12);
  } catch {
    /* ignore */
  }
}
