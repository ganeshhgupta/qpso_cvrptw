"use client";

const COLORS = { QPSO: "#D90429", GA: "#F4A261", "A*": "#8b949e" };
const W = 640, H = 260, PAD = 32;

export default function ConvergenceChart({ results }) {
  const series = Object.entries(results || {}).filter(([, r]) => Array.isArray(r.history) && r.history.length);
  const finiteVals = series.flatMap(([, r]) => r.history.filter((v) => Number.isFinite(v)));
  if (!finiteVals.length) return <div className="hint">No convergence data.</div>;

  const min = Math.min(...finiteVals), max = Math.max(...finiteVals);
  const range = max - min || 1;

  const xAt = (i, len) => PAD + (i / Math.max(1, len - 1)) * (W - 2 * PAD);
  const yAt = (v) => H - PAD - ((v - min) / range) * (H - 2 * PAD);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#21262d" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#21262d" />
      {series.map(([name, r]) => {
        const color = COLORS[name] || "#888";
        if (name === "A*") {
          const y = yAt(r.history[0]);
          return (
            <line key={name} x1={PAD} y1={y} x2={W - PAD} y2={y}
              stroke={color} strokeDasharray="6 4" strokeWidth={2} />
          );
        }
        const pts = r.history
          .map((v, i) => (Number.isFinite(v) ? `${xAt(i, r.history.length)},${yAt(v)}` : null))
          .filter(Boolean)
          .join(" ");
        return <polyline key={name} points={pts} fill="none" stroke={color} strokeWidth={2.2} />;
      })}
      {series.map(([name], i) => (
        <g key={name} transform={`translate(${W - PAD - 100}, ${PAD + i * 16})`}>
          <rect width="10" height="10" fill={COLORS[name] || "#888"} />
          <text x="14" y="9" fontSize="10" fill="#c9d1d9">{name}</text>
        </g>
      ))}
    </svg>
  );
}
