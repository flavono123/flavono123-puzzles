export type PieceId =
  | "source"
  | "pond"
  | "kakehi"
  | "crack"
  | "split"
  | "sozu"
  | "deer"
  | "rock";

export type TipId =
  | "source"
  | "kakehi"
  | "pond"
  | "crack"
  | "split"
  | "sozu"
  | "deer"
  | "deer-pond";

export const PIECE_NAME: Record<PieceId, string> = {
  source: "샘",
  pond: "연못",
  kakehi: "가케히",
  crack: "구멍 난 가케히",
  split: "갈림돌",
  sozu: "시시오도시",
  deer: "사슴",
  rock: "돌",
};

export const PIECE_BLURB: Record<PieceId, string> = {
  source: "여기가 샘이에요. 물이 슬슬 줄어드니, 연못에 닿기 전에 길을 맞춰 주세요.",
  pond: "손 씻는 작은 연못이에요. 물이 여기 닿으면 잉어가 폴짝 인사해요.",
  kakehi: "대나무 홈통이에요. 톡 누르면 길이 바뀌고, 물은 언제나 아래쪽으로만 흘러요.",
  crack: "금이 간 가케히예요. 여기서는 물이 옆으로 안 가고, 바로 아래로 똑똑 떨어져요.",
  split: "한 줄기가 두 갈래로 나뉘는 돌이에요. 양쪽 다 적시니, 쓸데없는 길은 막아 주세요.",
  sozu: "물을 받아 기울이고, 탁! 옆 칸으로 물을 넘기진 않아요. 소리는 곁의 사슴을 놀라게 해요.",
  deer: "목마른 사슴이에요. 탁 소리에 깜짝 놀라 달아나니, 연못을 막고 있으면 꼭 쫓아 주세요.",
  rock: "물은 돌 위에서 멈춰 버려요. 건너뛰는 길이 아니에요.",
};

export const TIP: Record<
  TipId,
  { piece: PieceId; title: string; body: string }
> = {
  source: {
    piece: "source",
    title: "샘",
    body: "물이 여기서 출발해요. 샘이 마르기 전에 연못까지 데려가 볼까요?",
  },
  kakehi: {
    piece: "kakehi",
    title: "가케히",
    body: "대나무를 톡 누르면 길이 뒤집혀요. 물은 아래로만 가니까, 홈통을 잘 맞춰 주세요.",
  },
  pond: {
    piece: "pond",
    title: "연못",
    body: "여기가 도착점이에요. 한 방울만 닿아도 잉어가 반겨 준답니다.",
  },
  crack: {
    piece: "crack",
    title: "구멍 난 가케히",
    body: "금이 간 홈통은 물을 옆으로 못 나르고, 바로 아래 칸으로 떨어뜨려요. 구멍도 길이 될 수 있어요.",
  },
  split: {
    piece: "split",
    title: "갈림돌",
    body: "물이 두 갈래로 쪼개져요. 연못으로 가는 길만 남기고, 새는 쪽은 조심하세요.",
  },
  sozu: {
    piece: "sozu",
    title: "시시오도시",
    body: "받아서 쏟고, 탁! 물을 다음 칸으로 잇는 홈통이 아니에요. 소리는 곁의 사슴을 쫓는 데 쓰여요.",
  },
  deer: {
    piece: "deer",
    title: "사슴",
    body: "시시오도시가 탁 하고 닫히면, 옆에 있던 사슴이 놀라 달아나요. 한 번 구경해 보세요.",
  },
  "deer-pond": {
    piece: "deer",
    title: "연못을 막는 사슴",
    body: "사슴이 연못에서 물을 마시고 있어요. 길이 이어져도 먼저 탁 소리로 쫓아야 잉어가 와요.",
  },
};

export const STAGE_TIPS: Record<number, TipId[]> = {
  1: ["source", "kakehi", "pond"],
  5: ["crack"],
  7: ["split"],
  8: ["sozu"],
  13: ["deer"],
  14: ["deer-pond"],
};

export const LEGEND = [
  { name: "샘", line: "위에서 물이 나와요. 마르면 이번 기회는 끝." },
  { name: "가케히", line: "톡 눌러 길을 바꿔요. 물은 아래쪽으로만." },
  { name: "구멍 난 가케히", line: "옆으로 못 가고, 아래로 똑똑." },
  { name: "갈림돌", line: "한 줄기가 두 갈래." },
  { name: "시시오도시", line: "받아 쏟고 탁. 물을 잇지 않아요." },
  { name: "사슴", line: "탁 소리에 달아나요." },
  { name: "연못", line: "물이 닿으면 잉어가 인사해요." },
];

export const UI = {
  home: "처음",
  undo: "무름",
  refill: "다시",
  resetBoard: "처음 판",
  next: "다음 정원",
  allClear: "모든 정원을 깨웠어요",
  share: "공유",
  shared: "주소를 담았어요",
  shareFail: "주소를 복사하지 못했어요",
  inspectHint: "조각을 꾹 누르면 이름이 보여요",
  tipNext: "다음",
  tipOk: "알겠어",
  failTitle: "앗, 샘이 말라 버렸어요",
  failBody: "가케히를 만져 길을 고친 다음, 샘에 물을 다시 담아 주세요.",
  failCta: "샘 채우기",
  lockTitle: (want: number) => `${want}번 정원은 아직 잠겨 있어요`,
  lockBody: (gate: number) =>
    `이 기기에서 앞 정원을 아직 안 깨워서 열 수 없어요. 지금 가장 앞에 남은 ${gate}번부터 깨워 주세요.`,
  lockCta: (gate: number) => `${gate}번 정원으로`,
  refillCheer: "첨벙, 샘이 다시 차올라요",
};

export function stagePath(id: number): string {
  return `/sozu/${id}`;
}

export function parseStageParam(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}
