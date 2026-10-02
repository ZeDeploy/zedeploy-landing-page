"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Direction the content travels from while fading in. */
  from?: "up" | "down" | "left" | "right" | "scale" | "none";
  /** Extra transition delay in ms — use to stagger siblings. */
  delay?: number;
  className?: string;
};

const FROM_CLASS: Record<NonNullable<RevealProps["from"]>, string> = {
  up: "reveal-up",
  down: "reveal-down",
  left: "reveal-left",
  right: "reveal-right",
  scale: "reveal-scale",
  none: "reveal-fade",
};

/**
 * Scroll-reveal wrapper: children start hidden/offset and transition in
 * when the element first enters the viewport. Purely presentational —
 * content is fully present for SSR/SEO and reduced-motion users.
 */
export default function Reveal({
  children,
  from = "up",
  delay = 0,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If IntersectionObserver is unavailable, show content immediately.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
        return;
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "reveal",
        FROM_CLASS[from],
        shown ? "is-shown" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
