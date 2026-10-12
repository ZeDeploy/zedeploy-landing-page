"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "#", label: "Home" },
  { href: "#services", label: "Services" },
  { href: "#infrastructure", label: "Solutions" },
  { href: "#contact-form", label: "Contact" },
];

// The "Get Started" CTA scrolls to the contact form section
// ("Get Started with ZeDeploy") instead of navigating elsewhere.
const GET_STARTED_HREF = "#contact-form";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  // The nav targets are in-page anchors (#services, #contact-form, …), which
  // only make sense on the home page. From any other route (e.g. /privacy)
  // they are re-pointed at the home page first, so a click still lands on the
  // right section instead of silently matching nothing.
  const pathname = usePathname();
  const hrefFrom = (href: string) => {
    if (pathname === "/") return href;
    return href === "#" ? "/" : `/${href}`;
  };

  // Once the page scrolls, the bar swaps to a stronger shadow so it reads
  // as floating above the sections instead of sitting flush with them.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu with the Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Close the menu if the viewport grows past the mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Lock body scroll while the menu is open.
  // (Guarded with a typeof window check so this only executes client-side;
  // reading document at module scope during SSR throws an error.)
  useEffect(() => {
    if (!menuOpen) return;
    if (typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  return (
    <header className={`header${scrolled ? " is-scrolled" : ""}`}>
      <div className="header-container">
        <a
          href={hrefFrom("#")}
          className="logo"
          aria-label="ZeDeploy home"
          onClick={() => setMenuOpen(false)}
        >
          <Image
            src="/zed-logo-preview.png"
            alt="ZeDeploy logo"
            width={500}
            height={500}
            priority
          />
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={hrefFrom(link.href)}>
              {link.label}
            </a>
          ))}
          <a href={hrefFrom(GET_STARTED_HREF)} className="start-button">
            Get Started
          </a>
        </nav>

        <button
          type="button"
          className={`hamburger${menuOpen ? " is-open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        id="mobile-menu"
        className={`mobile-menu${menuOpen ? " open" : ""}`}
      >
        <nav aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={hrefFrom(link.href)}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href={hrefFrom(GET_STARTED_HREF)}
            className="start-button"
            onClick={() => setMenuOpen(false)}
          >
            Get Started
          </a>
        </nav>
      </div>
    </header>
  );
}
