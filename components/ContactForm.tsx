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
    <section className="contact-section" id="contact-form">
      <div className="contact-container">
        <Reveal>
          <h2 className="section-title">Get Started with ZeDeploy</h2>
        </Reveal>
        <Reveal from="scale" delay={120}>
          <div className="form-wrapper">
          <form onSubmit={handleSubmit}>
            <fieldset className="form-fieldset" disabled={submitted}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input type="text" id="firstName" name="firstName" required />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input type="text" id="lastName" name="lastName" required />
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
                      {industry.charAt(0).toUpperCase() + industry.slice(1)}
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
              {submitted ? "✓ Submitted Successfully!" : "Sign Up Now"}
            </button>
            {error && (
              <p className="form-message form-message-error">
                Something went wrong sending your message. Please try again in
                a moment.
              </p>
            )}
            {submitted && (
              <p className="form-message form-message-success">
                We&apos;ll get back to you within 24 hours with a personalized
                proposal.
              </p>
            )}
            </fieldset>
          </form>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
