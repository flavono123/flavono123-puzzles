import Link from "next/link";
import { PUZZLE_POCS } from "@/games/registry";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-[#efe6d2] text-[#3a3530]">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-6 py-16">
        <header className="space-y-2">
          <p className="text-sm tracking-[0.2em] text-[#8a6a2a]">flavono123</p>
          <h1 className="font-[family-name:var(--font-mincho)] text-4xl">
            puzzles
          </h1>
          <p className="max-w-sm text-[#6b6560]">
            Vercel에 올리는 작은 퍼즐 POC들. 규칙은 보드가 설명한다.
          </p>
        </header>
        <ul className="flex flex-col gap-3">
          {PUZZLE_POCS.map((game) => {
            const inner = (
              <div
                className={`rounded-2xl border border-[#cbbfa4] bg-[#e7dcc3] px-5 py-4 ${
                  game.href ? "hover:border-[#8a6a2a]" : "opacity-55"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-lg">{game.name}</span>
                  <span className="text-sm text-[#8a6a2a]">{game.nameJa}</span>
                </div>
                <p className="mt-1 text-sm text-[#6b6560]">{game.blurb}</p>
              </div>
            );
            return (
              <li key={game.slug}>
                {game.href ? <Link href={game.href}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
