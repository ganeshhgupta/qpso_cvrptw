"use client";

import { useEffect, useRef, useState } from "react";

export default function MetricCard({ label, value, digits = 1, prefix = "", suffix = "", highlight = false, delay = 0, sub }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const start = performance.now();
    const duration = 800;

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return (
    <div className="metric-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${highlight ? "metric-highlight" : ""}`}>
        {prefix}{display.toFixed(digits)}{suffix} {sub}
      </div>
    </div>
  );
}
