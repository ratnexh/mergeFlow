"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InfoModal from "../components/InfoModal";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Home() {
  const router = useRouter();
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
            <div
              className="portal-card"
              role="button"
              tabIndex="0"
              onClick={() => router.push("/merge")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/merge"); }}
            >
              <div className="portal-card-icon merge-icon-color">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                </svg>
              </div>
              <h3>Merge PDFs</h3>
              <p>Combine multiple PDFs into a single document. Reorder, rotate, and preview pages before exporting.</p>
              <div className="portal-card-actions">
                <span className="portal-card-btn">Launch Tool →</span>
                <Link href="/how-it-works#merge" className="portal-card-sec-link" onClick={(e) => e.stopPropagation()}>
                  How it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Tool 2: Split PDF */}
            <div
              className="portal-card"
              role="button"
              tabIndex="0"
              onClick={() => router.push("/split")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/split"); }}
            >
              <div className="portal-card-icon split-icon-color">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <rect x="2" y="4" width="8" height="16" rx="2" />
                  <rect x="14" y="4" width="8" height="16" rx="2" />
                </svg>
              </div>
              <h3>Split PDF</h3>
              <p>Extract individual pages from a PDF. Rearrange, rotate, delete, or save specific sheets as a new PDF.</p>
              <div className="portal-card-actions">
                <span className="portal-card-btn">Launch Tool →</span>
                <Link href="/how-it-works#split" className="portal-card-sec-link" onClick={(e) => e.stopPropagation()}>
                  How it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Tool 3: Compress PDF */}
            <div
              className="portal-card"
              role="button"
              tabIndex="0"
              onClick={() => router.push("/compress")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/compress"); }}
            >
              <div className="portal-card-icon compress-icon-color">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="14" width="6" height="6" rx="1" />
                  <rect x="14" y="4" width="6" height="6" rx="1" />
                  <path d="M20 14l-6 6M4 10l6-6" />
                </svg>
              </div>
              <h3>Compress PDF</h3>
              <p>Reduce PDF file size by compressing and optimizing images locally without losing document content.</p>
              <div className="portal-card-actions">
                <span className="portal-card-btn">Launch Tool →</span>
                <Link href="/how-it-works#compress" className="portal-card-sec-link" onClick={(e) => e.stopPropagation()}>
                  How it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Tool 4: PDF to Image */}
            <div
              className="portal-card"
              role="button"
              tabIndex="0"
              onClick={() => router.push("/pdf-to-image")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/pdf-to-image"); }}
            >
              <div className="portal-card-icon to-image-icon-color">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3>PDF to Image</h3>
              <p>Convert PDF pages into high-quality JPEG or PNG image assets directly in your web browser.</p>
              <div className="portal-card-actions">
                <span className="portal-card-btn">Launch Tool →</span>
                <Link href="/how-it-works#pdf-to-image" className="portal-card-sec-link" onClick={(e) => e.stopPropagation()}>
                  How it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Tool 5: Image to PDF */}
            <div
              className="portal-card"
              role="button"
              tabIndex="0"
              onClick={() => router.push("/image-to-pdf")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/image-to-pdf"); }}
            >
              <div className="portal-card-icon to-image-icon-color">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3>Image to PDF</h3>
              <p>Convert your JPEG, PNG, and WebP images into a single clean PDF document completely offline.</p>
              <div className="portal-card-actions">
                <span className="portal-card-btn">Launch Tool →</span>
                <Link href="/how-it-works#image-to-pdf" className="portal-card-sec-link" onClick={(e) => e.stopPropagation()}>
                  How it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Tool 6: Protect PDF */}
            <div
              className="portal-card"
              role="button"
              tabIndex="0"
              onClick={() => router.push("/protect")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/protect"); }}
            >
              <div className="portal-card-icon protect-icon-color">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3>Protect PDF</h3>
              <p>Add strong password encryption to secure your PDFs against unauthorized viewing or copying.</p>
              <div className="portal-card-actions">
                <span className="portal-card-btn">Launch Tool →</span>
                <Link href="/how-it-works#protect" className="portal-card-sec-link" onClick={(e) => e.stopPropagation()}>
                  How it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Tool 7: Edit PDF */}
            <div
              className="portal-card"
              role="button"
              tabIndex="0"
              onClick={() => router.push("/edit")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/edit"); }}
            >
              <div className="portal-card-icon edit-icon-color">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </div>
              <h3>Edit PDF</h3>
              <p>Add text, highlights, shapes, and images to any PDF page — all processed locally in your browser.</p>
              <div className="portal-card-actions">
                <span className="portal-card-btn">Launch Tool →</span>
                <Link href="/how-it-works#edit" className="portal-card-sec-link" onClick={(e) => e.stopPropagation()}>
                  How it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Tool 8: OCR PDF */}
            <div
              className="portal-card"
              role="button"
              tabIndex="0"
              onClick={() => router.push("/ocr")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/ocr"); }}
            >
              <div className="portal-card-icon ocr-icon-color">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                  <line x1="9" y1="17" x2="13" y2="17" />
                </svg>
              </div>
              <h3>OCR PDF</h3>
              <p>Extract searchable, editable text from scanned PDFs locally in your browser using Wasm OCR.</p>
              <div className="portal-card-actions">
                <span className="portal-card-btn">Launch Tool →</span>
                <Link href="/how-it-works#ocr" className="portal-card-sec-link" onClick={(e) => e.stopPropagation()}>
                  How it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>
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
