import atlas from "./garden.json";

export type AtlasFrameName = keyof typeof atlas.frames;

const SHEET = "/sozu/garden.png";

export function AtlasSprite({
  name,
  x = 0,
  y = 0,
  width,
  height,
}: {
  name: AtlasFrameName;
  x?: number;
  y?: number;
  width: number;
  height: number;
}) {
  const f = atlas.frames[name].frame;
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={`0 0 ${f.w} ${f.h}`}
      overflow="hidden"
      style={{ pointerEvents: "none" }}
    >
      <image href={SHEET} x={-f.x} y={-f.y} width={atlas.meta.size.w} height={atlas.meta.size.h} />
    </svg>
  );
}
