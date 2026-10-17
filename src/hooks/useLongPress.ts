import {
  MouseEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

const LONG_PRESS_DELAY_MS = 500;
const MOVE_TOLERANCE_PX = 10;

export const useLongPress = (onLongPress: () => void, enabled = true) => {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      firedRef.current = false;
      if (!enabled || event.button !== 0) return;
      startRef.current = { x: event.clientX, y: event.clientY };
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        firedRef.current = true;
        onLongPress();
      }, LONG_PRESS_DELAY_MS);
    },
    [enabled, onLongPress],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const start = startRef.current;
      if (
        start &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) >
          MOVE_TOLERANCE_PX
      ) {
        cancel();
      }
    },
    [cancel],
  );

  const onContextMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    if (timerRef.current !== null || firedRef.current) event.preventDefault();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu,
  };
};
