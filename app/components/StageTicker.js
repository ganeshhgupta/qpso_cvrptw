"use client";

import { useEffect, useRef, useState } from "react";

export const STAGES = [
  { key: "network", label: "Generating seeded road network", detail: "Building a connected graph of junctions and road segments (replaces a live OSM fetch)." },
  { key: "traffic", label: "Applying traffic scenario", detail: "Assigning a travel-time multiplier to every road segment." },
  { key: "encode", label: "Encoding stops as random keys", detail: "Mapping depot + customers onto a continuous [0,1] vector for the swarm to search." },
  { key: "qpso", label: "Running the QPSO swarm", detail: "Particles evolve toward lower-cost delivery orderings via the quantum-potential-well update rule, iteration by iteration." },
  { key: "ga", label: "Running the Genetic Algorithm", detail: "A separate population of individuals evolves the same problem via crossover, mutation and elitism." },
  { key: "2opt", label: "Refining routes with 2-opt", detail: "Un-crossing each vehicle's route to remove obviously wasteful detours." },
  { key: "evaluate", label: "Evaluating cost, time & distance", detail: "Scoring every candidate against the A* baseline for the comparison table." },
];

export default function StageTicker({ active, done }) {
  const [stepIdx, setStepIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (active) {
      setStepIdx(0);
      let i = 0;
      timerRef.current = setInterval(() => {
        i = Math.min(i + 1, STAGES.length - 1);
        setStepIdx(i);
      }, 550);
      return () => clearInterval(timerRef.current);
    }
  }, [active]);

  useEffect(() => {
    if (done) {
      clearInterval(timerRef.current);
      setStepIdx(STAGES.length - 1);
    }
  }, [done]);

  if (!active) return null;

  return (
    <div className="stage-ticker">
      <div className="section-title" style={{ margin: 0 }}>
        Solving now <span className="tag">live</span>
      </div>
      <div className="stage-list">
        {STAGES.map((s, i) => {
          const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "";
          return (
            <div key={s.key} className={`stage-row ${state}`}>
              <span className="stage-icon" />
              <span>
                <strong>{s.label}</strong>
                {state === "active" && <span style={{ color: "var(--text-dim)" }}> — {s.detail}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
