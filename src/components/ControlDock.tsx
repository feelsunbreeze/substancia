import { useEffect } from "react";
import { useRouter } from "../lib/router";
import { IconSky, IconTaxonomy } from "../lib/icons";
import { applyTheme, applyMotion, readTheme, readMotion } from "./Settings";
import "./ControlDock.css";

export default function ControlDock() {
  const { navigate, route } = useRouter();

  useEffect(() => {
    applyTheme(readTheme());
    applyMotion(readMotion());
  }, []);

  return (
    <div className="dock">
      {route.view !== "firmament" && (
        <button
          className="dock-btn to-sky"
          title="Return to the Firmament"
          aria-label="Return to the Firmament"
          onClick={() => navigate({ view: "firmament" })}
        >
          <IconSky size={16} />
        </button>
      )}

      <button
        className="dock-btn"
        title="Search (⌘K)"
        aria-label="Search"
        onClick={() => window.dispatchEvent(new CustomEvent("substancia:register"))}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10.4 10.4L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>

      {route.view === "firmament" && (
        <button
          className="dock-btn"
          title="Toggle legend"
          aria-label="Toggle legend"
          onClick={() => window.dispatchEvent(new CustomEvent("substancia:legend"))}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="4" cy="4.5" r="1.7" fill="currentColor" />
            <circle cx="4" cy="11.5" r="1.7" fill="currentColor" />
            <path d="M8 4.5h5M8 11.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <button
        className="dock-btn"
        title="The Taxonomy — browse every class"
        aria-label="Browse classes"
        onClick={() => navigate({ view: "taxonomy" })}
      >
        <IconTaxonomy size={16} />
      </button>

      <button className="dock-btn" title="Compare two specimens" aria-label="Compare" onClick={() => navigate({ view: "diptych" })}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="5.6" cy="8" r="4" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="10.4" cy="8" r="4" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>

      <div className="dock-sep" />

      <button
        className="dock-btn"
        title="Settings — theme, motion, start over"
        aria-label="Settings"
        onClick={() => window.dispatchEvent(new CustomEvent("substancia:settings"))}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M8 1.6v1.9M8 12.5v1.9M14.4 8h-1.9M3.5 8H1.6M12.5 3.5l-1.3 1.3M4.8 11.2l-1.3 1.3M12.5 12.5l-1.3-1.3M4.8 4.8L3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
