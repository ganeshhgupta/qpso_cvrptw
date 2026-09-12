RENDER_URL = "https://qpso-cvrptw.onrender.com/"

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QPSO CVRPTW</title>
<style>
  html,body{{margin:0;height:100%;font-family:system-ui,sans-serif;background:#0b0f14;color:#e6edf3}}
  .bar{{padding:.75rem 1rem;border-bottom:1px solid #21262d;display:flex;align-items:center;gap:.75rem}}
  .bar a{{color:#58a6ff;text-decoration:none}}
  iframe{{border:0;width:100%;height:calc(100% - 50px)}}
</style>
</head>
<body>
  <div class="bar">
    <strong>Quantum-Inspired PSO &mdash; CVRPTW</strong>
    <span style="opacity:.6">served from Render</span>
    <a href="{render_url}" target="_blank" rel="noopener">Open directly &rarr;</a>
  </div>
  <iframe src="{render_url}" title="QPSO CVRPTW app" allow="fullscreen"></iframe>
</body>
</html>
""".format(render_url=RENDER_URL)


def app(environ, start_response):
    body = PAGE.encode("utf-8")
    status = "200 OK"
    headers = [
        ("Content-Type", "text/html; charset=utf-8"),
        ("Content-Length", str(len(body))),
    ]
    start_response(status, headers)
    return [body]
