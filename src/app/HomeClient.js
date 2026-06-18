"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import InfoModal from "../components/InfoModal";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Home() {
  // Theme & Layout States
  const [theme, setTheme] = useState("dark");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });

  // Theme Sync on load
  useEffect(() => {
    const savedTheme = localStorage.getItem("mergeStudioTheme") || "dark";
    setTheme(savedTheme);
    document.body.classList.toggle("theme-light", savedTheme === "light");
  }, [theme]);

  // Scroll Shrink Nav Hook
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dropdown close-on-click-outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const toolsDropdown = document.getElementById("toolsDropdown");
      if (toolsDropdown && !toolsDropdown.contains(e.target)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Modal close-on-esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && modal.isOpen) {
        setModal({ isOpen: false, title: "", body: "" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("mergeStudioTheme", nextTheme);
    document.body.classList.toggle("theme-light", nextTheme === "light");
  };

  // Placeholder dropdown clicks
  const handleDropdownItemClick = (name) => {
    setIsToolsOpen(false);
    setModal({
      isOpen: true,
      title: name,
      body: "This tool is coming soon in a future update! All document processing stays completely local and secure.",
    });
  };

  return (
    <>
      <Header
        isScrolled={isScrolled}
        isToolsOpen={isToolsOpen}
        setIsToolsOpen={setIsToolsOpen}
        handleDropdownItemClick={handleDropdownItemClick}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <button id="themeToggle" className="theme-toggle" type="button" aria-pressed={theme === "light"} onClick={toggleTheme}>
        <span className="theme-toggle-icon" aria-hidden="true" />
        <span className="theme-toggle-text">{theme === "light" ? "Dark" : "Light"}</span>
      </button>

      {/* 0. Portal Homepage View */}
      <main id="portal" className="landing view active">
        <section className="hero" style={{ paddingBottom: "60px", minHeight: "auto" }}>
          <div className="hero-content" style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Private PDF Studio
            </p>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", marginBottom: "16px" }}>Polished PDF Tools</h1>
            <p className="hero-copy" style={{ maxWidth: "600px", margin: "0 auto" }}>
              All document processing is executed completely locally in your browser. Your files never touch our servers.
            </p>
          </div>

          <div className="portal-grid">
            {/* Tool 1: Merge PDF */}
            <Link href="/merge" style={{ textDecoration: "none" }}>
              <div className="portal-card">
                <div className="portal-card-icon merge-icon-color">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                  </svg>
                </div>
                <h3>Merge PDFs</h3>
                <p>Combine multiple PDFs into a single document. Reorder, rotate, and preview pages before exporting.</p>
                <span className="portal-card-btn">Launch Tool →</span>
              </div>
            </Link>

            {/* Tool 2: Split PDF */}
            <Link href="/split" style={{ textDecoration: "none" }}>
              <div className="portal-card">
                <div className="portal-card-icon split-icon-color">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="3" x2="12" y2="21" />
                    <rect x="2" y="4" width="8" height="16" rx="2" />
                    <rect x="14" y="4" width="8" height="16" rx="2" />
                  </svg>
                </div>
                <h3>Split PDF</h3>
                <p>Extract individual pages from a PDF. Rearrange, rotate, delete, or save specific sheets as a new PDF.</p>
                <span className="portal-card-btn">Launch Tool →</span>
              </div>
            </Link>

            {/* Tool 3: Compress PDF */}
            <Link href="/compress" style={{ textDecoration: "none" }}>
              <div className="portal-card">
                <div className="portal-card-icon compress-icon-color">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="14" width="6" height="6" rx="1" />
                    <rect x="14" y="4" width="6" height="6" rx="1" />
                    <path d="M20 14l-6 6M4 10l6-6" />
                  </svg>
                </div>
                <h3>Compress PDF</h3>
                <p>Reduce PDF file size by compressing and optimizing images locally without losing document content.</p>
                <span className="portal-card-btn">Launch Tool →</span>
              </div>
            </Link>

            {/* Tool 4: PDF to Image */}
            <div className="portal-card disabled" onClick={() => handleDropdownItemClick("PDF to Image")}>
              <div className="portal-card-icon coming-soon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3>PDF to Image</h3>
              <p>Convert PDF pages into high-quality JPEG or PNG image assets directly in your web browser.</p>
              <span className="portal-card-badge">Coming Soon</span>
            </div>

            {/* Tool 5: Image to PDF */}
            <div className="portal-card disabled" onClick={() => handleDropdownItemClick("Image to PDF")}>
              <div className="portal-card-icon coming-soon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </div>
              <h3>Image to PDF</h3>
              <p>Convert your JPEG, PNG, and WebP images into a single clean PDF document completely offline.</p>
              <span className="portal-card-badge">Coming Soon</span>
            </div>

            {/* Tool 6: Protect PDF */}
            <Link href="/protect" style={{ textDecoration: "none" }}>
              <div className="portal-card">
                <div className="portal-card-icon protect-icon-color">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3>Protect PDF</h3>
                <p>Add strong password encryption to secure your PDFs against unauthorized viewing or copying.</p>
                <span className="portal-card-btn">Launch Tool →</span>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <Footer />

      <InfoModal
        isOpen={modal.isOpen}
        title={modal.title}
        body={modal.body}
        onClose={() => setModal({ isOpen: false, title: "", body: "" })}
      />
    </>
  );
}
