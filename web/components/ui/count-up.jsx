"use client";
import { useEffect, useRef, useState } from "react";

export function CountUp({ value, format = (n) => n, duration = 850, className }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = Number(value) || 0;
    if (reduce || from === to) { fromRef.current = to; setDisplay(to); return; }
    let start;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className={className}>{format(Math.round(display))}</span>;
}
