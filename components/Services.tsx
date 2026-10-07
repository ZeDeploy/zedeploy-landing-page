"use client";

import { useState } from "react";
import Reveal from "./Reveal";

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

export default function Services() {
  const [active, setActive] = useState<number | null>(null);

  const handleCardClick = (index: number) => {
    setActive(active === index ? null : index);
  };

  return (
    <section className="services" id="services">
      <div className="services-container">
        <Reveal>
          <h2 className="section-title">Our Services</h2>
        </Reveal>
        <div className="services-grid">
          {services.map((service, index) => (
            <Reveal key={service.title} from="scale" delay={index * 90}>
              <div
                className="service-card"
                style={{ flex: "0 0 calc(50% - 1rem)" }}
                onClick={() => handleCardClick(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCardClick(index);
                }}
              >
                <div className="service-card-overlay" style={{ display: active === index ? "block" : "none" }}>
                  <span className="service-card-overlay-text">
                    {active === index ? "See next card" : "Upgraded to full detail"}
                  </span>
                </div>
                <div className="service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
