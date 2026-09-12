"use client";

const CONTROLS = [
  { name: "Delivery Stops", body: "How many customer locations to generate on the map (4–30). More stops = a harder routing problem." },
  { name: "Fleet Size", body: "The maximum number of vehicles available. The optimizer will use fewer than this if that's actually cheaper — it's a ceiling, not a target." },
  { name: "Vehicle Capacity", body: "How much total demand one vehicle can carry per trip before it must return to the depot." },
  { name: "Traffic Engine", body: "Simulated gives reproducible random congestion; Live (Mock) simulates rush-hour-style jams around a few “downtown” junctions." },
  { name: "Stochastic Seed", body: "Controls every random choice in the run (network layout, demands, traffic). Same seed + same settings = the exact same scenario every time." },
  { name: "Distance Penalty (β)", body: "How much raw distance matters versus travel time in the cost function. Higher = shorter routes are favored even if slightly slower." },
  { name: "Swarm/Population Size", body: "An internal tuning knob for QPSO and GA: how many candidate solutions they search with in parallel. Not related to vehicle count." },
  { name: "Max Iterations", body: "How many rounds QPSO and GA get to improve their candidate solutions before stopping." },
  { name: "Road Network Size", body: "How many road junctions make up the generated street network underneath the routes." },
];

export default function WelcomeGuide() {
  return (
    <div className="welcome">
      <p className="hint" style={{ marginBottom: "1.1rem" }}>
        Nothing&rsquo;s been run yet. Adjust the controls on the left to describe a delivery scenario, then click
        &ldquo;Initialize Dispatch Sequence&rdquo; to solve it live with QPSO, GA and A* — here&rsquo;s what each
        control does:
      </p>
      <dl className="welcome-grid">
        {CONTROLS.map((c) => (
          <div key={c.name} className="welcome-item">
            <dt>{c.name}</dt>
            <dd>{c.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
