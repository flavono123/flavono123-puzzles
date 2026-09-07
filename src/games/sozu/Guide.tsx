"use client";

import { PIECE_BLURB, PIECE_NAME, TIP, UI, type PieceId, type TipId } from "./copy";

export function InspectCard({
  piece,
  onClose,
}: {
  piece: PieceId;
  onClose: () => void;
}) {
  return (
    <div
      className="sozu-card pointer-events-auto absolute bottom-3 left-3 right-3 z-20 rounded-2xl border border-[#cbbfa4] bg-[#efe6d2]/95 p-3 shadow-md sm:left-auto sm:right-3 sm:w-72"
      role="dialog"
      aria-label={PIECE_NAME[piece]}
    >
      <p className="text-sm font-medium text-[#8a6a2a]">{PIECE_NAME[piece]}</p>
      <p className="mt-1 text-sm leading-relaxed text-[#3a3530]">{PIECE_BLURB[piece]}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-xs text-[#6b6560] underline-offset-2 hover:underline"
      >
        닫기
      </button>
    </div>
  );
}

export function TutorialCard({
  tipId,
  last,
  onNext,
}: {
  tipId: TipId;
  last: boolean;
  onNext: () => void;
}) {
  const tip = TIP[tipId];
  return (
    <div
      className="sozu-card pointer-events-auto absolute bottom-3 left-3 right-3 z-30 rounded-2xl border border-[#8a6a2a] bg-[#efe6d2] p-4 shadow-lg sm:left-6 sm:right-6"
      role="dialog"
      aria-labelledby="sozu-tip-title"
    >
      <p id="sozu-tip-title" className="text-base font-medium text-[#8a6a2a]">
        {tip.title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[#3a3530]">{tip.body}</p>
      <button
        type="button"
        onClick={onNext}
        className="mt-3 min-h-10 rounded-full bg-[#6d875c] px-4 text-sm text-[#efe6d2]"
      >
        {last ? UI.tipOk : UI.tipNext}
      </button>
    </div>
  );
}

export function FailBanner({ onRefill }: { onRefill: () => void }) {
  return (
    <div
      className="sozu-fail-banner pointer-events-auto absolute inset-x-3 top-3 z-20 rounded-2xl border border-[#c45c3e] bg-[#efe6d2]/95 p-4 shadow-md"
      role="alert"
    >
      <p className="text-base font-medium text-[#c45c3e]">{UI.failTitle}</p>
      <p className="mt-1 text-sm leading-relaxed text-[#3a3530]">{UI.failBody}</p>
      <button
        type="button"
        onClick={onRefill}
        className="sozu-restart-pulse mt-3 min-h-11 rounded-full bg-[#c45c3e] px-4 text-sm text-[#efe6d2]"
      >
        {UI.failCta}
      </button>
    </div>
  );
}

export function LockGate({
  want,
  gate,
  onGo,
}: {
  want: number;
  gate: number;
  onGo: () => void;
}) {
  return (
    <div
      className="pointer-events-auto absolute inset-3 z-40 flex items-center justify-center rounded-2xl bg-[#3a3530]/45 p-4"
      role="dialog"
      aria-labelledby="sozu-lock-title"
    >
      <div className="max-w-sm rounded-2xl border border-[#cbbfa4] bg-[#efe6d2] p-5 text-center shadow-lg">
        <p id="sozu-lock-title" className="text-base font-medium text-[#8a6a2a]">
          {UI.lockTitle(want)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#3a3530]">{UI.lockBody(gate)}</p>
        <button
          type="button"
          onClick={onGo}
          className="mt-4 min-h-11 rounded-full bg-[#6d875c] px-4 text-sm text-[#efe6d2]"
        >
          {UI.lockCta(gate)}
        </button>
      </div>
    </div>
  );
}

export function Spotlight({
  box,
}: {
  box: { left: number; top: number; width: number; height: number } | null;
}) {
  if (!box) return null;
  return (
    <div
      className="sozu-spotlight pointer-events-none absolute z-10 rounded-2xl"
      style={{
        left: box.left - 8,
        top: box.top - 8,
        width: box.width + 16,
        height: box.height + 16,
      }}
    />
  );
}
