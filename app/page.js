"use client";

import { useState } from "react";
import RouteMap from "./components/RouteMap";
import ConvergenceChart from "./components/ConvergenceChart";
import StageTicker from "./components/StageTicker";
import MetricCard from "./components/MetricCard";
import HowItWorks from "./components/HowItWorks";
import { ALGO_COLORS } from "./components/colors";

const DEFAULTS = {
  customers: 10,
  vehicles: 4,
  capacity: 25,
  trafficMode: "simulated",
  seed: 42,
  distanceWeight: 0.2,
  particles: 40,
  iterations: 80,
  networkSize: 90,
};

function fmt(n, digits = 1) {
  return Number.isFinite(n) ? n.toFixed(digits) : "-";
}

export default function Page() {
  const [page, setPage] = useState("dashboard");
  const [params, setParams] = useState(DEFAULTS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [algo, setAlgo] = useState("QPSO");
  const [view, setView] = useState("map");
  const [runId, setRunId] = useState(0);
  const [justDone, setJustDone] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState(null);

  const set = (key) => (e) => {
    const value = e.target.type === "number" || e.target.type === "range" ? Number(e.target.value) : e.target.value;
    setParams((p) => ({ ...p, [key]: value }));
  };

  async function run() {
    setLoading(true);
    setJustDone(false);
    setError(null);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `Request failed (${res.status})`);
      setJustDone(true);
      setTimeout(() => {
        setData(json);
        setAlgo("QPSO");
        setRunId((r) => r + 1);
        setLoading(false);
        setExplanation(null);
        setExplainError(null);
      }, 450);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function explainRun() {
    setExplaining(true);
    setExplainError(null);
    try {
      const trimmed = Object.fromEntries(
        Object.entries(results).map(([k, r]) => [k, { score: r.score, distance_m: r.distance_m, travel_time_s: r.travel_time_s }])
      );
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ algo, results: trimmed }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `Request failed (${res.status})`);
      setExplanation(json.explanation);
    } catch (e) {
      setExplainError(e.message);
    } finally {
      setExplaining(false);
    }
  }

  const results = data?.results;
  const primary = results?.[algo];

  const qpsoDist = (results?.QPSO?.distance_m || 0) / 1000;
  const astarDist = (results?.["A*"]?.distance_m || 0) / 1000;
  const distSavedKm = Math.max(0, astarDist - qpsoDist);
  const litersSaved = distSavedKm / 8.0;
  const rupeesSaved = litersSaved * 100.0;
  const co2Saved = litersSaved * 2.68;

  const maxDist = results ? Math.max(...Object.values(results).map((r) => r.distance_m || 0)) || 1 : 1;

  return (
    <>
      <nav className="topnav">
        <div className="brand">
          <span className="dot" />
          QPSO CVRPTW
          <small>quantum-inspired route optimization</small>
        </div>
        <div className="nav-tabs">
          <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>Live Dashboard</button>
          <button className={page === "howitworks" ? "active" : ""} onClick={() => setPage("howitworks")}>How It Works</button>
        </div>
      </nav>

      {page === "howitworks" ? (
        <HowItWorks />
      ) : (
        <div className="layout">
          <aside className="sidebar">
            <h2>Fleet</h2>
            <div className="field">
              <label><span>Delivery Stops</span><span>{params.customers}</span></label>
              <input type="range" min={4} max={30} value={params.customers} onChange={set("customers")} />
            </div>
            <div className="field">
              <label><span>Fleet Size</span><span>{params.vehicles}</span></label>
              <input type="range" min={1} max={10} value={params.vehicles} onChange={set("vehicles")} />
            </div>
            <div className="field">
              <label><span>Vehicle Capacity</span></label>
              <input type="number" value={params.capacity} step={1} onChange={set("capacity")} />
            </div>

            <h2>Traffic Engine</h2>
            <div className="field radio-group">
              <label><input type="radio" checked={params.trafficMode === "simulated"} onChange={() => setParams((p) => ({ ...p, trafficMode: "simulated" }))} /> Simulated</label>
              <label><input type="radio" checked={params.trafficMode === "live"} onChange={() => setParams((p) => ({ ...p, trafficMode: "live" }))} /> Live (Mock)</label>
            </div>
            <div className="field">
              <label><span>Stochastic Seed</span><span>{params.seed}</span></label>
              <input type="number" min={0} max={9999} value={params.seed} onChange={set("seed")} />
            </div>

            <h2>Optimization Engine</h2>
            <div className="field">
              <label><span>Distance Penalty (&beta;)</span><span>{params.distanceWeight}</span></label>
              <input type="range" min={0} max={1} step={0.05} value={params.distanceWeight} onChange={set("distanceWeight")} />
            </div>
            <div className="field">
              <label><span>Swarm/Population Size</span><span>{params.particles}</span></label>
              <input type="range" min={10} max={100} value={params.particles} onChange={set("particles")} />
            </div>
            <div className="field">
              <label><span>Max Iterations</span><span>{params.iterations}</span></label>
              <input type="range" min={20} max={300} value={params.iterations} onChange={set("iterations")} />
            </div>
            <div className="field">
              <label><span>Road Network Size</span><span>{params.networkSize}</span></label>
              <input type="range" min={30} max={200} value={params.networkSize} onChange={set("networkSize")} />
            </div>

            <button className="run-btn" onClick={run} disabled={loading}>
              {loading ? (justDone ? "Done!" : "Solving...") : "Initialize Dispatch Sequence"}
            </button>
          </aside>

          <main className="main">
            <div className="hero">
              <h1>Enterprise Route Optimization Dashboard</h1>
              <p>Quantum-Inspired framework minimizing operational cost and CO2 emissions in a synthetic road network, solved live on Vercel.</p>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <StageTicker active={loading} done={justDone} />

            {!data && !error && !loading && (
              <p className="hint">Configure fleet parameters and click &ldquo;Initialize Dispatch Sequence&rdquo; to run QPSO, GA and A* on a freshly generated network. Curious what actually happens? Check &ldquo;How It Works&rdquo; above.</p>
            )}

            {results && (
              <>
                <div className="section-title">Fleet Impact (QPSO vs. A* Baseline)</div>
                <div className="metric-grid">
                  <MetricCard label="Route Optimization" value={qpsoDist} suffix=" km" sub={<span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>from {fmt(astarDist)}</span>} delay={0} />
                  <MetricCard label="Operational Savings" value={rupeesSaved} digits={0} prefix="₹ " highlight delay={60} />
                  <MetricCard label="Fuel Reduction" value={litersSaved} suffix=" L" highlight delay={120} />
                  <MetricCard label="Carbon Offset" value={co2Saved} prefix="↓ " suffix=" kg" highlight delay={180} />
                </div>

                <div className="section-title">
                  Operational Telemetry <span className="tag">animated</span>
                </div>
                <div className="toolbar">
                  <div className="tabs">
                    {["QPSO", "GA", "A*"].map((a) => (
                      <button
                        key={a}
                        className={`tab ${algo === a ? "active" : ""}`}
                        style={algo === a ? { background: ALGO_COLORS[a], borderColor: ALGO_COLORS[a], color: "#04070b" } : {}}
                        onClick={() => setAlgo(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="tabs">
                    <button className={`tab ${view === "map" ? "active" : ""}`} onClick={() => setView("map")}>Map View</button>
                    <button className={`tab ${view === "chart" ? "active" : ""}`} onClick={() => setView("chart")}>Convergence</button>
                  </div>
                </div>

                <div className="panel">
                  {view === "map" ? (
                    <RouteMap key={`map-${algo}-${runId}`} graph={data.graph} routes={primary?.routes} />
                  ) : (
                    <ConvergenceChart key={`chart-${runId}`} results={results} />
                  )}
                </div>

                <div className="section-title">Engine Comparison</div>
                <div className="panel">
                  <table className="compare">
                    <thead>
                      <tr><th>Method</th><th>Total Cost</th><th>Distance</th><th>Travel Time (min)</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(results)
                        .sort((a, b) => (a[1].score ?? Infinity) - (b[1].score ?? Infinity))
                        .map(([name, r]) => (
                          <tr key={name}>
                            <td>{r.algorithm}</td>
                            <td>{fmt(r.score, 2)}</td>
                            <td>
                              <div className="bar-cell">
                                <span style={{ width: 62 }}>{fmt((r.distance_m || 0) / 1000, 2)} km</span>
                                <div className="bar-track">
                                  <div
                                    className="bar-fill"
                                    style={{
                                      width: `${Math.max(4, ((r.distance_m || 0) / maxDist) * 100)}%`,
                                      background: ALGO_COLORS[name] || "#888",
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td>{fmt((r.travel_time_s || 0) / 60, 1)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="section-title">
                  Plain-English Recap <span className="tag">AI</span>
                </div>
                <div className="panel">
                  {!explanation && !explaining && (
                    <button className="tab" onClick={explainRun}>Explain this run in plain English</button>
                  )}
                  {explaining && <p className="hint">Asking an LLM to summarize this run&hellip;</p>}
                  {explainError && <div className="error-banner">{explainError}</div>}
                  {explanation && (
                    <>
                      <p style={{ lineHeight: 1.6, margin: 0 }}>{explanation}</p>
                      <button className="tab" style={{ marginTop: "0.8rem" }} onClick={explainRun}>Regenerate</button>
                    </>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </>
  );
}
