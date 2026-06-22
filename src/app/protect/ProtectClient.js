"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";
import InfoModal from "../../components/InfoModal";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function ProtectClient() {
  // Theme & Layout States
  const [theme, setTheme] = useState("dark");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });

  // Protection State
  const [protectFile, setProtectFile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [encryptionAlgorithm, setEncryptionAlgorithm] = useState("AES-256"); // "AES-256" | "RC4"
  const [protectView, setProtectView] = useState("upload"); // "upload" | "settings" | "processing" | "done"
  const [protectedBlob, setProtectedBlob] = useState(null);
  const [protectedUrl, setProtectedUrl] = useState(null);
  const [protectedName, setProtectedName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Cleanup Object URLs on unmount and change
  useEffect(() => {
    return () => {
      if (protectedUrl) URL.revokeObjectURL(protectedUrl);
    };
  }, [protectedUrl]);

  const protectInputRef = useRef(null);

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

  const handleDropdownItemClick = (name) => {
    setIsToolsOpen(false);
    if (name === "Protect PDF") {
      resetProtectState();
    } else {
      setModal({
        isOpen: true,
        title: name,
        body: "This tool is coming soon in a future update! All document processing stays completely local and secure.",
      });
    }
  };

  const resetProtectState = () => {
    setProtectFile(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setPasswordError("");
    setProtectView("upload");
    setProtectedBlob(null);
    if (protectedUrl) URL.revokeObjectURL(protectedUrl);
    setProtectedUrl(null);
    setProtectedName("");
    setOriginalSize(0);
    setProcessingProgress(0);
  };

  const handleProtectFileSelect = (filesList) => {
    const tooLarge = filesList.find((file) => file.size > 104857600);
    if (tooLarge) {
      setModal({
        isOpen: true,
        title: "File Too Large",
        body: `The file "${tooLarge.name}" exceeds the maximum size limit of 100MB. Please select a smaller file.`,
      });
      return;
    }
    const usable = filesList.filter((file) => {
      const name = file.name.toLowerCase();
      return file.size > 0 && (file.type === "application/pdf" || name.endsWith(".pdf"));
    });
    if (!usable.length) return;
    const file = usable[0];
    setProtectFile(file);
    setOriginalSize(file.size);
    setProtectView("settings");
  };

  const handleProtect = async () => {
    if (!password) {
      setPasswordError("Password cannot be empty.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError("");
    setProtectView("processing");
    setProcessingProgress(15);

    try {
      const arrayBuffer = await protectFile.arrayBuffer();
      setProcessingProgress(40);

      // Perform encryption
      const encryptedBytes = await encryptPDF(new Uint8Array(arrayBuffer), password, { algorithm: encryptionAlgorithm });
      setProcessingProgress(85);

      const resBlob = new Blob([encryptedBytes], { type: "application/pdf" });
      setProtectedBlob(resBlob);

      const resName = protectFile.name.replace(/\.pdf$/i, "") + "-protected.pdf";
      setProtectedName(resName);

      if (protectedUrl) URL.revokeObjectURL(protectedUrl);
      const resUrl = URL.createObjectURL(resBlob);
      setProtectedUrl(resUrl);

      setProcessingProgress(100);
      await wait(300);
      setProtectView("done");
    } catch (err) {
      console.error("Encryption failed:", err);
      setModal({
        isOpen: true,
        title: "Protection Error",
        body: "Failed to protect the PDF file. Please ensure it is a valid, unencrypted PDF.",
      });
      setProtectView("upload");
      setProtectFile(null);
    }
  };

  const downloadProtected = () => {
    if (!protectedBlob) return;
    const finalName = normalizePdfName(protectedName);
    const link = document.createElement("a");
    link.href = protectedUrl || URL.createObjectURL(protectedBlob);
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Helper Utils
  const normalizePdfName = (val) => {
    const cleaned = (val || "protected-document.pdf")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, " ");
    return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
  };

  const formatMb = (bytes) =>
    Math.max(0.1, bytes / 1024 / 1024).toFixed(bytes > 10000000 ? 0 : 1);

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  return (
    <>
      {protectView !== "settings" && (
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
        </>
      )}

      {protectView === "settings" && protectFile && (
        <main id="workspace" className="studio view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {/* Workspace top navigation bar */}
          <div className="workspace-header">
            <button className="ghost-btn workspace-back" onClick={() => {
              setProtectView("upload");
              setProtectFile(null);
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <div className="workspace-title-area">
              <h3 className="workspace-title">Protect PDF</h3>
              <p className="workspace-subtitle">{protectFile.name}</p>
            </div>
            <div className="workspace-actions" />
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
            <div className="compress-card" style={{ maxWidth: "480px", width: "100%", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(248, 244, 235, 0.12)", paddingBottom: "16px", marginBottom: "24px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "18px" }} title={protectFile.name}>
                    {protectFile.name.length > 30 ? `${protectFile.name.slice(0, 27)}...` : protectFile.name}
                  </h3>
                  <p style={{ margin: 0, color: "var(--subtle)", fontSize: "14px" }}>Original Size: {formatMb(protectFile.size)} MB</p>
                </div>
                <button className="ghost-btn" style={{ minHeight: "36px", padding: "0 12px" }} onClick={() => {
                  setProtectView("upload");
                  setProtectFile(null);
                }}>
                  Change File
                </button>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ margin: "0 0 20px", fontSize: "16px", textAlign: "left" }}>Set Document Password</h4>

                <label className="rename-field" style={{ marginBottom: "20px" }}>
                  <span>Encryption Standard</span>
                  <select
                    value={encryptionAlgorithm}
                    onChange={(e) => setEncryptionAlgorithm(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: theme === "light" ? "rgba(16, 22, 36, 0.05)" : "rgba(13,18,27,0.5)",
                      border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.12)" : "1px solid rgba(248, 244, 235, 0.15)",
                      color: theme === "light" ? "#101624" : "#f8f4eb",
                      fontSize: "14px",
                      outline: "none",
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    <option value="AES-256">AES-256 - Strong (Recommended)</option>
                    <option value="RC4">RC4 - Legacy Compatibility</option>
                  </select>
                </label>

                <label className="rename-field" style={{ marginBottom: "16px" }}>
                  <span>Enter Password</span>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a strong password"
                      style={{ paddingRight: "48px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "var(--subtle)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", height: "20px" }}>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", height: "20px" }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>

                <label className="rename-field" style={{ marginBottom: "12px" }}>
                  <span>Confirm Password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                  />
                </label>

                {passwordError && (
                  <p style={{ margin: "10px 0 0", color: "var(--danger)", fontSize: "14px", textAlign: "left" }}>
                    ⚠️ {passwordError}
                  </p>
                )}
              </div>

              <button className="wide-btn" style={{ width: "100%", minHeight: "52px" }} onClick={handleProtect}>
                Protect PDF
              </button>
            </div>
          </div>
        </main>
      )}

      {protectView !== "settings" && (
        <main id="protect" className="landing view active">
        <input
          id="protectInput"
          className="sr-only"
          type="file"
          accept=".pdf,application/pdf"
          ref={protectInputRef}
          onChange={(e) => {
            handleProtectFileSelect([...e.target.files]);
            e.target.value = "";
          }}
        />

        <section className="hero">
          <div className="hero-content">
            <Link className="ghost-btn-back" href="/">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to Tools</span>
            </Link>

            <p className="eyebrow">
              <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Private PDF Studio
            </p>
            <h1>Protect PDF</h1>
            <p className="hero-copy">
              Encrypt your PDF document with a strong password — all processed locally in your browser.
            </p>
          </div>

          {/* Inner View: Upload */}
          {protectView === "upload" && (
            <div
              id="protectDropzone"
              className={`dropzone${isDragOverDropzone ? " dragover" : ""}`}
              tabIndex="0"
              role="button"
              aria-label="Choose a PDF file to encrypt"
              onClick={() => protectInputRef.current.click()}
              onDragEnter={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOverDropzone(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverDropzone(false);
                handleProtectFileSelect([...e.dataTransfer.files]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  protectInputRef.current.click();
                }
              }}
            >
              <div className="dropzone-inner">
                <div className="dropzone-cards" aria-hidden="true">
                  <div className="pdf-card-shadow card-left"></div>
                  <div className="pdf-card-shadow card-right"></div>
                  <div className="pdf-card-front">PDF</div>
                </div>
                <button id="chooseBtn" className="choose-btn-gold" type="button">
                  <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Choose PDF file
                </button>
                <p className="dropzone-text">or drag and drop PDF here</p>
                <div className="dropzone-security">
                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Files are processed locally. Your data stays private.</span>
                </div>
              </div>
            </div>
          )}

          {/* Inner View: Settings */}
          {protectView === "settings" && protectFile && (
            <div className="compress-card" style={{ maxWidth: "480px", width: "100%", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(248, 244, 235, 0.12)", paddingBottom: "16px", marginBottom: "24px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "18px" }} title={protectFile.name}>
                    {protectFile.name.length > 30 ? `${protectFile.name.slice(0, 27)}...` : protectFile.name}
                  </h3>
                  <p style={{ margin: 0, color: "var(--subtle)", fontSize: "14px" }}>Original Size: {formatMb(protectFile.size)} MB</p>
                </div>
                <button className="ghost-btn" style={{ minHeight: "36px", padding: "0 12px" }} onClick={() => setProtectView("upload")}>
                  Change File
                </button>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ margin: "0 0 20px", fontSize: "16px", textAlign: "left" }}>Set Document Password</h4>

                <label className="rename-field" style={{ marginBottom: "20px" }}>
                  <span>Encryption Standard</span>
                  <select
                    value={encryptionAlgorithm}
                    onChange={(e) => setEncryptionAlgorithm(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: theme === "light" ? "rgba(16, 22, 36, 0.05)" : "rgba(13,18,27,0.5)",
                      border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.12)" : "1px solid rgba(248, 244, 235, 0.15)",
                      color: theme === "light" ? "#101624" : "#f8f4eb",
                      fontSize: "14px",
                      outline: "none",
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    <option value="AES-256">AES-256 - Strong (Recommended)</option>
                    <option value="RC4">RC4 - Legacy Compatibility</option>
                  </select>
                </label>

                <label className="rename-field" style={{ marginBottom: "16px" }}>
                  <span>Enter Password</span>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a strong password"
                      style={{ paddingRight: "48px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "var(--subtle)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", height: "20px" }}>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", height: "20px" }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>

                <label className="rename-field" style={{ marginBottom: "12px" }}>
                  <span>Confirm Password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                  />
                </label>

                {passwordError && (
                  <p style={{ margin: "10px 0 0", color: "var(--danger)", fontSize: "14px", textAlign: "left" }}>
                    ⚠️ {passwordError}
                  </p>
                )}
              </div>

              <button className="wide-btn" style={{ width: "100%", minHeight: "52px" }} onClick={handleProtect}>
                Protect PDF
              </button>
            </div>
          )}

          {/* Inner View: Processing */}
          {protectView === "processing" && (
            <div className="compress-card" style={{ textAlign: "center", maxWidth: "420px", width: "100%", margin: "0 auto" }}>
              <div className="process-icon" aria-hidden="true" style={{ margin: "0 auto 24px" }}>
                <span></span>
                <span></span>
              </div>
              <h2 style={{ margin: "0 0 8px" }}>Encrypting PDF</h2>
              <div className="progress" style={{ margin: "24px 0 16px" }}>
                <i style={{ width: `${processingProgress}%`, transition: "width 0.3s ease" }}></i>
              </div>
              <p style={{ margin: 0, color: "var(--subtle)" }}>Applying password protection locally. {processingProgress}%</p>
            </div>
          )}

          {/* Inner View: Done */}
          {protectView === "done" && (
            <div className="compress-card" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "32px",
              alignItems: "center",
              maxWidth: "800px",
              width: "100%",
              margin: "0 auto"
            }}>
              {/* Left Column: Locked Preview Asset */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: theme === "light" ? "rgba(16, 22, 36, 0.03)" : "rgba(13, 18, 27, 0.4)",
                border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.08)" : "1px solid rgba(248, 244, 235, 0.08)",
                borderRadius: "12px",
                padding: "40px 24px",
                height: "360px",
                width: "100%",
                textAlign: "center"
              }}>
                <div style={{
                  background: "rgba(184, 138, 67, 0.12)",
                  color: "var(--gold)",
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px"
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "36px", height: "36px" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "20px" }}>Encrypted Securely</h3>
                <p style={{ margin: 0, color: "var(--subtle)", fontSize: "14px", maxWidth: "260px" }}>
                  This document is now locked and require the password to be opened or printed.
                </p>
              </div>

              {/* Right Column: Actions */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ marginBottom: "24px" }}>
                  <p className="eyebrow" style={{ margin: "0 0 8px" }}>Success</p>
                  <h2 style={{ margin: "0 0 8px" }}>Password Protected</h2>
                  <p style={{ margin: 0, color: "var(--subtle)", fontSize: "14.5px" }}>
                    Size: {formatMb(protectedBlob?.size || 0)} MB
                  </p>
                </div>

                <label className="rename-field" style={{ marginBottom: "20px" }}>
                  <span>Rename protected file</span>
                  <input
                    id="renameProtectInput"
                    type="text"
                    value={protectedName}
                    onChange={(e) => setProtectedName(e.target.value)}
                  />
                </label>

                <button className="wide-btn" style={{ width: "100%", marginBottom: "16px" }} onClick={downloadProtected}>
                  Download Protected PDF
                </button>

                <button className="ghost-btn" style={{ width: "100%" }} onClick={resetProtectState}>
                  Protect Another
                </button>
              </div>
            </div>
          )}
        </section>

        {protectView === "upload" && (
          <>
            <section className="features-section">
              <div className="section-header">
                <p className="eyebrow-small">Built for</p>
                <h2>Lock-tight security</h2>
              </div>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h3>128-bit Encryption</h3>
                  <p>Secures files using industry-compatible RC4 128-bit password protection, supported by all major PDF readers.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <h3>100% Client-Side</h3>
                  <p>Your password and files are processed inside browser memory. Zero network transit.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <h3>Universal Compatibility</h3>
                  <p>Protected files can be unlocked by standard software like Adobe Reader, Preview, Chrome, or Safari.</p>
                </div>
              </div>
            </section>

            <section className="how-it-works-section">
              <p className="eyebrow-small">How it works</p>
              <div className="how-it-works-container">
                <div className="how-it-works-grid">
                  <div className="step-card">
                    <div className="step-icon-container">
                      <div className="step-icon-wrapper">
                        <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="step-number">1</span>
                      </div>
                      <div className="step-connector"></div>
                    </div>
                    <h4>Upload PDF</h4>
                    <p>Choose an unencrypted PDF from your device.</p>
                  </div>

                  <div className="step-card">
                    <div className="step-icon-container">
                      <div className="step-icon-wrapper">
                        <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="step-number">2</span>
                      </div>
                      <div className="step-connector"></div>
                    </div>
                    <h4>Choose password</h4>
                    <p>Input a strong security key to locks the file.</p>
                  </div>

                  <div className="step-card">
                    <div className="step-icon-container">
                      <div className="step-icon-wrapper">
                        <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span className="step-number">3</span>
                      </div>
                      <div className="step-connector"></div>
                    </div>
                    <h4>Encrypt</h4>
                    <p>Web Crypto locks the PDF with 128-bit encryption, compatible with Adobe Acrobat, Preview, Chrome, and more.</p>
                  </div>

                  <div className="step-card">
                    <div className="step-icon-container">
                      <div className="step-icon-wrapper">
                        <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span className="step-number">4</span>
                      </div>
                    </div>
                    <h4>Download</h4>
                    <p>Save your password protected PDF instantly.</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      )}

      {protectView !== "settings" && <Footer />}

      <InfoModal
        isOpen={modal.isOpen}
        title={modal.title}
        body={modal.body}
        onClose={() => setModal({ isOpen: false, title: "", body: "" })}
      />
    </>
  );
}
