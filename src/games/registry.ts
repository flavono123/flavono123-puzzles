export type PuzzlePoc = {
  slug: string;
  name: string;
  nameKo: string;
  href: string | null;
  blurb: string;
};

export const PUZZLE_POCS: PuzzlePoc[] = [
  {
    slug: "sozu",
    name: "시시오도시",
    nameKo: "샘물을 연못까지",
    href: "/sozu",
    blurb: "가케히를 돌려 물을 나르고, 시시오도시는 탁 소리로 사슴을 쫓아요.",
  },
  {
    slug: "next-2",
    name: "곧 만나요",
    nameKo: "",
    href: null,
    blurb: "다음 퍼즐이 들어올 자리예요.",
  },
  {
    slug: "next-3",
    name: "곧 만나요",
    nameKo: "",
    href: null,
    blurb: "다음 퍼즐이 들어올 자리예요.",
  },
];
