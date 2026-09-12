"use client";

import { ALGO_COLORS } from "./colors";

const W = 640, H = 280, PAD = 36;

export default function ConvergenceChart({ results }) {
  const series = Object.entries(results || {}).filter(([, r]) => Array.isArray(r.history) && r.history.length);
  const finiteVals = series.flatMap(([, r]) => r.history.filter((v) => Number.isFinite(v)));
  if (!finiteVals.length) return <div className="hint">No convergence data.</div>;

  const min = Math.min(...finiteVals), max = Math.max(...finiteVals);
  const range = max - min || 1;

  const xAt = (i, len) => PAD + (i / Math.max(1, len - 1)) * (W - 2 * PAD);
  const yAt = (v) => H - PAD - ((v - min) / range) * (H - 2 * PAD);

  const gridLines = 4;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        <defs>
          <linearGradient id="qpsoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ALGO_COLORS.QPSO} stopOpacity="0.28" />
            <stop offset="100%" stopColor={ALGO_COLORS.QPSO} stopOpacity="0" />
          </linearGradient>
        </defs>

        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = PAD + (i / gridLines) * (H - 2 * PAD);
          return <line key={i} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#161f2c" strokeWidth={1} />;
        })}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#2a3444" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#2a3444" />
        <text x={PAD} y={H - 10} fontSize="9" fill="#8a96a8">iteration 0</text>
        <text x={W - PAD} y={H - 10} fontSize="9" fill="#8a96a8" textAnchor="end">final</text>
        <text x={8} y={PAD} fontSize="9" fill="#8a96a8">cost</text>

        {series.map(([name, r], si) => {
          const color = ALGO_COLORS[name] || "#888";

          if (name === "A*") {
            const y = yAt(r.history[0]);
            return (
              <line key={name} x1={PAD} y1={y} x2={W - PAD} y2={y}
                stroke={color} strokeDasharray="6 4" strokeWidth={2} opacity={0.85}>
                <title>A* Constructive baseline: {r.history[0].toFixed(1)}</title>
              </line>
            );
          }

          const finitePts = r.history
            .map((v, i) => (Number.isFinite(v) ? { i, v } : null))
            .filter(Boolean);
          const d = finitePts.map((p, k) => `${k === 0 ? "M" : "L"} ${xAt(p.i, r.history.length)} ${yAt(p.v)}`).join(" ");
          const bestIdx = finitePts.reduce((best, p, k) => (p.v < finitePts[best].v ? k : best), 0);
          const bestPt = finitePts[bestIdx];
          const area = `${d} L ${xAt(finitePts[finitePts.length - 1].i, r.history.length)} ${H - PAD} L ${xAt(0, r.history.length)} ${H - PAD} Z`;

          return (
            <g key={name}>
              {name === "QPSO" && <path d={area} fill="url(#qpsoFill)" stroke="none" />}
              <path
                d={d}
                pathLength={100}
                fill="none"
                stroke={color}
                strokeWidth={2.4}
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: 100,
                  animation: `drawPath 1.4s var(--ease) ${si * 0.15}s forwards`,
                }}
              />
              {bestPt && (
                <circle cx={xAt(bestPt.i, r.history.length)} cy={yAt(bestPt.v)} r={4.5} fill={color} stroke="#04070b" strokeWidth={1.5}>
                  <title>{`${name} best: ${bestPt.v.toFixed(1)} at iteration ${bestPt.i}`}</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      <div className="legend-row">
        {series.map(([name]) => (
          <span key={name}>
            <span className="legend-swatch" style={{ background: ALGO_COLORS[name] || "#888" }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
