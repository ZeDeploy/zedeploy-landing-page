"use client";

import Reveal from "./Reveal";

export default function FinalCta() {
  return (
    <section className="final-cta" id="contact">
      <div className="final-cta-container">
        <Reveal from="down">
          <h2>Ready to Transform Your Infrastructure?</h2>
        </Reveal>
        <Reveal from="down" delay={120}>
          <p>
            Join leading companies that trust ZeDeploy to power their cloud
            operations. Optimize costs and scale with confidence.
          </p>
        </Reveal>
        <Reveal from="down" delay={240}>
          <button type="button" className="cta-button">
            Start Your Free Trial
          </button>
        </Reveal>
      </div>
    </section>
  );
}
