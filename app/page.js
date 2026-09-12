"use client";

import { useEffect, useRef, useState } from "react";
import RouteMap from "./components/RouteMap";
import ConvergenceChart from "./components/ConvergenceChart";
import StageTicker from "./components/StageTicker";
import MetricCard from "./components/MetricCard";
import HowItWorks from "./components/HowItWorks";
import WelcomeGuide from "./components/WelcomeGuide";
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

const WARM_PRESETS = [
  { ...DEFAULTS, customers: 16, vehicles: 5, seed: 7 },
  { ...DEFAULTS, customers: 22, vehicles: 6, seed: 11 },
];

function fmt(n, digits = 1) {
  return Number.isFinite(n) ? n.toFixed(digits) : "-";
}

function ExplanationBody({ text }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => /^[-*•]\s+/.test(l));

  if (bulletLines.length >= 2) {
    return (
      <ul className="rail-list">
        {lines.map((l, i) => (
          <li key={i}>{l.replace(/^[-*•]\s+/, "")}</li>
        ))}
      </ul>
    );
  }
  return <p className="rail-text">{text}</p>;
}

function keyOf(p) {
  return JSON.stringify(p);
}

const STORAGE_PREFIX = "qpso_cache_v1:";

function readStorage(key) {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("cache read failed", e);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn("cache write failed (quota or private mode?)", e);
  }
}

const LAST_SHOWN_KEY = "qpso_last_shown_v1";

function readLastShown() {
  try {
    const raw = window.localStorage.getItem(LAST_SHOWN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("last-shown read failed", e);
    return null;
  }
}

function writeLastShown(p, json) {
  try {
    window.localStorage.setItem(LAST_SHOWN_KEY, JSON.stringify({ params: p, data: json }));
  } catch (e) {
    console.warn("last-shown write failed", e);
  }
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

  const cacheRef = useRef({});
  const lastKeyRef = useRef(null);

  const set = (key) => (e) => {
    const value = e.target.type === "number" || e.target.type === "range" ? Number(e.target.value) : e.target.value;
    setParams((p) => ({ ...p, [key]: value }));
  };

  function checkCache(p) {
    const key = keyOf(p);
    if (cacheRef.current[key]) return cacheRef.current[key];
    const stored = readStorage(key);
    if (stored) {
      cacheRef.current[key] = stored;
      return stored;
    }
    return null;
  }

  async function fetchNetwork(p) {
    const key = keyOf(p);
    const res = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || `Request failed (${res.status})`);
    cacheRef.current[key] = json;
    writeStorage(key, json);
    return json;
  }

  // Cache-first: reuse an already-computed result (this tab or a past visit)
  // instead of ever recalculating the same scenario twice.
  async function fetchSolve(p) {
    return checkCache(p) || fetchNetwork(p);
  }

  async function run(customParams) {
    const p = customParams || params;
    lastKeyRef.current = keyOf(p);
    setError(null);

    const cached = checkCache(p);
    if (cached) {
      setData(cached);
      setParams(p);
      setAlgo("QPSO");
      setRunId((r) => r + 1);
      setLoading(false);
      setJustDone(false);
      writeLastShown(p, cached);
      return;
    }

    setLoading(true);
    setJustDone(false);
    try {
      const json = await fetchNetwork(p);
      setJustDone(true);
      setTimeout(() => {
        setData(json);
        setParams(p);
        setAlgo("QPSO");
        setRunId((r) => r + 1);
        setLoading(false);
        writeLastShown(p, json);
      }, 350);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  // Never compute anything on our own. On mount we only either (a) restore
  // whatever the user last actually ran, from storage, or (b) leave the
  // dashboard empty so the welcome guide shows instead. Either way we quietly
  // warm a couple of scenarios in the background, one by one, purely so that
  // if the user (or a cache hit) later needs them, they're already cached.
  useEffect(() => {
    const last = readLastShown();
    if (last && last.data && last.params) {
      const key = keyOf(last.params);
      cacheRef.current[key] = last.data;
      lastKeyRef.current = key;
      setParams(last.params);
      setData(last.data);
      setRunId(1);
    }

    let cancelled = false;
    (async () => {
      for (const preset of [DEFAULTS, ...WARM_PRESETS]) {
        if (cancelled) return;
        try {
          await fetchSolve(preset);
        } catch (e) {
          console.warn("background warm-up failed for preset", preset, e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate the plain-English recap whenever a new run actually lands
  // (not for silent background warm-ups, which never touch `runId`).
  useEffect(() => {
    if (runId === 0) return;
    const explainKey = `explain:${lastKeyRef.current}`;
    const cachedExplanation = readStorage(explainKey);
    if (cachedExplanation) {
      setExplanation(cachedExplanation);
      setExplaining(false);
      setExplainError(null);
      return;
    }

    let cancelled = false;
    setExplaining(true);
    setExplainError(null);
    setExplanation(null);
    (async () => {
      try {
        const trimmed = Object.fromEntries(
          Object.entries(data.results).map(([k, r]) => [k, { score: r.score, distance_m: r.distance_m, travel_time_s: r.travel_time_s }])
        );
        const usedParams = lastKeyRef.current ? JSON.parse(lastKeyRef.current) : params;
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ algo: "QPSO", results: trimmed, params: usedParams }),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || `Request failed (${res.status})`);
        if (!cancelled) {
          setExplanation(json.explanation);
          writeStorage(explainKey, json.explanation);
        }
      } catch (e) {
        if (!cancelled) setExplainError(e.message);
      } finally {
        if (!cancelled) setExplaining(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

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

            <button className="run-btn" onClick={() => run()} disabled={loading}>
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

            {!results && !loading && <WelcomeGuide />}

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
              </>
            )}
          </main>

          <aside className="rail">
            <h2 style={{ margin: "0 0 0.9rem" }}>In Plain English</h2>
            {!results && (
              <p className="hint">A friendly, jargon-free explanation of what the algorithm just did will appear here as soon as a run loads.</p>
            )}
            {results && explaining && (
              <div className="rail-skeleton">
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            )}
            {results && explainError && <div className="error-banner">{explainError}</div>}
            {results && explanation && !explaining && <ExplanationBody text={explanation} />}
          </aside>
        </div>
      )}
    </>
  );
}
