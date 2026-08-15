import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "../lib/router";
import "./Cartouche.css";

export interface CartoucheRow {
  label: string;
  value: string;
  bar?: number;
  hue?: string;
}

export interface CartoucheContent {
  title: string;
  subtitle?: string;
  accent?: string;
  rows?: CartoucheRow[];
  note?: string;
}

interface Ctx {
  show: (e: { clientX: number; clientY: number }, content: CartoucheContent) => void;
  move: (e: { clientX: number; clientY: number }) => void;
  hide: () => void;
}

const CartoucheCtx = createContext<Ctx | null>(null);

const NOOP: Ctx = { show: () => {}, move: () => {}, hide: () => {} };

export function useCartouche(): Ctx {
  return useContext(CartoucheCtx) ?? NOOP;
}

const GAP = 16;

export function CartoucheProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<CartoucheContent | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [placed, setPlaced] = useState({ x: 0, y: 0, ready: false });
  const boxRef = useRef<HTMLDivElement | null>(null);

  const show = useCallback((e: { clientX: number; clientY: number }, c: CartoucheContent) => {
    setContent(c);
    setCursor({ x: e.clientX, y: e.clientY });
    setPlaced((p) => ({ ...p, ready: false }));
  }, []);

  const move = useCallback((e: { clientX: number; clientY: number }) => {
    setCursor({ x: e.clientX, y: e.clientY });
  }, []);

  const hide = useCallback(() => setContent(null), []);

  const { route } = useRouter();
  useEffect(() => {
    setContent(null);
  }, [route]);

  useEffect(() => {
    const dismiss = () => setContent(null);
    window.addEventListener("scroll", dismiss, { passive: true, capture: true });
    window.addEventListener("blur", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, { capture: true });
      window.removeEventListener("blur", dismiss);
    };
  }, []);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || !content) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const flipX = cursor.x + GAP + width > vw - 8;
    const flipY = cursor.y + GAP + height > vh - 8;
    const x = flipX ? cursor.x - GAP - width : cursor.x + GAP;
    const y = flipY ? cursor.y - GAP - height : cursor.y + GAP;

    const clamp = (v: number, size: number, limit: number) =>
      Math.max(8, Math.min(v, limit - size - 8));

    setPlaced({ x: clamp(x, width, vw), y: clamp(y, height, vh), ready: true });
  }, [content, cursor]);

  return (
    <CartoucheCtx.Provider value={{ show, move, hide }}>
      {children}
      {content && (
        <div
          ref={boxRef}
          className={`cartouche${placed.ready ? " ready" : ""}`}
          style={{
            left: placed.x,
            top: placed.y,
            borderLeftColor: content.accent ?? "var(--hair-strong)",
          }}
          role="tooltip"
        >
          <div className="cart-title">{content.title}</div>
          {content.subtitle && (
            <div className="cart-sub" style={{ color: content.accent ?? "var(--muted)" }}>
              {content.subtitle}
            </div>
          )}

          {content.rows && content.rows.length > 0 && (
            <div className="cart-rows">
              {content.rows.map((r) => (
                <div className="cart-row" key={r.label}>
                  <span className="cart-row-label">{r.label}</span>
                  <span className="cart-row-value">{r.value}</span>
                  {r.bar != null && (
                    <span className="cart-meter">
                      <span
                        className="cart-meter-fill"
                        style={{
                          width: `${Math.max(0, Math.min(1, r.bar)) * 100}%`,
                          background: r.hue ?? content.accent ?? "var(--muted)",
                        }}
                      />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {content.note && <div className="cart-note">{content.note}</div>}
        </div>
      )}
    </CartoucheCtx.Provider>
  );
}
