"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header({ 
  isScrolled, 
  isToolsOpen, 
  setIsToolsOpen, 
  theme,
  toggleTheme,
  isWorkspace = false,
  onBack,
  workspaceTitle,
  workspaceSubtitle,
  workspaceActions,
}) {
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isToolsOpen) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest("#toolsDropdown")) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isToolsOpen, setIsToolsOpen]);

  const isMergeActive = pathname === "/" || pathname === "/merge";

  return (
    <nav 
      className={`site-nav${isScrolled ? " scrolled" : ""}${isWorkspace ? " workspace-nav" : ""}`} 
      aria-label="Primary"
    >
      <div className="header-left">
        {isWorkspace && onBack && (
          <button 
            className="workspace-back-btn" 
            onClick={onBack} 
            type="button" 
            aria-label="Back to previous screen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
        )}
        <Link className="brand" href="/" aria-label="RAWPDF home">
          <span className="brand-logo-container">
            <svg className="brand-logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f0ba54" />
                  <stop offset="100%" stopColor="#d4af37" />
                </linearGradient>
              </defs>
              <rect x="5" y="5" width="15" height="19" rx="3" stroke="url(#logoGrad)" strokeWidth="2.2" strokeLinejoin="round" className="rect-back" />
              <rect x="12" y="9" width="15" height="19" rx="3" fill="var(--bg, #090c12)" stroke="url(#logoGrad)" strokeWidth="2.2" strokeLinejoin="round" className="rect-front" />
              <path d="M16 14H22" stroke="url(#logoGrad)" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16 18H22" stroke="url(#logoGrad)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="brand-text">RAWPDF</span>
          </span>
        </Link>
      </div>

      {isWorkspace && workspaceTitle && (
        <div className="header-workspace-center">
          <span className="header-workspace-title">{workspaceTitle}</span>
          {workspaceSubtitle && (
            <span className="header-workspace-badge">{workspaceSubtitle}</span>
          )}
        </div>
      )}

      <div className="header-right-actions">
        {workspaceActions}

        {toggleTheme && (
          <button
            className="header-theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="theme-svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="theme-svg">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        )}

        <div className={`dropdown${isToolsOpen ? " open" : ""}`} id="toolsDropdown">
          <button
            className="dropdown-trigger"
            id="toolsBtn"
            aria-haspopup="true"
            aria-expanded={isToolsOpen}
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsToolsOpen(!isToolsOpen); }}
          >
            <svg className="tools-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="4.5" height="4.5" rx="1.2" />
              <rect x="9.5" y="2" width="4.5" height="4.5" rx="1.2" />
              <rect x="2" y="9.5" width="4.5" height="4.5" rx="1.2" />
              <rect x="9.5" y="9.5" width="4.5" height="4.5" rx="1.2" />
            </svg>
            <span>Tools</span>
            <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <ul className="dropdown-menu" id="toolsList" role="menu">
            <li role="none">
              <Link id="toolMerge" role="menuitem" href="/" className={isMergeActive ? "active" : ""} onClick={() => setIsToolsOpen(false)}>
                <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="8" width="12" height="12" rx="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                <span>Merge PDFs</span>
              </Link>
            </li>
            <li role="none">
              <Link id="toolSplit" role="menuitem" href="/split" className={pathname === "/split" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>
                <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
                <span>Split PDF</span>
              </Link>
            </li>
            <li role="none">
              <Link id="toolCompress" role="menuitem" href="/compress" className={pathname === "/compress" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>
                <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 2 10 5-10 5L2 7l10-5Z" />
                  <path d="m2 17 10 5 10-5" />
                  <path d="m2 12 10 5 10-5" />
                </svg>
                <span>Compress PDF</span>
              </Link>
            </li>
            <li role="none">
              <Link id="toolToImage" role="menuitem" href="/pdf-to-image" className={pathname === "/pdf-to-image" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>
                <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span>PDF to image</span>
              </Link>
            </li>
            <li role="none">
              <Link id="toolFromImage" role="menuitem" href="/image-to-pdf" className={pathname === "/image-to-pdf" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>
                <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <circle cx="10" cy="13" r="1.5" />
                  <path d="m17 18-2-2-4 4" />
                </svg>
                <span>Image to PDF</span>
              </Link>
            </li>
            <li role="none">
              <Link id="toolOcr" role="menuitem" href="/ocr" className={pathname === "/ocr" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>
                <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span>OCR PDF</span>
              </Link>
            </li>
            <li role="none">
              <Link id="toolTextEditor" role="menuitem" href="/text-editor" className={pathname === "/text-editor" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>
                <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 7 4 4 20 4 20 7" />
                  <line x1="9" y1="20" x2="15" y2="20" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </svg>
                <span>Text Editor</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
