import { KEYS } from "./localState";

const KEY = KEYS.traversal;
const MAX_STEPS = 400;

export interface Step {
  name: string;
  at: number;
}

let cache: Step[] | null = null;

function read(): Step[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Step[]) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(steps: Step[]) {
  cache = steps;
  try {
    localStorage.setItem(KEY, JSON.stringify(steps));
  } catch {
  }
  window.dispatchEvent(new CustomEvent("substancia:traversal"));
}

export function recordVisit(name: string) {
  const steps = read();
  const last = steps[steps.length - 1];
  if (last && last.name === name) return;
  write([...steps, { name, at: Date.now() }].slice(-MAX_STEPS));
}

export function getPath(): Step[] {
  return read();
}

export function visitCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of read()) counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
  return counts;
}

export function clearPath() {
  write([]);
}

export function onTraversalChange(fn: () => void): () => void {
  window.addEventListener("substancia:traversal", fn);
  return () => window.removeEventListener("substancia:traversal", fn);
}
