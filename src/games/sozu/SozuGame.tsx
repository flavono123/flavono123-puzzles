"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyFacings,
  cloneGrid,
  isRotatable,
  projectPlay,
  rotateAt,
  simulate,
} from "./engine";
import { GardenBoard } from "./GardenBoard";
import { STAGES } from "./stages";
import { TICK_MS, type Cell, type SimEvent } from "./types";

const STORAGE = "sozu-progress";

function loadProgress(): { maxCleared: number; current: number } {
  if (typeof window === "undefined") return { maxCleared: 0, current: 1 };
  try {
    const raw = window.localStorage.getItem(STORAGE);
    if (!raw) return { maxCleared: 0, current: 1 };
    const parsed = JSON.parse(raw) as { maxCleared?: number; current?: number };
    return {
      maxCleared: parsed.maxCleared ?? 0,
      current: Math.min(STAGES.length, Math.max(1, parsed.current ?? 1)),
    };
  } catch {
    return { maxCleared: 0, current: 1 };
  }
}

function playClack() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 140;
    gain.gain.value = 0.07;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    /* ignore */
  }
}

export default function SozuGame() {
  const initial = useMemo(() => loadProgress(), []);
  const [stageId, setStageId] = useState(initial.current);
  const [maxCleared, setMaxCleared] = useState(initial.maxCleared);
  const stage = STAGES[stageId - 1];
  const [grid, setGrid] = useState<Cell[][]>(() => cloneGrid(stage.grid));
  const [undo, setUndo] = useState<Cell[][][]>([]);
  const [phase, setPhase] = useState<"idle" | "flow" | "win" | "lose">("idle");
  const [events, setEvents] = useState<SimEvent[] | null>(null);
  const [tick, setTick] = useState(0);
  const timer = useRef<number | null>(null);

  const resetToStage = useCallback((id: number) => {
    const next = STAGES[id - 1];
    setStageId(id);
    setGrid(cloneGrid(next.grid));
    setUndo([]);
    setPhase("idle");
    setEvents(null);
    setTick(0);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE,
      JSON.stringify({ maxCleared, current: stageId }),
    );
  }, [maxCleared, stageId]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const play = useMemo(() => {
    if (!events) return null;
    return projectPlay(stage, events, tick);
  }, [events, stage, tick]);

  const rotate = (r: number, c: number) => {
    if (phase === "flow" || phase === "win") return;
    const next = rotateAt(grid, r, c);
    if (!next) return;
    setUndo((stack) => [...stack, cloneGrid(grid)]);
    setGrid(next);
    setPhase("idle");
    setEvents(null);
  };

  const startFlow = () => {
    if (phase === "flow" || phase === "win") return;
    const result = simulate(stage, grid);
    setEvents(result.events);
    setTick(0);
    setPhase("flow");
    const maxT = result.events.reduce((m, ev) => Math.max(m, ev.t), 0);
    if (timer.current) window.clearInterval(timer.current);
    let t = 0;
    timer.current = window.setInterval(() => {
      t += 1;
      setTick(t);
      const clacks = result.events.filter((ev) => ev.kind === "clack" && ev.t === t);
      if (clacks.length) playClack();
      if (t >= maxT) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        setPhase(result.win ? "win" : "lose");
        if (result.win) {
          setMaxCleared((m) => Math.max(m, stage.id));
        }
      }
    }, TICK_MS);
  };

  const rake = () => {
    if (timer.current) window.clearInterval(timer.current);
    resetToStage(stageId);
  };

  const undoOnce = () => {
    if (phase === "flow") return;
    setUndo((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setGrid(prev);
      setPhase("idle");
      setEvents(null);
      return stack.slice(0, -1);
    });
  };

  const goNext = () => {
    if (stageId < STAGES.length) resetToStage(stageId + 1);
  };

  const cheatSolve = () => {
    if (process.env.NODE_ENV === "production") return;
    setGrid(applyFacings(stage.grid, stage.solution));
  };

  const rotatableCount = grid.flat().filter(isRotatable).length;

  return (
    <div className="flex min-h-full flex-col bg-[#efe6d2] text-[#3a3530]">
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="rounded-full border border-[#cbbfa4] bg-[#e7dcc3] px-3 py-1 text-sm tracking-wide"
        >
          庭
        </Link>
        <div className="flex min-w-0 items-center justify-center">
          <span className="tabular-nums text-sm text-[#6b6560] sm:hidden">
            {stageId}/{STAGES.length}
          </span>
          <div className="hidden max-w-full flex-wrap items-center justify-center gap-1.5 sm:flex">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-label={`${s.id}`}
                onClick={() => {
                  if (s.id <= maxCleared + 1) resetToStage(s.id);
                }}
                className={`h-2 w-2 shrink-0 rounded-full ${
                  s.id === stageId
                    ? "bg-[#c45c3e]"
                    : s.id <= maxCleared
                      ? "bg-[#6d875c]"
                      : "bg-[#cbbfa4]"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={undoOnce}
            disabled={undo.length === 0 || phase === "flow"}
            className="rounded-full border border-[#cbbfa4] px-3 py-1 text-sm disabled:opacity-40"
            aria-label="undo"
          >
            葉
          </button>
          <button
            type="button"
            onClick={rake}
            className="rounded-full border border-[#cbbfa4] px-3 py-1 text-sm"
            aria-label="reset"
          >
            耙
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 pb-8">
        <GardenBoard
          stage={stage}
          grid={grid}
          play={play}
          phase={phase === "lose" ? "lose" : phase}
          onRotate={rotate}
          onSource={startFlow}
        />
        <div className="mt-3 flex items-center justify-between text-sm text-[#6b6560]">
          <span className="tabular-nums">
            {stage.drops}/{stage.need}
          </span>
          {phase === "win" && stageId < STAGES.length ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-full bg-[#6d875c] px-4 py-1.5 text-[#efe6d2]"
            >
              →
            </button>
          ) : null}
          {phase === "win" && stageId === STAGES.length ? (
            <span className="text-[#c45c3e]">○</span>
          ) : null}
        </div>
        {process.env.NODE_ENV !== "production" ? (
          <button
            type="button"
            onClick={cheatSolve}
            className="mt-2 self-start text-xs text-[#9a938a]"
          >
            solve {rotatableCount}
          </button>
        ) : null}
      </main>
    </div>
  );
}
