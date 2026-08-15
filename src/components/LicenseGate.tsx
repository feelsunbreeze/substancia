import { useCallback, useRef, useState } from "react";
import { getLicenseStatus, installLicense, type LicenseStatus } from "../lib/api";
import "./LicenseGate.css";

interface Props {
  status: LicenseStatus;
  onLicensed: (status: LicenseStatus) => void;
}

async function copyMachineId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
  } catch {
  }
}

export default function LicenseGate({ status, onLicensed }: Props) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const activate = useCallback(async () => {
    if (!text.trim()) {
      setError("Paste a license file's contents, or load one, first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await installLicense(text);
      if (next.valid) {
        onLicensed(next);
      } else {
        setError("That license didn't verify. Check you copied the whole file.");
      }
    } catch (e) {
      setError(typeof e === "string" ? e : "That license didn't verify. Check you copied the whole file.");
    } finally {
      setBusy(false);
    }
  }, [text, onLicensed]);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setFileName(file.name);
      setError(null);
    };
    reader.readAsText(file);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  function recheck() {
    setBusy(true);
    getLicenseStatus()
      .then((s) => {
        if (s.valid) onLicensed(s);
        else setError("Still no valid license found on this machine.");
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="license-gate">
      <div className="license-card">
        <div className="license-kicker">license required</div>
        <h2 className="license-title">Substancia</h2>
        <p className="license-body">
          This copy of Substancia hasn't been activated on this machine yet. If you already have a
          license file, paste its contents or load it below. If not, send the machine ID underneath
          to whoever issued your copy — the license they generate for you will only work here.
        </p>

        <div className="license-machine">
          <span className="license-machine-label">this machine's ID</span>
          <code className="license-machine-id">{status.machine_id}</code>
          <button
            className="license-copy"
            onClick={() => { copyMachineId(status.machine_id); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }}
          >
            {copied ? "copied" : "copy"}
          </button>
        </div>

        <div
          className={`license-dropzone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <textarea
            className="license-input"
            placeholder="Paste the contents of your .substancia-license.json here, or drop the file on this box…"
            value={text}
            onChange={(e) => { setText(e.target.value); setFileName(null); setError(null); }}
            spellCheck={false}
          />
          <button className="license-upload" onClick={() => fileInput.current?.click()} type="button">
            <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 1.5v8.4M8 1.5 4.6 4.9M8 1.5l3.4 3.4M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2"
                fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            upload .json
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,.substancia-license.json,application/json"
            hidden
            onChange={onFile}
          />
        </div>

        {fileName && !error && <div className="license-filename">loaded {fileName}</div>}
        {error && <div className="license-error">{error}</div>}

        <div className="license-actions">
          <button className="license-skip" onClick={recheck} disabled={busy}>
            recheck
          </button>
          <button className="license-next" onClick={activate} disabled={busy}>
            {busy ? "verifying…" : "activate ▸"}
          </button>
        </div>
      </div>
    </div>
  );
}
