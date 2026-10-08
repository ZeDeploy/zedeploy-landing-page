"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    /** Exposed for tests (CDP scripts need programmatic scrolling). */
    __lenis?: Lenis;
  }
}

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so the pinned services
 * fan-out (and every other ScrollTrigger) stays perfectly in sync with the
 * eased scroll position instead of snapping between raw scroll events.
 * Skipped entirely for prefers-reduced-motion users.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.1 }); // 0.1 = gentle trailing ease
    window.__lenis = lenis;

    // Keep ScrollTrigger measurements on the eased scroll position.
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    // Recommended by Lenis: avoid GSAP's lag smoothing fighting the lerp.
    gsap.ticker.lagSmoothing(0);

    // Route same-page anchor clicks through Lenis so nav links glide like
    // the rest of the page. No manual header offset needed: Lenis honors
    // the html's scroll-padding-top: 120px for element targets.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.("a[href^='#']");
      const hash = link?.getAttribute("href");
      if (!hash || hash.length < 2) return; // plain "#" placeholder links
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement);
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33); // restore GSAP defaults
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  return null;
}
