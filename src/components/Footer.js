"use client";

export default function Footer() {
  return (
    <footer className="site-footer">
      <p className="footer-text" style={{ margin: 0, fontSize: "0.9rem", color: "var(--footer-text, #aaa)" }}>
        designed and developed by{' '}
        <a
          href="https://www.linkedin.com/in/ratnexh"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          Ratnesh Kumar
        </a>
      </p>
      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--footer-text, #777)" }}>© 2026 mergeFlow. All rights reserved.</p>
    </footer>
  );
}
