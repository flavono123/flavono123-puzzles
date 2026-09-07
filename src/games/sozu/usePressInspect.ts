"use client";

import { useRef, type PointerEvent, type MouseEvent } from "react";

const HOLD_MS = 480;

export function usePressInspect(
  onInspect: () => void,
  onTap?: () => void,
): {
  onPointerDown: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerCancel: () => void;
  onLostPointerCapture: () => void;
  onContextMenu: (e: MouseEvent) => void;
} {
  const timer = useRef(0);
  const held = useRef(false);

  const clear = () => {
    window.clearTimeout(timer.current);
    timer.current = 0;
  };

  return {
    onPointerDown: (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      held.current = false;
      clear();
      timer.current = window.setTimeout(() => {
        held.current = true;
        onInspect();
      }, HOLD_MS);
    },
    onPointerUp: () => {
      const wasHold = held.current;
      clear();
      if (!wasHold) onTap?.();
      held.current = false;
    },
    onPointerCancel: () => {
      clear();
      held.current = false;
    },
    onLostPointerCapture: () => {
      clear();
    },
    onContextMenu: (e) => {
      e.preventDefault();
      clear();
      held.current = true;
      onInspect();
    },
  };
}
