export type AtlasFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Packed like a Spine/texture atlas: one sheet, named frames. */
export const WATER_FRAMES = {
  drop: { x: 0, y: 0, w: 64, h: 64 },
  streak: { x: 64, y: 0, w: 64, h: 64 },
  spark: { x: 128, y: 0, w: 64, h: 64 },
  foam: { x: 192, y: 0, w: 64, h: 64 },
  splash0: { x: 0, y: 64, w: 64, h: 64 },
  splash1: { x: 64, y: 64, w: 64, h: 64 },
  splash2: { x: 128, y: 64, w: 64, h: 64 },
  mist: { x: 192, y: 64, w: 64, h: 64 },
  ring: { x: 0, y: 128, w: 64, h: 64 },
  sheet: { x: 64, y: 128, w: 64, h: 64 },
} as const;

export type WaterFrame = keyof typeof WATER_FRAMES;

let atlas: HTMLCanvasElement | null = null;

function disc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  inner: string,
  outer: string,
) {
  const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, inner);
  g.addColorStop(0.55, outer);
  g.addColorStop(1, "rgba(62, 122, 132, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function getWaterAtlas(): HTMLCanvasElement {
  if (atlas) return atlas;
  const sheet = document.createElement("canvas");
  sheet.width = 256;
  sheet.height = 192;
  const ctx = sheet.getContext("2d")!;

  disc(ctx, 32, 32, 22, "rgba(210, 245, 255, 0.95)", "rgba(90, 167, 184, 0.85)");
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(24, 22, 6, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();

  const streak = ctx.createLinearGradient(96, 8, 96, 56);
  streak.addColorStop(0, "rgba(210, 245, 255, 0)");
  streak.addColorStop(0.3, "rgba(150, 220, 230, 0.9)");
  streak.addColorStop(0.7, "rgba(90, 167, 184, 0.75)");
  streak.addColorStop(1, "rgba(62, 122, 132, 0)");
  ctx.fillStyle = streak;
  ctx.beginPath();
  ctx.ellipse(96, 32, 10, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  disc(ctx, 160, 32, 10, "rgba(255,255,255,0.95)", "rgba(170, 230, 240, 0.2)");

  disc(ctx, 224, 40, 16, "rgba(200, 240, 245, 0.55)", "rgba(90, 167, 184, 0.15)");
  disc(ctx, 214, 24, 9, "rgba(255,255,255,0.5)", "rgba(90, 167, 184, 0)");

  drawSplash(ctx, 32, 96, 0.35);
  drawSplash(ctx, 96, 96, 0.65);
  drawSplash(ctx, 160, 96, 1);
  disc(ctx, 224, 96, 24, "rgba(170, 220, 230, 0.25)", "rgba(90, 167, 184, 0)");

  ctx.strokeStyle = "rgba(180, 230, 240, 0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(32, 160, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90, 167, 184, 0.35)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(32, 160, 22, 0, Math.PI * 2);
  ctx.stroke();

  const sheetGrad = ctx.createLinearGradient(96, 140, 96, 180);
  sheetGrad.addColorStop(0, "rgba(180, 230, 240, 0.8)");
  sheetGrad.addColorStop(1, "rgba(62, 122, 132, 0.1)");
  ctx.fillStyle = sheetGrad;
  ctx.beginPath();
  ctx.ellipse(96, 160, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  atlas = sheet;
  return sheet;
}

function drawSplash(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
) {
  const rays = 7;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + 0.2;
    const len = 8 + t * 18;
    ctx.strokeStyle = `rgba(170, 230, 240, ${0.85 - t * 0.4})`;
    ctx.lineWidth = 3 - t * 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }
  disc(ctx, cx, cy, 6 + t * 6, "rgba(230, 250, 255, 0.8)", "rgba(90, 167, 184, 0)");
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  frame: AtlasFrame,
  x: number,
  y: number,
  opts: { scale?: number; rot?: number; alpha?: number } = {},
) {
  const scale = opts.scale ?? 1;
  const rot = opts.rot ?? 0;
  const alpha = opts.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  const dw = frame.w * scale;
  const dh = frame.h * scale;
  ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}
