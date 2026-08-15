import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { getAtlas, Atlas, AtlasNode, pigment } from "../lib/api";
import { useRouter } from "../lib/router";
import { getPath, visitCounts, onTraversalChange, clearPath } from "../lib/traversal";
import "./Firmament.css";

const LEGEND: [string, string | null][] = [
  ["Psychedelic", "Psychedelics"],
  ["Dissociatives", "Dissociatives"],
  ["Stimulants", "Stimulants"],
  ["Depressant", "Depressants"],
  ["Entactogen", "Entactogens"],
  ["Opioids", "Opioids"],
  ["Nootropic", "Nootropics"],
  ["Cannabinoid", "Cannabinoids"],
  ["Hallucinogens", "Hallucinogens"],
  ["Deliriant", "Deliriants"],
  ["Antipsychotic", "Antipsychotics"],
  ["Uncategorized", null],
];

const REGION_FADE_START = 1.5;
const REGION_FADE_END = 2.6;

const LANDMARK_COUNT = 12;

export default function Firmament() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [hovered, setHovered] = useState<AtlasNode | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(false);
  const [showPath, setShowPath] = useState(true);
  const [pathLength, setPathLength] = useState(0);
  const { navigate, restoreScroll } = useRouter();

  useEffect(() => {
    getAtlas().then(setAtlas);
    const onLegend = () => setShowLegend((v) => !v);
    window.addEventListener("substancia:legend", onLegend);
    return () => window.removeEventListener("substancia:legend", onLegend);
  }, []);

  useEffect(() => {
    setPathLength(getPath().length);
    return onTraversalChange(() => setPathLength(getPath().length));
  }, []);

  useEffect(() => {
    restoreScroll();
  }, [restoreScroll]);

  const regions = useMemo(() => {
    if (!atlas) return [];
    const byId = new Map<number, AtlasNode[]>();
    for (const s of atlas.substances) {
      if (s.community < 0) continue;
      const bucket = byId.get(s.community);
      if (bucket) bucket.push(s);
      else byId.set(s.community, [s]);
    }
    return (atlas.communities ?? [])
      .filter((c) => (byId.get(c.id)?.length ?? 0) >= 6 && c.signature_effects.length > 0)
      .map((c) => {
        const members = byId.get(c.id)!;
        return {
          id: c.id,
          size: members.length,
          x: d3.median(members, (m) => m.x)!,
          y: d3.median(members, (m) => m.y)!,
          title: c.signature_effects[0],
          subtitle: c.signature_effects.slice(1, 3).join(" · "),
        };
      });
  }, [atlas]);

  useEffect(() => {
    if (!atlas || !svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    g.selectAll("*").remove();

    const { width, height } = svgRef.current.getBoundingClientRect();
    const xExtent = d3.extent(atlas.substances, (d) => d.x) as [number, number];
    const yExtent = d3.extent(atlas.substances, (d) => d.y) as [number, number];
    const pad = 0.05 * Math.max(xExtent[1] - xExtent[0], yExtent[1] - yExtent[0]);

    const xScale = d3.scaleLinear().domain([xExtent[0] - pad, xExtent[1] + pad]).range([90, width - 90]);
    const yScale = d3.scaleLinear().domain([yExtent[0] - pad, yExtent[1] + pad]).range([height - 90, 90]);
    const radius = d3
      .scaleSqrt()
      .domain(d3.extent(atlas.substances, (d) => d.effect_count) as [number, number])
      .range([2.4, 7.5]);

    const nodeByName = new Map(atlas.substances.map((d) => [d.name, d]));

    const regionLayer = g.append("g").attr("class", "fm-region-layer");
    const traversalLayer = g.append("g").attr("class", "fm-traversal-layer");
    const linkLayer = g.append("g");
    const coreLayer = g.append("g");
    const labelLayer = g.append("g").attr("class", "fm-label-layer");

    const regionGroups = regionLayer
      .selectAll("g")
      .data(regions)
      .join("g")
      .attr("transform", (d) => `translate(${xScale(d.x)},${yScale(d.y)})`);

    regionGroups
      .append("text")
      .attr("class", "fm-region-title")
      .attr("text-anchor", "middle")
      .text((d) => d.title.toLowerCase());

    regionGroups
      .append("text")
      .attr("class", "fm-region-sub")
      .attr("text-anchor", "middle")
      .attr("dy", "1.5em")
      .text((d) => d.subtitle.toLowerCase());

    const counts = visitCounts();

    const cores = coreLayer
      .selectAll("circle")
      .data(atlas.substances)
      .join("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("fill", (d) => pigment(d.category))
      .attr("class", (d) => (counts.has(d.name) ? "fm-node fm-visited" : "fm-node"))
      .attr("r", 0)
      .style("opacity", 0);

    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.hypot(cx, cy);
    cores
      .transition()
      .delay((d) => {
        const dist = Math.hypot(xScale(d.x) - cx, yScale(d.y) - cy);
        return (dist / maxDist) * 620;
      })
      .duration(720)
      .ease(d3.easeCubicOut)
      .attr("r", (d) => radius(d.effect_count))
      .style("opacity", 0.85);

    function drawTraversal(visible: boolean) {
      traversalLayer.selectAll("*").remove();
      if (!visible) return;
      const steps = getPath().filter((s) => nodeByName.has(s.name));
      if (steps.length < 2) return;

      for (let i = 1; i < steps.length; i++) {
        const a = nodeByName.get(steps[i - 1].name)!;
        const b = nodeByName.get(steps[i].name)!;
        const age = (steps.length - i) / steps.length;
        traversalLayer
          .append("path")
          .attr("class", "fm-trail")
          .attr("d", `M${xScale(a.x)},${yScale(a.y)} L${xScale(b.x)},${yScale(b.y)}`)
          .attr("opacity", 0.10 + 0.42 * (1 - age));
      }
    }
    drawTraversal(showPath);

    function focus(d: AtlasNode | null) {
      linkLayer.selectAll("line").remove();
      if (!d) {
        cores.style("opacity", 0.85).attr("r", (n) => radius(n.effect_count));
        labelLayer.classed("fm-dimmed", false);
        return;
      }
      const kin = new Set(d.neighbors.map((n) => n.name));
      kin.add(d.name);
      cores
        .style("opacity", (n) => (kin.has(n.name) ? 1 : 0.08))
        .attr("r", (n) => (n.name === d.name ? radius(n.effect_count) * 1.7 : radius(n.effect_count)));
      labelLayer.classed("fm-dimmed", true);
      linkLayer
        .selectAll("line")
        .data(d.neighbors)
        .join("line")
        .attr("x1", xScale(d.x))
        .attr("y1", yScale(d.y))
        .attr("x2", (nb) => xScale(nodeByName.get(nb.name)?.x ?? d.x))
        .attr("y2", (nb) => yScale(nodeByName.get(nb.name)?.y ?? d.y))
        .attr("stroke", pigment(d.category))
        .attr("stroke-width", (nb) => 0.4 + nb.score * 1.8)
        .attr("opacity", 0.6);
    }

    cores
      .on("mouseenter", (event, d) => {
        setHovered(d);
        setCursor({ x: event.clientX, y: event.clientY });
        focus(d);
      })
      .on("mousemove", (event) => setCursor({ x: event.clientX, y: event.clientY }))
      .on("mouseleave", () => {
        setHovered(null);
        focus(null);
      })
      .on("click", (_e, d) => navigate({ view: "specimen", name: d.name }));

    const byRichness = [...atlas.substances].sort((a, b) => b.effect_count - a.effect_count);
    const championOf = new Map<number, AtlasNode>();
    for (const d of byRichness) {
      if (d.community >= 0 && !championOf.has(d.community)) championOf.set(d.community, d);
    }
    const champions = [...championOf.values()];
    const championSet = new Set(champions);
    const ranked = [...champions, ...byRichness.filter((d) => !championSet.has(d))];

    function renderLabels(t: d3.ZoomTransform) {
      const fontPx = 11 / t.k;
      const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
      const chosen: AtlasNode[] = [];

      const budget = t.k < 1.2 ? LANDMARK_COUNT : Math.min(ranked.length, Math.round(LANDMARK_COUNT * t.k * 2.4));

      for (const d of ranked) {
        if (chosen.length >= budget) break;

        const sx = t.applyX(xScale(d.x));
        const sy = t.applyY(yScale(d.y));
        if (sx < -40 || sx > width + 40 || sy < -30 || sy > height + 30) continue;

        const w = d.name.length * 11 * 0.55;
        const h = 13;
        const gap = radius(d.effect_count) * t.k + 5;
        const box = { x0: sx - w / 2, x1: sx + w / 2, y0: sy + gap, y1: sy + gap + h };

        const collides = placed.some(
          (p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0
        );
        if (collides) continue;

        placed.push(box);
        chosen.push(d);
      }

      labelLayer
        .selectAll<SVGTextElement, AtlasNode>("text")
        .data(chosen, (d) => d.name)
        .join(
          (enter) =>
            enter
              .append("text")
              .attr("class", "fm-label")
              .attr("text-anchor", "middle")
              .style("opacity", 0)
              .call((s) => s.transition().duration(200).style("opacity", 1)),
          (update) => update,
          (exit) => exit.remove()
        )
        .attr("x", (d) => xScale(d.x))
        .attr("y", (d) => yScale(d.y) + radius(d.effect_count) + 5 / t.k)
        .attr("dy", "0.75em")
        .style("font-size", `${fontPx}px`)
        .text((d) => d.name);
    }

    function renderRegions(t: d3.ZoomTransform) {
      const fade =
        t.k <= REGION_FADE_START
          ? 1
          : t.k >= REGION_FADE_END
          ? 0
          : 1 - (t.k - REGION_FADE_START) / (REGION_FADE_END - REGION_FADE_START);
      regionLayer.style("opacity", fade).classed("fm-hidden", fade < 0.02);
      regionGroups.selectAll<SVGTextElement, unknown>(".fm-region-title").style("font-size", `${26 / t.k}px`);
      regionGroups.selectAll<SVGTextElement, unknown>(".fm-region-sub").style("font-size", `${11 / t.k}px`);
    }

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 16])
      .on("zoom", (event) => {
        const t = event.transform as d3.ZoomTransform;
        g.attr("transform", t.toString());
        renderLabels(t);
        renderRegions(t);
      });

    svg.call(zoom).on("dblclick.zoom", null);

    const identity = d3.zoomIdentity;
    renderRegions(identity);
    const labelTimer = window.setTimeout(() => renderLabels(identity), 780);

    const onToggle = (e: Event) => drawTraversal((e as CustomEvent<boolean>).detail);
    window.addEventListener("substancia:trail", onToggle);

    return () => {
      window.clearTimeout(labelTimer);
      window.removeEventListener("substancia:trail", onToggle);
      svg.on(".zoom", null);
    };
  }, [atlas, regions, navigate, showPath]);

  return (
    <div className="firmament">
      <svg ref={svgRef} className="fm-svg">
        <g ref={gRef} />
      </svg>

      <div className="fm-caption">
        <div className="fm-caption-title">the firmament</div>
        <div className="fm-caption-body">
          {atlas ? `${atlas.substances.length} specimens` : "…"} placed by how similar their
          subjective effects are — not by chemistry or class. Regions are named for the effects
          that define them.
        </div>
        {pathLength > 1 && (
          <div className="fm-caption-tools">
            <button className="fm-mini" onClick={() => { const v = !showPath; setShowPath(v); window.dispatchEvent(new CustomEvent("substancia:trail", { detail: v })); }}>
              {showPath ? "hide" : "show"} your path ({pathLength})
            </button>
            <button className="fm-mini" onClick={() => clearPath()}>clear</button>
          </div>
        )}
      </div>

      {showLegend && (
        <div className="fm-legend">
          <div className="fm-legend-title">by psychoactive class</div>
          {LEGEND.map(([label, catName]) =>
            catName ? (
              <button
                key={label}
                className="fm-legend-row linkable"
                onClick={() => navigate({ view: "category", name: catName })}
              >
                <span className="pigment-dot" style={{ background: pigment(label) }} />
                {label}
              </button>
            ) : (
              <div key={label} className="fm-legend-row">
                <span className="pigment-dot" style={{ background: pigment(label) }} />
                {label}
              </div>
            )
          )}
        </div>
      )}

      {hovered && (
        <div
          className="fm-sigil"
          style={{
            left: Math.min(cursor.x + 18, window.innerWidth - 280),
            top: Math.min(cursor.y + 18, window.innerHeight - 210),
            borderColor: pigment(hovered.category),
          }}
        >
          <div className="sigil-name">{hovered.name}</div>
          <div className="sigil-class" style={{ color: pigment(hovered.category) }}>
            {hovered.category} · {hovered.subcategory}
          </div>
          <div className="sigil-effects">{hovered.signature_effects.slice(0, 4).join(" · ")}</div>
          <div className="sigil-cta">open specimen ▸</div>
        </div>
      )}
    </div>
  );
}
