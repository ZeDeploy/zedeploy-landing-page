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
  return (
    <section className="services" id="services">
      <div className="services-container">
        <h2 className="section-title">Our Services</h2>
        <div className="services-grid">
          {services.map((service) => (
            <div key={service.title} className="service-card">
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
