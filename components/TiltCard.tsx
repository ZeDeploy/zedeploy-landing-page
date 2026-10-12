"use client";

import { useCallback, useRef } from "react";

// Max tilt angle (deg) when the pointer reaches a card edge
const MAX_TILT = 10;

/**
 * Mouse-following holographic tilt, shared by the contact cards and the
 * service cards. As the pointer moves across a card, CSS custom
 * properties (--rx/--ry) drive a subtle 3D rotation and a glare highlight
 * (--gx/--gy) that tracks the cursor like a reflection on glass.
 *
 * Pure CSS-variable wiring — no per-frame React state, so it stays smooth.
 * Disabled for touch input and reduced-motion users via matchMedia.
 */
export default function TiltCard({
  children,
  className,
  ...rest
}: React.ComponentPropsWithoutRef<"div">) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    // Skip the effect for touch input and reduced-motion preference.
    if (
      card &&
      e.pointerType !== "touch" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1 across the card
      const py = (e.clientY - rect.top) / rect.height;
      card.style.setProperty("--ry", `${(px - 0.5) * MAX_TILT * 2}deg`);
      card.style.setProperty("--rx", `${(0.5 - py) * MAX_TILT * 2}deg`);
      card.style.setProperty("--gx", `${px * 100}%`);
      card.style.setProperty("--gy", `${py * 100}%`);
    }
  }, []);

  const handleLeave = useCallback(() => {
    const card = cardRef.current;
    if (card) {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...rest}
    >
      {children}
    </div>
  );
}
