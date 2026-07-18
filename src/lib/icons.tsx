import { ReactNode, ReactElement } from "react";

/**
 * A bespoke line-icon set for Substancia — drawn to sit inside the codex,
 * not lifted from a generic icon font. One weight (1.25), no fills except
 * accenting dots, 20x20 viewBox. Each glyph is a small argument about what
 * the section actually is (an alembic for chemistry, a caduceus-less
 * receptor lock for pharmacology, scales for legal status) rather than a
 * stock pictogram.
 */

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ size = 26, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ————— prose-section icons ————— */

export function IconHistory(p: IconProps) {
  // an hourglass resting on its side — time passed, not time remaining
  return (
    <Svg {...p}>
      <path d="M5 4h10M5 16h10" />
      <path d="M6 4c0 3 2.5 4.2 4 6-1.5 1.8-4 3-4 6M14 4c0 3-2.5 4.2-4 6 1.5 1.8 4 3 4 6" />
    </Svg>
  );
}

export function IconChemistry(p: IconProps) {
  // an alembic / retort flask, angled neck
  return (
    <Svg {...p}>
      <path d="M8.5 3h3" />
      <path d="M9 3v4.2L5.3 13a3 3 0 0 0 2.6 4.5h4.2A3 3 0 0 0 14.7 13L11 7.2V3" />
      <path d="M6.6 12.5h6.8" />
    </Svg>
  );
}

export function IconPharmacology(p: IconProps) {
  // a synapse — neurotransmitters crossing the cleft between two membranes
  return (
    <Svg {...p}>
      <path d="M3 5.5c3.2 1.7 10.8 1.7 14 0" />
      <path d="M3 16c3.2-1.7 10.8-1.7 14 0" />
      <circle cx="7" cy="10" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="10.6" cy="11.6" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="13.4" cy="9.4" r="1.05" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconSubjectiveEffects(p: IconProps) {
  // an eye with radiating perception lines
  return (
    <Svg {...p}>
      <path d="M2.5 10S5.8 5 10 5s7.5 5 7.5 5-3.3 5-7.5 5-7.5-5-7.5-5Z" />
      <circle cx="10" cy="10" r="2.1" />
      <path d="M10 2v1.4M4 4l1 1.2M16 4l-1 1.2" />
    </Svg>
  );
}

export function IconForms(p: IconProps) {
  // a faceted crystal / tablet — the physical shape a substance takes
  return (
    <Svg {...p}>
      <path d="M10 2.5 15.5 7 13 17.5H7L4.5 7 10 2.5Z" />
      <path d="M4.5 7h11M7 17.5 10 7l3 10.5M10 2.5V7" />
    </Svg>
  );
}

export function IconResearch(p: IconProps) {
  // an armillary-style compass / dividers, not a stock magnifier
  return (
    <Svg {...p}>
      <path d="M10 3v2.2M10 14.8V17M3 10h2.2M14.8 10H17" />
      <circle cx="10" cy="10" r="4.6" />
      <path d="M10 6.8 12 10l-2 3.2-2-3.2 2-3.2Z" />
    </Svg>
  );
}

export function IconToxicity(p: IconProps) {
  // a drop with a fracture through it — harm, not a skull
  return (
    <Svg {...p}>
      <path d="M10 2.5S4.5 9 4.5 12.8a5.5 5.5 0 0 0 11 0C15.5 9 10 2.5 10 2.5Z" />
      <path d="M8 9.5l2 2.2-1.4 1.6L11 16" />
    </Svg>
  );
}

export function IconLegal(p: IconProps) {
  // scales of justice, drawn heavier and full-canvas so it holds its own
  // as the plate's closing mark
  return (
    <Svg {...p}>
      <path d="M10 2.5v14" />
      <path d="M5 17.5h10" />
      <path d="M2.5 6 10 4l7.5 2" />
      <path d="M2.5 6 1 11.5a3.4 3.4 0 0 0 6.4 0L2.5 6Z" />
      <path d="M17.5 6 19 11.5a3.4 3.4 0 0 1-6.4 0L17.5 6Z" />
    </Svg>
  );
}

export function IconPhenomenology(p: IconProps) {
  // a radiant star-burst — the felt texture beneath the categories
  return (
    <Svg {...p}>
      <path d="M10 2v4M10 14v4M2 10h4M14 10h4M4.2 4.2l2.8 2.8M13 13l2.8 2.8M4.2 15.8 7 13M13 7l2.8-2.8" />
      <circle cx="10" cy="10" r="2.3" />
    </Svg>
  );
}

/* ————— phenomenology sub-category icons ————— */

export function IconPhysical(p: IconProps) {
  // a figure standing arms-out — the body as the site of the effect
  return (
    <Svg {...p}>
      <circle cx="10" cy="3.6" r="2" />
      <path d="M10 6v6.5M3.5 7.5 10 10l6.5-2.5M5.5 18l2.8-7.4M14.5 18l-2.8-7.4" />
    </Svg>
  );
}

export function IconCognitive(p: IconProps) {
  // thought coiling inward on itself — a single continuous spiral
  return (
    <Svg {...p}>
      <path d="M10 17c-3.9 0-7-3.1-7-7s2.7-6.3 6-6.3 5.2 2.2 5.2 5 -2 4.2-4.5 4.2-3.8-1.6-3.8-3.5 1.2-3 2.8-3" />
      <circle cx="10.7" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconVisual(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 10S5.8 5 10 5s7.5 5 7.5 5-3.3 5-7.5 5-7.5-5-7.5-5Z" />
      <circle cx="10" cy="10" r="2.1" />
    </Svg>
  );
}

export function IconAuditory(p: IconProps) {
  // resonance rippling outward from a struck point — matches the
  // radiating-line language used elsewhere rather than a literal ear
  return (
    <Svg {...p}>
      <circle cx="4.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <path d="M8 5.3a7 7 0 0 1 0 9.4" />
      <path d="M11.3 3.2a10.8 10.8 0 0 1 0 13.6" />
      <path d="M14.6 1.4a14.5 14.5 0 0 1 0 17.2" opacity="0.55" />
    </Svg>
  );
}

export function IconMultisensory(p: IconProps) {
  // three overlapping fields — senses blending
  return (
    <Svg {...p}>
      <circle cx="7.5" cy="8.5" r="4" />
      <circle cx="12.5" cy="8.5" r="4" />
      <circle cx="10" cy="12.5" r="4" />
    </Svg>
  );
}

export function IconTranspersonal(p: IconProps) {
  // a horizon dissolving outward — self extending past its edge
  return (
    <Svg {...p}>
      <circle cx="10" cy="10" r="3" />
      <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.3 5.3l1.4 1.4M13.3 13.3l1.4 1.4M5.3 14.7l1.4-1.4M13.3 6.7l1.4-1.4" opacity="0.55" />
    </Svg>
  );
}

export function IconDisconnective(p: IconProps) {
  // a broken chain link
  return (
    <Svg {...p}>
      <rect x="3" y="7" width="6" height="9" rx="3" transform="rotate(-20 6 11.5)" />
      <rect x="11" y="4" width="6" height="9" rx="3" transform="rotate(-20 14 8.5)" />
    </Svg>
  );
}

export function IconAftereffects(p: IconProps) {
  // a receding trail of fading dots
  return (
    <Svg {...p}>
      <circle cx="4.5" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="10.5" r="1.3" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="13" cy="8" r="1.6" fill="currentColor" stroke="none" opacity="0.45" />
      <path d="M4.5 13 8.5 10.5 13 8" opacity="0.5" />
    </Svg>
  );
}

export function IconParadoxical(p: IconProps) {
  // two opposing curved arrows
  return (
    <Svg {...p}>
      <path d="M4 8a6 6 0 0 1 10-3.2M14 4.5V7h-2.4" />
      <path d="M16 12a6 6 0 0 1-10 3.2M6 15.5V13h2.4" />
    </Svg>
  );
}

export function IconConfluence(p: IconProps) {
  // two streams meeting into one — the interactions glyph
  return (
    <Svg {...p}>
      <path d="M4 2.5c0 4 3 5 6 6.5M16 2.5c0 4-3 5-6 6.5M10 9v8.5" />
    </Svg>
  );
}

export function IconHazard(p: IconProps) {
  // a diamond marker with an exclamation — the codex's own hazard glyph,
  // not a stock triangle
  return (
    <Svg {...p}>
      <path d="M10 2 17.5 10 10 18 2.5 10Z" />
      <path d="M10 6.5v5" />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconTaxonomy(p: IconProps) {
  // shelves — the classes are stacks the codex is sorted onto
  return (
    <Svg {...p}>
      <path d="M3 4h14M3 10h14M3 16h14" />
      <circle cx="6" cy="4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="10" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="16" r="1.15" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconSky(p: IconProps) {
  // three stars over an arc — the firmament, as a nav glyph
  return (
    <Svg {...p}>
      <path d="M3 14a7 7 0 0 1 14 0" />
      <circle cx="10" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export const PROSE_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  "History and culture": IconHistory,
  "Chemistry": IconChemistry,
  "Pharmacology": IconPharmacology,
  "Subjective effects": IconSubjectiveEffects,
  "Forms": IconForms,
  "Research": IconResearch,
  "Toxicity and harm potential": IconToxicity,
  "Legal status": IconLegal,
};

export const PHENOMENOLOGY_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  Physical: IconPhysical,
  Cognitive: IconCognitive,
  Visual: IconVisual,
  Auditory: IconAuditory,
  Multisensory: IconMultisensory,
  Transpersonal: IconTranspersonal,
  Disconnective: IconDisconnective,
  Aftereffects: IconAftereffects,
  Paradoxical: IconParadoxical,
};
