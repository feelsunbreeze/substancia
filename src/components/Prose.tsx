import { Fragment } from "react";
import { Block, Reference } from "../lib/api";
import { IconConfluence } from "../lib/icons";
import Tooltip from "./Tooltip";
import "./Prose.css";

/** inline **bold** -> accented strong, everything else plain */
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

const LEVEL_LABEL: Record<string, string> = {
  dangerous: "Dangerous",
  unsafe: "Unsafe",
  uncertain: "Uncertain",
};

interface ProseProps {
  blocks: Block[];
  dropcap?: boolean;
  /** resolve an interaction subject to a substance / category / dead end */
  resolve?: (name: string) => Reference;
  onNavigate?: (ref: Reference) => void;
}

/** an interaction subject rendered as the right kind of link (or a tooltip'd dead end) */
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

export default function Prose({ blocks, dropcap = false, resolve, onNavigate }: ProseProps) {
  let firstPara = dropcap;
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h3":
            return <h3 key={i} className="prose-sub">{b.text}</h3>;
          case "h4":
            return <h4 key={i} className="prose-subsub">{b.text}</h4>;
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
            firstPara = false;
            return (
              <p key={i} className={drop ? "prose-p drop" : "prose-p"}>
                <Inline text={b.text} />
              </p>
            );
          }
        }
      })}
    </>
  );
}
