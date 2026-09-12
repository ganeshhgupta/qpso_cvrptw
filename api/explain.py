import json
import os
import sys
import urllib.request
import urllib.error

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-4o-mini"


def _build_prompt(payload):
    results = payload.get("results", {})
    params = payload.get("params", {}) or {}

    lines = []
    for name, r in results.items():
        dist_km = round((r.get("distance_m") or 0) / 1000, 2)
        time_min = round((r.get("travel_time_s") or 0) / 60, 1)
        lines.append(f"{name}: cost={r.get('score')}, distance_km={dist_km}, travel_time_min={time_min}")
    summary = "\n".join(lines)

    scenario = (
        f"customers={params.get('customers')}, vehicles={params.get('vehicles')}, "
        f"vehicle_capacity={params.get('capacity')}, traffic_mode={params.get('trafficMode')}, "
        f"distance_penalty_weight={params.get('distanceWeight')}, swarm_size={params.get('particles')}, "
        f"max_iterations={params.get('iterations')}, road_network_size={params.get('networkSize')}"
    )

    return (
        "You are a patient, encouraging teacher explaining a vehicle-routing optimization run to a student who has "
        "never seen this before. Write an elaborate, easy-to-follow explanation as a bullet-point list of 6 to 9 "
        "bullets. Each bullet must start with '- ' and contain one complete idea. Use simple, plain English: no "
        "jargon, no equations, no markdown headers or bold, just the bullet list itself.\n\n"
        "Cover, in this rough order:\n"
        "1. What problem this specific run was solving, in the student's own scenario (mention the number of "
        "delivery stops and vehicles).\n"
        "2. What each of the three methods (QPSO, GA, A*) actually did, in intuitive terms (no formulas) - "
        "e.g. QPSO as a swarm exploring possibilities, GA as evolving generations of route plans, A* as a "
        "quick greedy planner.\n"
        "3. What the resulting numbers (cost, distance, time) mean in practice and why they differ between "
        "methods.\n"
        "4. The real-world takeaway - money, fuel and CO2 saved by picking the best method over the naive "
        "baseline.\n\n"
        f"Scenario parameters:\n{scenario}\n\n"
        f"Results:\n{summary}\n\n"
        "Respond with ONLY the bullet list, one bullet per line, each starting with '- '."
    )


def app(environ, start_response):
    method = environ.get("REQUEST_METHOD", "GET")

    if method == "OPTIONS":
        start_response("204 No Content", [("Content-Length", "0")])
        return [b""]

    try:
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not configured on the server")

        length = int(environ.get("CONTENT_LENGTH") or 0)
        raw = environ["wsgi.input"].read(length) if length else b"{}"
        payload = json.loads(raw or b"{}")

        prompt = _build_prompt(payload)
        req_body = json.dumps({
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 650,
            "temperature": 0.6,
        }).encode("utf-8")

        req = urllib.request.Request(
            OPENROUTER_URL,
            data=req_body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://qpsocvrptw.vercel.app",
                "X-Title": "QPSO CVRPTW",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        text = data["choices"][0]["message"]["content"].strip()
        body = json.dumps({"explanation": text}).encode("utf-8")
        status = "200 OK"
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")
        print(f"OpenRouter HTTPError {exc.code}: {detail}", file=sys.stderr)
        body = json.dumps({"error": f"OpenRouter request failed ({exc.code})"}).encode("utf-8")
        status = "502 Bad Gateway"
    except Exception as exc:
        print(f"explain error: {exc}", file=sys.stderr)
        body = json.dumps({"error": str(exc)}).encode("utf-8")
        status = "500 Internal Server Error"

    headers = [
        ("Content-Type", "application/json"),
        ("Content-Length", str(len(body))),
        ("Access-Control-Allow-Origin", "*"),
    ]
    start_response(status, headers)
    return [body]
