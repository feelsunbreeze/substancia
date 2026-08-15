import { useRouter } from "../lib/router";

const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function win() {
  if (!inTauri) return null;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

export default function WindowChrome() {
  const { canBack, back, canForward, forward } = useRouter();

  return (
    <>
      <div className="drag-strip" data-tauri-drag-region />

      <div className="chrome-history">
        {canBack && (
          <button className="chrome-back" onClick={back} title="Back (Esc)" aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {canForward && (
          <button
            className="chrome-back chrome-forward"
            onClick={forward}
            title="Forward"
            aria-label="Forward"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="chrome-controls">
        <button className="chrome-btn min" onClick={() => win().then((w) => w?.minimize())} aria-label="Minimize">
          <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1.5" y="5" width="8" height="1" fill="currentColor" /></svg>
        </button>
        <button className="chrome-btn max" onClick={() => win().then((w) => w?.toggleMaximize())} aria-label="Maximize">
          <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1.5" y="1.5" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
        </button>
        <button className="chrome-btn close" onClick={() => win().then((w) => w?.close())} aria-label="Close">
          <svg width="11" height="11" viewBox="0 0 11 11">
            <path d="M2 2l7 7M9 2l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </>
  );
}
