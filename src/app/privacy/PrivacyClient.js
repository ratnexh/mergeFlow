"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const sections = [
  {
    id: "local-processing",
    title: "Your files never leave your device",
    body: "All PDF processing — merging, splitting, rotating, compressing, protecting, converting PDF to images, and converting images to PDF — happens entirely inside your browser using Web APIs. No file is ever uploaded to any server. Your documents and images stay completely private.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="14" height="8" rx="2" />
        <path d="M7 11V7a3 3 0 0 1 6 0v4" />
        <circle cx="10" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "no-tracking",
    title: "No accounts, no tracking",
    body: "rawPDF requires no sign-up and collects no personal data. There are no analytics scripts, no advertising trackers, and no third-party cookies. The only data stored is your theme preference (dark/light), saved in your browser's localStorage.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" />
        <path d="M4 4l12 12" />
      </svg>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: "rawPDF is a cookie-free application. We do not set, retrieve, or transmit any tracking cookies. The only client-side storage used is your browser's localStorage, which is used solely to store your light/dark theme preference and dismiss the privacy banner.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM8 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM14 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
      </svg>
    ),
  },
  {
    id: "open-source",
    title: "Open libraries, transparent processing",
    body: "All document processing is powered by open-source libraries — pdf-lib for PDF creation and manipulation, and PDF.js for rendering previews. Both run locally in your browser sandbox. You can inspect the source at any time.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3L2 10l4 7M14 3l4 7-4 7M11 2l-2 16" />
      </svg>
    ),
  },
  {
    id: "network",
    title: "Network requests",
    body: "rawPDF loads static assets from its hosting provider and loads pdf-lib and PDF.js from cdnjs.cloudflare.com on first use. After that, everything runs offline-capable. No document data is ever sent over the network.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" />
        <path d="M2 10h16M10 3c-2 2-3 4.5-3 7s1 5 3 7M10 3c2 2 3 4.5 3 7s-1 5-3 7" />
      </svg>
    ),
  },
  {
    id: "data-retention",
    title: "Data retention",
    body: "We store nothing. Each time you close the tab or navigate away, all file data is discarded from memory. There is no database, no cloud storage, and no server-side logging of any file content whatsoever.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11" />
      </svg>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: null,
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="16" height="12" rx="2" />
        <path d="M2 7l8 5 8-5" />
      </svg>
    ),
  },
];

export default function PrivacyPage() {
  const [theme, setTheme] = useState("dark");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeId, setActiveId] = useState("local-processing");

  useEffect(() => {
    const saved = localStorage.getItem("mergeStudioTheme") || "dark";
    setTheme(saved);
    document.body.classList.toggle("theme-light", saved === "light");
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
      // Update active section
      for (const s of [...sections].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveId(s.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onOutside = (e) => {
      const el = document.getElementById("toolsDropdown");
      if (el && !el.contains(e.target)) setIsToolsOpen(false);
    };
    document.addEventListener("click", onOutside);
    return () => document.removeEventListener("click", onOutside);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("mergeStudioTheme", next);
    document.body.classList.toggle("theme-light", next === "light");
  };

  return (
    <>
      <Header
        isScrolled={isScrolled}
        isToolsOpen={isToolsOpen}
        setIsToolsOpen={setIsToolsOpen}
        handleDropdownItemClick={() => setIsToolsOpen(false)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <button id="themeToggle" className="theme-toggle" type="button" aria-pressed={theme === "light"} onClick={toggleTheme}>
        <span className="theme-toggle-icon" aria-hidden="true" />
        <span className="theme-toggle-text">{theme === "light" ? "Dark" : "Light"}</span>
      </button>

      <main className="landing view active">
        {/* Compact hero */}
        <section className="hero" style={{ minHeight: "36svh" }}>
          <div className="hero-content" style={{ textAlign: "center" }}>
            <p className="eyebrow">Legal</p>
            <h1>Privacy Policy</h1>
            <p className="hero-copy">
              Your documents are yours — always local, never uploaded.
            </p>
          </div>
        </section>

        {/* Two-column layout */}
        <section className="privacy-layout">

          {/* Sticky sidebar TOC */}
          <aside className="privacy-toc">
            <p className="privacy-toc-label">On this page</p>
            <nav>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`privacy-toc-link${activeId === s.id ? " active" : ""}`}
                  onClick={() => setActiveId(s.id)}
                >
                  {s.title}
                </a>
              ))}
            </nav>
            <p className="privacy-toc-date">Last updated<br />June 2026</p>
          </aside>

          {/* Main content */}
          <div className="privacy-content">
            {sections.map((s, i) => (
              <div key={s.id} id={s.id} className="privacy-block">
                <div className="privacy-block-icon">{s.icon}</div>
                <div className="privacy-block-body">
                  <h2 className="privacy-block-title">{s.title}</h2>
                  {s.id !== "contact" ? (
                    <p className="privacy-block-text">{s.body}</p>
                  ) : (
                    <p className="privacy-block-text">
                      If you have any questions or concerns about how rawPDF handles your data, reach out directly —
                      I&apos;m happy to help.
                      <span className="privacy-contact-links">
                        <a href="mailto:rkmaurya0709@gmail.com" className="privacy-contact-link">
                          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="16" height="12" rx="2" /><path d="M2 7l8 5 8-5" /></svg>
                          rkmaurya0709@gmail.com
                        </a>
                        <a href="https://www.linkedin.com/in/ratnexh" target="_blank" rel="noopener noreferrer" className="privacy-contact-link">
                          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="16" height="16" rx="3" /><path d="M6 9v5M6 6.5v.5M10 14v-3a2 2 0 0 1 4 0v3M10 9v5" /></svg>
                          LinkedIn
                        </a>
                      </span>
                    </p>
                  )}
                </div>
                {i < sections.length - 1 && <div className="privacy-divider" />}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
