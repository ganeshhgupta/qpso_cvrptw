"use client";

const PIPELINE = [
  { n: "01", h: "Road Network", p: "A deterministic, seeded graph of junctions and streets is generated (no live map fetch, so it runs instantly in a serverless function)." },
  { n: "02", h: "Traffic Scenario", p: "Every road segment gets a congestion multiplier, turning raw distance into realistic travel time." },
  { n: "03", h: "Random-Key Encoding", p: "The depot + customers are represented as one real-valued vector in [0,1] per stop." },
  { n: "04", h: "Swarm Optimization", p: "QPSO and a Genetic Algorithm search that continuous space in parallel, each generating a full run history." },
  { n: "05", h: "2-opt Refinement", p: "Each candidate route is locally repaired to remove crossed/overlapping legs." },
  { n: "06", h: "Scoring", p: "Every method is evaluated on the same cost function and compared against an A* constructive baseline." },
];

export default function HowItWorks() {
  return (
    <div className="hiw">
      <h2>Under the hood</h2>
      <p className="lead">
        This isn&rsquo;t a canned demo — every run generates a fresh road network and solves it live, in the same
        serverless function that answers your request. Here&rsquo;s exactly what happens between clicking
        &ldquo;Initialize Dispatch Sequence&rdquo; and seeing routes on the map.
      </p>

      <h3>Pipeline</h3>
      <div className="pipeline">
        {PIPELINE.map((s, i) => (
          <div key={s.n} className="pipe-step" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="num">{s.n}</div>
            <h4>{s.h}</h4>
            <p>{s.p}</p>
          </div>
        ))}
      </div>

      <h3>The three methods being compared</h3>
      <div className="algo-cards">
        <div className="algo-card" style={{ "--c": "#ef476f" }}>
          <h4><span className="swatch" /> QPSO</h4>
          <p>
            Quantum-Inspired Particle Swarm Optimization. Instead of moving toward a target in a straight line like
            classic PSO, each particle samples its next position from a probability cloud centered between its own
            best-known position and the swarm&rsquo;s best &mdash; a wider, less predictable search step that resists
            getting stuck in local minima.
          </p>
        </div>
        <div className="algo-card" style={{ "--c": "#ffb703" }}>
          <h4><span className="swatch" /> Genetic Algorithm</h4>
          <p>
            A population of candidate orderings evolves through tournament selection, arithmetic crossover, and
            Gaussian mutation, with the best individual carried over unchanged each generation (elitism). Runs on the
            exact same cost function as QPSO, making it a fair apples-to-apples baseline.
          </p>
        </div>
        <div className="algo-card" style={{ "--c": "#8fa1b8" }}>
          <h4><span className="swatch" /> A* Constructive</h4>
          <p>
            A greedy, non-metaheuristic baseline: repeatedly send each vehicle to whichever unvisited customer is
            cheapest to reach next, respecting capacity. Fast and deterministic, but shortsighted &mdash; it never
            revisits an earlier decision.
          </p>
        </div>
      </div>

      <h3>Random-key encoding, concretely</h3>
      <p className="lead" style={{ marginBottom: "0.8rem" }}>
        Both QPSO and GA search in continuous space, so a particle&rsquo;s position has to become a delivery order.
        Sorting the vector&rsquo;s values gives a permutation of customers, which is then greedily sliced into
        vehicle routes as capacity is reached:
      </p>
      <div className="formula-block">{`particle   = [0.71, 0.13, 0.94, 0.31, 0.55]
sorted →     customer_2, customer_4, customer_5, customer_1, customer_3
sliced by vehicle_capacity → Route 1: [depot, c2, c4, depot]
                              Route 2: [depot, c5, c1, c3, depot]`}</div>

      <h3>The QPSO update rule</h3>
      <p className="lead" style={{ marginBottom: "0.8rem" }}>
        This is the actual math driving the swarm shown in the convergence chart. <code>mbest</code> is the mean of
        every particle&rsquo;s personal best; each particle is pulled toward a random blend of its own best and the
        global best, then displaced by a log-scaled random walk around that point.
      </p>
      <div className="formula-block">{`mbest = mean(personal_best_positions)

P = phi * pbest + (1 - phi) * gbest        (phi ~ U(0,1))

X_new = P ± beta * |mbest - X| * ln(1 / u)   (u ~ U(0,1))`}</div>

      <h3>Why the map looks the way it does</h3>
      <p className="lead">
        Dots are road junctions; the larger white dots are customer stops; the amber square is the depot. Colored
        lines are the routes actually returned by the selected algorithm for this run, drawn in the order they were
        computed &mdash; the small moving dot on each route is a stand-in vehicle looping its assigned stops.
      </p>
    </div>
  );
}
