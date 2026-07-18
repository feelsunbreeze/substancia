import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";

export type Route =
  | { view: "firmament" }
  | { view: "specimen"; name: string }
  | { view: "effect"; name: string }
  | { view: "category"; name: string }
  | { view: "taxonomy" }
  | { view: "diptych"; a?: string; b?: string };

interface HistoryEntry {
  route: Route;
}

interface RouterCtx {
  route: Route;
  navigate: (r: Route) => void;
  back: () => void;
  forward: () => void;
  canBack: boolean;
  canForward: boolean;
  /** views with async content should call this once they're rendered and loaded */
  restoreScroll: () => void;
}

const Ctx = createContext<RouterCtx | null>(null);

function routesEqual(a: Route, b: Route): boolean {
  if (a.view !== b.view) return false;
  switch (a.view) {
    case "specimen":
      return a.name === (b as Extract<Route, { view: "specimen" }>).name;
    case "effect":
      return a.name === (b as Extract<Route, { view: "effect" }>).name;
    case "category":
      return a.name === (b as Extract<Route, { view: "category" }>).name;
    case "diptych":
      return a.a === (b as Extract<Route, { view: "diptych" }>).a && a.b === (b as Extract<Route, { view: "diptych" }>).b;
    default:
      return true;
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([{ route: { view: "firmament" } }]);
  const [index, setIndex] = useState(0);
  const scrollYs = useRef<number[]>([0]);
  const pendingRestore = useRef<number | null>(null);

  const saveCurrentScroll = useCallback(() => {
    scrollYs.current[index] = window.scrollY;
  }, [index]);

  const navigate = useCallback(
    (r: Route) => {
      saveCurrentScroll();
      if (routesEqual(history[index].route, r)) return;
      const nextHistory = history.slice(0, index + 1);
      nextHistory.push({ route: r });
      const nextScrollYs = scrollYs.current.slice(0, index + 1);
      nextScrollYs.push(0);
      setHistory(nextHistory);
      setIndex(nextHistory.length - 1);
      scrollYs.current = nextScrollYs;
      pendingRestore.current = null;
      window.scrollTo(0, 0);
    },
    [history, index, saveCurrentScroll]
  );

  const back = useCallback(() => {
    if (index <= 0) return;
    // scrollY for the current entry is already maintained by the scroll listener
    pendingRestore.current = scrollYs.current[index - 1];
    setIndex(index - 1);
  }, [index]);

  const forward = useCallback(() => {
    if (index >= history.length - 1) return;
    pendingRestore.current = scrollYs.current[index + 1];
    setIndex(index + 1);
  }, [history.length, index]);

  const restoreScroll = useCallback(() => {
    if (pendingRestore.current !== null) {
      window.scrollTo(0, pendingRestore.current);
      pendingRestore.current = null;
    }
  }, []);

  // Alt+Left / Alt+Right walk the history, like a browser
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); forward(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, forward]);

  // keep the scroll position for the current entry up to date
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        scrollYs.current[index] = window.scrollY;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [index]);

  const route = history[index].route;
  return (
    <Ctx.Provider
      value={{
        route,
        navigate,
        back,
        forward,
        canBack: index > 0,
        canForward: index < history.length - 1,
        restoreScroll,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useRouter(): RouterCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRouter outside provider");
  return ctx;
}
