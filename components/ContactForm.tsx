"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Reveal from "./Reveal";

// Formspree endpoint that receives contact-form submissions
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mdekbbkb";

const industries = [
  "technology",
  "finance",
  "healthcare",
  "ecommerce",
  "saas",
  "other",
];

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    setError(false);
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      if (!response.ok) {
        throw new Error(`Submission failed (${response.status})`);
      }
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="contact-section contact-form-section" id="contact-form">
      <div className="contact-container">
        {/* Split-panel card: dark brand panel + light form panel */}
        <Reveal from="scale" delay={120}>
          <div className="form-wrapper">
            <div className="form-intro">
              <p className="form-kicker">Start Your Project</p>
              <h2 className="form-title">
                Get Started with <span className="form-title-highlight">ZeDeploy</span>
              </h2>
              <p className="form-lede">
                Tell us what you&apos;re running — a single server, a growing
                app or a full migration — and we&apos;ll come back with a plan
                that fits.
              </p>
              <ul className="form-points">
                <li>Free, no-obligation consultation</li>
                <li>Custom proposal within 24 hours</li>
                <li>Direct support from our Kochi team</li>
              </ul>
            </div>

            <div className="form-body">
              <form onSubmit={handleSubmit}>
                <fieldset className="form-fieldset" disabled={submitted}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastName">Last Name</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input type="email" id="email" name="email" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input type="tel" id="phone" name="phone" />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="company">Company Name</label>
                      <input type="text" id="company" name="company" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="industry">Industry</label>
                      <select id="industry" name="industry" required>
                        <option value="">Select an industry</option>
                        {industries.map((industry) => (
                          <option key={industry} value={industry}>
                            {industry.charAt(0).toUpperCase() +
                              industry.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group full">
                    <label htmlFor="message">
                      Tell us about your infrastructure needs
                    </label>
                    <textarea id="message" name="message" required />
                  </div>

                  <button
                    type="submit"
                    className="form-submit"
                    disabled={sending || submitted}
                  >
                    {submitted ? "✓ Submitted Successfully!" : "Submit"}
                  </button>
                  {error && (
                    <p className="form-message form-message-error">
                      Something went wrong sending your message. Please try
                      again in a moment.
                    </p>
                  )}
                  {submitted && (
                    <p className="form-message form-message-success">
                      We&apos;ll get back to you within 24 hours with a
                      personalized proposal.
                    </p>
                  )}
                </fieldset>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
