export const KEYS = {
  traversal: "substancia.traversal.v1",
  threshold: "substancia.threshold.seen.v1",
  theme: "substancia-theme",
  motion: "substancia.motion.v1",
} as const;

export type StateKey = keyof typeof KEYS;

function ownedKeys(): string[] {
  const known = new Set<string>(Object.values(KEYS));
  const found: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (known.has(k) || k.startsWith("substancia.") || k.startsWith("substancia-"))) {
        found.push(k);
      }
    }
  } catch {
    return [...known];
  }
  return found;
}

export interface LocalStateSummary {
  visits: number;
  specimens: number;
  hasSeenIntro: boolean;
  keys: number;
}

export function summarize(): LocalStateSummary {
  let visits = 0;
  let specimens = 0;
  try {
    const raw = localStorage.getItem(KEYS.traversal);
    if (raw) {
      const steps = JSON.parse(raw) as { name: string }[];
      visits = steps.length;
      specimens = new Set(steps.map((s) => s.name)).size;
    }
  } catch {
  }
  return {
    visits,
    specimens,
    hasSeenIntro: (() => {
      try {
        return !!localStorage.getItem(KEYS.threshold);
      } catch {
        return false;
      }
    })(),
    keys: ownedKeys().length,
  };
}

export function factoryReset() {
  try {
    for (const k of ownedKeys()) localStorage.removeItem(k);
    sessionStorage.clear();
  } catch {
  }
  window.location.reload();
}
