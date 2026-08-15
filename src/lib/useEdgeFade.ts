import { useCallback, useEffect, useState } from "react";

export function useEdgeFade<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [edges, setEdges] = useState({ up: false, down: false });

  const ref = useCallback((el: T | null) => setNode(el), []);

  useEffect(() => {
    if (!node) return;

    const measure = () => {
      const overflow = node.scrollHeight - node.clientHeight;
      if (overflow <= 1) {
        setEdges((prev) => (prev.up || prev.down ? { up: false, down: false } : prev));
        return;
      }
      const up = node.scrollTop > 2;
      const down = node.scrollTop < overflow - 2;
      setEdges((prev) => (prev.up === up && prev.down === down ? prev : { up, down }));
    };

    measure();
    node.addEventListener("scroll", measure, { passive: true });

    const ro = new ResizeObserver(measure);
    ro.observe(node);
    for (const child of Array.from(node.children)) ro.observe(child);

    const mo = new MutationObserver(() => {
      for (const child of Array.from(node.children)) ro.observe(child);
      measure();
    });
    mo.observe(node, { childList: true, subtree: true });

    window.addEventListener("resize", measure);
    return () => {
      node.removeEventListener("scroll", measure);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [node]);

  const className = `edge-fade${edges.up ? " fade-up" : ""}${edges.down ? " fade-down" : ""}`;
  return { ref, className, edges };
}
