"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Script from "next/script";
import { loadScript } from "../../utils/lazyLoad";

export default function SanitizeClient() {
  const [theme, setTheme] = useState("dark");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // File & Metadata State
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSanitizing, setIsSanitizing] = useState(false);
  const [sanitized, setSanitized] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Theme Sync
  useEffect(() => {
    const savedTheme = localStorage.getItem("mergeStudioTheme") || "dark";
    setTheme(savedTheme);
    document.body.classList.toggle("theme-light", savedTheme === "light");
  }, [theme]);

  // Scroll Nav
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("mergeStudioTheme", nextTheme);
    document.body.classList.toggle("theme-light", nextTheme === "light");
  };

  const handleDropdownItemClick = () => setIsToolsOpen(false);

  const analyzePdf = async (selectedFile) => {
    if (!selectedFile || selectedFile.type !== "application/pdf") {
      setError("Please select a valid PDF file.");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setIsAnalyzing(true);
    setSanitized(false);

    try {
      await loadScript("https://unpkg.com/pdf-lib/dist/pdf-lib.min.js");
      const { PDFDocument } = window.PDFLib;
      const arrayBuffer = await selectedFile.arrayBuffer();

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      } catch (err) {
        setError("Could not parse PDF. The file may be password protected or corrupted.");
        setIsAnalyzing(false);
        return;
      }

      const title = pdfDoc.getTitle() || "None";
      const author = pdfDoc.getAuthor() || "None";
      const subject = pdfDoc.getSubject() || "None";
      const creator = pdfDoc.getCreator() || "None";
      const producer = pdfDoc.getProducer() || "None";
      const creationDate = pdfDoc.getCreationDate() ? pdfDoc.getCreationDate().toLocaleString() : "Unknown";
      const modDate = pdfDoc.getModificationDate() ? pdfDoc.getModificationDate().toLocaleString() : "Unknown";
      const pageCount = pdfDoc.getPageCount();

      setMetadata({
        title,
        author,
        subject,
        creator,
        producer,
        creationDate,
        modDate,
        pageCount,
        fileSize: (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB",
        hasLeaks: author !== "None" || creator !== "None" || producer !== "None"
      });
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze PDF metadata.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sanitizeAndDownload = async () => {
    if (!file) return;
    setIsSanitizing(true);
    try {
      await loadScript("https://unpkg.com/pdf-lib/dist/pdf-lib.min.js");
      const { PDFDocument } = window.PDFLib;
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      // Strip all identifying metadata & set rawPDF signature
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("rawPDF Studio");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator("rawPDF Engine");
      pdfDoc.setProducer("rawPDF (https://ratnexh.github.io/rawPDF/)");

      const pdfBytes = await pdfDoc.save({ updateInfoDict: false });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const originalName = file.name.replace(/\.[^/.]+$/, "");
      a.download = `${originalName}_sanitized.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSanitized(true);
    } catch (err) {
      console.error("Sanitize error:", err);
      setError("Failed to sanitize metadata.");
    } finally {
      setIsSanitizing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setMetadata(null);
    setError(null);
    setSanitized(false);
  };

  const relatedTools = [
    {
      title: "Protect PDF",
      desc: "Encrypt PDF with strong password.",
      href: "/protect",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    },
    {
      title: "Compress PDF",
      desc: "Reduce PDF file size offline.",
      href: "/compress",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )
    },
    {
      title: "OCR PDF",
      desc: "Extract text from scanned PDFs.",
      href: "/ocr",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
      )
    }
  ];

  return (
    <div className={`app ${theme === "light" ? "theme-light" : ""}`}>
      <Header
        isScrolled={isScrolled}
        isToolsOpen={isToolsOpen}
        setIsToolsOpen={setIsToolsOpen}
        handleDropdownItemClick={handleDropdownItemClick}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="landing view active">
        <section className="hero">
          <div className="hero-content">
            <Link className="ghost-btn-back" href="/">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to Tools</span>
            </Link>

            <p className="eyebrow" aria-label="Privacy guarantee">
              <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              100% Client-Side Privacy Sanitizer
            </p>
            <h1>Inspect & Sanitize PDF Metadata</h1>
            <p className="hero-copy">
              Inspect hidden PDF metadata (Author stamps, Creator software, Creation timestamps) and strip all identifying signatures 100% offline before sharing.
            </p>
          </div>

          {/* Interactive Workspace Dropzone */}
          <div style={{ maxWidth: "860px", margin: "0 auto", width: "100%" }}>
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="dropzone"
                style={{
                  border: "2px dashed rgba(184, 138, 67, 0.4)",
                  borderRadius: "20px",
                  padding: "60px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(16px)",
                  transition: "all 0.25s ease"
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      analyzePdf(e.target.files[0]);
                    }
                  }}
                />
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(184, 138, 67, 0.14)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <button type="button" className="choose-btn-gold" style={{ pointerEvents: "none", marginBottom: "12px" }}>
                  Inspect & Sanitize PDF
                </button>
                <p className="dropzone-text" style={{ margin: 0 }}>
                  or drag and drop PDF file here • 100% Private Client-Side
                </p>
              </div>
            ) : isAnalyzing ? (
              <div style={{ padding: "60px 24px", textAlign: "center", background: "var(--glass-bg)", borderRadius: "20px", border: "1px solid var(--glass-border)" }}>
                <p style={{ color: "var(--gold)", fontWeight: 800, fontSize: "18px", margin: 0 }}>Analyzing PDF metadata & privacy footprints...</p>
              </div>
            ) : metadata ? (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "36px 28px", backdropFilter: "blur(16px)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase" }}>Loaded PDF Document</span>
                    <h3 style={{ fontSize: "20px", margin: "2px 0 0", color: "#f8f4eb", fontWeight: 700, wordBreak: "break-word", overflowWrap: "anywhere" }}>{file.name}</h3>
                  </div>
                  <button
                    onClick={reset}
                    style={{ background: "rgba(248, 244, 235, 0.08)", border: "1px solid rgba(248, 244, 235, 0.14)", color: "#f8f4eb", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                  >
                    Select Another PDF
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
                  <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "18px", borderRadius: "14px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    <div style={{ fontSize: "11px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Author Stamp</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, margin: "6px 0 0", color: metadata.author !== "None" ? "#f8d99f" : "rgba(248, 244, 235, 0.6)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.author}</div>
                  </div>

                  <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "18px", borderRadius: "14px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    <div style={{ fontSize: "11px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Software Creator</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, margin: "6px 0 0", color: metadata.creator !== "None" ? "#f8d99f" : "rgba(248, 244, 235, 0.6)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.creator}</div>
                  </div>

                  <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "18px", borderRadius: "14px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    <div style={{ fontSize: "11px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>PDF Producer</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, margin: "6px 0 0", color: metadata.producer !== "None" ? "#f8d99f" : "rgba(248, 244, 235, 0.6)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.producer}</div>
                  </div>

                  <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "18px", borderRadius: "14px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    <div style={{ fontSize: "11px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Creation Timestamp</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, margin: "6px 0 0", color: "rgba(248, 244, 235, 0.85)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.creationDate}</div>
                  </div>

                  <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "18px", borderRadius: "14px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    <div style={{ fontSize: "11px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pages & File Size</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, margin: "6px 0 0", color: "rgba(248, 244, 235, 0.9)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.pageCount} Pages • {metadata.fileSize}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                  <button
                    onClick={sanitizeAndDownload}
                    disabled={isSanitizing}
                    className="choose-btn-gold"
                    style={{ padding: "14px 32px", fontSize: "16px", fontWeight: 700 }}
                  >
                    {isSanitizing ? "Sanitizing..." : "Strip Metadata & Download Clean PDF"}
                  </button>

                  {sanitized && (
                    <span style={{ color: "#10b981", fontWeight: 800, fontSize: "15px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Sanitized PDF Downloaded Successfully!
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {error && (
              <p style={{ color: "var(--danger)", margin: "16px 0 0", fontSize: "14px", fontWeight: 700, textAlign: "center" }}>
                {error}
              </p>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="section-header">
            <p className="eyebrow-small">OFFLINE PRIVACY PROTECTION</p>
            <h2>Why Sanitize PDF Metadata?</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3>Remove Author Identity</h3>
              <p>PDF creation tools automatically embed your full computer account name, username, or company profile into every exported PDF.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3>Hide Software Footprints</h3>
              <p>Mask software versions, printer drivers, or operating system details attached to your documents before public distribution.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>100% Offline Processing</h3>
              <p>Your PDF file is read and sanitized completely inside your browser memory. Zero bytes leave your device.</p>
            </div>
          </div>
        </section>

        {/* Related Tools */}
        <section className="workspace-footer" style={{ maxWidth: "1280px", margin: "60px auto 40px" }}>
          <div>
            <h3 style={{ fontSize: "18px", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Related PDF Studio Tools</h3>
            <p style={{ color: "var(--subtle)", margin: "4px 0 0", fontSize: "14px" }}>Discover other offline tools to manage your documents securely.</p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {relatedTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: "rgba(248, 244, 235, 0.04)",
                  border: "1px solid rgba(248, 244, 235, 0.1)",
                  color: "#f8f4eb",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 700
                }}
              >
                {tool.icon}
                <span>{tool.title}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      <Script id="schema-sanitize" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "rawPDF Metadata Inspector & Privacy Sanitizer",
          "description": "Inspect hidden PDF metadata (Author, Software stamps, Creation dates) and strip identifying details 100% locally in your browser before sharing.",
          "applicationCategory": "UtilitiesApplication",
          "operatingSystem": "All",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        })}
      </Script>
    </div>
  );
}
