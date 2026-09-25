"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Infrastructure" },
  { href: "#contact-form", label: "Contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

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
  }, []);  // Lock body scroll while the menu is open.
  // NOTE: no padding-right compensation needed — `scrollbar-gutter: stable`
  // on <html> reserves the scrollbar space, so nothing shifts horizontally.
  useEffect(() => {
    if (!menuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="header-container">
        <a
          href="#"
          className="logo"
          aria-label="ZeDeploy home"
          onClick={() => setMenuOpen(false)}
        >
          <Image
            src="/zedeploy_logo.png"
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
          <a href="#contact-form" className="start-button">
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
            href="#contact-form"
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
