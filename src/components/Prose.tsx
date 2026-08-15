import { Fragment } from "react";
import { Block, Reference } from "../lib/api";
import { IconConfluence } from "../lib/icons";
import Tooltip from "./Tooltip";
import "./Prose.css";

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="prose-strong">{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

function headingText(text: string): string {
  const t = text.trim();
  const inner = t.slice(2, -2);
  return t.startsWith("**") && t.endsWith("**") && !inner.includes("**") ? inner : t;
}

function splitIncipit(text: string): [string, string] | null {
  const t = text.trimStart();
  if (t.startsWith("**")) return null;

  const words = t.split(" ");
  const taken: string[] = [];
  let chars = 0;
  for (const w of words) {
    if (w.includes("*") || w.includes("[")) break;
    if (w.length > 14 || /[()[\]{}\d/]/.test(w)) break;
    taken.push(w);
    chars += w.length + 1;
    if (taken.length >= 4 || chars >= 22) break;
  }

  const dangles = (w: string) => {
    const bare = w.toLowerCase().replace(/[,;:]$/, "");
    return DANGLING.has(bare) || (bare.includes("-") && !bare.endsWith("-"));
  };
  while (taken.length && dangles(taken[taken.length - 1])) taken.pop();
  if (taken.length < 2) return null;

  const head = taken.join(" ");
  const rest = t.slice(head.length);
  if (rest.trim().length < 40) return null;
  return [head, rest];
}

const DANGLING = new Set([
  "and", "or", "of", "the", "a", "an", "to", "in", "on", "at", "by", "for",
  "with", "was", "were", "is", "are", "be", "been", "who", "that", "which",
  "but", "as", "from", "its", "it", "their", "this", "these", "has", "have",
]);

const LEVEL_LABEL: Record<string, string> = {
  dangerous: "Dangerous",
  unsafe: "Unsafe",
  uncertain: "Uncertain",
};

interface ProseProps {
  blocks: Block[];
  dropcap?: boolean;
  incipit?: boolean;
  resolve?: (name: string) => Reference;
  onNavigate?: (ref: Reference) => void;
}

export function RefName({
  subject,
  className,
  resolve,
  onNavigate,
}: {
  subject: string;
  className?: string;
  resolve?: (name: string) => Reference;
  onNavigate?: (ref: Reference) => void;
}) {
  const ref = resolve?.(subject) ?? { kind: "none" as const, name: subject };
  if (ref.kind === "none" || !onNavigate) {
    return (
      <Tooltip label={<><strong>{subject}</strong> — referenced here, but not a substance or class in the codex.</>}>
        <span className={`refname none ${className ?? ""}`}>{subject}</span>
      </Tooltip>
    );
  }
  const tip =
    ref.kind === "category" ? (
      <><strong>{ref.name}</strong> — a drug class. Open its page.</>
    ) : (
      <>Open <strong>{ref.name}</strong>{ref.name !== subject ? ` (${subject})` : ""}.</>
    );
  return (
    <Tooltip label={tip}>
      <button className={`refname ${ref.kind} ${className ?? ""}`} onClick={() => onNavigate(ref)}>
        {subject}
      </button>
    </Tooltip>
  );
}

function Callout({
  level,
  subject,
  text,
  resolve,
  onNavigate,
}: {
  level: string;
  subject: string;
  text: string;
  resolve?: (n: string) => Reference;
  onNavigate?: (ref: Reference) => void;
}) {
  return (
    <aside className={`callout callout-${level}`}>
      <div className="callout-head">
        <IconConfluence size={15} className="callout-icon" />
        <span className="callout-level">{LEVEL_LABEL[level] ?? level}</span>
        <span className="callout-sep">·</span>
        <RefName subject={subject} className="callout-subject" resolve={resolve} onNavigate={onNavigate} />
      </div>
      {text && <p className="callout-body"><Inline text={text} /></p>}
    </aside>
  );
}

export default function Prose({ blocks, dropcap = false, incipit = false, resolve, onNavigate }: ProseProps) {
  let firstPara = dropcap;
  let firstOfSection = incipit;
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h3":
            return <h3 key={i} className="prose-sub"><Inline text={headingText(b.text)} /></h3>;
          case "h4":
            return <h4 key={i} className="prose-subsub"><Inline text={headingText(b.text)} /></h4>;
          case "list":
            return (
              <ul key={i} className="prose-list">
                {b.items.map((it, k) => (
                  <li key={k}><Inline text={it} /></li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <Callout
                key={i}
                level={b.level}
                subject={b.subject}
                text={b.text}
                resolve={resolve}
                onNavigate={onNavigate}
              />
            );
          default: {
            const drop = firstPara;
            const opens = firstOfSection;
            firstPara = false;
            firstOfSection = false;
            const parts = opens ? splitIncipit(b.text) : null;
            return (
              <p key={i} className={`prose-p${drop ? " drop" : ""}${opens ? " opens" : ""}`}>
                {parts ? (
                  <>
                    <span className="prose-incipit">{parts[0]}</span>
                    <Inline text={parts[1]} />
                  </>
                ) : (
                  <Inline text={b.text} />
                )}
              </p>
            );
          }
        }
      })}
    </>
  );
}
