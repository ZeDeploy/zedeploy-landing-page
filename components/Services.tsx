"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Reveal from "./Reveal";
import TiltCard from "./TiltCard";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    icon: "📊",
    title: "Monitoring",
    description:
      "Real-time visibility into your infrastructure with advanced analytics and alerting systems to catch issues before they impact users.",
    detail: {
      intro:
        "You cannot fix what you cannot see. We instrument every layer of your stack — servers, containers, databases and application code — and turn raw telemetry into dashboards and alerts your team can actually act on. Problems are flagged within minutes of appearing, long before they reach your customers.",
      includes: [
        "24/7 dashboards for uptime, latency, error rate, CPU, memory and disk",
        "Alerting routed to email, Slack or WhatsApp with sensible thresholds",
        "Anomaly detection that surfaces slow regressions before they become outages",
        "Custom SLOs and SLIs tied to the metrics your business cares about",
        "Weekly health digests and a monthly reliability report",
      ],
      result:
        "Most teams cut mean-time-to-detection from several hours to under five minutes.",
    },
  },
  {
    icon: "🔧",
    title: "Troubleshooting",
    description:
      "Expert diagnosis and resolution of infrastructure issues. Our team provides rapid response to minimize downtime and optimize performance.",
    detail: {
      intro:
        "When something breaks, every minute costs money. Our senior engineers jump straight into your environment, trace the fault to its root cause and restore service — then document exactly what happened so the same incident never repeats itself.",
      includes: [
        "24/7 on-call engineers with a 15-minute first-response target",
        "Deep-dive root cause analysis across logs, traces and metrics",
        "Performance tuning for slow queries, memory leaks and bottlenecks",
        "Blameless post-incident reports with actionable follow-ups",
        "New runbooks and alerts added for every incident we resolve",
      ],
      result:
        "Most incidents are mitigated within the first hour, with a permanent fix shipped the same week.",
    },
  },
  {
    icon: "⚡",
    title: "Server Updates",
    description:
      "Seamless updates and patches with zero-downtime deployment strategies. Keep your systems current and secure without disrupting operations.",
    detail: {
      intro:
        "Keeping systems patched is a balancing act between security and uptime. We plan and execute every update with tested backups and a rollback path ready, so your users never notice the maintenance window happened.",
      includes: [
        "Scheduled maintenance windows agreed around your traffic peaks",
        "Rolling and blue-green updates for zero-downtime rollouts",
        "Operating system, runtime and dependency security patching",
        "Pre-update backups with a one-click rollback path",
        "Compatibility and smoke tests after every change",
      ],
      result:
        "Your estate stays current and secure without a single planned outage.",
    },
  },
  {
    icon: "🚀",
    title: "Feature Deployment",
    description:
      "Safely deploy new products and features with confidence. Our proven deployment pipelines ensure smooth releases every time.",
    detail: {
      intro:
        "Ship faster without breaking production. We build the pipelines, environments and release gates that carry a feature from pull request to production with confidence — and pull it back automatically if anything looks wrong.",
      includes: [
        "Automated CI/CD pipelines with lint, test and build gates",
        "Staging and preview environments for every branch",
        "Canary and blue-green rollouts with automatic rollback",
        "Feature flags for safe, gradual exposure to real users",
        "Release notes and deployment history your whole team can read",
      ],
      result:
        "Deployments stop being a stressful event and become a routine, multiple-times-a-day habit.",
    },
  },
  {
    icon: "🔒",
    title: "Secure Environments",
    description:
      "Bank-grade security standards with compliance certifications. Your data and infrastructure are protected with industry best practices.",
    detail: {
      intro:
        "Security is built into the foundation, not bolted on afterwards. We harden your cloud accounts, manage secrets centrally, encrypt traffic end to end and keep you audit-ready against the standards your customers keep asking about.",
      includes: [
        "Server and cloud hardening with least-privilege access by default",
        "Centralised secrets management — no keys in code or chat logs",
        "TLS everywhere, plus WAF and DDoS protection at the edge",
        "Encryption at rest, automated backups and tested restore drills",
        "Audit logging and evidence for SOC 2, ISO 27001 and GDPR",
      ],
      result:
        "Pass customer security questionnaires and audits with the evidence already in place.",
    },
  },
  {
    icon: "🏗️",
    title: "Infrastructure Building",
    description:
      "Complete cloud infrastructure setup for new companies and products. We design, deploy, and optimize your entire cloud ecosystem from day one.",
    detail: {
      intro:
        "Starting from a blank page, or migrating away from something that no longer scales? We design and build the whole cloud foundation — network, compute, data and delivery — as code, so it is repeatable, reviewable and cheap to run.",
      includes: [
        "Reference architecture sized for your product and your budget",
        "Infrastructure as code (Terraform) with peer-reviewed changes",
        "Auto-scaling, load balancing and multi-zone availability setup",
        "Cost modelling and ongoing right-sizing to avoid cloud waste",
        "Migration plan with zero-downtime cutover and team handover",
      ],
      result:
        "A production-ready foundation live within weeks, owned by your team from day one.",
    },
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
 *
 * Clicking a card's heading opens a detail dialog (rendered through a
 * portal on <body> so the pinned section's stacking context can't cover
 * it) with a "Book a Consultation" link to the contact form and a "Back"
 * button that returns to the cards.
 */
export default function Services() {
  const [selected, setSelected] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const wasFanning = useRef(false);
  // The heading button that opened the dialog — focused again on close.
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

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
          // While the fan-out is scrubbing (progress < 1) the cards are in
          // motion under the cursor: a hover would leave a card lifted and
          // glowing mid-air ("stuck") and a click would fire mid-scroll.
          // Flag the section so CSS can disable pointer interaction, and
          // clear any dialog opened before the scroll started.
          onUpdate: (self) => {
            const fanning = self.progress < 1;
            if (fanning === wasFanning.current) return;
            wasFanning.current = fanning;
            section.classList.toggle("is-fanning", fanning);
            if (fanning) setSelected(null);
          },
          // Scrolling back up past the start releases the pin — cards are
          // interactive again (they're already moving off-screen).
          onLeaveBack: () => {
            wasFanning.current = false;
            section.classList.remove("is-fanning");
          },
        },
      });
    }, section);

    return () => {
      ctx.revert(); // unpins and restores everything on unmount
      section.classList.remove("is-fanning");
    };
  }, []);

  const closeDialog = useCallback(() => {
    setSelected(null);
    // Return focus to the heading that opened the dialog. preventScroll is
    // essential: the heading lives inside the GSAP-pinned section, so a
    // plain focus() makes the browser scroll the document to the element's
    // document position, yanking the page back into the fan-out range.
    openerRef.current?.focus({ preventScroll: true });
  }, []);

  const openDialog = useCallback((index: number) => {
    // Ignore while the fan-out is scrubbing — cards are in motion mid-scroll.
    if (sectionRef.current?.classList.contains("is-fanning")) return;
    setSelected(index);
  }, []);

  // Dialog behavior while open: lock the page, close on Escape, trap Tab
  // inside the dialog, and move focus into it.
  useEffect(() => {
    if (selected === null) return;
    const { body } = document;
    const originalOverflow = body.style.overflow;
    body.style.overflow = "hidden"; // same lock the mobile menu uses
    const lenis = window.__lenis;
    lenis?.stop(); // Lenis owns the wheel, so it has to pause too

    const getFocusable = () =>
      dialogRef.current
        ? Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() =>
      dialogRef.current?.focus({ preventScroll: true }),
    );

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
      body.style.overflow = originalOverflow;
      lenis?.start();
    };
  }, [selected, closeDialog]);

  const service = selected === null ? null : services[selected];

  return (
    <>
      <section className="services" id="services" ref={sectionRef}>
        <div className="services-container">
          <Reveal>
            <h2 className="section-title">Our Services</h2>
          </Reveal>
          <div className="services-grid">
            {services.map((item, index) => (
              /* No Reveal wrapper here on purpose: the pinned fan-out scrub IS
                 the entrance animation. A second, staggered opacity transition
                 firing mid-scrub made the cards flicker. */
              <TiltCard key={item.title} className="service-card">
                <div className="service-icon">{item.icon}</div>
                <h3>
                  <button
                    type="button"
                    className="service-title-button"
                    aria-haspopup="dialog"
                    onClick={(event) => {
                      openerRef.current = event.currentTarget;
                      openDialog(index);
                    }}
                  >
                    {item.title}
                  </button>
                </h3>
                <p>{item.description}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {service !== null &&
        selected !== null &&
        createPortal(
          /* data-lenis-prevent is required: Lenis is paused while the dialog
             is open, and its virtual-scroll handler preventDefaults every
             wheel/touch event it sees — which would silently kill the
             backdrop's native overflow-y scrolling. The attribute makes
             Lenis skip events inside the dialog so the panel scrolls. */
          <div
            className="service-modal-backdrop"
            data-lenis-prevent
            onClick={closeDialog}
          >
            <div
              className="service-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="service-modal-title"
              tabIndex={-1}
              ref={dialogRef}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="service-modal-close"
                aria-label="Close service details"
                onClick={closeDialog}
              >
                ✕
              </button>

              <div className="service-icon">{service.icon}</div>
              <h3 className="service-modal-title" id="service-modal-title">
                {service.title}
              </h3>
              <p className="service-modal-intro">{service.detail.intro}</p>

              <h4 className="service-modal-subtitle">What&apos;s included</h4>
              <ul className="service-modal-list">
                {service.detail.includes.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <p className="service-modal-result">
                <span className="service-modal-result-label">The outcome</span>
                {service.detail.result}
              </p>

              <div className="service-modal-actions">
                <button
                  type="button"
                  className="service-modal-back"
                  onClick={closeDialog}
                >
                  Back
                </button>
                <a
                  href="#contact-form"
                  className="service-modal-book"
                  onClick={closeDialog}
                >
                  Book a Consultation
                </a>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
