export default function Hero() {
  return (
    <section className="hero">
      {/* Soft glowing orbs behind the glass card — the card's backdrop
          blur diffuses them, which is what makes the frosted glass read
          as real glass (purely decorative) */}
      <div className="hero-glass-orbs" aria-hidden="true">
        <span className="orb orb-gold" />
        <span className="orb orb-green" />
        <span className="orb orb-white" />
      </div>

      <div className="hero-container">
        <h1>
          <span className="hero-title-main hero-anim hero-anim-1">
            Transform Your Business
          </span>
          <span className="hero-title-line hero-anim hero-anim-2">with</span>
          <span className="hero-title-line hero-highlight hero-anim hero-anim-3">
            Web &amp; AI Automation
          </span>
        </h1>
        <p className="hero-description hero-anim hero-anim-4">
          We build professional websites, intelligent AI agents, and seamless
          automation systems to save you time, multiply your sales, and run
          your business 24/7.
        </p>
        <div className="hero-actions hero-anim hero-anim-5">
          <a href="#contact-form" className="cta-button">
            Book Free Consultation
          </a>
        </div>
      </div>

      {/* Scroll cue */}
      <a href="#services" className="hero-scroll-cue" aria-label="Scroll to services">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </a>
    </section>
  );
}
