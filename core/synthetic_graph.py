import networkx as nx
import numpy as np


def build_synthetic_network(n_nodes=90, seed=42, area_km=6.0):
    """Deterministic seeded road-like network. No external data or network calls,
    so it fits inside a serverless function (osmnx needs a live OSM download)."""
    n_nodes = max(int(n_nodes), 20)
    radius = 1.7 / np.sqrt(n_nodes)
    Gu = nx.random_geometric_graph(n_nodes, radius, seed=int(seed))

    comps = list(nx.connected_components(Gu))
    for i in range(len(comps) - 1):
        u = next(iter(comps[i]))
        v = next(iter(comps[i + 1]))
        Gu.add_edge(u, v)

    G = nx.MultiDiGraph()
    for n, (x, y) in nx.get_node_attributes(Gu, "pos").items():
        G.add_node(n, x=float(x * area_km), y=float(y * area_km))

    for u, v in Gu.edges():
        dx = G.nodes[u]["x"] - G.nodes[v]["x"]
        dy = G.nodes[u]["y"] - G.nodes[v]["y"]
        dist_m = float(np.hypot(dx, dy) * 1000.0)
        G.add_edge(u, v, key=0, length=dist_m, distance_m=dist_m)
        G.add_edge(v, u, key=0, length=dist_m, distance_m=dist_m)

    return G


def choose_stops(G, n, seed):
    rng = np.random.default_rng(seed)
    components = nx.strongly_connected_components(G)
    nodes = np.asarray(list(max(components, key=len)))
    n = min(int(n), len(nodes) - 1)
    chosen = rng.choice(nodes, size=n + 1, replace=False)
    return int(chosen[0]), [int(x) for x in chosen[1:]]
