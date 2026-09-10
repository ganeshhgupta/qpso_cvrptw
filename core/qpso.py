import numpy as np

class QPSO:
    """
    Maximally Efficient Quantum-behaved Particle Swarm Optimization.
    Features matrix-vectorization for speed and topological boundary clipping 
    for Random-Key stability.
    """

    def __init__(self, evaluate, n_particles=30, iterations=100,
                 beta_max=1.0, beta_min=0.5, seed=42):
        self.evaluate = evaluate
        self.n_particles = n_particles
        self.iterations = iterations
        self.beta_max = beta_max
        self.beta_min = beta_min
        self.rng = np.random.default_rng(seed)

    def optimize(self, dimension):
        X = self.rng.uniform(0.0, 1.0, (self.n_particles, dimension))
        pbest = X.copy()
        
        pbest_score = np.zeros(self.n_particles)
        for i in range(self.n_particles):
            score, _ = self.evaluate(X[i])
            pbest_score[i] = score

        g_idx = int(np.argmin(pbest_score))
        gbest = pbest[g_idx].copy()
        gbest_score = float(pbest_score[g_idx])

        history = [gbest_score]
        
        # --- NEW: Stagnation Tracker ---
        stagnation_counter = 0  
        stagnation_limit = 15   # If no improvement for 15 steps, trigger reset

        for t in range(self.iterations):
            beta = self.beta_max - (self.beta_max - self.beta_min) * (t / max(1, self.iterations - 1))
            mbest = np.mean(pbest, axis=0)

            # Vectorized Quantum Math
            phi = self.rng.random((self.n_particles, dimension))
            attractor = phi * pbest + (1.0 - phi) * gbest
            u = np.clip(self.rng.random((self.n_particles, dimension)), 1e-12, 1.0)
            direction = np.where(self.rng.random((self.n_particles, dimension)) < 0.5, -1.0, 1.0)
            
            step = beta * np.abs(mbest - X) * np.log(1.0 / u)
            X = attractor + direction * step
            X = np.clip(X, 0.0, 1.0)

            # --- NEW: Diversity Injection (The Escape Hatch) ---
            if stagnation_counter > stagnation_limit:
                # Find the worst 50% of particles and completely randomize their positions
                worst_indices = np.argsort(pbest_score)[self.n_particles // 2:]
                X[worst_indices] = self.rng.uniform(0.0, 1.0, (len(worst_indices), dimension))
                stagnation_counter = 0 # Reset counter after injection
            # ---------------------------------------------------

            improved_this_step = False

            for i in range(self.n_particles):
                score, _ = self.evaluate(X[i])

                if score < pbest_score[i]:
                    pbest[i] = X[i].copy()
                    pbest_score[i] = score

                    if score < gbest_score:
                        gbest = X[i].copy()
                        gbest_score = float(score)
                        improved_this_step = True

            # Track stagnation
            if improved_this_step:
                stagnation_counter = 0
            else:
                stagnation_counter += 1

            history.append(gbest_score)

        return gbest, gbest_score, history