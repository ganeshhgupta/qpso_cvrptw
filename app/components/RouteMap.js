"use client";

import { ROUTE_COLORS } from "./colors";

function toPathData(pts) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export default function RouteMap({ graph, routes, speed = 1 }) {
  if (!graph) return null;

  const xs = graph.nodes.map((n) => n.x);
  const ys = graph.nodes.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = maxX - minX || 1;
  const pad = span * 0.08;
  const vb = `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;

  const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
  const customerSet = new Set(graph.customers);
  const activeRoutes = (routes || []).filter((r) => r.length > 2);

  return (
    <div>
      <svg viewBox={vb} width="100%" height="440" style={{ background: "#04070b", borderRadius: 8, display: "block" }}>
        {graph.edges.map((e, i) => {
          const a = byId[e.u], b = byId[e.v];
          if (!a || !b) return null;
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#33475e" strokeWidth={span * 0.0014} opacity={0.75} />
          );
        })}

        {activeRoutes.map((route, ri) => {
          const color = ROUTE_COLORS[ri % ROUTE_COLORS.length];
          const pts = route.map((id) => byId[id]).filter(Boolean);
          if (pts.length < 2) return null;
          const d = toPathData(pts);
          const dur = (7 + ri * 1.3) / speed;
          const drawDur = 1.1 + ri * 0.12;

          return (
            <g key={ri}>
              <path
                d={d}
                pathLength={100}
                fill="none"
                stroke={color}
                strokeWidth={span * 0.0045}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: 100,
                  animation: `drawPath ${drawDur}s var(--ease) forwards`,
                }}
              />
              <circle r={span * 0.008} fill={color}>
                <animateMotion
                  path={d}
                  dur={`${dur}s`}
                  begin={`${drawDur}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
            </g>
          );
        })}

        {graph.nodes.map((n) => (
          <circle key={n.id} cx={n.x} cy={n.y}
            r={span * (customerSet.has(n.id) ? 0.006 : 0.0022)}
            fill={customerSet.has(n.id) ? "#f0f6fc" : "#4d6a89"}>
            <title>{customerSet.has(n.id) ? `Customer stop #${n.id}` : `Junction #${n.id}`}</title>
          </circle>
        ))}

        <rect
          x={byId[graph.depot].x - span * 0.011}
          y={byId[graph.depot].y - span * 0.011}
          width={span * 0.022}
          height={span * 0.022}
          fill="#f4a261"
          style={{ animation: "glowPulse 2.2s ease-in-out infinite" }}
        >
          <title>Depot</title>
        </rect>
      </svg>

      <div className="legend-row">
        <span><span className="legend-swatch" style={{ background: "#f4a261" }} /> Depot</span>
        <span><span className="legend-swatch" style={{ background: "#f0f6fc" }} /> Customer stop</span>
        <span><span className="legend-swatch" style={{ background: "#4d6a89" }} /> Road junction</span>
        {activeRoutes.map((_, ri) => (
          <span key={ri}>
            <span className="legend-swatch" style={{ background: ROUTE_COLORS[ri % ROUTE_COLORS.length] }} />
            Vehicle {ri + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
