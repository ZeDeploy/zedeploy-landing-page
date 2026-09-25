"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Infrastructure" },
  { href: "#contact-form", label: "Contact" },
];

// The "Get Started" CTA scrolls to the contact form section
// ("Get Started with ZeDeploy") instead of navigating elsewhere.
const GET_STARTED_HREF = "#contact-form";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHashBg, setIsHashBg] = useState(true);

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
  useEffect(() => {
    if (!menuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  // Track whether the sticky navbar is scrolling over white-background sections
  // (e.g. Services, Contact) or hash/colored sections (Hero, Infrastructure, Stats, CTA).
  useEffect(() => {
    const updateNavBackground = () => {
      const headerEl = document.querySelector(".header-container");
      const headerRect = headerEl?.getBoundingClientRect();
      const probeY = headerRect ? headerRect.top + headerRect.height / 2 : 60;

      const whiteSections = document.querySelectorAll(
        ".services, .contact-section"
      );

      let onWhite = false;
      for (const section of whiteSections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= probeY && rect.bottom > probeY) {
          onWhite = true;
          break;
        }
      }

      setIsHashBg(!onWhite);
    };

    updateNavBackground();
    window.addEventListener("scroll", updateNavBackground, { passive: true });
    window.addEventListener("resize", updateNavBackground, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateNavBackground);
      window.removeEventListener("resize", updateNavBackground);
    };
  }, []);

  return (
    <header className="header">
      <div
        className={`header-container ${
          isHashBg ? "is-hash-bg" : "is-white-bg"
        }`}
      >
        <a
          href="#"
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
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <a href={GET_STARTED_HREF} className="start-button">
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
              href={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href={GET_STARTED_HREF}
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
