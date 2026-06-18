"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        
        <div className="footer-brand-col">
          <Link className="brand" href="/" aria-label="Merge Flow home">
            <span className="brand-logo-container">
              <svg className="brand-logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="footerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#b88a43" />
                    <stop offset="100%" stopColor="#0f8176" />
                  </linearGradient>
                </defs>
                <rect x="4" y="6" width="16" height="20" rx="3" stroke="url(#footerLogoGrad)" strokeWidth="2.5" strokeLinejoin="round" className="rect-back" />
                <rect x="12" y="10" width="16" height="20" rx="3" fill="#0d121b" stroke="url(#footerLogoGrad)" strokeWidth="2.5" strokeLinejoin="round" className="rect-front" />
                <path d="M17 15H23" stroke="url(#footerLogoGrad)" strokeWidth="2" strokeLinecap="round" />
                <path d="M17 19H23" stroke="url(#footerLogoGrad)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="brand-text">
                merge<span className="brand-highlight">Flow</span>
              </span>
            </span>
          </Link>
          <p className="footer-desc">
            The private and simple way<br />to merge your PDFs.
          </p>
        </div>

        <div className="footer-center-col">
          <div className="footer-nav-links">
            <Link href="/how-it-works" className="footer-link">How it works</Link>
            <Link href="/privacy" className="footer-link">Privacy</Link>
            <Link href="/" className="footer-link">Tools</Link>
          </div>
          <p className="copyright-text">© 2026 mergeFlow. All rights reserved.</p>
        </div>

        <div className="footer-author-col">
          <p className="author-label">Designed and developed by</p>
          <a
            href="https://www.linkedin.com/in/ratnexh"
            target="_blank"
            rel="noopener noreferrer"
            className="author-name"
          >
            Ratnesh Kumar
          </a>
        </div>

      </div>
    </footer>
  );
}
