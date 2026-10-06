import Reveal from "./Reveal";

// Contact details rendered on the card row
const EMAIL = "info.zedeploy@gmail.com";
const PHONES = ["+91 7510936939", "+91 6238825928"];
const LOCATIONS = "Kochi";

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function Contact() {
  return (
    <section className="contact-section" id="contact-info">
      <div className="contact-container">
        <Reveal>
          <p className="contact-kicker">Get In Touch</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="contact-title">Let&apos;s Build Something Great</h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="contact-lede">
            Ready to transform your digital presence? We&apos;d love to hear
            about your project and explore how we can bring your vision to
            life.
          </p>
        </Reveal>

        <Reveal from="scale" delay={240}>
          <div className="contact-cards">
            <a className="contact-card" href={`mailto:${EMAIL}`}>
              <span className="contact-card-icon" aria-hidden="true">
                <MailIcon />
              </span>
              <span className="contact-card-label">Email Us</span>
              <span className="contact-card-value">{EMAIL}</span>
            </a>

            <div className="contact-card">
              <span className="contact-card-icon" aria-hidden="true">
                <PhoneIcon />
              </span>
              <span className="contact-card-label">Call Us</span>
              <span className="contact-card-value">
                {PHONES.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/\s/g, "")}`}>
                    {phone}
                  </a>
                ))}
              </span>
            </div>

            <div className="contact-card">
              <span className="contact-card-icon" aria-hidden="true">
                <PinIcon />
              </span>
              <span className="contact-card-label">Visit Us</span>
              <span className="contact-card-value">{LOCATIONS}</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
