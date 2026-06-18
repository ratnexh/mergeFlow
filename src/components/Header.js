"use client";
import Link from "next/link";

import { usePathname } from "next/navigation";

export default function Header({ 
  isScrolled, 
  isToolsOpen, 
  setIsToolsOpen, 
  handleDropdownItemClick,
  theme,
  toggleTheme 
}) {
  const pathname = usePathname();

  return (
    <nav className={`site-nav${isScrolled ? " scrolled" : ""}`} aria-label="Primary">
      <Link className="brand" href="/" aria-label="Merge Flow home">
        <span className="brand-logo-container">
          <svg className="brand-logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b88a43" />
                <stop offset="100%" stopColor="#0f8176" />
              </linearGradient>
            </defs>
            <rect x="4" y="6" width="16" height="20" rx="3" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinejoin="round" className="rect-back" />
            <rect x="12" y="10" width="16" height="20" rx="3" fill="#0d121b" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinejoin="round" className="rect-front" />
            <path d="M17 15H23" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" />
            <path d="M17 19H23" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="brand-text">
            merge<span className="brand-highlight">Flow</span>
          </span>
        </span>
      </Link>

      <div className="nav-links">
        <Link className={`nav-link${pathname === "/how-it-works" ? " active" : ""}`} href="/how-it-works">How it works</Link>
        <Link className={`nav-link${pathname === "/privacy" ? " active" : ""}`} href="/privacy">Privacy</Link>
      </div>

      <div className="header-right-actions">
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
            <svg className="tools-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>Tools</span>
            <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <ul className="dropdown-menu" id="toolsList" role="menu">
            <li role="none"><Link id="toolMerge" role="menuitem" href="/merge" className={pathname === "/merge" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>Merge PDFs</Link></li>
            <li role="none"><Link id="toolSplit" role="menuitem" href="/split" className={pathname === "/split" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>Split PDF</Link></li>
            <li role="none"><Link id="toolCompress" role="menuitem" href="/compress" className={pathname === "/compress" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>Compress PDF</Link></li>
            <li role="none"><a id="toolToImage" role="menuitem" onClick={() => handleDropdownItemClick("PDF to Image")}>PDF to Image</a></li>
            <li role="none"><a id="toolFromImage" role="menuitem" onClick={() => handleDropdownItemClick("Image to PDF")}>Image to PDF</a></li>
            <li role="none"><Link id="toolProtect" role="menuitem" href="/protect" className={pathname === "/protect" ? "active" : ""} onClick={() => setIsToolsOpen(false)}>Protect PDF</Link></li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
