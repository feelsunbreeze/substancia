import { ReactNode, useRef, useState, useCallback } from "react";
import "./Tooltip.css";

/**
 * A custom hover tooltip in the app's own voice — replaces the browser's
 * native title="" bubble. Positions itself above the trigger, follows into
 * view, and fades. Purely presentational (aria handled by the trigger).
 */
export default function Tooltip({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement | null>(null);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  }, []);
  const hide = useCallback(() => setPos(null), []);

  return (
    <span
      ref={ref}
      className="tt-trigger"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
    >
      {children}
      {pos && (
        <span
          className="tt-bubble"
          style={{ left: pos.x, top: pos.y }}
          role="tooltip"
        >
          {label}
        </span>
      )}
    </span>
  );
}
