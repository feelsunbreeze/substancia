import { useEffect, useState } from "react";
import { useRouter } from "../lib/router";
import { IconSky, IconTaxonomy } from "../lib/icons";
import "./ControlDock.css";

export default function ControlDock() {
  const { navigate, route } = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("substancia-theme") as "dark" | "light") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("substancia-theme", theme);
  }, [theme]);

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

      <button
        className="dock-btn"
        title={theme === "dark" ? "Vellum" : "Nocturne"}
        aria-label="Toggle theme"
        onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      >
        {theme === "dark" ? "☾" : "☀"}
      </button>
    </div>
  );
}
