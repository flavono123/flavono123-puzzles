# flavono123-puzzles

Vercel에 올리는 퍼즐 게임 POC 허브.

첫 게임은 **Sozu** (`/sozu`) — 시시오도시(소즈)를 본뜬 대각 대나무 홈통 퍼즐. 물은 위에서 아래로만 흐르고, 규칙은 보드가 보여 준다.

```
pnpm dev
```

로컬에서 스테이지 해가 닫히는지 보려면:

```
pnpm dlx tsx src/games/sozu/check.ts
```
