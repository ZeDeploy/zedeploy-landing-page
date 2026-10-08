"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Reveal from "./Reveal";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    icon: "📊",
    title: "Monitoring",
    description:
      "Real-time visibility into your infrastructure with advanced analytics and alerting systems to catch issues before they impact users.",
  },
  {
    icon: "🔧",
    title: "Troubleshooting",
    description:
      "Expert diagnosis and resolution of infrastructure issues. Our team provides rapid response to minimize downtime and optimize performance.",
  },
  {
    icon: "⚡",
    title: "Server Updates",
    description:
      "Seamless updates and patches with zero-downtime deployment strategies. Keep your systems current and secure without disrupting operations.",
  },
  {
    icon: "🚀",
    title: "Feature Deployment",
    description:
      "Safely deploy new products and features with confidence. Our proven deployment pipelines ensure smooth releases every time.",
  },
  {
    icon: "🔒",
    title: "Secure Environments",
    description:
      "Bank-grade security standards with compliance certifications. Your data and infrastructure are protected with industry best practices.",
  },
  {
    icon: "🏗️",
    title: "Infrastructure Building",
    description:
      "Complete cloud infrastructure setup for new companies and products. We design, deploy, and optimize your entire cloud ecosystem from day one.",
  },
];

/**
 * Depth stack & fan-out (GSAP ScrollTrigger).
 *
 * The section pins in place while the visitor scrolls ~1200px. A scrubbed
 * tween eases each card's --fan custom property from 0 (stacked in the
 * center of the grid, tilted and scaled down) to 1 (settled precisely in
 * its final grid position). The stacked offsets and tilts live in
 * globals.css (--dx/--dy/--rot per card, per breakpoint); this component
 * only drives progress and the pin. Respect for prefers-reduced-motion is
 * handled both here (no trigger/pin) and in CSS (transform: none).
 */
export default function Services() {
  const [active, setActive] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    // Reduced motion: leave the cards in their final grid positions.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".service-card", section);
      // Snap the deck into its stacked state right after hydration (the
      // section sits below the fold, so no visible flash).
      gsap.set(cards, { "--fan": 0 });
      gsap.to(cards, {
        "--fan": 1,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: section,
          // Start when the section top reaches the sticky header's bottom
          // edge (~80px); hold for 1200px of scroll, like the reference.
          start: "top 80px",
          end: "+=1200",
          scrub: 1, // 1s smoothing lag behind the scrollbar
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    return () => ctx.revert(); // unpins and restores everything on unmount
  }, []);

  const handleCardClick = (index: number) => {
    setActive(active === index ? null : index);
  };

  return (
    <section className="services" id="services" ref={sectionRef}>
      <div className="services-container">
        <Reveal>
          <h2 className="section-title">Our Services</h2>
        </Reveal>
        <div className="services-grid">
          {services.map((service, index) => (
            /* No Reveal wrapper here on purpose: the pinned fan-out scrub IS
               the entrance animation. A second, staggered opacity transition
               firing mid-scrub made the cards flicker. */
            <div
              key={service.title}
              className="service-card"
              onClick={() => handleCardClick(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCardClick(index);
              }}
            >
              <div
                className="service-card-overlay"
                style={{ display: active === index ? "block" : "none" }}
              >
                <span className="service-card-overlay-text">
                  {active === index ? "See next card" : "Upgraded to full detail"}
                </span>
              </div>
              <div className="service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
