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

  // Pointer-driven press state. :hover never fires on touch and :active is
  // unreliable there (measured: emulated/headless touch never enters it at
  // all, and iOS Safari only honours :active when an ancestor carries an
  // onclick handler), so the tap feedback is driven by a class instead —
  // pointerdown/up fire on every touch device. On release the class lingers
  // briefly so the glow is perceivable after the finger lifts, then the
  // card's own transitions fade it out.
  const pressedRef = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReleaseTimer = useCallback(() => {
    if (releaseTimer.current) {
      clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
    }
  }, []);

  const handleLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    // Finger/button still down and dragged off: drop the press immediately.
    // After an actual release the pending linger timer keeps running.
    if (pressedRef.current) {
      pressedRef.current = false;
      clearReleaseTimer();
      card.classList.remove("is-pressed");
    }
  }, [clearReleaseTimer]);

  const handleDown = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    pressedRef.current = true;
    clearReleaseTimer();
    card.classList.add("is-pressed");
  }, [clearReleaseTimer]);

  const handleUp = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    pressedRef.current = false;
    clearReleaseTimer();
    releaseTimer.current = setTimeout(() => {
      card.classList.remove("is-pressed");
      releaseTimer.current = null;
    }, 320);
  }, [clearReleaseTimer]);

  return (
    <div
      ref={cardRef}
      className={className}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      {...rest}
    >
      {children}
    </div>
  );
}
