import json
import os
import sys
import urllib.request
import urllib.error

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-4o-mini"


def _build_prompt(payload):
    algo = payload.get("algo", "QPSO")
    results = payload.get("results", {})
    lines = []
    for name, r in results.items():
        dist_km = round((r.get("distance_m") or 0) / 1000, 2)
        time_min = round((r.get("travel_time_s") or 0) / 60, 1)
        lines.append(f"{name}: cost={r.get('score')}, distance_km={dist_km}, travel_time_min={time_min}")
    summary = "\n".join(lines)
    return (
        "You are explaining the result of a vehicle routing optimization run to a non-technical reader. "
        "Use simple, friendly, plain English, no jargon, no equations, no markdown. Keep it to 3-4 short sentences. "
        f"The reader is currently looking at the '{algo}' result.\n\n"
        f"Raw results:\n{summary}\n\n"
        "Explain what just happened and why the numbers differ between methods."
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
            "max_tokens": 220,
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
