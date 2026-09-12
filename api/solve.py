import json
import math
import os
import sys
import traceback
from urllib.parse import parse_qs

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np

from core.synthetic_graph import build_synthetic_network, choose_stops
from core.traffic import apply_traffic_scenario
from core.vrp import Customer, VRPInstance
from core.engine import solve_qpso, solve_ga_baseline
from core.heuristics import solve_dynamic_heuristic


def _clean(obj):
    if isinstance(obj, float):
        return None if (math.isinf(obj) or math.isnan(obj)) else obj
    if isinstance(obj, np.floating):
        return _clean(float(obj))
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean(v) for v in obj]
    return obj


def _solve(params):
    n_customers = max(4, min(30, int(params.get("customers", 10))))
    vehicles = max(1, min(10, int(params.get("vehicles", 4))))
    capacity = float(params.get("capacity", 25.0))
    seed = int(params.get("seed", 42))
    traffic_mode = "live" if params.get("trafficMode") == "live" else "simulated"
    distance_weight = float(params.get("distanceWeight", 0.2))
    particles = max(10, min(100, int(params.get("particles", 40))))
    iterations = max(20, min(300, int(params.get("iterations", 80))))
    network_size = max(30, min(200, int(params.get("networkSize", 90))))

    G0 = build_synthetic_network(n_nodes=network_size, seed=seed)
    G = apply_traffic_scenario(G0, seed=seed, mode=traffic_mode)

    depot, customer_nodes = choose_stops(G, n_customers, seed=seed)
    demands = np.random.default_rng(seed).integers(1, 8, size=len(customer_nodes))
    customers = [Customer(node=n, demand=float(d)) for n, d in zip(customer_nodes, demands)]
    instance = VRPInstance(depot=depot, customers=customers, vehicle_capacity=capacity, num_vehicles=vehicles)

    results = {}
    results["A*"] = solve_dynamic_heuristic(G, instance, method="astar", distance_weight=distance_weight)
    results["QPSO"] = solve_qpso(G, instance, particles=particles, iterations=iterations, seed=seed, distance_weight=distance_weight)
    results["GA"] = solve_ga_baseline(G, instance, particles=particles, iterations=iterations, seed=seed, distance_weight=distance_weight)

    for res in results.values():
        res.pop("paths", None)

    nodes = [{"id": int(n), "x": G.nodes[n]["x"], "y": G.nodes[n]["y"]} for n in G.nodes]
    seen = set()
    edges = []
    for u, v in G.edges():
        key = (min(u, v), max(u, v))
        if key in seen:
            continue
        seen.add(key)
        edges.append({"u": int(u), "v": int(v)})

    return {
        "results": results,
        "graph": {"nodes": nodes, "edges": edges, "depot": depot, "customers": customer_nodes},
    }


def app(environ, start_response):
    method = environ.get("REQUEST_METHOD", "GET")

    if method == "OPTIONS":
        start_response("204 No Content", [("Content-Length", "0")])
        return [b""]

    try:
        if method == "POST":
            length = int(environ.get("CONTENT_LENGTH") or 0)
            raw = environ["wsgi.input"].read(length) if length else b"{}"
            params = json.loads(raw or b"{}")
        else:
            qs = parse_qs(environ.get("QUERY_STRING", ""))
            params = {k: v[0] for k, v in qs.items()}

        payload = _clean(_solve(params))
        body = json.dumps(payload).encode("utf-8")
        status = "200 OK"
    except Exception as exc:
        traceback.print_exc()
        body = json.dumps({"error": str(exc)}).encode("utf-8")
        status = "500 Internal Server Error"

    headers = [
        ("Content-Type", "application/json"),
        ("Content-Length", str(len(body))),
        ("Access-Control-Allow-Origin", "*"),
    ]
    start_response(status, headers)
    return [body]
