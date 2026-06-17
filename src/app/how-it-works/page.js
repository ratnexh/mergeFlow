"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function HowItWorksPage() {
  const [theme, setTheme] = useState("dark");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mergeStudioTheme") || "dark";
    setTheme(saved);
    document.body.classList.toggle("theme-light", saved === "light");
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
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

  const handleDropdownItemClick = () => setIsToolsOpen(false);

  const mergeSteps = [
    {
      number: "01",
      title: "Select your PDFs",
      desc: "Click the upload zone or drag and drop your PDF files directly from your computer. You can add as many files as you need — there's no limit.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="6" width="22" height="28" rx="4" />
          <rect x="18" y="14" width="22" height="28" rx="4" />
          <path d="M19 22h12M19 28h8" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Arrange the order",
      desc: "Drag and drop the file cards to set the exact merge order. Preview any document by clicking it — full page-by-page rendering, all locally in your browser.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 16h32M8 24h32M8 32h32" />
          <path d="M4 12l4-4 4 4M4 36l4 4 4-4" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Merge & Export",
      desc: "Click Merge PDFs. The documents are combined in your browser using pdf-lib — no file ever leaves your device. Rename the output and download instantly.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v16l4-4m-4 4l-4-4" />
          <path d="M36 40V24l-4 4m4-4l4 4" />
          <path d="M12 24h24" />
        </svg>
      ),
    },
  ];

  const compressSteps = [
    {
      number: "01",
      title: "Upload your PDF",
      desc: "Drop a PDF file onto the Compress page. Only one file is processed at a time so you stay in full control of the result.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 32V16m0 0l-6 6m6-6l6 6" />
          <rect x="8" y="36" width="32" height="4" rx="2" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Choose compression level",
      desc: "Pick from three levels — Less Compression (high quality), Recommended (balanced), or Extreme (smallest size). Each shows an estimated output size.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 36h8v-8H8zM20 36h8V20h-8zM32 36h8V8h-8z" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Download optimized file",
      desc: "mergeFlow re-renders every page as an optimised JPEG and rebuilds the PDF using pdf-lib — entirely in your browser. Review the before/after size, rename, and save.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 16v16m0 0l-6-6m6 6l6-6" />
          <path d="M8 38h32" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <Header
        isScrolled={isScrolled}
        isToolsOpen={isToolsOpen}
        setIsToolsOpen={setIsToolsOpen}
        handleDropdownItemClick={handleDropdownItemClick}
      />

      <button id="themeToggle" className="theme-toggle" type="button" aria-pressed={theme === "light"} onClick={toggleTheme}>
        <span className="theme-toggle-icon" aria-hidden="true" />
        <span className="theme-toggle-text">{theme === "light" ? "Dark" : "Light"}</span>
      </button>

      <main className="landing view active">
        {/* Hero */}
        <section className="hero" style={{ minHeight: "50svh" }}>
          <div className="hero-content" style={{ textAlign: "center" }}>
            <p className="eyebrow">Guide</p>
            <h1>How It Works</h1>
            <p className="hero-copy">
              Everything happens in your browser — no uploads, no accounts, no waiting.
            </p>
          </div>
        </section>

        {/* Merge section */}
        <section style={{ padding: "clamp(48px, 8vw, 96px) clamp(18px, 5vw, 76px)" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "48px" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #b88a43, #0f8176)",
                flexShrink: 0
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </span>
              <h2 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 30px)" }}>Merge PDFs</h2>
            </div>

            <div className="hiw-steps">
              {mergeSteps.map((step) => (
                <div key={step.number} className="hiw-card">
                  <div className="hiw-number">{step.number}</div>
                  <div className="hiw-icon">{step.icon}</div>
                  <h3 className="hiw-title">{step.title}</h3>
                  <p className="hiw-desc">{step.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: "48px" }}>
              <Link href="/" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                Start Merging
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", margin: "0 clamp(18px, 5vw, 76px)" }} />

        {/* Compress section */}
        <section style={{ padding: "clamp(48px, 8vw, 96px) clamp(18px, 5vw, 76px)" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "48px" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #0f8176, #2867e8)",
                flexShrink: 0
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <h2 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 30px)" }}>Compress PDF</h2>
            </div>

            <div className="hiw-steps">
              {compressSteps.map((step) => (
                <div key={step.number} className="hiw-card">
                  <div className="hiw-number">{step.number}</div>
                  <div className="hiw-icon">{step.icon}</div>
                  <h3 className="hiw-title">{step.title}</h3>
                  <p className="hiw-desc">{step.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: "48px" }}>
              <Link href="/compress" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                Start Compressing
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
