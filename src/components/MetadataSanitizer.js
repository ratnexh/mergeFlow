"use client";

import React, { useState, useRef } from "react";
import { loadScript } from "../utils/lazyLoad";

export default function MetadataSanitizer() {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSanitizing, setIsSanitizing] = useState(false);
  const [sanitized, setSanitized] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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

  return (
    <section className="metadata-sanitizer-section" style={{ margin: "40px auto 60px", maxWidth: "1280px", padding: "0 20px" }}>
      <div
        style={{
          background: "linear-gradient(135deg, rgba(20, 26, 38, 0.95), rgba(13, 18, 27, 0.98))",
          border: "1px solid rgba(184, 138, 67, 0.28)",
          borderRadius: "24px",
          padding: "clamp(24px, 4vw, 40px)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(184, 138, 67, 0.14)", color: "var(--gold)", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Privacy Feature
            </div>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              PDF Metadata Inspector & Privacy Sanitizer
            </h2>
            <p style={{ color: "var(--subtle)", margin: "8px 0 0", fontSize: "15px", maxWidth: "680px" }}>
              PDF files contain hidden metadata like your author name, computer software details, and creation timestamps. Inspect and strip identifying metadata 100% locally before sharing.
            </p>
          </div>
        </div>

        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed rgba(184, 138, 67, 0.35)",
              borderRadius: "16px",
              padding: "48px 24px",
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(248, 244, 235, 0.02)",
              transition: "border-color 0.25s ease, background 0.25s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--gold)";
              e.currentTarget.style.background = "rgba(184, 138, 67, 0.05)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "rgba(184, 138, 67, 0.35)";
              e.currentTarget.style.background = "rgba(248, 244, 235, 0.02)";
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
            <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "rgba(184, 138, 67, 0.12)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3 style={{ fontSize: "18px", margin: "0 0 6px", fontWeight: 700 }}>Inspect PDF for Hidden Metadata</h3>
            <p style={{ color: "var(--subtle)", fontSize: "14px", margin: 0 }}>
              Drop a PDF file here or click to select • 100% Client-Side Processing
            </p>
          </div>
        ) : isAnalyzing ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p style={{ color: "var(--gold)", fontWeight: 700, fontSize: "16px" }}>Analyzing PDF metadata & privacy footprints...</p>
          </div>
        ) : metadata ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: "13px", color: "var(--subtle)", fontWeight: 700 }}>Loaded Document</span>
                <h4 style={{ fontSize: "18px", margin: "2px 0 0", color: "#f8f4eb", fontWeight: 700, wordBreak: "break-word", overflowWrap: "anywhere" }}>{file.name}</h4>
              </div>
              <button
                onClick={reset}
                style={{ background: "rgba(258, 244, 235, 0.08)", border: "1px solid rgba(248, 244, 235, 0.14)", color: "#f8f4eb", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
              >
                Inspect Another File
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
              <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "16px", borderRadius: "12px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                <div style={{ fontSize: "12px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase" }}>Author Stamp</div>
                <div style={{ fontSize: "15px", fontWeight: 700, margin: "4px 0 0", color: metadata.author !== "None" ? "#f8d99f" : "rgba(248, 244, 235, 0.6)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.author}</div>
              </div>

              <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "16px", borderRadius: "12px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                <div style={{ fontSize: "12px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase" }}>Software Creator</div>
                <div style={{ fontSize: "15px", fontWeight: 700, margin: "4px 0 0", color: metadata.creator !== "None" ? "#f8d99f" : "rgba(248, 244, 235, 0.6)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.creator}</div>
              </div>

              <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "16px", borderRadius: "12px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                <div style={{ fontSize: "12px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase" }}>PDF Producer</div>
                <div style={{ fontSize: "15px", fontWeight: 700, margin: "4px 0 0", color: metadata.producer !== "None" ? "#f8d99f" : "rgba(248, 244, 235, 0.6)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.producer}</div>
              </div>

              <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "16px", borderRadius: "12px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                <div style={{ fontSize: "12px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase" }}>Creation Timestamp</div>
                <div style={{ fontSize: "14px", fontWeight: 700, margin: "4px 0 0", color: "rgba(248, 244, 235, 0.8)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.creationDate}</div>
              </div>

              <div style={{ background: "rgba(248, 244, 235, 0.03)", border: "1px solid rgba(248, 244, 235, 0.08)", padding: "16px", borderRadius: "12px", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                <div style={{ fontSize: "12px", color: "var(--subtle)", fontWeight: 800, textTransform: "uppercase" }}>Pages & File Size</div>
                <div style={{ fontSize: "15px", fontWeight: 700, margin: "4px 0 0", color: "rgba(248, 244, 235, 0.9)", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.pageCount} Pages • {metadata.fileSize}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={sanitizeAndDownload}
                disabled={isSanitizing}
                className="choose-btn-gold"
                style={{ padding: "12px 28px", fontSize: "15px", fontWeight: 700 }}
              >
                {isSanitizing ? "Sanitizing..." : "Strip Metadata & Download Clean PDF"}
              </button>

              {sanitized && (
                <span style={{ color: "#10b981", fontWeight: 800, fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Sanitized PDF Downloaded Successfully!
                </span>
              )}
            </div>
          </div>
        ) : null}

        {error && (
          <p style={{ color: "var(--danger)", margin: "16px 0 0", fontSize: "14px", fontWeight: 700 }}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
