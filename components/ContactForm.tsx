"use client";

import { useState } from "react";
import type { FormEvent } from "react";

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const formData = new FormData(event.currentTarget);
    console.log("Form submitted:", Object.fromEntries(formData));
    // Simulate an async submission
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSending(false);
    setSubmitted(true);
    event.currentTarget.reset();
    setTimeout(() => setSubmitted(false), 2000);
  }

  return (
    <section className="contact-section" id="contact-form">
      <div className="contact-container">
        <h2 className="section-title">Get Started with ZeDeploy</h2>
        <div className="form-wrapper">
          <form onSubmit={handleSubmit}>
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
              {submitted ? "✓ Sign Up Successful!" : "Sign Up Now"}
            </button>
            <p className="form-message">
              We&apos;ll get back to you within 24 hours with a personalized
              proposal.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
