"use client";
import { useEffect, useState } from "react";

export function Ring({ value = 0, size = 76, stroke = 8, className, children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = mounted ? Math.min(1, Math.max(0, value)) : 0;
  const off = c * (1 - pct);
  return (
    <div className={"relative " + (className || "")} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
