"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const faqData = [
  {
    category: "Privacy & Security",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="14" height="8" rx="2" />
        <path d="M7 11V7a3 3 0 0 1 6 0v4" />
        <circle cx="10" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
    items: [
      {
        q: "Do my files get uploaded to a server?",
        a: "No — never. Every operation (merge, split, compress, protect, edit, image conversion) runs 100% inside your browser using Web APIs. Your files never leave your device.",
      },
      {
        q: "Does rawPDF collect any personal data?",
        a: "No personal data is collected. There are no accounts, no analytics trackers, and no advertising cookies. The only thing stored locally is your theme preference (dark/light), saved in your browser's localStorage.",
      },
      {
        q: "Does rawPDF use cookies?",
        a: "No. rawPDF is completely cookie-free. We do not use any marketing, tracking, or analytical cookies. The only client-side data stored is your theme preference and privacy banner dismissal, which are saved in your browser's localStorage.",
      },
      {
        q: "Is my PDF content safe when I use Protect PDF?",
        a: "Yes. The password and encryption are applied using the browser's built-in Web Crypto API (AES-256 standard) entirely in memory. The password never leaves your device.",
      },
      {
        q: "What happens to my files when I close the tab?",
        a: "All file data is immediately discarded from memory. There is no cloud storage, no server-side logging, and no persistence of any file content.",
      },
    ],
  },
  {
    category: "Merge PDF",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="9" height="12" rx="2" />
        <rect x="9" y="5" width="9" height="12" rx="2" />
        <path d="M7 9h6" />
      </svg>
    ),
    items: [
      {
        q: "Is there a limit to how many PDFs I can merge?",
        a: "There is no hard limit enforced by rawPDF. You can add as many files as your device memory allows. Very large collections may be slower to process depending on your hardware.",
      },
      {
        q: "Can I reorder the PDFs before merging?",
        a: "Yes. After uploading, simply drag and drop the file cards into the exact order you want. The merge will follow that order precisely.",
      },
      {
        q: "Can I preview a PDF before merging?",
        a: "Yes. Click any file card to open a full page-by-page preview rendered locally using PDF.js. No upload required.",
      },
      {
        q: "Can I rename the output file before downloading?",
        a: "Yes. Once the merge is complete, you can edit the filename directly in the download screen before saving.",
      },
    ],
  },
  {
    category: "Split PDF",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="10" y1="2" x2="10" y2="18" />
        <rect x="2" y="4" width="6" height="12" rx="2" />
        <rect x="12" y="4" width="6" height="12" rx="2" />
      </svg>
    ),
    items: [
      {
        q: "Can I select specific pages to keep?",
        a: "Yes. After uploading, select the pages you want in the output. You can also rotate pages or delete unwanted ones before exporting.",
      },
      {
        q: "Can I reorder pages in the split output?",
        a: "Yes. Drag the page thumbnails to rearrange them in any order you like before clicking Split PDF.",
      },
      {
        q: "Will the output PDF have any watermarks?",
        a: "No. rawPDF produces clean, watermark-free PDFs. The split PDF is rebuilt using pdf-lib and contains only the pages you selected.",
      },
    ],
  },
  {
    category: "Compress PDF",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 14V6M10 6l-3 3M10 6l3 3" />
        <path d="M4 16h12" />
      </svg>
    ),
    items: [
      {
        q: "How does the compression work?",
        a: "rawPDF re-renders each page as an optimised JPEG at a reduced quality level and rebuilds the PDF using pdf-lib, entirely in your browser. This reduces file size significantly for image-heavy documents.",
      },
      {
        q: "What compression levels are available?",
        a: "Three levels: Less Compression (high quality, small reduction), Recommended (balanced), and Extreme (smallest file size, some quality trade-off). Each shows an estimated output size before you compress.",
      },
      {
        q: "Will compression affect text quality?",
        a: "For PDFs containing mostly text, compression may slightly reduce sharpness because pages are rendered as images. For photo-heavy PDFs, compression is especially effective.",
      },
    ],
  },
  {
    category: "Protect PDF",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2L3 5v5c0 4.4 3 8.2 7 9 4-0.8 7-4.6 7-9V5l-7-3z" />
      </svg>
    ),
    items: [
      {
        q: "What encryption standard is used?",
        a: "AES-256, implemented via the browser's Web Crypto API. This is the same encryption standard used by banks and military-grade applications.",
      },
      {
        q: "Can I unlock a protected PDF with rawPDF?",
        a: "Currently, rawPDF only supports adding password protection. Unlocking is not yet available — you would need the original PDF and the password.",
      },
    ],
  },
  {
    category: "Image Conversion",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="16" height="16" rx="2" />
        <circle cx="7" cy="7" r="1.5" />
        <polyline points="18 13 13 8 4 18" />
      </svg>
    ),
    items: [
      {
        q: "What image formats can I convert to PDF?",
        a: "rawPDF supports JPG/JPEG, PNG, WEBP, and GIF images for conversion to PDF. You can upload multiple images at once and they will each become a page in the output PDF.",
      },
      {
        q: "Can I set the page size when converting images to PDF?",
        a: "Yes. You can choose from A4, Letter, or 'Fit to Image' (where each page matches the image dimensions exactly). You can also set landscape or portrait orientation.",
      },
      {
        q: "Can I add a background color to Image to PDF pages?",
        a: "Yes. There's a background color option in the Image to PDF tool. This is useful when converting images with transparency or when you want a consistent colored background behind each image.",
      },
      {
        q: "What output formats are available for PDF to Image?",
        a: "You can export as PNG or JPEG. You can also choose the resolution scale (1x, 2x, or 3x) for higher-quality output. All pages are zipped and downloaded in a single archive.",
      },
      {
        q: "Is there a limit to how many images I can convert at once?",
        a: "No hard limit is enforced. You can upload as many images as your device memory allows. Processing speed depends on the number and size of images.",
      },
    ],
  },
  {
    category: "OCR PDF",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h12v12H4zM7 8h6M7 12h6" />
      </svg>
    ),
    items: [
      {
        q: "How does the OCR text extraction work?",
        a: "rawPDF renders each page of your PDF file onto an offscreen canvas locally using PDF.js. It then runs Tesseract.js (an open-source OCR engine compiled to WebAssembly) directly in your browser to analyze the page image and extract text. No server processing is involved.",
      },
      {
        q: "What languages are supported for OCR?",
        a: "Currently, our client-side OCR is pre-configured to extract English text. This keeps the initial download size lightweight and fast.",
      },
      {
        q: "Can I copy or download the extracted text?",
        a: "Yes. You can copy the text of any individual page, copy the text of all pages combined, or download the full document text as a clean plain-text (.TXT) file.",
      },
    ],
  },
  {
    category: "Text Editor",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 6 18 6" />
      </svg>
    ),
    items: [
      {
        q: "What does the Text Editor & Case Converter do?",
        a: "It allows you to paste or compose text completely locally, and perform formatting actions like sentence casing, lowercasing, uppercasing, title casing, line merging, spacing cleaning, and find/replace replacements.",
      },
      {
        q: "Is my text content kept private?",
        a: "Yes. rawPDF processes all text content directly inside your browser memory. Your text never leaves your device and is never sent to any server.",
      },
      {
        q: "How does the Find & Replace panel work?",
        a: "You can expand the Find & Replace panel to replace all occurrences of a search string. It supports case matching options and regular expressions (Regex) for advanced pattern matching.",
      },
    ],
  },
  {
    category: "General",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 14v-4M10 6.5v.5" />
      </svg>
    ),
    items: [
      {
        q: "Does rawPDF work offline?",
        a: "After the first visit, the core libraries (pdf-lib and PDF.js) may be cached by your browser, allowing most features to work without an active internet connection. Static assets are served from the hosting CDN.",
      },
      {
        q: "Which browsers are supported?",
        a: "rawPDF works in all modern browsers: Chrome, Edge, Firefox, and Safari. For the best experience, we recommend using an up-to-date version of Chrome or Edge.",
      },
      {
        q: "Is rawPDF free to use?",
        a: "Yes, completely free. There are no subscriptions, no per-file charges, and no paywalls. All tools are available without any account or sign-up.",
      },
      {
        q: "Can I use rawPDF on mobile?",
        a: "Yes. rawPDF is fully responsive and works on mobile browsers. File selection via the upload button works on iOS and Android. Drag-and-drop may not be available on all mobile browsers.",
      },
      {
        q: "How can I request a new feature?",
        a: "You can reach out by email at rkmaurya0709@gmail.com or use the 'Request Feature' link in the footer. Feature suggestions are always welcome!",
      },
    ],
  },
];

const ALL_CAT = "All";

function highlightText(text, query) {
  if (!query || !query.trim()) {
    return text;
  }
  const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="faq-highlight">{part}</mark>
    ) : (
      part
    )
  );
}

export default function FaqPage() {
  const [theme, setTheme] = useState("dark");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL_CAT);
  const [activeId, setActiveId] = useState("");
  const [openIndex, setOpenIndex] = useState(null); // "catIdx-itemIdx"
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("mergeStudioTheme") || "dark";
    setTheme(saved);
    document.body.classList.toggle("theme-light", saved === "light");
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
      
      if (searchQuery.trim() !== "") return;
      
      const sections = faqData.map(g => ({
        id: `faq-cat-${g.category.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`,
        category: g.category
      }));
      
      for (const s of [...sections].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 145) {
          setActiveId(s.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Trigger scroll check immediately
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    const onOutside = (e) => {
      const el = document.getElementById("toolsDropdown");
      if (el && !el.contains(e.target)) setIsToolsOpen(false);
    };
    document.addEventListener("click", onOutside);
    return () => document.removeEventListener("click", onOutside);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("mergeStudioTheme", next);
    document.body.classList.toggle("theme-light", next === "light");
  };

  const categories = [ALL_CAT, ...faqData.map((g) => g.category)];

  const filteredGroups = faqData
    .filter((g) => activeCategory === ALL_CAT || g.category === activeCategory)
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          searchQuery.trim() === "" ||
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((g) => g.items.length > 0);

  const toggle = (key) => setOpenIndex((prev) => (prev === key ? null : key));

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

      <main className="landing view active">
        {/* Hero */}
        <section className="hero" style={{ minHeight: "40svh" }}>
          <div className="hero-content" style={{ textAlign: "center" }}>
            <p className="eyebrow">Support</p>
            <h1>Frequently Asked Questions</h1>
            <p className="hero-copy">
              Everything you need to know about rawPDF — privacy, tools, and how it all works.
            </p>

            {/* Search bar */}
            <div className="faq-search-wrap">
              <svg className="faq-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M18 18l-4-4" />
              </svg>
              <input
                ref={searchRef}
                id="faq-search"
                className="faq-search-input"
                type="text"
                placeholder="Search questions…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setOpenIndex(null); }}
                aria-label="Search FAQ"
              />
              {searchQuery && (
                <button className="faq-search-clear" onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }} aria-label="Clear search">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M15 5L5 15M5 5l10 10" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Body: two-column layout */}
        <section className="faq-body">
          <div className="faq-layout">

            {/* Sticky sidebar TOC */}
            <aside className="privacy-toc faq-toc">
              <p className="privacy-toc-label">Categories</p>
              <nav>
                {faqData.map((g) => {
                  const id = `faq-cat-${g.category.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
                  return (
                    <a
                      key={g.category}
                      href={`#${id}`}
                      className={`privacy-toc-link${activeId === id ? " active" : ""}`}
                      onClick={() => {
                        setActiveCategory(ALL_CAT);
                        setActiveId(id);
                        setOpenIndex(null);
                        setSearchQuery("");
                      }}
                    >
                      {g.category}
                    </a>
                  );
                })}
              </nav>
              <p className="privacy-toc-date">{faqData.reduce((acc, g) => acc + g.items.length, 0)} questions across {faqData.length} categories</p>
            </aside>

            {/* Main content */}
            <div className="faq-main">
              {/* Category filter pills */}
              <div className="faq-categories" role="tablist" aria-label="FAQ categories">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={activeCategory === cat}
                    className={`faq-cat-pill${activeCategory === cat ? " active" : ""}`}
                    onClick={() => {
                      setActiveCategory(cat);
                      setOpenIndex(null);
                      if (cat !== ALL_CAT) {
                        const id = `faq-cat-${cat.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
                        setActiveId(id);
                      } else {
                        // Reset to first category ID or empty
                        setActiveId("");
                      }
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Accordion groups */}
              <div className="faq-groups">
                {filteredGroups.length === 0 ? (
                  <div className="faq-empty">
                    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="24" cy="24" r="18" />
                      <path d="M24 16v8M24 32v.5" />
                    </svg>
                    <p>No results found for &ldquo;{searchQuery}&rdquo;</p>
                    <button className="faq-clear-btn" onClick={() => setSearchQuery("")}>Clear search</button>
                  </div>
                ) : (
                  filteredGroups.map((group, gi) => (
                    <div
                      key={group.category}
                      id={`faq-cat-${group.category.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`}
                      className="faq-group"
                    >
                      <div className="faq-group-header">
                        <span className="faq-group-icon">{group.icon}</span>
                        <h2 className="faq-group-title">{group.category}</h2>
                      </div>

                      <div className="faq-accordion">
                        {group.items.map((item, ii) => {
                          const key = `${gi}-${ii}`;
                          const isOpen = openIndex === key;
                          return (
                            <div key={key} className={`faq-item${isOpen ? " open" : ""}`}>
                              <button
                                id={`faq-q-${key}`}
                                className="faq-question"
                                aria-expanded={isOpen}
                                aria-controls={`faq-a-${key}`}
                                onClick={() => toggle(key)}
                              >
                                 <span className="faq-q-text">{highlightText(item.q, searchQuery)}</span>
                                <span className="faq-chevron" aria-hidden="true">
                                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m5 8 5 5 5-5" />
                                  </svg>
                                </span>
                              </button>
                              <div
                                id={`faq-a-${key}`}
                                role="region"
                                aria-labelledby={`faq-q-${key}`}
                                className="faq-answer"
                              >
                                 <p className="faq-answer-text">{highlightText(item.a, searchQuery)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* CTA */}
              <div className="faq-cta">
                <p className="faq-cta-text">Still have questions?</p>
                <a href="mailto:rkmaurya0709@gmail.com?subject=rawPDF - Question" className="faq-cta-btn">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="16" height="12" rx="2" />
                    <path d="M2 7l8 5 8-5" />
                  </svg>
                  Send us a message
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
