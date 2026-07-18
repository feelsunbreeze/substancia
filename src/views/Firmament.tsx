import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { getAtlas, Atlas, AtlasNode, pigment } from "../lib/api";
import { useRouter } from "../lib/router";
import "./Firmament.css";

// legend uses the exact GraphQL class string (singular); the Category page
// for it is usually named in the plural — map the ones that don't just take
// an "s".
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

export default function Firmament() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [hovered, setHovered] = useState<AtlasNode | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(false);
  const { navigate, restoreScroll } = useRouter();

  useEffect(() => {
    getAtlas().then(setAtlas);
    const onLegend = () => setShowLegend((v) => !v);
    window.addEventListener("substancia:legend", onLegend);
    return () => window.removeEventListener("substancia:legend", onLegend);
  }, []);

  useEffect(() => {
    restoreScroll();
  }, [restoreScroll]);

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
    const linkLayer = g.append("g");
    const coreLayer = g.append("g");

    const cores = coreLayer
      .selectAll("circle")
      .data(atlas.substances)
      .join("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", (d) => radius(d.effect_count))
      .attr("fill", (d) => pigment(d.category))
      .attr("class", "fm-node")
      .style("opacity", 0.85);

    function focus(d: AtlasNode | null) {
      linkLayer.selectAll("line").remove();
      if (!d) {
        cores.style("opacity", 0.85).attr("r", (n) => radius(n.effect_count));
        return;
      }
      const kin = new Set(d.neighbors.map((n) => n.name));
      kin.add(d.name);
      cores
        .style("opacity", (n) => (kin.has(n.name) ? 1 : 0.08))
        .attr("r", (n) => (n.name === d.name ? radius(n.effect_count) * 1.7 : radius(n.effect_count)));
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

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 16])
      .on("zoom", (event) => g.attr("transform", event.transform.toString()));
    svg.call(zoom).on("dblclick.zoom", null);
    return () => {
      svg.on(".zoom", null);
    };
  }, [atlas, navigate]);

  return (
    <div className="firmament">
      <svg ref={svgRef} className="fm-svg">
        <g ref={gRef} />
      </svg>

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
