"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  /** Final display value, e.g. "500+", "99.99%", "<2m". */
  value: string;
  /** Animation duration in ms. */
  duration?: number;
};

/**
 * Animated count-up for stat values. Parses the numeric part of the value
 * ("500+", "99.99%", "<2m") and animates it from 0 to the target, then
 * re-appends the surrounding decorations. Non-numeric values render as-is.
 */
export default function CountUp({ value, duration = 1600 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState("0");
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Extract leading decorations, number, and trailing decorations.
    const match = value.match(/^([^\d]*)([\d.]+)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr);
    const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;

    // Reduced motion: jump straight to the final value.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const t0 = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - t0) / duration, 1);
              // Ease-out cubic for a natural "settling" feel.
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = (target * eased).toFixed(decimals);
              setDisplay(`${prefix}${current}${suffix}`);
              if (progress < 1) {
                requestAnimationFrame(tick);
              }
            };
            requestAnimationFrame(tick);
            observer.disconnect();
          }
        }
        return;
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display}</span>;
}
