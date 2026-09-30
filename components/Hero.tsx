export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-container">
        <h1>
          <span className="hero-title-lead">Transform Your Business with</span>{" "}
          <span className="hero-title-accent">Web &amp; AI Automation</span>
        </h1>
        <p className="hero-description">
          We build professional websites, intelligent AI agents, and seamless
          automation systems to save you time, multiply your sales, and run
          your business 24/7.
        </p>
        <div className="hero-actions">
          <a href="#contact-form" className="cta-button">
            Book Free Consultation
          </a>
          <a href="#services" className="cta-secondary">
            Explore Services
          </a>
        </div>
      </div>
    </section>
  );
}
