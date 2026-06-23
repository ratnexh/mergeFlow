"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import InfoModal from "../../components/InfoModal";
import ConfirmModal from "../../components/ConfirmModal";

export default function TextEditorClient() {
  // Navigation & Theme
  const [theme, setTheme] = useState("dark");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Modals & Notifications
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Editor State
  const [text, setText] = useState("");
  const [historyStack, setHistoryStack] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);

  // Editor Preferences
  const [fontFamily, setFontFamily] = useState("monospace");
  const [fontSize, setFontSize] = useState(14);
  const [wrapText, setWrapText] = useState(true);

  // Find & Replace State
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Theme Init
  useEffect(() => {
    const saved = localStorage.getItem("mergeStudioTheme") || "dark";
    setTheme(saved);
    document.body.classList.toggle("theme-light", saved === "light");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("mergeStudioTheme", next);
    document.body.classList.toggle("theme-light", next === "light");
  };

  // Scroll Nav Shrink
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dropdown close-on-click-outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const el = document.getElementById("toolsDropdown");
      if (el && !el.contains(e.target)) setIsToolsOpen(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Calculate Metrics
  const getMetrics = () => {
    const chars = text.length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const lines = text === "" ? 0 : text.split("\n").length;
    const sentences = text.trim() === "" ? 0 : text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    return { chars, words, lines, sentences };
  };

  const { chars, words, lines, sentences } = getMetrics();

  // Save current state to undo history
  const saveToHistory = (customText = null) => {
    const value = customText !== null ? customText : text;
    setHistoryStack((prev) => [...prev, value].slice(-50)); // Cap history stack at 50 entries
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setText(previous);
    setHistoryStack((prev) => prev.slice(0, -1));
    setToastMessage("Undone");
  };

  // Case Conversions
  const handleSentenceCase = () => {
    if (!text) return;
    saveToHistory();
    // Capitalize first letter of text, and then first letter of any sentence following a punctuation mark
    const converted = text.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, prefix, char) => {
      return prefix + char.toUpperCase();
    });
    setText(converted);
    setToastMessage("Sentence case applied");
  };

  const handleLowerCase = () => {
    if (!text) return;
    saveToHistory();
    setText(text.toLowerCase());
    setToastMessage("Converted to lowercase");
  };

  const handleUpperCase = () => {
    if (!text) return;
    saveToHistory();
    setText(text.toUpperCase());
    setToastMessage("Converted to UPPERCASE");
  };

  const handleCapitalizedCase = () => {
    if (!text) return;
    saveToHistory();
    const converted = text.toLowerCase().replace(/\b[a-z]/g, (char) => char.toUpperCase());
    setText(converted);
    setToastMessage("Capitalized Case applied");
  };

  const handleTitleCase = () => {
    if (!text) return;
    saveToHistory();
    // Traditional title casing: capitalize words except minor prepositions, conjunctions, and articles
    const minorWords = /^(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v\.?|via|vs\.?)$/i;
    const wordsArr = text.toLowerCase().split(/(\s+)/);
    const converted = wordsArr
      .map((word, index) => {
        // Leave spaces alone
        if (/^\s+$/.test(word)) return word;
        // Capitalize first word, last word, or any major word
        const isFirst = index === 0;
        const isLast = index === wordsArr.length - 1;
        if (isFirst || isLast || !minorWords.test(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join("");
    setText(converted);
    setToastMessage("Title Case applied");
  };

  const handleAlternatingCase = () => {
    if (!text) return;
    saveToHistory();
    let isUpper = true;
    const converted = text
      .split("")
      .map((char) => {
        if (/[a-zA-Z]/.test(char)) {
          const result = isUpper ? char.toUpperCase() : char.toLowerCase();
          isUpper = !isUpper;
          return result;
        }
        return char;
      })
      .join("");
    setText(converted);
    setToastMessage("Alternating case applied");
  };

  const handleInverseCase = () => {
    if (!text) return;
    saveToHistory();
    const converted = text
      .split("")
      .map((char) => {
        if (char === char.toUpperCase()) return char.toLowerCase();
        return char.toUpperCase();
      })
      .join("");
    setText(converted);
    setToastMessage("Inverted letters case");
  };

  // Formatting utility operations
  const handleReduceSpaces = () => {
    if (!text) return;
    saveToHistory();
    const cleaned = text
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .join("\n");
    setText(cleaned);
    setToastMessage("Reduced duplicate spaces");
  };

  const handleMergeLines = () => {
    if (!text) return;
    saveToHistory();
    const merged = text
      .replace(/([^\n])\n([^\n])/g, "$1 $2")
      .replace(/[ \t]+/g, " ");
    setText(merged);
    setToastMessage("Merged single lines");
  };

  // Find & Replace
  const handleFindReplace = () => {
    if (!text || !findText) return;
    try {
      let regex;
      if (useRegex) {
        regex = new RegExp(findText, matchCase ? "g" : "gi");
      } else {
        // Escape literal search characters to prevent regex crashes
        const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        regex = new RegExp(escaped, matchCase ? "g" : "gi");
      }
      
      const matches = text.match(regex);
      if (!matches || matches.length === 0) {
        setToastMessage("No matches found");
        return;
      }

      saveToHistory();
      const count = matches.length;
      const updatedText = text.replace(regex, replaceText);
      setText(updatedText);
      setToastMessage(`Replaced ${count} match${count > 1 ? "es" : ""} successfully`);
    } catch (err) {
      console.error(err);
      setToastMessage("Error: Invalid Search Pattern");
    }
  };

  // Export functions
  const handleCopy = () => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setToastMessage("Copied to clipboard!");
      }).catch(err => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (val) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = val;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setToastMessage("Copied to clipboard!");
    } catch (err) {
      setToastMessage("Failed to copy automatically.");
    }
  };

  const handleDownload = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "edited_text.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMessage("Downloaded plain text file");
  };

  const handleShare = async () => {
    if (!text) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Formatted Text from rawPDF",
          text: text,
        });
        setToastMessage("Shared successfully");
      } catch (err) {
        console.log("Share failed or cancelled");
      }
    } else {
      handleCopy();
      setToastMessage("Copied to clipboard (sharing unavailable)");
    }
  };

  const handleClear = () => {
    if (!text) return;
    setIsConfirmOpen(true);
  };

  const relatedTools = [
    {
      title: "OCR PDF",
      desc: "Extract text from scanned PDFs.",
      href: "/ocr",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      )
    },
    {
      title: "Merge PDF",
      desc: "Combine multiple PDFs into one.",
      href: "/merge",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="11" height="11" rx="2" />
        </svg>
      )
    },
    {
      title: "Split PDF",
      desc: "Extract pages from your PDF.",
      href: "/split",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <line x1="12" y1="3" x2="12" y2="21" />
          <rect x="2" y="4" width="8" height="16" rx="2" />
          <rect x="14" y="4" width="8" height="16" rx="2" />
        </svg>
      )
    },
    {
      title: "Compress PDF",
      desc: "Reduce PDF file size offline.",
      href: "/compress",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <path d="M20 14l-6 6M4 10l6-6" />
        </svg>
      )
    }
  ];

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

      <main className="landing view active" style={{ paddingBottom: "100px" }}>

        {/* Title / Hero */}
        <section className="hero">
          <div className="hero-content" style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
            <Link className="ghost-btn-back" href="/" style={{ marginBottom: "16px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to Tools</span>
            </Link>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Private Local Processing
            </p>
            <h1>Text Editor & Case Converter</h1>
            <p className="hero-copy" style={{ maxWidth: "600px", margin: "0 auto" }}>
              Compose, clean spacing, merge lines, and translate cases instantly. All text actions happen 100% locally.
            </p>
          </div>

          {/* Text Editor Studio Container */}
          <div style={{ maxWidth: "980px", width: "100%", margin: "0 auto", padding: "0 20px" }}>
            <div className="text-editor-box">

              {/* Find & Replace Expandable Panel */}
              {showFindReplace && (
                <div className="editor-fr-panel">
                  <div className="fr-field-group">
                    <input
                      type="text"
                      placeholder="Find text..."
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      className="fr-input"
                    />
                    <input
                      type="text"
                      placeholder="Replace with..."
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      className="fr-input"
                    />
                    <button className="fr-action-btn primary" onClick={handleFindReplace}>
                      Replace All
                    </button>
                  </div>
                  <div className="fr-option-group">
                    <label className="fr-checkbox-label">
                      <input
                        type="checkbox"
                        checked={matchCase}
                        onChange={(e) => setMatchCase(e.target.checked)}
                      />
                      <span>Match Case</span>
                    </label>
                    <label className="fr-checkbox-label">
                      <input
                        type="checkbox"
                        checked={useRegex}
                        onChange={(e) => setUseRegex(e.target.checked)}
                      />
                      <span>Regex Search</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Custom Preferences Drawer */}
              {showSettings && (
                <div className="editor-settings-panel">
                  <div className="settings-row">
                    <label className="settings-item">
                      <span>Font Family:</span>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="settings-select"
                      >
                        <option value="monospace">Monospace (Console)</option>
                        <option value="'Space Grotesk', sans-serif">Sans-Serif (Modern)</option>
                        <option value="Georgia, serif">Serif (Editorial)</option>
                      </select>
                    </label>

                    <label className="settings-item">
                      <span>Font Size: {fontSize}px</span>
                      <input
                        type="range"
                        min="12"
                        max="28"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="settings-slider"
                      />
                    </label>

                    <label className="settings-checkbox">
                      <input
                        type="checkbox"
                        checked={wrapText}
                        onChange={(e) => setWrapText(e.target.checked)}
                      />
                      <span>Wrap Text</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Upper Editor Formatting Toolbar */}
              <div className="ocr-editor-toolbar" style={{ borderRadius: "12px 12px 0 0", borderTop: "1px solid rgba(248, 244, 235, 0.08)" }}>
                <button
                  className="editor-tool-btn undo-btn"
                  onClick={handleUndo}
                  disabled={historyStack.length === 0}
                  title="Undo last modification"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                  Undo
                </button>
                <div className="toolbar-divider" />

                <button className="editor-tool-btn" onClick={handleSentenceCase}>Sentence case</button>
                <button className="editor-tool-btn" onClick={handleLowerCase}>lowercase</button>
                <button className="editor-tool-btn" onClick={handleUpperCase}>UPPERCASE</button>
                <button className="editor-tool-btn" onClick={handleCapitalizedCase}>Capitalized</button>
                <button className="editor-tool-btn" onClick={handleTitleCase}>Title Case</button>
                <button className="editor-tool-btn" onClick={handleAlternatingCase}>aLtErNaTe</button>
                <button className="editor-tool-btn" onClick={handleInverseCase}>iNvErSe</button>

                <div className="toolbar-divider" />
                <button className="editor-tool-btn" onClick={handleReduceSpaces} title="Clear consecutive double spaces">Reduce Spaces</button>
                <button className="editor-tool-btn" onClick={handleMergeLines} title="Join lines into paragraphs">Merge Lines</button>
              </div>

              {/* Main Textarea */}
              <div style={{ position: "relative" }}>
                <textarea
                  className="ocr-text-textarea"
                  style={{
                    minHeight: "360px",
                    borderRadius: "0",
                    fontFamily: fontFamily,
                    fontSize: `${fontSize}px`,
                    whiteSpace: wrapText ? "pre-wrap" : "pre",
                    overflowX: wrapText ? "hidden" : "auto",
                    padding: "24px",
                    borderBottom: "1px solid rgba(248, 244, 235, 0.08)",
                    width: "100%"
                  }}
                  placeholder="Type or paste your content here..."
                  value={text}
                  onChange={(e) => {
                    saveToHistory(text);
                    setText(e.target.value);
                  }}
                />
              </div>

              {/* Lower Utility Control Panel */}
              <div className="editor-bottom-bar">

                <div className="editor-action-buttons">
                  <button className="editor-util-btn" onClick={handleCopy} title="Copy all text to clipboard">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy</span>
                  </button>

                  <button className="editor-util-btn" onClick={handleShare} title="Share text content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>Share</span>
                  </button>

                  <button className="editor-util-btn" onClick={handleDownload} title="Download text as .txt file">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download</span>
                  </button>

                  <button className="editor-util-btn danger" onClick={handleClear} title="Discard and clear all text">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Clear</span>
                  </button>

                  <div className="util-btn-divider" />

                  <button className={`editor-util-btn${showFindReplace ? " active" : ""}`} onClick={() => setShowFindReplace(!showFindReplace)} title="Toggle Find & Replace panel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>Find & Replace</span>
                  </button>

                  <button className={`editor-util-btn${showSettings ? " active" : ""}`} onClick={() => setShowSettings(!showSettings)} title="Toggle editor preferences">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Preferences</span>
                  </button>
                </div>

                {/* Character, word, line counts */}
                <div className="editor-stats">
                  <span>Ch: <strong>{chars}</strong></span>
                  <span className="stats-dot">•</span>
                  <span>W: <strong>{words}</strong></span>
                  <span className="stats-dot">•</span>
                  <span>L: <strong>{lines}</strong></span>
                  <span className="stats-dot">•</span>
                  <span>Sent: <strong>{sentences}</strong></span>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* Built for section */}
        <section className="features-section" style={{ marginTop: "80px" }}>
          <div className="section-header">
            <p className="eyebrow-small">Built for</p>
            <h2>Secure Offline Text Formatting</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>100% Client-Side Processing</h3>
              <p>All formatting, case conversions, and searches run directly in browser memory. Your text never leaves your device.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3>Privacy-First Compose</h3>
              <p>Ideal for formatting sensitive copy, API credentials, configuration text, or private notes in complete safety.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <h3>Premium Formatting Suite</h3>
              <p>Includes undo stack histories, spacing cleaners, regex Find & Replace, and customizable font size and family settings.</p>
            </div>
          </div>
        </section>

        {/* How it works section */}
        <section className="how-it-works-section" style={{ marginTop: "80px" }}>
          <p className="eyebrow-small">How it works</p>
          <div className="how-it-works-container">
            <div className="how-it-works-grid">

              <div className="step-card">
                <div className="step-icon-container">
                  <div className="step-icon-wrapper">
                    <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="step-number">1</span>
                  </div>
                  <div className="step-connector"></div>
                </div>
                <h4>Enter your text</h4>
                <p>Type directly or paste content into the clean, offline workspace area.</p>
              </div>

              <div className="step-card">
                <div className="step-icon-container">
                  <div className="step-icon-wrapper">
                    <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span className="step-number">2</span>
                  </div>
                  <div className="step-connector"></div>
                </div>
                <h4>Format and clean</h4>
                <p>Convert case styles, merge single lines, clean consecutive spaces, or run find-replace tools.</p>
              </div>

              <div className="step-card">
                <div className="step-icon-container">
                  <div className="step-icon-wrapper">
                    <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span className="step-number">3</span>
                  </div>
                </div>
                <h4>Copy or export</h4>
                <p>Download your completed work as a plain text (.TXT) file or copy it with a single click.</p>
              </div>

            </div>
          </div>
        </section>

        {/* Related Tools Links */}
        <section className="related-tools-section">
          <h3 style={{ fontSize: "20px", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            Related PDF Utilities
          </h3>
          <div className="related-tools-grid">
            {relatedTools.map((t) => (
              <Link key={t.href} href={t.href} className="related-tool-card">
                <div className="related-tool-card-icon">
                  {t.icon}
                </div>
                <h4>{t.title}</h4>
                <p>{t.desc}</p>
                <span className="related-tool-card-cta">
                  Launch Tool
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* SEO Content & FAQ Section */}
        <section className="seo-faq-section">
          <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "left" }}>
            <h2 style={{ fontSize: "24px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "16px", fontWeight: 700 }}>
              Secure Offline Text Formatting & Case Conversion
            </h2>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--subtle)", marginBottom: "24px" }}>
              RawPDF's Text Editor and Case Converter runs completely offline and processes data client-side. Most online notepad and case conversion tools upload your text to databases or log your keystrokes. With RawPDF, your sensitive notes, API key configurations, or personal correspondence are processed entirely in browser memory.
            </p>

            <h3 style={{ fontSize: "18px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "12px", fontWeight: 700 }}>
              Flexible Case Formatting Options
            </h3>
            <ul style={{ fontSize: "14.5px", lineHeight: "1.8", color: "var(--subtle)", paddingLeft: "20px", marginBottom: "24px" }}>
              <li><strong>Sentence Case:</strong> Capitalizes the first letter of each sentence, transforming accidental all-caps or all-lowercase paragraphs into standard reading layouts.</li>
              <li><strong>Title Case:</strong> Adapts your headings to professional editorial standards. It skips minor prepositions, articles, and conjunctions (e.g. "and", "the", "of", "to") unless they are the first or last word.</li>
              <li><strong>Inverse and Alternating Case:</strong> Instantly flip uppercase characters to lowercase (and vice versa) or convert text to an alternating pattern (e.g. "aLtErNaTe") for creative design needs.</li>
              <li><strong>Whitespace Cleanup:</strong> Clean up dirty copy-pastes instantly with options to merge separate lines into single continuous paragraphs or reduce multiple consecutive spaces.</li>
            </ul>

            <h3 style={{ fontSize: "22px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "20px", fontWeight: 700, borderBottom: "1px solid rgba(248, 244, 235, 0.08)", paddingBottom: "8px" }}>
              Frequently Asked Questions
            </h3>
            <div className="seo-faq-grid">
              <div className="seo-faq-item">
                <h4>Is my text sent to any servers?</h4>
                <p>No. Every operation—including text formatting, case conversions, and search & replace—is handled 100% locally in your web browser. Nothing is ever sent to our servers.</p>
              </div>
              <div className="seo-faq-item">
                <h4>How does the Title Case algorithm work?</h4>
                <p>It follows professional publishing guidelines, capitalizing primary words while keeping minor prepositions (like "of", "in", "by"), articles (like "a", "an", "the"), and coordinating conjunctions lowercase.</p>
              </div>
              <div className="seo-faq-item">
                <h4>Can I import or export text files?</h4>
                <p>Yes. You can paste text directly, download your edited text as a <code>.txt</code> file, copy it directly to your clipboard, or share it using your browser's native share menu.</p>
              </div>
              <div className="seo-faq-item">
                <h4>Does the editor support code configurations?</h4>
                <p>Absolutely. You can open the editor Preferences drawer to switch to a monospace font and turn off text wrapping, making it highly suitable for formatting JSON, markdown, or system logs.</p>
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

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Discard all text?"
        body="Are you sure you want to discard your changes and clear the entire editor?"
        confirmText="Discard"
        cancelText="Cancel"
        onConfirm={() => {
          saveToHistory();
          setText("");
          setIsConfirmOpen(false);
          setToastMessage("Cleared");
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {toastMessage && (
        <div className="ocr-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SoftwareApplication Schema Markup */}
      <Script id="schema-text-editor" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "RawPDF Text Editor & Case Converter",
          "description": "An offline, browser-based text editor and case converter tool. Convert to Title Case, sentence case, uppercase, or lowercase, and clean text spacing locally and privately.",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "All",
          "browserRequirements": "Requires HTML5 and WebAssembly support",
          "offers": {
            "@type": "Offer",
            "price": "0.00",
            "priceCurrency": "USD"
          }
        })}
      </Script>
    </>
  );
}
