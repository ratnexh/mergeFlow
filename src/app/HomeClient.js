"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import InfoModal from "../components/InfoModal";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Home() {
  const router = useRouter();
  
  // Theme & Layout States
  const [theme, setTheme] = useState("dark");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

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

  const tools = [
    {
      id: "merge",
      name: "Merge PDFs",
      desc: "Combine multiple PDFs into a single document. Reorder, rotate, and preview pages before exporting.",
      path: "/merge",
      category: "Organize PDFs",
      iconClass: "merge-icon-color",
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="portal-icon">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="11" height="11" rx="2" />
        </svg>
      )
    },
    {
      id: "split",
      name: "Split PDF",
      desc: "Extract individual pages from a PDF. Rearrange, rotate, delete, or save specific sheets as a new PDF.",
      path: "/split",
      category: "Organize PDFs",
      iconClass: "split-icon-color",
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="portal-icon">
          <line x1="12" y1="3" x2="12" y2="21" />
          <rect x="2" y="4" width="8" height="16" rx="2" />
          <rect x="14" y="4" width="8" height="16" rx="2" />
        </svg>
      )
    },
    {
      id: "compress",
      name: "Compress PDF",
      desc: "Reduce PDF file size by compressing and optimizing images locally without losing document content.",
      path: "/compress",
      category: "Optimize PDFs",
      iconClass: "compress-icon-color",
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="portal-icon">
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <path d="M20 14l-6 6M4 10l6-6" />
        </svg>
      )
    },
    {
      id: "pdf-to-image",
      name: "PDF to Image",
      desc: "Convert PDF pages into high-quality JPEG or PNG image assets directly in your web browser.",
      path: "/pdf-to-image",
      category: "Convert PDFs",
      iconClass: "to-image-icon-color",
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="portal-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )
    },
    {
      id: "image-to-pdf",
      name: "Image to PDF",
      desc: "Convert your JPEG, PNG, and WebP images into a single clean PDF document completely offline.",
      path: "/image-to-pdf",
      category: "Convert PDFs",
      iconClass: "to-image-icon-color",
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="portal-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )
    },
    {
      id: "protect",
      name: "Protect PDF",
      desc: "Add strong password encryption to secure your PDFs against unauthorized viewing or copying.",
      path: "/protect",
      category: "Security",
      iconClass: "protect-icon-color",
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="portal-icon">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    },
    {
      id: "edit",
      name: "Edit PDF",
      desc: "Add text, highlights, shapes, and images to any PDF page — all processed locally in your browser.",
      path: "/edit",
      category: "Editing",
      iconClass: "edit-icon-color",
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="portal-icon">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )
    },
    {
      id: "ocr",
      name: "OCR PDF",
      desc: "Extract searchable, editable text from scanned PDFs locally in your browser using Wasm OCR.",
      path: "/ocr",
      category: "Optimize PDFs",
      iconClass: "ocr-icon-color",
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="portal-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      )
    },
    {
      id: "text-editor",
      name: "Text Editor",
      desc: "Compose, clean duplicate spaces, merge single lines, and convert text cases completely offline.",
      path: "/text-editor",
      category: "Editing",
      iconClass: "edit-icon-color",
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="portal-icon">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    }
  ];

  // Tool Categorization & Filtering
  const filteredTools = tools.filter(
    (t) =>
      (activeCategory === "All" || t.category === activeCategory) &&
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
       t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = ["Organize PDFs", "Convert PDFs", "Optimize PDFs", "Security", "Editing"];

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

      {/* Structured Metadata Schema Markup */}
      <Script id="schema-homepage" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "RawPDF",
          "url": "https://ratnexh.github.io/rawPDF/",
          "description": "Merge, split, compress, convert, edit, and secure PDFs without uploading files. Everything is processed locally in your browser.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://ratnexh.github.io/rawPDF/?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}
      </Script>
      <Script id="schema-org" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "RawPDF",
          "url": "https://ratnexh.github.io/rawPDF/",
          "logo": "https://ratnexh.github.io/rawPDF/favicon.ico"
        })}
      </Script>

      {/* Homepage View */}
      <main id="portal" className="landing view active" style={{ paddingBottom: "120px" }}>
        
        {/* Title / Hero */}
        <section className="hero" style={{ paddingBottom: "80px", minHeight: "auto" }}>
          <div className="hero-content" style={{ textAlign: "center", maxWidth: "850px", margin: "0 auto" }}>
            <p className="eyebrow" style={{ justifyContent: "center" }} aria-label="Privacy protection guarantee">
              <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              100% Offline PDF Studio
            </p>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", marginBottom: "16px", lineHeight: "1.15" }}>
              Private PDF Tools That Run Entirely In Your Browser
            </h1>
            <p className="hero-copy" style={{ maxWidth: "680px", margin: "0 auto 36px" }}>
              Merge, split, compress, convert, edit, and secure PDFs without uploading files. Everything is processed locally on your device.
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              <button 
                className="choose-btn-gold" 
                style={{ padding: "14px 28px", fontSize: "15px", fontWeight: "700", minHeight: "48px" }}
                onClick={() => {
                  router.push("/merge");
                }}
              >
                Start Processing PDFs
              </button>
              <button 
                className="ghost-btn" 
                style={{ padding: "14px 28px", fontSize: "15px", fontWeight: "700", minHeight: "48px" }}
                onClick={() => {
                  const el = document.getElementById("tools-catalog");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                View All Tools
              </button>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="trust-section" style={{ padding: "60px 20px", background: "rgba(255, 255, 255, 0.01)", borderBottom: "1px solid rgba(248, 244, 235, 0.06)", borderTop: "1px solid rgba(248, 244, 235, 0.06)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "28px", marginBottom: "32px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              Your Documents Never Leave Your Device
            </h2>
            <div className="trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
              <div className="trust-card" style={{ padding: "24px", background: "rgba(248, 244, 235, 0.02)", border: "1px solid rgba(248, 244, 235, 0.06)", borderRadius: "12px", textAlign: "left" }}>
                <h3 style={{ fontSize: "18px", color: "var(--gold)", marginBottom: "10px", fontFamily: "'Space Grotesk', sans-serif" }}>Local Processing</h3>
                <p style={{ fontSize: "14px", color: "var(--subtle)", margin: 0, lineHeight: 1.5 }}>All document conversions, rendering, and processing occur locally inside your browser's secure sandbox environment.</p>
              </div>
              <div className="trust-card" style={{ padding: "24px", background: "rgba(248, 244, 235, 0.02)", border: "1px solid rgba(248, 244, 235, 0.06)", borderRadius: "12px", textAlign: "left" }}>
                <h3 style={{ fontSize: "18px", color: "var(--gold)", marginBottom: "10px", fontFamily: "'Space Grotesk', sans-serif" }}>No File Uploads</h3>
                <p style={{ fontSize: "14px", color: "var(--subtle)", margin: 0, lineHeight: 1.5 }}>Your confidential PDFs and images are never transmitted or stored on any external server. Complete data sovereignty.</p>
              </div>
              <div className="trust-card" style={{ padding: "24px", background: "rgba(248, 244, 235, 0.02)", border: "1px solid rgba(248, 244, 235, 0.06)", borderRadius: "12px", textAlign: "left" }}>
                <h3 style={{ fontSize: "18px", color: "var(--gold)", marginBottom: "10px", fontFamily: "'Space Grotesk', sans-serif" }}>No Account Required</h3>
                <p style={{ fontSize: "14px", color: "var(--subtle)", margin: 0, lineHeight: 1.5 }}>Skip registration, subscriptions, or usage logs. Enjoy instant access to premium document tools completely free.</p>
              </div>
              <div className="trust-card" style={{ padding: "24px", background: "rgba(248, 244, 235, 0.02)", border: "1px solid rgba(248, 244, 235, 0.06)", borderRadius: "12px", textAlign: "left" }}>
                <h3 style={{ fontSize: "18px", color: "var(--gold)", marginBottom: "10px", fontFamily: "'Space Grotesk', sans-serif" }}>Privacy First</h3>
                <p style={{ fontSize: "14px", color: "var(--subtle)", margin: 0, lineHeight: 1.5 }}>Perfect for medical records, legal agreements, tax filings, and other sensitive workflows that demand strict confidentiality.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Flow */}
        <section className="how-it-works-brief" style={{ padding: "60px 20px", borderBottom: "1px solid rgba(248, 244, 235, 0.06)" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "28px", marginBottom: "40px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              Secure 3-Step Local Processing Flow
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "32px", position: "relative" }}>
              <div className="step-card-brief">
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(184, 138, 67, 0.15)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "18px", fontWeight: "bold" }}>1</div>
                <h3 style={{ fontSize: "18px", marginBottom: "8px", fontFamily: "'Space Grotesk', sans-serif" }}>Upload or Drop Files</h3>
                <p style={{ fontSize: "14px", color: "var(--subtle)", margin: 0, lineHeight: 1.5 }}>Select your PDF or image files from your device. They load instantly into browser memory.</p>
              </div>
              <div className="step-card-brief">
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(15, 129, 118, 0.15)", color: "#0f8176", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "18px", fontWeight: "bold" }}>2</div>
                <h3 style={{ fontSize: "18px", marginBottom: "8px", fontFamily: "'Space Grotesk', sans-serif" }}>Process Locally</h3>
                <p style={{ fontSize: "14px", color: "var(--subtle)", margin: 0, lineHeight: 1.5 }}>Perform merges, splits, compressions, or edits offline. All logic runs in client-side WebAssembly.</p>
              </div>
              <div className="step-card-brief">
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(184, 138, 67, 0.15)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "18px", fontWeight: "bold" }}>3</div>
                <h3 style={{ fontSize: "18px", marginBottom: "8px", fontFamily: "'Space Grotesk', sans-serif" }}>Download Instantly</h3>
                <p style={{ fontSize: "14px", color: "var(--subtle)", margin: 0, lineHeight: 1.5 }}>Save your newly generated file directly back to your device without any server delay.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Competitor Comparison Section */}
        <section className="comparison-section" style={{ padding: "60px 20px", borderBottom: "1px solid rgba(248, 244, 235, 0.06)" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "28px", textAlign: "center", marginBottom: "32px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              How RawPDF Compares
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table className="comparison-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(248, 244, 235, 0.15)" }}>
                    <th style={{ padding: "16px 12px", fontWeight: "700" }}>Feature / Security Capability</th>
                    <th style={{ padding: "16px 12px", fontWeight: "700", color: "var(--gold)" }}>RawPDF (Local)</th>
                    <th style={{ padding: "16px 12px", fontWeight: "700", color: "var(--subtle)" }}>Typical Online PDF Tools</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid rgba(248, 244, 235, 0.06)" }}>
                    <td style={{ padding: "14px 12px", fontWeight: "500" }}>Files uploaded to servers</td>
                    <td style={{ padding: "14px 12px", color: "#e24c4c", fontWeight: "bold" }}>❌ No (Never leaves device)</td>
                    <td style={{ padding: "14px 12px", color: "var(--subtle)" }}>⚠️ Yes (Temporary storage)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(248, 244, 235, 0.06)" }}>
                    <td style={{ padding: "14px 12px", fontWeight: "500" }}>Local browser processing</td>
                    <td style={{ padding: "14px 12px", color: "#0f8176", fontWeight: "bold" }}>✅ Yes (100% offline)</td>
                    <td style={{ padding: "14px 12px", color: "var(--subtle)" }}>❌ No (Server-based API)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(248, 244, 235, 0.06)" }}>
                    <td style={{ padding: "14px 12px", fontWeight: "500" }}>Account required</td>
                    <td style={{ padding: "14px 12px", color: "#0f8176", fontWeight: "bold" }}>❌ No (Anonymous processing)</td>
                    <td style={{ padding: "14px 12px", color: "var(--subtle)" }}>⚠️ Often (To upsell / log history)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(248, 244, 235, 0.06)" }}>
                    <td style={{ padding: "14px 12px", fontWeight: "500" }}>Privacy-focused design</td>
                    <td style={{ padding: "14px 12px", color: "#0f8176", fontWeight: "bold" }}>✅ Yes (By architecture)</td>
                    <td style={{ padding: "14px 12px", color: "var(--subtle)" }}>❌ No (Files handled by third parties)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(248, 244, 235, 0.06)" }}>
                    <td style={{ padding: "14px 12px", fontWeight: "500" }}>Works offline after page load</td>
                    <td style={{ padding: "14px 12px", color: "#0f8176", fontWeight: "bold" }}>✅ Yes (Can disconnect internet)</td>
                    <td style={{ padding: "14px 12px", color: "var(--subtle)" }}>❌ No (Requires active upload)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(248, 244, 235, 0.06)" }}>
                    <td style={{ padding: "14px 12px", fontWeight: "500" }}>Fast processing speeds</td>
                    <td style={{ padding: "14px 12px", color: "#0f8176", fontWeight: "bold" }}>✅ Instant (No network lag)</td>
                    <td style={{ padding: "14px 12px", color: "var(--subtle)" }}>⚠️ Slow (Upload/download queue)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Dynamic Tool Search & Categorized Discovery Section */}
        <section id="tools-catalog" style={{ padding: "60px 20px", scrollMarginTop: "80px" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px", marginBottom: "48px" }}>
              <div>
                <h2 style={{ fontSize: "28px", margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                  Explore PDF Studio Tools
                </h2>
                <p style={{ color: "var(--subtle)", margin: "6px 0 0", fontSize: "15px" }}>Fully browser-based PDF conversion, page layout, and encryption tools.</p>
              </div>
              
              {/* Tool Search Bar */}
              <div className="search-wrap" style={{ position: "relative", maxWidth: "360px", width: "100%" }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="M18 18l-4-4" />
                </svg>
                <input
                  type="text"
                  placeholder="Search tool or format..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(248, 244, 235, 0.03)",
                    border: "1px solid rgba(248, 244, 235, 0.1)",
                    borderRadius: "24px",
                    padding: "10px 16px 10px 42px",
                    color: "#f8f4eb",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.2s ease"
                  }}
                />
              </div>
            </div>

            {/* Filter Tabs Pills */}
            <div className="filter-tabs-container">
              {["All", ...categories].map((cat) => (
                <button
                  key={cat}
                  className={`filter-tab-btn${activeCategory === cat ? " active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat === "All" ? "All Tools" : cat}
                </button>
              ))}
            </div>

            {/* Filtered Grid Output */}
            {filteredTools.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", border: "1.5px dashed rgba(248, 244, 235, 0.08)", borderRadius: "16px" }}>
                <p style={{ color: "var(--subtle)", margin: "0 0 12px" }}>No tools matching "{searchQuery}" found.</p>
                <button className="ghost-btn" onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}>Reset search query</button>
              </div>
            ) : (
              <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
                {filteredTools.map((t) => (
                  <div
                    key={t.id}
                    className={`portal-card card-${t.id}`}
                    role="button"
                    tabIndex="0"
                    onClick={() => router.push(t.path)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(t.path); }}
                    aria-label={`Launch ${t.name}`}
                  >
                    <div className="portal-card-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "16px" }}>
                      <div className={`portal-card-icon ${t.iconClass}`} style={{ marginBottom: 0 }}>
                        {t.svg}
                      </div>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--gold)", fontWeight: 600 }}>
                        {t.category}
                      </span>
                    </div>
                    <h3>{t.name}</h3>
                    <p>{t.desc}</p>
                    <div className="portal-card-actions">
                      <span className="portal-card-btn">Launch Tool →</span>
                      <Link href={`/how-it-works#${t.id}`} className="portal-card-sec-link" onClick={(e) => e.stopPropagation()}>
                        How it works
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }} aria-hidden="true">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Social Proof & GitHub Stars Placeholder */}
        <section className="social-proof-section" style={{ padding: "60px 20px", borderBottom: "1px solid rgba(248, 244, 235, 0.06)", borderTop: "1px solid rgba(248, 244, 235, 0.06)", background: "rgba(255, 255, 255, 0.005)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "28px", marginBottom: "16px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              Loved by Security-Conscious Teams
            </h2>
            <p style={{ color: "var(--subtle)", marginBottom: "40px", fontSize: "15px" }}>Perfect for professionals handling sensitive client records, legal documents, and personal spreadsheets.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
              <div className="proof-card" style={{ padding: "24px", background: "rgba(248, 244, 235, 0.01)", border: "1px solid rgba(248, 244, 235, 0.04)", borderRadius: "12px", textAlign: "left" }}>
                <p style={{ fontSize: "14px", fontStyle: "italic", color: "var(--subtle)", marginBottom: "16px", lineHeight: 1.5 }}>"As an accountant handling client tax records, RawPDF has changed my workflow. I can merge and compress client docs knowing they never leave my screen."</p>
                <strong style={{ fontSize: "14px", display: "block" }}>Sarah L.</strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Certified Public Accountant</span>
              </div>
              <div className="proof-card" style={{ padding: "24px", background: "rgba(248, 244, 235, 0.01)", border: "1px solid rgba(248, 244, 235, 0.04)", borderRadius: "12px", textAlign: "left" }}>
                <p style={{ fontSize: "14px", fontStyle: "italic", color: "var(--subtle)", marginBottom: "16px", lineHeight: 1.5 }}>"The offline compression is incredible. I shut off my Wi-Fi to test it, and it processed my 80MB PDF locally in seconds. Brilliant browser-side execution."</p>
                <strong style={{ fontSize: "14px", display: "block" }}>David K.</strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Software Architect</span>
              </div>
              <div className="proof-card" style={{ padding: "24px", background: "rgba(248, 244, 235, 0.01)", border: "1px solid rgba(248, 244, 235, 0.04)", borderRadius: "12px", textAlign: "left" }}>
                <p style={{ fontSize: "14px", fontStyle: "italic", color: "var(--subtle)", marginBottom: "16px", lineHeight: 1.5 }}>"No accounts, no limits, no upload delay. This is how the web should work. Excellent local WebAssembly implementation."</p>
                <strong style={{ fontSize: "14px", display: "block" }}>Elena R.</strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Legal Paralegal</span>
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
