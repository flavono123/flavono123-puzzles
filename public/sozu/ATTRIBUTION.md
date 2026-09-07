# Sozu sprites

Texture atlas packed by `scripts/pack-sozu-atlas.py` into TexturePacker hash JSON
(`src/games/sozu/assets/garden.json` + `public/sozu/garden.png`).

## Pipeline (typical 2D puzzle stack)

1. **Frames** — Aseprite / Kenney / OpenGameArt sources in `assets/sozu/raw/`.
2. **Atlas** — TexturePacker, Free Texture Packer, or this script. Runtime
   samples named frames (`AtlasSprite`).
3. **Levels** — LDtk or Tiled is the usual next step; this game still authors
   stages in TypeScript so the sim can stay the source of truth.

## Frames

| Name | Source | License |
| --- | --- | --- |
| `koi` | Kenney Fish Pack 2.0 (`fish_orange.png`) | CC0, [kenney.nl/assets/fish-pack](https://kenney.nl/assets/fish-pack) |
| `deer-stand`, `deer-drink` | ScratchIO `Deer_Idle.png` frames 0 and 5 | CC0, [OpenGameArt: Animated Wild Animals](https://opengameart.org/content/animated-wild-animals) (`Deer_0` / deer-sprites zip, not the 3D Blender `Deer.zip`) |
| `deer-run` | ScratchIO `Deer_Run.png` frame 0 | CC0, same |

Sozu (鹿威し / ししおどし) has no matching public pack that still shows fill,
mouth-pour, and the strike stone in one tile. The pivoting tube is drawn
in-board so those three beats stay readable. Rebuild the atlas with:

```
python3 scripts/pack-sozu-atlas.py
```
