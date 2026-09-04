export type PuzzlePoc = {
  slug: string;
  name: string;
  nameJa: string;
  href: string | null;
  blurb: string;
};

export const PUZZLE_POCS: PuzzlePoc[] = [
  {
    slug: "sozu",
    name: "Sozu",
    nameJa: "鹿威し",
    href: "/sozu",
    blurb: "대각 대나무 홈통으로 샘의 물이 연못에 닿게 한다.",
  },
  {
    slug: "next-2",
    name: "soon",
    nameJa: "—",
    href: null,
    blurb: "다음 퍼즐 POC 자리.",
  },
  {
    slug: "next-3",
    name: "soon",
    nameJa: "—",
    href: null,
    blurb: "다음 퍼즐 POC 자리.",
  },
];
