import { useEffect, useState } from "react";
import { KEYS, factoryReset, summarize, LocalStateSummary } from "../lib/localState";
import "./Settings.css";

export type Theme = "dark" | "obsidian" | "light";
export type Motion = "full" | "still";

interface ThemeOption {
  id: Theme;
  name: string;
  note: string;
  swatch: [string, string, string, string];
}

const THEMES: ThemeOption[] = [
  {
    id: "dark",
    name: "Nocturne",
    note: "Ink-black with a blue undertone. The default room.",
    swatch: ["#090A0F", "#0F1117", "#E8E4D8", "#B084E0"],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    note: "True black. On an OLED panel the ground is simply unlit.",
    swatch: ["#000000", "#08080B", "#E8E4D8", "#B084E0"],
  },
  {
    id: "light",
    name: "Vellum",
    note: "Paper and pigment. The atlas becomes a printed chart.",
    swatch: ["#E9E7DD", "#F1EFE6", "#1A1D22", "#7D51B8"],
  },
];

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
  }
}

export function applyMotion(motion: Motion) {
  document.documentElement.setAttribute("data-motion", motion);
  try {
    localStorage.setItem(KEYS.motion, motion);
  } catch {
  }
}

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEYS.theme);
    if (v === "dark" || v === "obsidian" || v === "light") return v;
  } catch {
  }
  return "dark";
}

export function readMotion(): Motion {
  try {
    return localStorage.getItem(KEYS.motion) === "still" ? "still" : "full";
  } catch {
    return "full";
  }
}

export default function Settings() {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [motion, setMotion] = useState<Motion>(readMotion);
  const [confirming, setConfirming] = useState<LocalStateSummary | null>(null);

  useEffect(() => {
    const onOpen = () => { setLeaving(false); setOpen(true); };
    window.addEventListener("substancia:settings", onOpen);
    return () => window.removeEventListener("substancia:settings", onOpen);
  }, []);

  function close() {
    setLeaving(true);
    window.setTimeout(() => { setOpen(false); setConfirming(null); }, 260);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (confirming) setConfirming(null);
      else close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, confirming]);

  function pickTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  function pickMotion(m: Motion) {
    setMotion(m);
    applyMotion(m);
  }

  if (!open) return null;

  return (
    <div className={`settings-veil${leaving ? " leaving" : ""}`} onClick={close}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <header className="settings-head">
          <div>
            <div className="settings-kicker">settings</div>
            <h2 className="settings-title">The room</h2>
          </div>
          <button className="settings-close" onClick={close} aria-label="Close settings">✕</button>
        </header>

        <section className="settings-block">
          <div className="settings-label">Theme</div>
          <div className="theme-grid">
            {THEMES.map((t, i) => (
              <button
                key={t.id}
                className={`theme-card${theme === t.id ? " on" : ""}`}
                style={{ animationDelay: `${i * 55}ms` }}
                onClick={() => pickTheme(t.id)}
                aria-pressed={theme === t.id}
              >
                <span className="theme-swatch" style={{ background: t.swatch[0] }}>
                  <span className="tsw-raised" style={{ background: t.swatch[1] }} />
                  <span className="tsw-rule" style={{ background: t.swatch[2] }} />
                  <span className="tsw-dot" style={{ background: t.swatch[3] }} />
                </span>
                <span className="theme-meta">
                  <span className="theme-name">{t.name}</span>
                  <span className="theme-note">{t.note}</span>
                </span>
                <span className="theme-tick" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-block">
          <div className="settings-label">Motion</div>
          <div className="seg">
            <button className={`seg-btn${motion === "full" ? " on" : ""}`} onClick={() => pickMotion("full")}>
              unfolding
            </button>
            <button className={`seg-btn${motion === "still" ? " on" : ""}`} onClick={() => pickMotion("still")}>
              still
            </button>
          </div>
          <p className="settings-note">
            Substancia animates to show how things relate — clusters gathering, kin reaching out from
            their anchor. <em>Still</em> holds every one of those at its final state.
          </p>
        </section>

        <section className="settings-block">
          <div className="settings-label">This machine</div>
          <p className="settings-note">
            Everything Substancia remembers — your traversal path, this theme — stays on this
            machine and is never transmitted.
          </p>
          <div className="settings-actions">
            <button className="settings-reset" onClick={() => setConfirming(summarize())}>
              start over
            </button>
            <button className="settings-replay" onClick={() => { close(); setTimeout(() => window.dispatchEvent(new CustomEvent("substancia:threshold")), 300); }}>
              replay the introduction
            </button>
          </div>
        </section>

        {confirming && (
          <div className="reset-inline">
            <div className="reset-inline-title">
              Reset everything to a fresh install?
            </div>
            <ul className="reset-losses">
              <li>
                <span className="reset-n">{confirming.specimens}</span>
                specimens on your path
                <span className="reset-sub">{confirming.visits} visits recorded</span>
              </li>
              <li>
                <span className="reset-n">{confirming.keys}</span>
                stored preferences
                <span className="reset-sub">theme, motion, introduction</span>
              </li>
            </ul>
            <div className="reset-foot">
              <button className="reset-cancel" onClick={() => setConfirming(null)}>cancel</button>
              <button className="reset-go" onClick={factoryReset}>reset everything ▸</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
