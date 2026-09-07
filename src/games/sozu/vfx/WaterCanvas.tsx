"use client";

import { useEffect, useRef, type RefObject } from "react";
import { cellCenter } from "../layout";
import { boardSize } from "../layout";
import { dropletPos, facingAngle, sozuPourPos, type LiveState } from "../live";
import type { Cell, Facing, Stage } from "../types";
import {
  WATER_FRAMES,
  drawFrame,
  getWaterAtlas,
  type WaterFrame,
} from "./atlas";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  frame: WaterFrame;
  scale: number;
  rot: number;
  spin: number;
  alpha: number;
  gravity: number;
};

export function WaterCanvas({
  stage,
  grid,
  liveRef,
  sourceFacing,
}: {
  stage: Stage;
  grid: Cell[][];
  liveRef: RefObject<LiveState | null>;
  sourceFacing: Facing;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const parts = useRef<Particle[]>([]);
  const last = useRef(0);
  const seenBurst = useRef(new Set<number>());
  const dripAcc = useRef(0);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  useEffect(() => {
    seenBurst.current.clear();
    parts.current = [];
    dripAcc.current = 0;
  }, [stage.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const sheet = getWaterAtlas();
    const { w: vw, h: vh } = boardSize(stage);
    let raf = 0;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const spawn = (p: Omit<Particle, "max" | "gravity"> & { max?: number; gravity?: number }) => {
      if (parts.current.length > 160) return;
      parts.current.push({
        ...p,
        max: p.max ?? p.life,
        gravity: p.gravity ?? 0,
      });
    };

    const tick = (now: number) => {
      if (last.current === 0) last.current = now;
      const dt = Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      const live = liveRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || !live) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const sx = canvas.width / vw;
      const sy = canvas.height / vh;
      const ang = facingAngle(sourceFacing);
      const src = cellCenter(stage.source.r, stage.source.c);

      dripAcc.current += dt;

      if (dripAcc.current > 0.28) {
        dripAcc.current = 0;
        for (let r = 0; r < stage.rows; r++) {
          for (let c = 0; c < stage.cols; c++) {
            const cell = gridRef.current?.[r]?.[c];
            if (cell?.type !== "bamboo" || cell.crack <= 0) continue;
            const p = cellCenter(r, c);
            spawn({
              x: p.x + (Math.random() - 0.5) * 4,
              y: p.y + 6,
              vx: (Math.random() - 0.5) * 8,
              vy: 28 + Math.random() * 18,
              life: 0.55,
              frame: "drop",
              scale: 0.18,
              rot: Math.PI / 2,
              spin: 0,
              alpha: live.flowing ? 0.85 : 0.45,
              gravity: 140,
            });
          }
        }
      }

      if (live.flowing) {
        const ratio = live.reservoirMax > 0 ? live.reservoir / live.reservoirMax : 0;
        if (ratio > 0.02) {
          spawn({
            x: src.x + Math.cos(ang) * 8,
            y: src.y + Math.sin(ang) * 6,
            vx: Math.cos(ang) * 22,
            vy: Math.sin(ang) * 26,
            life: 0.22,
            frame: "streak",
            scale: 0.42 + ratio * 0.12,
            rot: ang,
            spin: 0,
            alpha: 0.7,
            gravity: 20,
          });
        }

        for (const d of live.droplets) {
          const p = dropletPos(d);
          const head = dropletPos(d, Math.min(1, d.progress));
          const behind = dropletPos(d, Math.max(0, d.progress - 0.08));
          const rot = Math.atan2(head.y - behind.y, head.x - behind.x);
          spawn({
            x: p.x,
            y: p.y,
            vx: 0,
            vy: 0,
            life: 0.1,
            frame: d.dump ? "spark" : "drop",
            scale: d.dump ? 0.4 : 0.3,
            rot,
            spin: 0,
            alpha: 0.9,
            gravity: 0,
          });

          const here = gridRef.current?.[d.r]?.[d.c];
          if (here?.type === "bamboo" && here.crack > 0 && Math.random() < 0.45) {
            const leak = cellCenter(d.r, d.c);
            spawn({
              x: leak.x,
              y: leak.y + 4,
              vx: (Math.random() - 0.5) * 12,
              vy: 40 + Math.random() * 30,
              life: 0.45,
              frame: "drop",
              scale: 0.2,
              rot: Math.PI / 2,
              spin: 0,
              alpha: 0.8,
              gravity: 160,
            });
          }
        }
      }

      for (const [key, s] of live.sozu) {
        if (s.phase !== "pour") continue;
        const [rs, cs] = key.split(",");
        const r = Number(rs);
        const c = Number(cs);
        const cell = gridRef.current?.[r]?.[c];
        if (!cell || cell.type !== "sozu") continue;
        const mouth = sozuPourPos(r, c, cell.dump);
        spawn({
          x: mouth.x + (Math.random() - 0.5) * 3,
          y: mouth.y,
          vx: (Math.random() - 0.5) * 4,
          vy: 14 + Math.random() * 8,
          life: 0.18,
          frame: "drop",
          scale: 0.18,
          rot: Math.PI / 2,
          spin: 0,
          alpha: 0.9,
          gravity: 70,
        });
      }

      for (const b of live.bursts) {
        if (seenBurst.current.has(b.id)) continue;
        seenBurst.current.add(b.id);
        if (b.kind === "drip") {
          for (let i = 0; i < 8; i++) {
            const a = Math.PI / 2 + (Math.random() - 0.5) * 0.7;
            spawn({
              x: b.x,
              y: b.y,
              vx: Math.cos(a) * (18 + Math.random() * 22),
              vy: Math.sin(a) * (40 + Math.random() * 40),
              life: 0.4 + Math.random() * 0.2,
              frame: i % 2 ? "drop" : "mist",
              scale: 0.18 + Math.random() * 0.12,
              rot: a,
              spin: 0,
              alpha: 0.85,
              gravity: 160,
            });
          }
        } else if (b.kind === "fork") {
          for (const dir of [Math.PI / 4, (Math.PI * 3) / 4]) {
            for (let i = 0; i < 5; i++) {
              spawn({
                x: b.x,
                y: b.y,
                vx: Math.cos(dir) * (24 + i * 6),
                vy: Math.sin(dir) * (24 + i * 6),
                life: 0.28,
                frame: "streak",
                scale: 0.34,
                rot: dir,
                spin: 0,
                alpha: 0.8,
                gravity: 10,
              });
            }
          }
        } else if (b.kind === "pour") {
          for (let i = 0; i < 6; i++) {
            spawn({
              x: b.x + (Math.random() - 0.5) * 6,
              y: b.y,
              vx: (Math.random() - 0.5) * 8,
              vy: 12 + Math.random() * 10,
              life: 0.22 + Math.random() * 0.08,
              frame: i % 2 ? "drop" : "mist",
              scale: 0.16 + Math.random() * 0.08,
              rot: Math.PI / 2,
              spin: 0,
              alpha: 0.8,
              gravity: 80,
            });
          }
        } else if (b.kind === "dust") {
          for (let i = 0; i < 6; i++) {
            spawn({
              x: b.x + (Math.random() - 0.5) * 12,
              y: b.y,
              vx: (Math.random() - 0.5) * 28,
              vy: -8 - Math.random() * 18,
              life: 0.35 + Math.random() * 0.2,
              frame: "mist",
              scale: 0.2 + Math.random() * 0.1,
              rot: 0,
              spin: 0,
              alpha: 0.55,
              gravity: 40,
            });
          }
        } else {
          const n = b.kind === "pond" ? 16 : 10;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const spd = 28 + Math.random() * 50;
            spawn({
              x: b.x,
              y: b.y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd * 0.7 - 12,
              life: 0.35 + Math.random() * 0.25,
              frame: b.kind === "pond" ? "foam" : b.kind === "clack" ? "spark" : "drop",
              scale: 0.2 + Math.random() * 0.18,
              rot: a,
              spin: (Math.random() - 0.5) * 4,
              alpha: 0.9,
              gravity: 80,
            });
          }
          spawn({
            x: b.x,
            y: b.y,
            vx: 0,
            vy: 0,
            life: b.kind === "pond" ? 0.75 : 0.38,
            frame: b.kind === "pond" ? "ring" : "splash1",
            scale: 0.75,
            rot: 0,
            spin: 0,
            alpha: 0.85,
            gravity: 0,
          });
        }
      }

      const next: Particle[] = [];
      for (const p of parts.current) {
        p.life -= dt;
        if (p.life <= 0) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.rot += p.spin * dt;
        p.alpha = Math.max(0, p.life / p.max);
        next.push(p);
      }
      parts.current = next;

      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      ctx.imageSmoothingEnabled = true;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const d of live.droplets) {
        drawRibbon(ctx, d);
        const head = dropletPos(d);
        drawFrame(ctx, sheet, WATER_FRAMES.drop, head.x, head.y, {
          scale: d.dump ? 0.38 : 0.28,
          rot: 0,
          alpha: 0.95,
        });
      }

      ctx.globalCompositeOperation = "lighter";
      for (const p of parts.current) {
        if (p.frame === "splash0" || p.frame === "splash1" || p.frame === "ring") {
          continue;
        }
        drawFrame(ctx, sheet, WATER_FRAMES[p.frame], p.x, p.y, {
          scale: p.scale,
          rot: p.rot,
          alpha: p.alpha,
        });
      }
      ctx.globalCompositeOperation = "source-over";
      for (const p of parts.current) {
        if (
          !(
            p.frame === "splash0" ||
            p.frame === "splash1" ||
            p.frame === "ring" ||
            p.frame === "foam"
          )
        ) {
          continue;
        }
        drawFrame(ctx, sheet, WATER_FRAMES[p.frame], p.x, p.y, {
          scale: p.scale * (p.frame === "ring" ? 1 + (1 - p.alpha) : 1),
          rot: p.rot,
          alpha: p.alpha * 0.85,
        });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [liveRef, sourceFacing, stage]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  d: { r: number; c: number; nr: number; nc: number; progress: number; dump: boolean },
) {
  const steps = d.dump ? 10 : 6;
  const t = Math.min(1, Math.max(0, d.progress));
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * t;
    const p = dropletPos(d, u);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = "rgba(62, 122, 132, 0.55)";
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * t;
    const p = dropletPos(d, u);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = "rgba(140, 214, 224, 0.95)";
  ctx.lineWidth = 5;
  ctx.stroke();
}
