import { STAGES } from "./stages";

const PROGRESS_KEY = "sozu-progress";
const TIPS_KEY = "sozu-seen-tips";

export type Progress = { maxCleared: number; current: number };

export function lastOpenStage(maxCleared: number): number {
  return Math.min(STAGES.length, Math.max(1, maxCleared + 1));
}

export function isStageOpen(id: number, maxCleared: number): boolean {
  return id >= 1 && id <= lastOpenStage(maxCleared);
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return { maxCleared: 0, current: 1 };
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { maxCleared: 0, current: 1 };
    const parsed = JSON.parse(raw) as { maxCleared?: number; current?: number };
    const maxCleared = Math.max(0, Math.min(STAGES.length, parsed.maxCleared ?? 0));
    const current = Math.min(
      STAGES.length,
      Math.max(1, parsed.current ?? lastOpenStage(maxCleared)),
    );
    return { maxCleared, current };
  } catch {
    return { maxCleared: 0, current: 1 };
  }
}

export function saveProgress(progress: Progress): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function loadSeenTips(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(TIPS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export function saveSeenTips(seen: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TIPS_KEY, JSON.stringify([...seen]));
}
