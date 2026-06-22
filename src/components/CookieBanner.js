"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem("rawPdfCookieConsent");
    if (!consent) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("rawPdfCookieConsent", "accepted");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-banner" role="alert">
      <div className="cookie-banner-content">
        <div className="cookie-banner-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div className="cookie-banner-text">
          <h4>Cookie-Free & Private</h4>
          <p>
            rawPDF operates entirely client-side. We do not use any cookies, tracking scripts, or analytics. We only use local storage to save your theme preference.
          </p>
        </div>
        <button className="cookie-banner-btn" onClick={handleAccept} type="button">
          Got it
        </button>
      </div>
    </div>
  );
}
