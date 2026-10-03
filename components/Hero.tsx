"use client";

import { useMemo } from "react";

/**
 * Deterministic pseudo-random particles (seeded so SSR and client render
 * the same set — avoids hydration mismatches).
 */
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const PARTICLE_COUNT = 14;

export default function Hero() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const r1 = seededRandom(i * 3 + 1);
        const r2 = seededRandom(i * 3 + 2);
        const r3 = seededRandom(i * 3 + 3);
        return {
          left: `${(r1 * 100).toFixed(2)}%`,
          size: `${(r2 * 4 + 2).toFixed(2)}px`,
          delay: `${(r3 * 10).toFixed(2)}s`,
          duration: `${(r2 * 8 + 9).toFixed(2)}s`,
          drift: `${((r1 - 0.5) * 120).toFixed(1)}px`,
          gold: r3 > 0.55,
        };
      }),
    [],
  );

  return (
    <section className="hero">
      {/* Ambient floating particles (purely decorative) */}
      <div className="hero-particles" aria-hidden="true">
        {particles.map((p, i) => (
          <span
            key={i}
            className={`hero-particle${p.gold ? " is-gold" : ""}`}
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              "--drift": p.drift,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Soft glowing orbs behind the glass card — the card's backdrop
           blur diffuses them, which is what makes the frosted glass read
           as real glass (purely decorative) */}
      <div className="hero-glass-orbs" aria-hidden="true">
        <span className="orb orb-gold" />
        <span className="orb orb-green" />
        <span className="orb orb-white" />
      </div>

      <div className="hero-container">
        <h1>
          <span className="hero-title-main hero-anim hero-anim-1">
            Transform Your Business
          </span>
          <span className="hero-title-line hero-anim hero-anim-2">with</span>
          <span className="hero-title-line hero-highlight hero-anim hero-anim-3">
            <span className="hero-shimmer">Web &amp; AI Automation</span>
          </span>
        </h1>
        <p className="hero-description hero-anim hero-anim-4">
          We build professional websites, intelligent AI agents, and seamless
          automation systems to save you time, multiply your sales, and run
          your business 24/7.
        </p>
        <div className="hero-actions hero-anim hero-anim-5">
          <a href="#contact-form" className="cta-button">
            Book Free Consultation
          </a>
          <a href="#services" className="cta-secondary">
            Explore Services
          </a>
        </div>
      </div>

      {/* Scroll cue */}
      <a href="#services" className="hero-scroll-cue" aria-label="Scroll to services">
        <span className="hero-scroll-mouse" aria-hidden="true">
          <span className="hero-scroll-wheel" />
        </span>
      </a>
    </section>
  );
}
