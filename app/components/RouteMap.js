"use client";

const ROUTE_COLORS = ["#D90429", "#2A9D8F", "#F4A261", "#457B9D", "#9B5DE5", "#00B4D8", "#FFB703", "#EF476F"];

export default function RouteMap({ graph, routes }) {
  if (!graph) return null;

  const xs = graph.nodes.map((n) => n.x);
  const ys = graph.nodes.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = (maxX - minX || 1) * 0.08;
  const vb = `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;

  const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
  const customerSet = new Set(graph.customers);

  return (
    <svg viewBox={vb} width="100%" height="420" style={{ background: "#05080b", borderRadius: 6 }}>
      {graph.edges.map((e, i) => {
        const a = byId[e.u], b = byId[e.v];
        if (!a || !b) return null;
        return (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="#21262d" strokeWidth={(maxX - minX) * 0.0015} />
        );
      })}

      {(routes || []).map((route, ri) => {
        const color = ROUTE_COLORS[ri % ROUTE_COLORS.length];
        const pts = route.map((id) => byId[id]).filter(Boolean);
        if (pts.length < 2) return null;
        const d = pts.map((p) => `${p.x},${p.y}`).join(" ");
        return (
          <polyline key={ri} points={d} fill="none" stroke={color}
            strokeWidth={(maxX - minX) * 0.005} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        );
      })}

      {graph.nodes.map((n) => (
        <circle key={n.id} cx={n.x} cy={n.y}
          r={(maxX - minX) * (customerSet.has(n.id) ? 0.006 : 0.0015)}
          fill={customerSet.has(n.id) ? "#f0f6fc" : "#30363d"} />
      ))}

      <rect
        x={byId[graph.depot].x - (maxX - minX) * 0.01}
        y={byId[graph.depot].y - (maxX - minX) * 0.01}
        width={(maxX - minX) * 0.02}
        height={(maxX - minX) * 0.02}
        fill="#F4A261"
      />
    </svg>
  );
}
