import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Privacy Policy | ZeDeploy",
  description:
    "How ZeDeploy collects, uses, shares and protects the information you share through this website — plus the rights you have over it.",
};

// Shown in the hero chip and in the "changes" section — bump it whenever
// the policy text changes.
const LAST_UPDATED = "12 October 2026";

const CONTACT_EMAIL = "info.zedeploy@gmail.com";
const CONTACT_PHONES = ["+91 7510936939", "+91 6238825928"];

/** Table of contents — every id must match a section id below. */
const sections = [
  { id: "who-we-are", label: "Who we are" },
  { id: "information-we-collect", label: "Information we collect" },
  { id: "how-we-use", label: "How we use your information" },
  { id: "cookies-and-tracking", label: "Cookies and tracking" },
  { id: "how-we-share", label: "How we share information" },
  { id: "data-retention", label: "How long we keep it" },
  { id: "your-rights", label: "Your rights" },
  { id: "children", label: "Children" },
  { id: "security", label: "Security" },
  { id: "third-party-links", label: "Third-party links" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact us" },
];

/** Four one-line takeaways shown under the table of contents. */
const highlights = [
  { title: "No cookies", text: "Nothing is stored in your browser." },
  { title: "No trackers", text: "No ads, pixels or analytics scripts." },
  { title: "Never sold", text: "Your details are not sold or rented." },
  { title: "Deletable", text: "Ask us to erase your data at any time." },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="privacy-page">
        {/* --- Hero ---------------------------------------------------- */}
        <section className="privacy-hero">
          <div className="hero-glass-orbs" aria-hidden="true">
            <span className="orb orb-gold" />
            <span className="orb orb-green" />
            <span className="orb orb-white" />
          </div>

          <div className="privacy-hero-inner">
            <Reveal from="none">
              <p className="privacy-kicker">Legal</p>
            </Reveal>
            <Reveal>
              <h1>Privacy Policy</h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="privacy-lede">
                A plain-language account of what happens to the information
                you share with ZeDeploy through this website — what we
                collect, why we collect it, and the control you keep over it.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <p className="privacy-updated">Last updated: {LAST_UPDATED}</p>
            </Reveal>
            <Reveal delay={280}>
              <div className="privacy-hero-actions">
                <Link href="/" className="cta-button">
                  Back to home
                </Link>
                <Link href="/#contact-form" className="privacy-ghost">
                  Contact us
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* --- Policy body --------------------------------------------- */}
        <div className="privacy-body">
          <div className="privacy-container">
            <Reveal>
              <nav className="privacy-toc" aria-label="Privacy policy contents">
                <h2>On this page</h2>
                <ol className="privacy-toc-list">
                  {sections.map(({ id, label }) => (
                    <li key={id}>
                      <a href={`#${id}`}>{label}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </Reveal>

            <Reveal delay={100}>
              <ul className="privacy-highlights">
                {highlights.map(({ title, text }) => (
                  <li key={title}>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <section className="policy-section" id="who-we-are">
              <Reveal>
                <h2>Who we are</h2>
                <p>
                  ZeDeploy is a cloud infrastructure solutions provider based
                  in Kochi, India. In this policy, &ldquo;ZeDeploy&rdquo;,
                  &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; mean
                  ZeDeploy. We are the ones responsible for the personal
                  information described here.
                </p>
                <p>
                  This policy applies to this website and to the information
                  you choose to send us through it. It does not apply to the
                  third-party websites and apps we link to — once you leave
                  this site, their own policies take over.
                </p>
              </Reveal>
            </section>

            <section className="policy-section" id="information-we-collect">
              <Reveal>
                <h2>Information we collect</h2>
                <p>There are only two ways information reaches us:</p>
                <ul className="policy-list">
                  <li>
                    <strong>What you send us.</strong> When you fill in our
                    contact form we receive your first and last name, email
                    address, phone number (optional), company name, industry,
                    and whatever you type into the message field. If you
                    contact us by email, WhatsApp or through a social profile
                    instead, we receive your message and the contact details
                    you use.
                  </li>
                  <li>
                    <strong>What your browser sends automatically.</strong>{" "}
                    Like every website, our host receives standard technical
                    request data when a page is loaded — typically your IP
                    address, browser and device type, and the page that
                    referred you. We use it only to deliver, secure and
                    maintain the site.
                  </li>
                </ul>
                <p>
                  We do not knowingly collect anything else, and we never ask
                  for sensitive categories of personal data.
                </p>
              </Reveal>
            </section>

            <section className="policy-section" id="how-we-use">
              <Reveal>
                <h2>How we use your information</h2>
                <p>We use it to:</p>
                <ul className="policy-list">
                  <li>
                    answer your enquiry and prepare the personalised proposal
                    we promise within 24 hours;
                  </li>
                  <li>
                    discuss, provide and improve the services you ask about;
                  </li>
                  <li>keep this website secure and working properly;</li>
                  <li>meet our legal and regulatory obligations.</li>
                </ul>
                <p>
                  We do not sell or rent your personal information, and we do
                  not use it for profiling or automated decision-making.
                </p>
              </Reveal>
            </section>

            <section className="policy-section" id="cookies-and-tracking">
              <Reveal>
                <h2>Cookies and tracking</h2>
                <p>
                  This website does not set cookies, does not store anything
                  in your browser&apos;s local or session storage, and does
                  not embed advertising, remarketing or analytics trackers.
                  The smooth scrolling and animations you see run entirely in
                  your browser and collect nothing.
                </p>
                <p>
                  If we ever add optional analytics or marketing tools, we
                  will ask for your consent where the law requires it and
                  update this page before doing so.
                </p>
              </Reveal>
            </section>

            <section className="policy-section" id="how-we-share">
              <Reveal>
                <h2>How we share information</h2>
                <p>We share your information only with:</p>
                <ul className="policy-list">
                  <li>
                    <strong>Formspree</strong>, the form service our contact
                    form posts to, which forwards your submission to our
                    inbox. It processes the data on our instructions; its own{" "}
                    <a
                      href="https://formspree.io/legal/privacy-policy/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      privacy policy
                    </a>{" "}
                    explains how it handles that data.
                  </li>
                  <li>
                    <strong>Our service providers</strong> — hosting, email
                    and site security — who may use the information only to
                    run this website for us and are bound to keep it
                    confidential.
                  </li>
                  <li>
                    <strong>Messaging and social platforms</strong> (WhatsApp,
                    Instagram, LinkedIn, Facebook, X) if you choose to contact
                    us through them, where their terms and privacy policies
                    apply.
                  </li>
                  <li>
                    <strong>Authorities</strong>, when disclosure is required
                    by law or is necessary to protect the rights, safety or
                    property of someone.
                  </li>
                </ul>
              </Reveal>
            </section>

            <section className="policy-section" id="data-retention">
              <Reveal>
                <h2>How long we keep it</h2>
                <p>
                  We keep enquiry information only for as long as we need it
                  to respond to you, prepare or deliver what you asked for,
                  and maintain ordinary business records. After that we delete
                  it or anonymise it.
                </p>
                <p>
                  You can ask us to remove your information sooner — see{" "}
                  <a href="#your-rights">Your rights</a> — subject to any
                  records we are required to keep by law.
                </p>
              </Reveal>
            </section>

            <section className="policy-section" id="your-rights">
              <Reveal>
                <h2>Your rights</h2>
                <p>
                  Depending on where you live — for example under India&apos;s
                  Digital Personal Data Protection Act, 2023, the EU or UK
                  GDPR, or similar laws — you may have the right to:
                </p>
                <ul className="policy-list">
                  <li>get a copy of the personal data we hold about you;</li>
                  <li>correct anything that is inaccurate or incomplete;</li>
                  <li>ask us to delete data we no longer need;</li>
                  <li>withdraw any consent you previously gave;</li>
                  <li>
                    object to, or restrict, certain kinds of processing;
                  </li>
                  <li>receive your data in a portable format;</li>
                  <li>lodge a complaint with your data protection authority.</li>
                </ul>
                <p>
                  To use any of these rights, email{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We
                  will not charge you for a reasonable request and will reply
                  within the time allowed by applicable law.
                </p>
              </Reveal>
            </section>

            <section className="policy-section" id="children">
              <Reveal>
                <h2>Children</h2>
                <p>
                  Our services are bought by businesses, and this website is
                  not directed at children under 18. We do not knowingly
                  collect personal data from children. If you believe a child
                  has sent us information, contact us and we will delete it.
                </p>
              </Reveal>
            </section>

            <section className="policy-section" id="security">
              <Reveal>
                <h2>Security</h2>
                <p>
                  We use reasonable technical and organisational measures to
                  protect what you send us, and we limit access to the people
                  who need it to do their work. No method of transmitting data
                  over the internet is completely secure, so we cannot promise
                  absolute security — but we will tell you promptly if
                  something affects your information.
                </p>
              </Reveal>
            </section>

            <section className="policy-section" id="third-party-links">
              <Reveal>
                <h2>Third-party links</h2>
                <p>
                  This site links out to WhatsApp, Instagram, LinkedIn,
                  Facebook and X, and may link to other sites in future. Those
                  services collect and use your data under their own privacy
                  policies, which we do not control. Please review them before
                  sharing anything.
                </p>
              </Reveal>
            </section>

            <section className="policy-section" id="changes">
              <Reveal>
                <h2>Changes to this policy</h2>
                <p>
                  We may update this policy from time to time. The
                  &ldquo;Last updated&rdquo; date at the top of this page
                  always reflects the latest revision, and the current version
                  remains published here. If a change materially affects how
                  we handle information you have already sent, we will say so
                  clearly.
                </p>
              </Reveal>
            </section>

            <section className="privacy-contact" id="contact">
              <Reveal>
                <h2>Questions about your data?</h2>
                <p>
                  Write to us and we will answer — whether you want a copy of
                  what we hold, a correction, or everything removed.
                </p>
                <div className="privacy-contact-links">
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                  {CONTACT_PHONES.map((phone) => (
                    <a key={phone} href={`tel:${phone.replace(/\s/g, "")}`}>
                      {phone}
                    </a>
                  ))}
                  <Link href="/#contact-form">Send a message</Link>
                </div>
              </Reveal>
            </section>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
