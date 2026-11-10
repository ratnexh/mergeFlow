"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Script from "next/script";
import Header from "../../components/Header";
import ConfirmModal from "../../components/ConfirmModal";
import { useAppTheme } from "../../utils/useTheme";

const DEFAULT_HTML = "<p><br></p>";

const EMOJIS = [
  "😀", "😃", "🎉", "🔥", "💡",
  "✅", "⚠️", "⭐", "❤️", "🚀",
  "👍", "📝", "📌", "✨", "📊",
  "🔒", "📅", "🎯", "💯", "🙌",
];

const SYMBOLS = [
  "©", "®", "™", "°", "±",
  "×", "÷", "≠", "≈", "≤",
  "≥", "π", "∞", "√", "∑",
  "€", "$", "£", "¥", "₹",
  "→", "←", "↑", "↓", "✓",
  "★", "§", "¶", "•", "—",
];

const TEXT_COLORS = [
  "#ffffff", "#cbd5e1", "#0f172a", "#e5a93c", "#ef4444",
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899",
];

const HIGHLIGHT_COLORS = [
  "rgba(229, 169, 60, 0.35)",
  "rgba(239, 68, 68, 0.35)",
  "rgba(59, 130, 246, 0.35)",
  "rgba(16, 185, 129, 0.35)",
  "transparent",
];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMediaUrl(rawUrl) {
  const url = (rawUrl || "").trim();
  if (!url) return { type: "none", src: "" };

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  if (ytMatch) {
    return { type: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  // Direct HTML5 audio/video
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    return { type: "video", src: url };
  }
  if (/\.(mp3|wav|m4a|aac)(\?.*)?$/i.test(url)) {
    return { type: "audio", src: url };
  }

  return { type: "iframe", src: url };
}

export default function TextEditorClient() {
  // Navigation & Theme
  const [paperTheme, setPaperTheme] = useState("dark");
  const { theme, toggleTheme } = useAppTheme(setPaperTheme);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Editor Display Modes
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSourceView, setIsSourceView] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [sourceCode, setSourceCode] = useState("");
  const [zoom, setZoom] = useState(100);
  const [lineSpacing, setLineSpacing] = useState("1.65");
  const [columnCount, setColumnCount] = useState("1");

  // History (Undo / Redo)
  const historyRef = useRef({ stack: [DEFAULT_HTML], index: 0 });
  const historyTimerRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Format Painter State
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [isPainterArmed, setIsPainterArmed] = useState(false);

  // Active Toolbar Formatting Reflection
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    superscript: false,
    subscript: false,
    unorderedList: false,
    orderedList: false,
    align: "left",
    block: "Paragraph",
    styleLabel: "Styles",
    color: "#e5a93c",
    inTable: false,
  });

  // Table Hover Grid State
  const [tableHover, setTableHover] = useState({ r: 3, c: 3 });

  // Modals & Drawers
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'stats' | 'shortcuts' | 'link' | 'image' | 'media' | 'embed' | 'bookmark'

  // Modal Field States
  const [linkForm, setLinkForm] = useState({ url: "https://", text: "", newTab: true, hasExisting: false });
  const [imageForm, setImageForm] = useState({ url: "https://", alt: "Image", width: "100%" });
  const [mediaForm, setMediaForm] = useState({ url: "https://www.youtube.com/watch?v=" });
  const [embedForm, setEmbedForm] = useState({ html: "<blockquote>Custom quote or snippet</blockquote>" });
  const [bookmarkName, setBookmarkName] = useState("Section 1");
  const [bookmarksList, setBookmarksList] = useState([]);

  // Dropdowns & Menus
  const [activeMenu, setActiveMenu] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Find & Replace State
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const findCursorIndexRef = useRef(0);

  // Live Metrics
  const [metrics, setMetrics] = useState({
    words: 0,
    chars: 0,
    lines: 0,
    sentences: 0,
    readTime: "0 min",
  });

  // DOM References
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const isSourceViewRef = useRef(isSourceView);
  const pendingPrintRef = useRef(false);
  const prevIsSourceViewRef = useRef(isSourceView);

  useEffect(() => {
    isSourceViewRef.current = isSourceView;
  }, [isSourceView]);

  // Initialize default editor HTML once on mount
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = DEFAULT_HTML;
    }
  }, []);

  // Toast Auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 2400);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Scroll Nav Shrink
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus/dropdowns on outside click
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".rich-editor-toolbar") && !e.target.closest(".rich-editor-menubar")) {
        setActiveMenu(null);
        setActiveDropdown(null);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // Update History Buttons
  const syncHistoryFlags = useCallback(() => {
    const h = historyRef.current;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, []);

  const pushHistory = useCallback((html) => {
    const h = historyRef.current;
    const current = h.stack[h.index];
    if (html === current) return;
    const nextStack = h.stack.slice(0, h.index + 1);
    nextStack.push(html);
    if (nextStack.length > 80) {
      nextStack.shift();
    }
    historyRef.current = {
      stack: nextStack,
      index: nextStack.length - 1,
    };
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const scheduleHistorySnapshot = useCallback(() => {
    if (!editorRef.current) return;
    clearTimeout(historyTimerRef.current);
    const snapshot = editorRef.current.innerHTML;
    historyTimerRef.current = setTimeout(() => {
      pushHistory(snapshot);
    }, 350);
  }, [pushHistory]);

  // Extract plain text & HTML reliably across Visual & Source modes
  const getCurrentHtml = useCallback(() => {
    if (isSourceViewRef.current) return sourceCode;
    return editorRef.current ? editorRef.current.innerHTML : "";
  }, [sourceCode]);

  const getCurrentPlainText = useCallback(() => {
    if (isSourceViewRef.current) {
      const tmp = document.createElement("div");
      tmp.innerHTML = sourceCode;
      return tmp.innerText || tmp.textContent || "";
    }
    return editorRef.current ? editorRef.current.innerText || "" : "";
  }, [sourceCode]);

  // Update Metrics
  const updateMetrics = useCallback((overrideText = null) => {
    let text = "";
    if (overrideText !== null) {
      text = overrideText;
    } else if (isSourceViewRef.current) {
      const tmp = document.createElement("div");
      tmp.innerHTML = sourceCode;
      text = tmp.innerText || tmp.textContent || "";
    } else if (editorRef.current) {
      text = editorRef.current.innerText || "";
    }

    const trimmed = text.trim();
    const chars = trimmed === "" && text === "\n" ? 0 : text.replace(/\n$/, "").length;
    const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
    const lines = trimmed === "" ? 0 : text.replace(/\n$/, "").split("\n").length;
    const sentences = trimmed === "" ? 0 : trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    const readMinutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));

    setMetrics({
      words,
      chars,
      lines,
      sentences,
      readTime: `${readMinutes} min`,
    });
  }, [sourceCode]);

  // Sync HTML into newly mounted visual editor when leaving HTML Source View
  useEffect(() => {
    if (prevIsSourceViewRef.current && !isSourceView && editorRef.current) {
      editorRef.current.innerHTML = sourceCode || DEFAULT_HTML;
      pushHistory(editorRef.current.innerHTML);
      updateMetrics();
      if (pendingPrintRef.current) {
        pendingPrintRef.current = false;
        window.print();
      }
    }
    prevIsSourceViewRef.current = isSourceView;
  }, [isSourceView, sourceCode, pushHistory, updateMetrics]);

  // Save current Selection Range if inside editorRef
  const saveSelection = useCallback(() => {
    if (typeof window === "undefined" || !editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  // Restore Selection Range cleanly into editorRef
  const restoreSelection = useCallback(() => {
    if (typeof window === "undefined" || !editorRef.current) return false;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel) return false;

    const saved = savedRangeRef.current;
    if (saved && editorRef.current.contains(saved.commonAncestorContainer)) {
      try {
        sel.removeAllRanges();
        sel.addRange(saved);
        return true;
      } catch {
        // Fallback to end of editor
      }
    }

    // Place caret at end if no saved range
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    savedRangeRef.current = range.cloneRange();
    return true;
  }, []);

  // Detect active block, inline styles, links & table context
  const syncSelectionState = useCallback(() => {
    if (typeof document === "undefined" || !editorRef.current || isSourceViewRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    saveSelection();

    let align = "left";
    if (document.queryCommandState("justifyCenter")) align = "center";
    else if (document.queryCommandState("justifyRight")) align = "right";
    else if (document.queryCommandState("justifyFull")) align = "justify";

    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    let blockLabel = "Paragraph";
    let inTable = false;
    let walker = node;
    while (walker && walker !== editorRef.current) {
      const tag = walker.tagName;
      if (tag === "TD" || tag === "TH") inTable = true;
      if (tag === "H1" && blockLabel === "Paragraph") blockLabel = "Heading 1";
      else if (tag === "H2" && blockLabel === "Paragraph") blockLabel = "Heading 2";
      else if (tag === "H3" && blockLabel === "Paragraph") blockLabel = "Heading 3";
      else if (tag === "H4" && blockLabel === "Paragraph") blockLabel = "Heading 4";
      else if (tag === "BLOCKQUOTE" && blockLabel === "Paragraph") blockLabel = "Quote";
      else if (tag === "PRE" && blockLabel === "Paragraph") blockLabel = "Code";
      walker = walker.parentElement;
    }

    let computedColor = "#e5a93c";
    if (node && node !== editorRef.current) {
      const c = window.getComputedStyle(node).color;
      if (c) computedColor = c;
    }

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      superscript: document.queryCommandState("superscript"),
      subscript: document.queryCommandState("subscript"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
      align,
      block: blockLabel,
      styleLabel: "Styles",
      color: computedColor,
      inTable,
    });
  }, [saveSelection]);

  // Listen to document selectionchange when inside editor
  useEffect(() => {
    const onSelectionChange = () => {
      syncSelectionState();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [syncSelectionState]);

  // Execute Undo / Redo using our History Stack
  const handleUndo = useCallback(() => {
    if (isSourceViewRef.current) return;
    clearTimeout(historyTimerRef.current);
    const h = historyRef.current;
    if (h.index > 0 && editorRef.current) {
      h.index -= 1;
      editorRef.current.innerHTML = h.stack[h.index];
      updateMetrics();
      syncHistoryFlags();
      editorRef.current.focus();
    }
  }, [syncHistoryFlags, updateMetrics]);

  const handleRedo = useCallback(() => {
    if (isSourceViewRef.current) return;
    clearTimeout(historyTimerRef.current);
    const h = historyRef.current;
    if (h.index < h.stack.length - 1 && editorRef.current) {
      h.index += 1;
      editorRef.current.innerHTML = h.stack[h.index];
      updateMetrics();
      syncHistoryFlags();
      editorRef.current.focus();
    }
  }, [syncHistoryFlags, updateMetrics]);

  // Core exec wrapper: guarantees restored selection & history tracking
  const exec = useCallback((command, value = null) => {
    if (typeof document === "undefined" || isPreviewMode || isSourceViewRef.current) return;
    if (!editorRef.current) return;

    pushHistory(editorRef.current.innerHTML);
    restoreSelection();

    try {
      document.execCommand("styleWithCSS", false, false);
    } catch {
      // Ignore if unsupported
    }
    document.execCommand(command, false, value);

    pushHistory(editorRef.current.innerHTML);
    saveSelection();
    syncSelectionState();
    updateMetrics();
  }, [isPreviewMode, pushHistory, restoreSelection, saveSelection, syncSelectionState, updateMetrics]);

  // Apply crisp pixel font sizes (avoiding ugly legacy <font> tags)
  const applyFontSize = (pxSize) => {
    if (!editorRef.current || isSourceViewRef.current || isPreviewMode) return;
    pushHistory(editorRef.current.innerHTML);
    restoreSelection();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (range.collapsed) {
      const span = document.createElement("span");
      span.style.fontSize = pxSize;
      span.innerHTML = "&#8203;";
      range.insertNode(span);
      range.setStart(span.firstChild, 1);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      // Use temp fontSize 7 trick to handle cross-paragraph selections safely, then replace <font>
      document.execCommand("fontSize", false, "7");
      const fonts = editorRef.current.querySelectorAll('font[size="7"]');
      fonts.forEach((el) => {
        const span = document.createElement("span");
        span.style.fontSize = pxSize;
        while (el.firstChild) span.appendChild(el.firstChild);
        span.querySelectorAll("[style]").forEach((child) => {
          if (child.style.fontSize) child.style.fontSize = "";
        });
        el.replaceWith(span);
      });
    }

    pushHistory(editorRef.current.innerHTML);
    saveSelection();
    updateMetrics();
    setActiveDropdown(null);
    setToastMessage(`Font size set to ${pxSize}`);
  };

  // Clear ALL inline + block formatting cleanly
  const handleClearFormatting = () => {
    if (!editorRef.current || isSourceViewRef.current || isPreviewMode) return;
    pushHistory(editorRef.current.innerHTML);
    restoreSelection();

    document.execCommand("removeFormat", false, null);

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!range.collapsed) {
        const fragment = range.extractContents();
        const wrapper = document.createElement("div");
        wrapper.appendChild(fragment);
        wrapper.querySelectorAll("span, font, mark, code, strong, em, b, i, u, s, strike, sub, sup").forEach((el) => {
          const text = document.createTextNode(el.textContent || "");
          el.replaceWith(text);
        });
        const cleanNodes = Array.from(wrapper.childNodes);
        cleanNodes.forEach((n) => range.insertNode(n));
      } else {
        // Normalize heading to paragraph if cursor sits on heading
        let block = range.commonAncestorContainer;
        if (block.nodeType === Node.TEXT_NODE) block = block.parentElement;
        while (block && block !== editorRef.current) {
          if (/^H[1-6]|BLOCKQUOTE|PRE$/.test(block.tagName)) {
            document.execCommand("formatBlock", false, "<p>");
            break;
          }
          block = block.parentElement;
        }
      }
    }

    pushHistory(editorRef.current.innerHTML);
    saveSelection();
    syncSelectionState();
    updateMetrics();
    setToastMessage("Formatting cleared");
  };

  // REAL Format Painter: Copy Format from Caret/Selection & Apply on Next Click/Select
  const copyFormatFromSelection = () => {
    if (!editorRef.current || isSourceViewRef.current) return;
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node || !editorRef.current.contains(node)) return;

    const cs = window.getComputedStyle(node);
    const defaultBg = window.getComputedStyle(editorRef.current).backgroundColor;
    const styleObj = {
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      textDecorationLine: cs.textDecorationLine === "none" ? "" : cs.textDecorationLine,
      color: cs.color,
      backgroundColor: cs.backgroundColor !== defaultBg && cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? cs.backgroundColor : "",
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
    };

    setCopiedFormat(styleObj);
    setIsPainterArmed(true);
    setActiveDropdown(null);
    setToastMessage("Format copied — select target text to apply");
  };

  const applyCopiedFormat = useCallback(() => {
    if (!copiedFormat || !editorRef.current || isSourceViewRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    // If user just clicked on a word (collapsed), expand selection to current word
    if (range.collapsed && sel.modify) {
      try {
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE && /\S/.test(textNode.textContent)) {
          sel.modify("move", "backward", "word");
          sel.modify("extend", "forward", "word");
        }
      } catch {
        // Ignore if unsupported
      }
    }

    const finalRange = sel.getRangeAt(0);
    if (finalRange.collapsed) {
      setIsPainterArmed(false);
      return;
    }

    pushHistory(editorRef.current.innerHTML);

    const span = document.createElement("span");
    span.style.fontWeight = copiedFormat.fontWeight;
    span.style.fontStyle = copiedFormat.fontStyle;
    if (copiedFormat.textDecorationLine) span.style.textDecoration = copiedFormat.textDecorationLine;
    span.style.color = copiedFormat.color;
    if (copiedFormat.backgroundColor) span.style.backgroundColor = copiedFormat.backgroundColor;
    span.style.fontSize = copiedFormat.fontSize;
    span.style.fontFamily = copiedFormat.fontFamily;

    const extracted = finalRange.extractContents();
    span.appendChild(extracted);
    finalRange.insertNode(span);

    sel.removeAllRanges();
    const after = document.createRange();
    after.selectNodeContents(span);
    after.collapse(false);
    sel.addRange(after);

    pushHistory(editorRef.current.innerHTML);
    saveSelection();
    syncSelectionState();
    setIsPainterArmed(false);
    setToastMessage("Copied format applied");
  }, [copiedFormat, pushHistory, saveSelection, syncSelectionState]);

  // Case Conversions Preserving All HTML Structure (Bold, Headings, Tables, Images)
  const transformCase = (type) => {
    if (!editorRef.current || isSourceViewRef.current || isPreviewMode) return;
    pushHistory(editorRef.current.innerHTML);
    restoreSelection();

    const convert = (str) => {
      switch (type) {
        case "upper":
          return str.toUpperCase();
        case "lower":
          return str.toLowerCase();
        case "sentence":
          return str.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
        case "capitalized":
          return str.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
        case "title": {
          const minor = /^(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v\.?|via|vs\.?)$/i;
          const words = str.toLowerCase().split(/(\s+)/);
          return words
            .map((w, idx) => {
              if (/^\s+$/.test(w)) return w;
              if (idx === 0 || idx === words.length - 1 || !minor.test(w)) {
                return w.charAt(0).toUpperCase() + w.slice(1);
              }
              return w;
            })
            .join("");
        }
        case "alternate":
          return str
            .split("")
            .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
            .join("");
        case "inverse":
          return str
            .split("")
            .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
            .join("");
        case "clean-spaces":
          return str.replace(/[ \t]+/g, " ");
        case "merge-lines":
          return str.replace(/\r?\n+/g, " ");
        default:
          return str;
      }
    };

    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed;

    if (hasSelection) {
      const range = sel.getRangeAt(0);
      // Walk text nodes intersecting selection
      const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let cur;
      while ((cur = walker.nextNode())) {
        if (range.intersectsNode(cur)) nodes.push(cur);
      }
      if (nodes.length === 1 && nodes[0] === range.startContainer && nodes[0] === range.endContainer) {
        const tn = nodes[0];
        const before = tn.nodeValue.slice(0, range.startOffset);
        const middle = tn.nodeValue.slice(range.startOffset, range.endOffset);
        const after = tn.nodeValue.slice(range.endOffset);
        const converted = convert(middle);
        tn.nodeValue = before + converted + after;
        range.setStart(tn, before.length);
        range.setEnd(tn, before.length + converted.length);
      } else if (nodes.length > 0) {
        nodes.forEach((tn) => {
          const sOff = tn === range.startContainer ? range.startOffset : 0;
          const eOff = tn === range.endContainer ? range.endOffset : tn.nodeValue.length;
          const before = tn.nodeValue.slice(0, sOff);
          const mid = tn.nodeValue.slice(sOff, eOff);
          const after = tn.nodeValue.slice(eOff);
          tn.nodeValue = before + convert(mid) + after;
        });
      }
      setToastMessage("Selection case converted");
    } else {
      // Whole document: preserve all formatting/images/tables!
      if (type === "merge-lines") {
        const plain = editorRef.current.innerText.replace(/\r?\n+/g, " ");
        editorRef.current.innerHTML = `<p>${plain}</p>`;
      } else {
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let n;
        while ((n = walker.nextNode())) textNodes.push(n);
        textNodes.forEach((tn) => {
          tn.nodeValue = convert(tn.nodeValue);
        });
      }
      setToastMessage("Document text converted");
    }

    pushHistory(editorRef.current.innerHTML);
    saveSelection();
    updateMetrics();
    setActiveDropdown(null);
  };

  // Line Spacing on Selected Block or Full Document
  const applyLineSpacing = (val) => {
    setLineSpacing(val);
    if (editorRef.current && !isSourceViewRef.current) {
      pushHistory(editorRef.current.innerHTML);
      restoreSelection();
      const sel = window.getSelection();
      let appliedToBlock = false;
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_ELEMENT);
        let el;
        while ((el = walker.nextNode())) {
          if (/^(P|H[1-6]|LI|BLOCKQUOTE|DIV)$/.test(el.tagName) && range.intersectsNode(el) && el.parentElement === editorRef.current) {
            el.style.lineHeight = val;
            appliedToBlock = true;
          }
        }
      }
      if (!appliedToBlock) {
        editorRef.current.style.lineHeight = val;
      }
      pushHistory(editorRef.current.innerHTML);
    }
    setActiveDropdown(null);
    setToastMessage(`Line spacing: ${val}`);
  };

  // Columns Layout
  const applyColumns = (cols) => {
    setColumnCount(String(cols));
    if (editorRef.current) {
      editorRef.current.style.columnCount = String(cols);
      editorRef.current.style.columnGap = cols > 1 ? "32px" : "normal";
    }
    setActiveDropdown(null);
    setToastMessage(cols === 1 ? "Single column layout" : `${cols}-column layout enabled`);
  };

  // Inline / Block Code
  const insertInlineCode = () => {
    if (!editorRef.current || isSourceViewRef.current || isPreviewMode) return;
    pushHistory(editorRef.current.innerHTML);
    restoreSelection();
    const sel = window.getSelection();
    const text = sel && !sel.isCollapsed ? sel.toString() : "code";
    document.execCommand("insertHTML", false, `<code>${text}</code>&nbsp;`);
    pushHistory(editorRef.current.innerHTML);
    saveSelection();
    setActiveDropdown(null);
  };

  // Table Creation & Contextual Table Editing
  const insertTable = (rows = 3, cols = 3) => {
    let html = `<table class="doc-table"><tbody>`;
    for (let r = 0; r < rows; r++) {
      html += `<tr>`;
      for (let c = 0; c < cols; c++) {
        html += `<td>${r === 0 ? `<strong>Heading ${c + 1}</strong>` : `Cell`}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table><p><br></p>`;
    exec("insertHTML", html);
    setActiveDropdown(null);
    setToastMessage(`Inserted ${rows}×${cols} Table`);
  };

  const modifyActiveTable = (action) => {
    if (!editorRef.current) return;
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let cell = sel.getRangeAt(0).commonAncestorContainer;
    if (cell.nodeType === Node.TEXT_NODE) cell = cell.parentElement;
    cell = cell?.closest("td, th");
    const row = cell?.closest("tr");
    const table = cell?.closest("table");
    if (!table || !row || !cell) {
      setToastMessage("Place cursor inside a table first");
      return;
    }

    pushHistory(editorRef.current.innerHTML);
    const colIndex = cell.cellIndex;

    if (action === "addRow") {
      const newRow = row.cloneNode(true);
      Array.from(newRow.cells).forEach((c) => { c.innerHTML = "Cell"; });
      row.after(newRow);
      setToastMessage("Row added below");
    } else if (action === "addCol") {
      Array.from(table.rows).forEach((r, idx) => {
        const nc = r.insertCell(colIndex + 1);
        nc.innerHTML = idx === 0 ? "<strong>Heading</strong>" : "Cell";
      });
      setToastMessage("Column added right");
    } else if (action === "delRow") {
      if (table.rows.length <= 1) table.remove();
      else row.remove();
      setToastMessage("Row deleted");
    } else if (action === "delCol") {
      if (row.cells.length <= 1) table.remove();
      else Array.from(table.rows).forEach((r) => { if (r.cells[colIndex]) r.deleteCell(colIndex); });
      setToastMessage("Column deleted");
    } else if (action === "delTable") {
      table.remove();
      setToastMessage("Table removed");
    }

    pushHistory(editorRef.current.innerHTML);
    syncSelectionState();
    updateMetrics();
    setActiveDropdown(null);
  };

  // Insert Checklist
  const insertChecklist = () => {
    const html = `<ul class="doc-checklist"><li><input type="checkbox" /> <span>Task item 1</span></li><li><input type="checkbox" /> <span>Task item 2</span></li></ul><p><br></p>`;
    exec("insertHTML", html);
    setActiveDropdown(null);
    setToastMessage("Checklist inserted");
  };

  // Sync HTML checked attribute when checklist checkbox is clicked inside contentEditable
  const handleEditorClick = (e) => {
    if (e.target && e.target.tagName === "INPUT" && e.target.type === "checkbox") {
      if (e.target.checked) e.target.setAttribute("checked", "checked");
      else e.target.removeAttribute("checked");
      if (editorRef.current) pushHistory(editorRef.current.innerHTML);
    }
    syncSelectionState();
  };

  // Open In-App Link Modal
  const openLinkModal = () => {
    saveSelection();
    const sel = window.getSelection();
    let existingAnchor = null;
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      let node = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      existingAnchor = node?.closest("a");
    }
    const selectedText = sel && !sel.isCollapsed ? sel.toString() : "";
    setLinkForm({
      url: existingAnchor ? existingAnchor.getAttribute("href") || "https://" : "https://",
      text: existingAnchor ? existingAnchor.textContent : selectedText,
      newTab: existingAnchor ? existingAnchor.target === "_blank" : true,
      hasExisting: Boolean(existingAnchor),
    });
    setActiveDropdown(null);
    setActiveMenu(null);
    setActiveModal("link");
  };

  const submitLinkModal = (e) => {
    e.preventDefault();
    if (!editorRef.current || !linkForm.url.trim()) return;
    pushHistory(editorRef.current.innerHTML);
    restoreSelection();
    const url = linkForm.url.trim();
    const text = (linkForm.text || "").trim() || url;
    const targetAttr = linkForm.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
    document.execCommand("insertHTML", false, `<a href="${url.replace(/"/g, "&quot;")}"${targetAttr}>${text}</a>&nbsp;`);
    pushHistory(editorRef.current.innerHTML);
    saveSelection();
    updateMetrics();
    setActiveModal(null);
    setToastMessage("Hyperlink inserted");
  };

  const removeActiveLink = () => {
    restoreSelection();
    exec("unlink");
    setActiveModal(null);
    setToastMessage("Link removed");
  };

  // Image Upload / URL Modal
  const handleImageFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target.result;
        const html = `<img src="${dataUrl}" alt="${file.name}" class="doc-img" /><p><br></p>`;
        exec("insertHTML", html);
        setToastMessage("Image inserted");
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
    setActiveDropdown(null);
  };

  const submitImageUrlModal = (e) => {
    e.preventDefault();
    if (!imageForm.url.trim()) return;
    const safeUrl = imageForm.url.trim().replace(/"/g, "&quot;");
    const safeAlt = (imageForm.alt || "Image").replace(/"/g, "&quot;");
    const widthStyle = imageForm.width === "100%" ? "" : ` style="width: ${imageForm.width};"`;
    exec("insertHTML", `<img src="${safeUrl}" alt="${safeAlt}" class="doc-img"${widthStyle} /><p><br></p>`);
    setActiveModal(null);
    setToastMessage("Image inserted");
  };

  // Media Modal
  const submitMediaModal = (e) => {
    e.preventDefault();
    const parsed = normalizeMediaUrl(mediaForm.url);
    if (parsed.type === "none") return;
    const safeSrc = parsed.src.replace(/"/g, "&quot;");
    let html = "";
    if (parsed.type === "video") {
      html = `<div class="doc-media-wrap"><video controls src="${safeSrc}"></video></div><p><br></p>`;
    } else if (parsed.type === "audio") {
      html = `<div class="doc-media-wrap" style="padding:12px;"><audio controls src="${safeSrc}" style="width:100%"></audio></div><p><br></p>`;
    } else {
      html = `<div class="doc-media-wrap"><iframe src="${safeSrc}" height="340" allowfullscreen loading="lazy"></iframe></div><p><br></p>`;
    }
    exec("insertHTML", html);
    setActiveModal(null);
    setToastMessage("Media embedded");
  };

  // Embed HTML Modal
  const submitEmbedModal = (e) => {
    e.preventDefault();
    if (!embedForm.html.trim()) return;
    exec("insertHTML", `${embedForm.html}<p><br></p>`);
    setActiveModal(null);
    setToastMessage("HTML block embedded");
  };

  // Bookmark Modal
  const openBookmarkModal = () => {
    saveSelection();
    let count = 0;
    if (editorRef.current) {
      const nodes = editorRef.current.querySelectorAll(".doc-bookmark");
      const list = Array.from(nodes).map((n) => ({
        id: n.id,
        label: n.textContent.replace("📌", "").trim() || n.id,
      }));
      count = list.length;
      setBookmarksList(list);
    }
    setBookmarkName(`Bookmark ${count + 1}`);
    setActiveModal("bookmark");
  };

  const submitBookmarkModal = (e) => {
    e.preventDefault();
    const label = bookmarkName.trim() || "Bookmark";
    const id = `bm-${Date.now()}`;
    exec("insertHTML", `<span class="doc-bookmark" id="${id}">📌 ${label}</span>&nbsp;`);
    setActiveModal(null);
    setToastMessage(`Bookmark "${label}" added`);
  };

  const jumpToBookmark = (id) => {
    setActiveModal(null);
    const el = editorRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setToastMessage(`Jumped to ${el.textContent}`);
    }
  };

  // Callout Helper
  const insertCallout = (variant = "gold") => {
    const label = variant === "info" ? "Info" : "Note";
    const cls = variant === "info" ? "doc-callout info" : "doc-callout";
    exec("insertHTML", `<div class="${cls}"><strong>${label}:</strong> Type key callout details here...</div><p><br></p>`);
    setActiveDropdown(null);
  };

  // Symbol / Emoji
  const insertCharacter = (char) => {
    exec("insertText", char);
    setActiveDropdown(null);
  };

  // Live Find & Replace (Walks ONLY Text Nodes — never corrupts HTML tags!)
  const collectTextMatches = useCallback((query, isCase) => {
    if (!query || !editorRef.current) return [];
    const results = [];
    const flags = isCase ? "g" : "gi";
    const regex = new RegExp(escapeRegExp(query), flags);
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = walker.nextNode())) {
      const val = tn.nodeValue;
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(val)) !== null) {
        if (m[0].length === 0) break;
        results.push({ node: tn, start: m.index, end: m.index + m[0].length });
      }
    }
    return results;
  }, []);

  const updateMatchCount = useCallback((query = findText, isCase = matchCase) => {
    if (!query || !editorRef.current || isSourceViewRef.current) {
      setMatchCount(0);
      findCursorIndexRef.current = 0;
      return;
    }
    setMatchCount(collectTextMatches(query, isCase).length);
  }, [collectTextMatches, findText, matchCase]);

  const handleFindNext = () => {
    if (!findText || !editorRef.current || isSourceViewRef.current) return;
    const matches = collectTextMatches(findText, matchCase);
    setMatchCount(matches.length);
    if (matches.length === 0) {
      setToastMessage("No matches found");
      return;
    }
    const idx = findCursorIndexRef.current % matches.length;
    const target = matches[idx];
    findCursorIndexRef.current = (idx + 1) % matches.length;

    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(target.node, target.start);
    range.setEnd(target.node, target.end);
    sel.removeAllRanges();
    sel.addRange(range);
    savedRangeRef.current = range.cloneRange();

    const parentEl = target.node.parentElement;
    if (parentEl) parentEl.scrollIntoView({ behavior: "smooth", block: "center" });
    setToastMessage(`Match ${idx + 1} of ${matches.length}`);
  };

  const handleReplaceSingle = () => {
    if (!findText || !editorRef.current || isSourceViewRef.current) return;
    const sel = window.getSelection();
    let replaced = false;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const curText = sel.toString();
      const matchesCur = matchCase ? curText === findText : curText.toLowerCase() === findText.toLowerCase();
      if (matchesCur) {
        pushHistory(editorRef.current.innerHTML);
        document.execCommand("insertText", false, replaceText);
        pushHistory(editorRef.current.innerHTML);
        updateMetrics();
        replaced = true;
      }
    }
    handleFindNext();
    if (replaced) setToastMessage("Replaced match");
  };

  const handleReplaceAll = () => {
    if (!findText || !editorRef.current || isSourceViewRef.current) return;
    const matches = collectTextMatches(findText, matchCase);
    if (matches.length === 0) {
      setToastMessage("No matches to replace");
      return;
    }

    pushHistory(editorRef.current.innerHTML);
    const regex = new RegExp(escapeRegExp(findText), matchCase ? "g" : "gi");
    let count = 0;
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let tn;
    while ((tn = walker.nextNode())) nodes.push(tn);
    nodes.forEach((node) => {
      const m = node.nodeValue.match(regex);
      if (m) {
        count += m.length;
        node.nodeValue = node.nodeValue.replace(regex, replaceText);
      }
    });

    pushHistory(editorRef.current.innerHTML);
    updateMetrics();
    setMatchCount(0);
    setToastMessage(`Replaced ${count} match${count === 1 ? "" : "es"}`);
  };

  // Exports (work smoothly from BOTH Visual & Source mode!)
  const exportWord = () => {
    const rawHtml = getCurrentHtml();
    // Convert checklist inputs & page breaks for clean Microsoft Word rendering
    const wordReadyHtml = rawHtml
      .replace(/<input[^>]*type="checkbox"[^>]*checked[^>]*>/gi, '<span style="font-family:Segoe UI Symbol;">☑</span>')
      .replace(/<input[^>]*type="checkbox"[^>]*>/gi, '<span style="font-family:Segoe UI Symbol;">☐</span>')
      .replace(/<div class="doc-page-break">[\s\S]*?<\/div>/gi, '<br clear="all" style="page-break-before:always" />');

    const docHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Document</title>
<style>
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; line-height: ${lineSpacing}; color: #1e293b; }
  h1 { font-size: 18pt; color: #0f172a; margin-top: 18pt; margin-bottom: 6pt; }
  h2 { font-size: 14pt; color: #1e293b; margin-top: 14pt; margin-bottom: 4pt; }
  h3 { font-size: 12pt; color: #334155; margin-top: 10pt; margin-bottom: 2pt; }
  p { margin: 0 0 8pt; }
  table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
  td, th { border: 1px solid #94a3b8; padding: 6pt 10pt; }
  blockquote { border-left: 3pt solid #e5a93c; padding-left: 10pt; font-style: italic; }
  img { max-width: 100%; height: auto; }
  .doc-checklist { list-style: none; padding-left: 0; }
</style>
</head>
<body>${wordReadyHtml}</body>
</html>`;

    const blob = new Blob(["\ufeff", docHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.doc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMessage("Exported as Word document (.doc)");
  };

  const exportHtml = () => {
    const htmlContent = getCurrentHtml();
    const standalone = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Exported Document</title>
<style>
  body { max-width: 820px; margin: 40px auto; padding: 0 24px; font-family: Inter, system-ui, sans-serif; line-height: ${lineSpacing}; color: #0f172a; column-count: ${columnCount}; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td, th { border: 1px solid #cbd5e1; padding: 8px 12px; }
  blockquote { border-left: 3px solid #d89626; padding: 8px 16px; background: #fffbeb; margin: 14px 0; }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  .doc-checklist { list-style: none; padding-left: 0; }
  .doc-page-break { break-after: page; page-break-after: always; }
</style>
</head>
<body>${htmlContent}</body>
</html>`;
    const blob = new Blob([standalone], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMessage("Exported standalone HTML (.html)");
  };

  const exportPDF = () => {
    // If user is currently in HTML source mode, switch cleanly and trigger print right after commit
    if (isSourceView) {
      pendingPrintRef.current = true;
      setIsSourceView(false);
    } else {
      window.print();
    }
    setToastMessage("Print / Save as PDF opened");
  };

  const exportTxt = () => {
    const text = getCurrentPlainText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMessage("Downloaded plain text (.txt)");
  };

  // Smart Importer: Extracts HTML safely from .html, .htm, and HTML-wrapped .doc files
  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const content = String(loadEvt.target.result || "");
        const isHtmlDoc = /\.(html?|doc)$/i.test(file.name) && /<(html|body|p|h1|div|table)/i.test(content);

        let parsedHtml = "";
        if (isHtmlDoc) {
          const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const inner = bodyMatch ? bodyMatch[1] : content;
          // Strip script tags for safety
          const safeDiv = document.createElement("div");
          safeDiv.innerHTML = inner;
          safeDiv.querySelectorAll("script").forEach((s) => s.remove());
          parsedHtml = safeDiv.innerHTML;
        } else {
          // Plain text / markdown paragraphs
          const escaped = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          parsedHtml = escaped
            .split(/\r?\n/)
            .map((line) => (line.trim() === "" ? "<p><br></p>" : `<p>${line}</p>`))
            .join("");
        }

        if (isSourceView) {
          setSourceCode(parsedHtml);
          const tmp = document.createElement("div");
          tmp.innerHTML = parsedHtml;
          updateMetrics(tmp.innerText || "");
        } else if (editorRef.current) {
          pushHistory(editorRef.current.innerHTML);
          editorRef.current.innerHTML = parsedHtml || DEFAULT_HTML;
          pushHistory(editorRef.current.innerHTML);
          updateMetrics();
        }
        setToastMessage(`Loaded: ${file.name}`);
      };
      reader.readAsText(file);
    }
    e.target.value = "";
    setActiveMenu(null);
  };

  // View Switchers (Visual WYSIWYG vs Source vs Clean Read Preview)
  const switchToVisual = () => {
    if (isSourceView) {
      setIsSourceView(false);
    }
    setIsPreviewMode(false);
    setActiveDropdown(null);
    setActiveMenu(null);
    setToastMessage("Visual Editor active");
  };

  const switchToSource = () => {
    if (!isSourceView) {
      const html = editorRef.current ? editorRef.current.innerHTML : DEFAULT_HTML;
      setSourceCode(html);
      setIsSourceView(true);
      setIsPreviewMode(false);
    }
    setActiveDropdown(null);
    setActiveMenu(null);
    setToastMessage("Switched to HTML Source");
  };

  const toggleCleanPreview = () => {
    if (isSourceView) {
      setIsSourceView(false);
    }
    setIsPreviewMode((prev) => {
      const next = !prev;
      setToastMessage(next ? "Clean Read Preview enabled" : "Editing mode resumed");
      return next;
    });
    setActiveDropdown(null);
    setActiveMenu(null);
  };

  // Select All strictly scoped inside editor
  const handleSelectAll = () => {
    if (isSourceView) {
      const ta = document.querySelector(".doc-source-textarea");
      if (ta) {
        ta.focus();
        ta.select();
      }
      return;
    }
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    sel.removeAllRanges();
    sel.addRange(range);
    saveSelection();
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (e.key === "Escape") {
        if (activeModal) { setActiveModal(null); return; }
        if (activeDropdown || activeMenu) { setActiveDropdown(null); setActiveMenu(null); return; }
        if (showFindReplace) { setShowFindReplace(false); return; }
        if (isFullscreen) { setIsFullscreen(false); return; }
      }

      if (e.key === "F11") {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
        return;
      }

      if (!isCtrl) return;

      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey && !isSourceViewRef.current) {
        e.preventDefault();
        handleUndo();
      } else if ((key === "y" || (key === "z" && e.shiftKey)) && !isSourceViewRef.current) {
        e.preventDefault();
        handleRedo();
      } else if (key === "f") {
        e.preventDefault();
        setShowFindReplace(true);
      } else if (key === "k" && !isSourceViewRef.current) {
        e.preventDefault();
        openLinkModal();
      } else if (key === "o") {
        e.preventDefault();
        fileInputRef.current?.click();
      } else if (key === "p") {
        e.preventDefault();
        exportPDF();
      } else if (key === "s") {
        e.preventDefault();
        exportWord();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Tab navigation inside Table cells or List indentation
  const handleEditorKeyDown = (e) => {
    if (e.key === "Tab") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node = sel.getRangeAt(0).commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        const cell = node?.closest("td, th");
        if (cell) {
          e.preventDefault();
          const table = cell.closest("table");
          const allCells = Array.from(table.querySelectorAll("td, th"));
          const idx = allCells.indexOf(cell);
          const nextIdx = e.shiftKey ? idx - 1 : idx + 1;
          if (nextIdx >= 0 && nextIdx < allCells.length) {
            const target = allCells[nextIdx];
            const range = document.createRange();
            range.selectNodeContents(target);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          return;
        }
        if (node?.closest("li")) {
          e.preventDefault();
          exec(e.shiftKey ? "outdent" : "indent");
          return;
        }
        e.preventDefault();
        exec("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;");
      }
    }
  };

  // Helper to prevent stealing selection on toolbar mousedown
  const preventStealFocus = (e) => {
    e.preventDefault();
  };

  return (
    <>
      <Header
        isScrolled={isScrolled}
        isToolsOpen={isToolsOpen}
        setIsToolsOpen={setIsToolsOpen}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main id="text-editor" className="landing view active">
        <section className="hero" style={{ minHeight: "100vh", padding: "85px 20px 60px" }}>
          {/* Ambient Glowing Golden Ribbons */}
          <div className="bg-golden-ribbons" aria-hidden="true">
            <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="goldRibbonTopTxt" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#e5a93c" stopOpacity="0" />
                  <stop offset="15%" stopColor="#e5a93c" stopOpacity="0.75" />
                  <stop offset="40%" stopColor="#ffe494" stopOpacity="0.95" />
                  <stop offset="70%" stopColor="#f5c768" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#e5a93c" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="goldRibbonBottomTxt" x1="100%" y1="50%" x2="0%" y2="50%">
                  <stop offset="0%" stopColor="#e5a93c" stopOpacity="0" />
                  <stop offset="20%" stopColor="#e5a93c" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#ffe494" stopOpacity="0.95" />
                  <stop offset="80%" stopColor="#f5c768" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#e5a93c" stopOpacity="0" />
                </linearGradient>
                <filter id="ribbonGlowSoftTxt" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
                <filter id="ribbonGlowWideTxt" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="16" />
                </filter>
              </defs>
              <path d="M -40,360 C 140,390 280,260 480,180 S 850,110 1200,125" stroke="url(#goldRibbonTopTxt)" strokeWidth="18" filter="url(#ribbonGlowWideTxt)" opacity="0.35" />
              <path d="M -40,360 C 140,390 280,260 480,180 S 850,110 1200,125" stroke="url(#goldRibbonTopTxt)" strokeWidth="5" filter="url(#ribbonGlowSoftTxt)" opacity="0.85" />
              <path d="M -40,360 C 140,390 280,260 480,180 S 850,110 1200,125" stroke="url(#goldRibbonTopTxt)" strokeWidth="2" opacity="1" />

              <path d="M 1480,620 C 1300,750 1140,840 900,870 S 500,880 280,840" stroke="url(#goldRibbonBottomTxt)" strokeWidth="18" filter="url(#ribbonGlowWideTxt)" opacity="0.35" />
              <path d="M 1480,620 C 1300,750 1140,840 900,870 S 500,880 280,840" stroke="url(#goldRibbonBottomTxt)" strokeWidth="5" filter="url(#ribbonGlowSoftTxt)" opacity="0.85" />
              <path d="M 1480,620 C 1300,750 1140,840 900,870 S 500,880 280,840" stroke="url(#goldRibbonBottomTxt)" strokeWidth="2" opacity="1" />
            </svg>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            style={{ display: "none" }}
            accept=".txt,.md,.html,.htm,.doc"
          />

          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageFileChange}
            style={{ display: "none" }}
            accept="image/*"
          />

          <div className={`rich-editor-wrapper ${isFullscreen ? "fullscreen-active" : ""}`}>
            <div className={`rich-editor-card ${paperTheme === "light" ? "paper-white-canvas" : "paper-dark-canvas"}`}>
              <div className="dropzone-bottom-glow" aria-hidden="true" />

              {/* TOP MENU BAR */}
              <div className="rich-editor-menubar" onMouseDown={preventStealFocus}>
                {/* File Menu */}
                <div className="menu-item-wrap">
                  <button
                    type="button"
                    className={`menu-btn ${activeMenu === "file" ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(null);
                      setActiveMenu(activeMenu === "file" ? null : "file");
                    }}
                  >
                    File
                  </button>
                  {activeMenu === "file" && (
                    <div className="menu-dropdown">
                      <button type="button" onClick={() => { setIsConfirmOpen(true); setActiveMenu(null); }}>
                        <span>New Document</span>
                        <kbd>Ctrl+N</kbd>
                      </button>
                      <button type="button" onClick={() => { fileInputRef.current?.click(); setActiveMenu(null); }}>
                        <span>Open / Import (.txt, .doc, .html)</span>
                        <kbd>Ctrl+O</kbd>
                      </button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => { exportWord(); setActiveMenu(null); }}>
                        <span>Export as Word (.doc)</span>
                        <kbd>Ctrl+S</kbd>
                      </button>
                      <button type="button" onClick={() => { exportPDF(); setActiveMenu(null); }}>
                        <span>Export as PDF</span>
                      </button>
                      <button type="button" onClick={() => { exportHtml(); setActiveMenu(null); }}>
                        <span>Export as HTML (.html)</span>
                      </button>
                      <button type="button" onClick={() => { exportTxt(); setActiveMenu(null); }}>
                        <span>Export as Plain Text (.txt)</span>
                      </button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => { exportPDF(); setActiveMenu(null); }}>
                        <span>Print Document</span>
                        <kbd>Ctrl+P</kbd>
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Menu */}
                <div className="menu-item-wrap">
                  <button
                    type="button"
                    className={`menu-btn ${activeMenu === "edit" ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(null);
                      setActiveMenu(activeMenu === "edit" ? null : "edit");
                    }}
                  >
                    Edit
                  </button>
                  {activeMenu === "edit" && (
                    <div className="menu-dropdown">
                      <button type="button" onClick={() => { handleUndo(); setActiveMenu(null); }}>
                        <span>Undo</span>
                        <kbd>Ctrl+Z</kbd>
                      </button>
                      <button type="button" onClick={() => { handleRedo(); setActiveMenu(null); }}>
                        <span>Redo</span>
                        <kbd>Ctrl+Y</kbd>
                      </button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => {
                        const selText = window.getSelection()?.toString() || getCurrentPlainText();
                        navigator.clipboard?.writeText(selText).then(() => setToastMessage("Copied to clipboard"));
                        setActiveMenu(null);
                      }}>
                        <span>Copy Selection / All</span>
                        <kbd>Ctrl+C</kbd>
                      </button>
                      <button type="button" onClick={() => { handleSelectAll(); setActiveMenu(null); }}>
                        <span>Select All</span>
                        <kbd>Ctrl+A</kbd>
                      </button>
                      <button type="button" onClick={() => { setShowFindReplace(true); setActiveMenu(null); }}>
                        <span>Find & Replace</span>
                        <kbd>Ctrl+F</kbd>
                      </button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => { setIsConfirmOpen(true); setActiveMenu(null); }} className="danger-text">
                        <span>Clear All Content</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* View Menu */}
                <div className="menu-item-wrap">
                  <button
                    type="button"
                    className={`menu-btn ${activeMenu === "view" ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(null);
                      setActiveMenu(activeMenu === "view" ? null : "view");
                    }}
                  >
                    View
                  </button>
                  {activeMenu === "view" && (
                    <div className="menu-dropdown">
                      <button type="button" onClick={() => { setIsFullscreen(!isFullscreen); setActiveMenu(null); }}>
                        <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}</span>
                        <kbd>F11</kbd>
                      </button>
                      <button type="button" onClick={isSourceView ? switchToVisual : switchToSource}>
                        <span>{isSourceView ? "Visual WYSIWYG View" : "HTML Source Code"}</span>
                      </button>
                      <button type="button" onClick={toggleCleanPreview}>
                        <span>{isPreviewMode ? "Resume Editing" : "Clean Read Preview"}</span>
                      </button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => { setPaperTheme(paperTheme === "dark" ? "light" : "dark"); setActiveMenu(null); }}>
                        <span>Switch to {paperTheme === "dark" ? "White Paper Sheet" : "Dark Slate Sheet"}</span>
                      </button>
                      <button type="button" onClick={() => { setActiveModal("stats"); setActiveMenu(null); }}>
                        <span>Document Word Count & Metrics</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Insert Menu */}
                <div className="menu-item-wrap">
                  <button
                    type="button"
                    className={`menu-btn ${activeMenu === "insert" ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(null);
                      setActiveMenu(activeMenu === "insert" ? null : "insert");
                    }}
                  >
                    Insert
                  </button>
                  {activeMenu === "insert" && (
                    <div className="menu-dropdown">
                      <button type="button" onClick={() => { saveSelection(); imageInputRef.current?.click(); setActiveMenu(null); }}>
                        <span>Image from Computer...</span>
                      </button>
                      <button type="button" onClick={() => { saveSelection(); setActiveModal("image"); setActiveMenu(null); }}>
                        <span>Image from URL...</span>
                      </button>
                      <button type="button" onClick={() => { insertTable(3, 3); setActiveMenu(null); }}>
                        <span>Table (3×3 Grid)</span>
                      </button>
                      <button type="button" onClick={openLinkModal}>
                        <span>Hyperlink</span>
                        <kbd>Ctrl+K</kbd>
                      </button>
                      <button type="button" onClick={() => { insertChecklist(); setActiveMenu(null); }}>
                        <span>Checklist Tasks</span>
                      </button>
                      <button type="button" onClick={() => { saveSelection(); setActiveModal("media"); setActiveMenu(null); }}>
                        <span>Video / Audio Embed...</span>
                      </button>
                      <button type="button" onClick={() => { openBookmarkModal(); setActiveMenu(null); }}>
                        <span>Bookmark Anchor...</span>
                      </button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => { insertCallout("info"); setActiveMenu(null); }}>
                        <span>Info Callout Box</span>
                      </button>
                      <button type="button" onClick={() => { exec("insertHorizontalRule"); setActiveMenu(null); }}>
                        <span>Horizontal Divider Rule</span>
                      </button>
                      <button type="button" onClick={() => { exec("insertHTML", '<div class="doc-page-break"><span class="break-pill">--- Page Break ---</span></div><p><br></p>'); setActiveMenu(null); }}>
                        <span>Page Break</span>
                      </button>
                      <button type="button" onClick={() => { insertCharacter(new Date().toLocaleDateString()); setActiveMenu(null); }}>
                        <span>Date & Time Stamp</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Format Menu */}
                <div className="menu-item-wrap">
                  <button
                    type="button"
                    className={`menu-btn ${activeMenu === "format" ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(null);
                      setActiveMenu(activeMenu === "format" ? null : "format");
                    }}
                  >
                    Format
                  </button>
                  {activeMenu === "format" && (
                    <div className="menu-dropdown">
                      <button type="button" onClick={() => { exec("bold"); setActiveMenu(null); }}>
                        <span>Bold</span>
                        <kbd>Ctrl+B</kbd>
                      </button>
                      <button type="button" onClick={() => { exec("italic"); setActiveMenu(null); }}>
                        <span>Italic</span>
                        <kbd>Ctrl+I</kbd>
                      </button>
                      <button type="button" onClick={() => { exec("underline"); setActiveMenu(null); }}>
                        <span>Underline</span>
                        <kbd>Ctrl+U</kbd>
                      </button>
                      <button type="button" onClick={() => { exec("strikeThrough"); setActiveMenu(null); }}>
                        <span>Strikethrough</span>
                      </button>
                      <button type="button" onClick={() => { exec("superscript"); setActiveMenu(null); }}>
                        <span>Superscript (ab¹)</span>
                      </button>
                      <button type="button" onClick={() => { exec("subscript"); setActiveMenu(null); }}>
                        <span>Subscript (ab₁)</span>
                      </button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => { transformCase("title"); setActiveMenu(null); }}>
                        <span>Title Case</span>
                      </button>
                      <button type="button" onClick={() => { transformCase("upper"); setActiveMenu(null); }}>
                        <span>UPPERCASE</span>
                      </button>
                      <button type="button" onClick={() => { transformCase("lower"); setActiveMenu(null); }}>
                        <span>lowercase</span>
                      </button>
                      <button type="button" onClick={() => { transformCase("sentence"); setActiveMenu(null); }}>
                        <span>Sentence case</span>
                      </button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => { handleClearFormatting(); setActiveMenu(null); }}>
                        <span>Clear All Formatting</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Help Menu */}
                <div className="menu-item-wrap">
                  <button
                    type="button"
                    className={`menu-btn ${activeMenu === "help" ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(null);
                      setActiveMenu(activeMenu === "help" ? null : "help");
                    }}
                  >
                    Help
                  </button>
                  {activeMenu === "help" && (
                    <div className="menu-dropdown">
                      <button type="button" onClick={() => { setActiveModal("stats"); setActiveMenu(null); }}>
                        <span>Document Overview & Word Count</span>
                      </button>
                      <button type="button" onClick={() => { setActiveModal("shortcuts"); setActiveMenu(null); }}>
                        <span>Keyboard Shortcuts</span>
                      </button>
                      <button type="button" onClick={() => { setToastMessage("100% offline & client-side in your browser"); setActiveMenu(null); }}>
                        <span>About RawPDF Studio</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* TOOLBAR ROW 1 */}
              <div className="rich-editor-toolbar toolbar-row-1" onMouseDown={preventStealFocus}>
                {/* 1. Undo */}
                <button
                  type="button"
                  className="t-icon-btn"
                  title="Undo (Ctrl+Z)"
                  disabled={!canUndo || isSourceView}
                  onClick={handleUndo}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                </button>

                {/* 2. Redo */}
                <button
                  type="button"
                  className="t-icon-btn"
                  title="Redo (Ctrl+Y)"
                  disabled={!canRedo || isSourceView}
                  onClick={handleRedo}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                  </svg>
                </button>

                <div className="t-divider" />

                {/* 3. Code {} with dropdown */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "code" ? "active" : ""}`}
                    title="Insert Code Block or Inline Code"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "code" ? null : "code");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "code" && (
                    <div className="t-dropdown-menu">
                      <button type="button" onClick={() => { exec("formatBlock", "<pre>"); setActiveDropdown(null); }}>
                        <span>Code Block (&lt;pre&gt;)</span>
                      </button>
                      <button type="button" onClick={insertInlineCode}>
                        <span>Inline Code (&lt;code&gt;)</span>
                      </button>
                      <button type="button" onClick={() => { exec("fontName", "Menlo, Consolas, monospace"); setActiveDropdown(null); }}>
                        <span>Monospace Font</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. View / Preview Eye with dropdown */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${isSourceView || isPreviewMode ? "active" : ""}`}
                    title="View Modes (Editor / Read Preview / HTML Source)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "viewMode" ? null : "viewMode");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "viewMode" && (
                    <div className="t-dropdown-menu">
                      <button type="button" className={!isSourceView && !isPreviewMode ? "active-opt" : ""} onClick={switchToVisual}>
                        <span>Visual Editor</span>
                        {!isSourceView && !isPreviewMode && <span>✓</span>}
                      </button>
                      <button type="button" className={isPreviewMode ? "active-opt" : ""} onClick={toggleCleanPreview}>
                        <span>Clean Read Preview</span>
                        {isPreviewMode && <span>✓</span>}
                      </button>
                      <button type="button" className={isSourceView ? "active-opt" : ""} onClick={switchToSource}>
                        <span>HTML Source Code</span>
                        {isSourceView && <span>✓</span>}
                      </button>
                    </div>
                  )}
                </div>

                <div className="t-divider" />

                {/* 5. Import Document */}
                <button
                  type="button"
                  className="t-icon-btn"
                  title="Import Document (.txt, .doc, .html, .md)"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M12 18v-6m-3 3l3-3 3 3" />
                  </svg>
                </button>

                {/* 6. Export Word */}
                <button type="button" className="t-icon-btn" title="Export as Microsoft Word (.doc)" onClick={exportWord}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M12 12v6m-3-3l3 3 3-3" />
                  </svg>
                </button>

                {/* 7. Export PDF */}
                <button type="button" className="t-icon-btn" title="Export Document as PDF (Print)" onClick={exportPDF}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M9 15h6" />
                    <path d="M12 12v6" />
                  </svg>
                </button>

                <div className="t-divider" />

                {/* 8. Real Format Painter 🖌 with dropdown */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${isPainterArmed ? "active" : ""}`}
                    title={isPainterArmed ? "Format Painter Armed (Select text to paste style)" : "Format Painter (Copy style from current text)"}
                    onClick={() => {
                      if (isPainterArmed) {
                        setIsPainterArmed(false);
                        setToastMessage("Format Painter cancelled");
                      } else {
                        copyFormatFromSelection();
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 11V4a2 2 0 0 0-2-2H4v7h13a2 2 0 0 0 2-2z" />
                      <path d="M9 9v10a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5" />
                      <line x1="8" y1="4" x2="8" y2="7" />
                    </svg>
                    <span
                      className="chevron-mini"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        setActiveDropdown(activeDropdown === "painter" ? null : "painter");
                      }}
                    >
                      ⌵
                    </span>
                  </button>
                  {activeDropdown === "painter" && (
                    <div className="t-dropdown-menu">
                      <button type="button" onClick={copyFormatFromSelection}>
                        <span>Copy Format from Selection</span>
                      </button>
                      {copiedFormat && (
                        <button type="button" onClick={() => { applyCopiedFormat(); setActiveDropdown(null); }}>
                          <span>Apply Copied Format</span>
                        </button>
                      )}
                      {isPainterArmed && (
                        <button type="button" onClick={() => { setIsPainterArmed(false); setActiveDropdown(null); }}>
                          <span>Cancel Format Painter</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 9. Aa Case Conversion */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "case" ? "active" : ""}`}
                    title="Case Converter"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "case" ? null : "case");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 17l4-10 4 10" />
                      <path d="M4.8 13.5h4.4" />
                      <circle cx="17" cy="14" r="3" />
                      <path d="M20 11v6" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "case" && (
                    <div className="t-dropdown-menu">
                      <button type="button" onClick={() => transformCase("sentence")}>Sentence case</button>
                      <button type="button" onClick={() => transformCase("lower")}>lowercase</button>
                      <button type="button" onClick={() => transformCase("upper")}>UPPERCASE</button>
                      <button type="button" onClick={() => transformCase("capitalized")}>Capitalized Case</button>
                      <button type="button" onClick={() => transformCase("title")}>Title Case</button>
                      <button type="button" onClick={() => transformCase("alternate")}>aLtErNaTiNg cAsE</button>
                      <button type="button" onClick={() => transformCase("inverse")}>iNvErSe cAsE</button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => transformCase("clean-spaces")}>Reduce Spaces</button>
                      <button type="button" onClick={() => transformCase("merge-lines")}>Merge Lines</button>
                    </div>
                  )}
                </div>

                {/* 10. Clear Formatting */}
                <button type="button" className="t-icon-btn" title="Clear All Formatting" onClick={handleClearFormatting}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <path d="M4 6h16" />
                    <path d="M10 6v5" />
                    <path d="M14 6v5" />
                  </svg>
                </button>

                {/* 11. Find & Replace 🔍 */}
                <button
                  type="button"
                  className={`t-icon-btn ${showFindReplace ? "active" : ""}`}
                  title="Find & Replace (Ctrl+F)"
                  onClick={() => setShowFindReplace(!showFindReplace)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>

                {/* 12. Text Color & Highlight A with dropdown */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "color" ? "active" : ""}`}
                    title="Text Color & Highlight"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "color" ? null : "color");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 16l5-12 5 12" />
                      <path d="M6 12h6" />
                      <line x1="3" y1="20" x2="15" y2="20" strokeWidth="3" stroke={activeFormats.color || "#e5a93c"} />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "color" && (
                    <div className="t-dropdown-menu color-palette-menu">
                      <div className="color-section-title">Text Color</div>
                      <div className="color-swatches">
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="color-swatch-dot"
                            title={c}
                            style={{ background: c }}
                            onClick={() => { exec("foreColor", c); setActiveDropdown(null); }}
                          />
                        ))}
                      </div>
                      <div className="color-section-title">Highlight</div>
                      <div className="color-swatches">
                        {HIGHLIGHT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="color-swatch-dot"
                            title={c === "transparent" ? "No highlight" : c}
                            style={{ background: c === "transparent" ? "#475569" : c }}
                            onClick={() => { exec("hiliteColor", c); setActiveDropdown(null); }}
                          />
                        ))}
                      </div>
                      <label className="color-custom-row">
                        <span>Custom Color:</span>
                        <input
                          type="color"
                          className="color-custom-input"
                          defaultValue="#e5a93c"
                          onChange={(e) => exec("foreColor", e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="t-divider" />

                {/* 13. Link 🔗 */}
                <button type="button" className="t-icon-btn" title="Insert / Edit Hyperlink (Ctrl+K)" onClick={openLinkModal}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>

                {/* 14. Superscript M¹ / ab¹ */}
                <button
                  type="button"
                  className={`t-icon-btn ${activeFormats.superscript ? "active" : ""}`}
                  title="Superscript"
                  onClick={() => exec("superscript")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19V5l4 7 4-7v14" />
                    <path d="M18 9V4l-2 2" />
                  </svg>
                </button>

                {/* 15. Bookmark 🔖 */}
                <button type="button" className="t-icon-btn" title="Insert / Jump to Bookmark Anchor" onClick={openBookmarkModal}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>

                {/* 16. Image 🖼️ with dropdown */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "image" ? "active" : ""}`}
                    title="Insert Image"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "image" ? null : "image");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "image" && (
                    <div className="t-dropdown-menu">
                      <button type="button" onClick={() => { saveSelection(); imageInputRef.current?.click(); setActiveDropdown(null); }}>
                        <span>Upload from Device...</span>
                      </button>
                      <button type="button" onClick={() => { saveSelection(); setActiveModal("image"); setActiveDropdown(null); }}>
                        <span>Insert from Image URL...</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 17. Interactive Table ▦ with Grid Picker + Row/Col Tools */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "table" || activeFormats.inTable ? "active" : ""}`}
                    title="Insert or Edit Table"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "table" ? null : "table");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="3" y1="15" x2="21" y2="15" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "table" && (
                    <div className="t-dropdown-menu table-grid-picker-wrap align-right">
                      <div className="table-grid-label">Insert {tableHover.r} × {tableHover.c} Table</div>
                      <div className="table-grid-picker">
                        {Array.from({ length: 36 }).map((_, idx) => {
                          const r = Math.floor(idx / 6) + 1;
                          const c = (idx % 6) + 1;
                          const highlighted = r <= tableHover.r && c <= tableHover.c;
                          return (
                            <button
                              key={idx}
                              type="button"
                              className={`table-grid-cell${highlighted ? " highlighted" : ""}`}
                              onMouseEnter={() => setTableHover({ r, c })}
                              onClick={() => insertTable(r, c)}
                              title={`${r} rows × ${c} columns`}
                            />
                          );
                        })}
                      </div>
                      {activeFormats.inTable && (
                        <>
                          <div className="menu-divider" style={{ marginTop: 10 }} />
                          <button type="button" onClick={() => modifyActiveTable("addRow")}>+ Add Row Below</button>
                          <button type="button" onClick={() => modifyActiveTable("addCol")}>+ Add Column Right</button>
                          <button type="button" onClick={() => modifyActiveTable("delRow")}>Delete Current Row</button>
                          <button type="button" onClick={() => modifyActiveTable("delCol")}>Delete Current Column</button>
                          <button type="button" className="danger-text" onClick={() => modifyActiveTable("delTable")}>Remove Table</button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 18. Media Embed ▶ */}
                <button
                  type="button"
                  className="t-icon-btn"
                  title="Insert Video or Audio Embed"
                  onClick={() => { saveSelection(); setActiveModal("media"); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>

                {/* 19. Embed HTML </> with dropdown */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "embed" ? "active" : ""}`}
                    title="Embed Raw HTML or Callouts"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "embed" ? null : "embed");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                      <line x1="14" y1="4" x2="10" y2="20" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "embed" && (
                    <div className="t-dropdown-menu align-right">
                      <button type="button" onClick={() => { saveSelection(); setActiveModal("embed"); setActiveDropdown(null); }}>
                        <span>Custom HTML Snippet...</span>
                      </button>
                      <button type="button" onClick={() => insertCallout("info")}>
                        <span>Info Callout Box</span>
                      </button>
                      <button type="button" onClick={() => insertCallout("gold")}>
                        <span>Highlight Callout Box</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 20. Insert More + with dropdown */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "more" ? "active" : ""}`}
                    title="Insert Divider, Page Break, Date or Quote"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "more" ? null : "more");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "more" && (
                    <div className="t-dropdown-menu align-right">
                      <button type="button" onClick={() => { exec("insertHorizontalRule"); setActiveDropdown(null); }}>Horizontal Divider Rule</button>
                      <button type="button" onClick={() => { exec("insertHTML", '<div class="doc-page-break"><span class="break-pill">--- Page Break ---</span></div><p><br></p>'); setActiveDropdown(null); setToastMessage("Page break inserted"); }}>Page Break</button>
                      <button type="button" onClick={() => { exec("formatBlock", "<blockquote>"); setActiveDropdown(null); }}>Blockquote</button>
                      <button type="button" onClick={() => insertCharacter(`${new Date().toLocaleDateString()} `)}>Today&apos;s Date Stamp</button>
                    </div>
                  )}
                </div>

                {/* 21. Emoji 😊 */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn ${activeDropdown === "emoji" ? "active" : ""}`}
                    title="Insert Emoji"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "emoji" ? null : "emoji");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                    </svg>
                  </button>
                  {activeDropdown === "emoji" && (
                    <div className="t-dropdown-menu emoji-picker-grid align-right">
                      {EMOJIS.map((em) => (
                        <button key={em} type="button" className="emoji-btn" onClick={() => insertCharacter(em)}>
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 22. Special Characters Ω */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn ${activeDropdown === "symbol" ? "active" : ""}`}
                    title="Special Characters & Symbols (Ω)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "symbol" ? null : "symbol");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 20h4.5a3 3 0 0 0 2.5-1.5L12 14l2 4.5a3 3 0 0 0 2.5 1.5H21" />
                      <path d="M7 16a6 6 0 1 1 10 0" />
                    </svg>
                  </button>
                  {activeDropdown === "symbol" && (
                    <div className="t-dropdown-menu emoji-picker-grid align-right">
                      {SYMBOLS.map((sym) => (
                        <button key={sym} type="button" className="emoji-btn" onClick={() => insertCharacter(sym)}>
                          {sym}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* TOOLBAR ROW 2 */}
              <div className="rich-editor-toolbar toolbar-row-2" onMouseDown={preventStealFocus}>
                {/* Paragraph / Heading */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className="t-select-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "block" ? null : "block");
                    }}
                  >
                    <span>{activeFormats.block}</span>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "block" && (
                    <div className="t-dropdown-menu">
                      {[
                        { label: "Paragraph", tag: "<p>" },
                        { label: "Heading 1", tag: "<h1>" },
                        { label: "Heading 2", tag: "<h2>" },
                        { label: "Heading 3", tag: "<h3>" },
                        { label: "Heading 4", tag: "<h4>" },
                        { label: "Quote", tag: "<blockquote>" },
                        { label: "Code", tag: "<pre>" },
                      ].map((opt) => (
                        <button
                          key={opt.tag}
                          type="button"
                          className={activeFormats.block === opt.label ? "active-opt" : ""}
                          onClick={() => { exec("formatBlock", opt.tag); setActiveDropdown(null); }}
                        >
                          <span>{opt.label}</span>
                          {activeFormats.block === opt.label && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Styles & Font Family */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className="t-select-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "styles" ? null : "styles");
                    }}
                  >
                    <span>{activeFormats.styleLabel}</span>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "styles" && (
                    <div className="t-dropdown-menu">
                      <button type="button" onClick={() => { exec("fontName", "Inter, sans-serif"); setActiveDropdown(null); }}>Modern Sans (Inter)</button>
                      <button type="button" onClick={() => { exec("fontName", "Georgia, serif"); setActiveDropdown(null); }}>Editorial Serif (Georgia)</button>
                      <button type="button" onClick={() => { exec("fontName", "'Space Grotesk', sans-serif"); setActiveDropdown(null); }}>Display Sans (Grotesk)</button>
                      <button type="button" onClick={() => { exec("fontName", "Menlo, Consolas, monospace"); setActiveDropdown(null); }}>Monospace (Code)</button>
                      <div className="menu-divider" />
                      <button type="button" onClick={() => insertCallout("info")}>Info Callout Box</button>
                      <button type="button" onClick={() => insertCallout("gold")}>Highlight Callout Box</button>
                      <button type="button" onClick={insertInlineCode}>Inline Code Badge</button>
                    </div>
                  )}
                </div>

                <div className="t-divider" />

                {/* Bold B */}
                <button
                  type="button"
                  className={`t-icon-btn font-bold-icon ${activeFormats.bold ? "active" : ""}`}
                  title="Bold (Ctrl+B)"
                  onClick={() => exec("bold")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                  </svg>
                </button>

                {/* Italic I */}
                <button
                  type="button"
                  className={`t-icon-btn font-italic-icon ${activeFormats.italic ? "active" : ""}`}
                  title="Italic (Ctrl+I)"
                  onClick={() => exec("italic")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="4" x2="10" y2="4" />
                    <line x1="14" y1="20" x2="5" y2="20" />
                    <line x1="15" y1="4" x2="9" y2="20" />
                  </svg>
                </button>

                {/* Underline U */}
                <button
                  type="button"
                  className={`t-icon-btn font-underline-icon ${activeFormats.underline ? "active" : ""}`}
                  title="Underline (Ctrl+U)"
                  onClick={() => exec("underline")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3v7a6 6 0 0 0 12 0V3" />
                    <line x1="4" y1="21" x2="20" y2="21" />
                  </svg>
                </button>

                {/* Strikethrough S */}
                <button
                  type="button"
                  className={`t-icon-btn font-strike-icon ${activeFormats.strikeThrough ? "active" : ""}`}
                  title="Strikethrough"
                  onClick={() => exec("strikeThrough")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h-6a4 4 0 0 0-4 4 4 4 0 0 0 4 4h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                  </svg>
                </button>

                {/* Font Size AA ⌵ */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "size" ? "active" : ""}`}
                    title="Font Size"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "size" ? null : "size");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19l4-11 4 11" />
                      <path d="M5.5 15h5" />
                      <path d="M14 19l3-8 3 8" />
                      <path d="M15.2 16h3.6" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "size" && (
                    <div className="t-dropdown-menu">
                      {["12px", "14px", "15px", "18px", "22px", "28px", "36px"].map((sz) => (
                        <button key={sz} type="button" onClick={() => applyFontSize(sz)}>
                          <span>{sz === "15px" ? "15px (Default)" : sz}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="t-divider" />

                {/* Alignment ≡ ⌵ */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "align" ? "active" : ""}`}
                    title="Text Alignment"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "align" ? null : "align");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="21" y1="6" x2="3" y2="6" />
                      <line x1={activeFormats.align === "center" ? "18" : "15"} y1="12" x2={activeFormats.align === "center" ? "6" : "3"} y2="12" />
                      <line x1="17" y1="18" x2="3" y2="18" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "align" && (
                    <div className="t-dropdown-menu">
                      {[
                        { label: "Align Left", cmd: "justifyLeft", val: "left" },
                        { label: "Align Center", cmd: "justifyCenter", val: "center" },
                        { label: "Align Right", cmd: "justifyRight", val: "right" },
                        { label: "Justify Both", cmd: "justifyFull", val: "justify" },
                      ].map((a) => (
                        <button
                          key={a.val}
                          type="button"
                          className={activeFormats.align === a.val ? "active-opt" : ""}
                          onClick={() => { exec(a.cmd); setActiveDropdown(null); }}
                        >
                          <span>{a.label}</span>
                          {activeFormats.align === a.val && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Line Spacing ↕≡ ⌵ */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "spacing" ? "active" : ""}`}
                    title="Line Spacing"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "spacing" ? null : "spacing");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="7 6 4 3 1 6" />
                      <polyline points="7 18 4 21 1 18" />
                      <line x1="4" y1="3" x2="4" y2="21" />
                      <line x1="11" y1="6" x2="21" y2="6" />
                      <line x1="11" y1="12" x2="21" y2="12" />
                      <line x1="11" y1="18" x2="21" y2="18" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "spacing" && (
                    <div className="t-dropdown-menu">
                      {[
                        { label: "1.0 (Tight)", val: "1.0" },
                        { label: "1.2 (Compact)", val: "1.2" },
                        { label: "1.65 (Standard)", val: "1.65" },
                        { label: "1.8 (Spacious)", val: "1.8" },
                        { label: "2.2 (Double)", val: "2.2" },
                      ].map((sp) => (
                        <button
                          key={sp.val}
                          type="button"
                          className={lineSpacing === sp.val ? "active-opt" : ""}
                          onClick={() => applyLineSpacing(sp.val)}
                        >
                          <span>{sp.label}</span>
                          {lineSpacing === sp.val && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Columns 🗖 ⌵ */}
                <div className="t-dropdown-wrap">
                  <button
                    type="button"
                    className={`t-icon-btn with-chevron ${activeDropdown === "columns" || columnCount !== "1" ? "active" : ""}`}
                    title="Column Layout"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      setActiveDropdown(activeDropdown === "columns" ? null : "columns");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                    <span className="chevron-mini">⌵</span>
                  </button>
                  {activeDropdown === "columns" && (
                    <div className="t-dropdown-menu">
                      {[1, 2, 3].map((cols) => (
                        <button
                          key={cols}
                          type="button"
                          className={columnCount === String(cols) ? "active-opt" : ""}
                          onClick={() => applyColumns(cols)}
                        >
                          <span>{cols === 1 ? "Single Column" : `${cols} Columns`}</span>
                          {columnCount === String(cols) && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Page Break 📄+ */}
                <button
                  type="button"
                  className="t-icon-btn"
                  title="Insert Page Break"
                  onClick={() => {
                    exec("insertHTML", '<div class="doc-page-break"><span class="break-pill">--- Page Break ---</span></div><p><br></p>');
                    setToastMessage("Page break inserted");
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </button>

                {/* Bullet List */}
                <button
                  type="button"
                  className={`t-icon-btn ${activeFormats.unorderedList ? "active" : ""}`}
                  title="Bulleted List"
                  onClick={() => exec("insertUnorderedList")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
                    <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
                    <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
                  </svg>
                </button>

                {/* Numbered List */}
                <button
                  type="button"
                  className={`t-icon-btn ${activeFormats.orderedList ? "active" : ""}`}
                  title="Numbered List"
                  onClick={() => exec("insertOrderedList")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="10" y1="6" x2="21" y2="6" />
                    <line x1="10" y1="12" x2="21" y2="12" />
                    <line x1="10" y1="18" x2="21" y2="18" />
                    <path d="M4 6h1v4" />
                    <path d="M4 10h2" />
                    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
                  </svg>
                </button>

                {/* Checklist */}
                <button type="button" className="t-icon-btn" title="Checklist / Task Items" onClick={insertChecklist}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 8 8 4" />
                    <line x1="12" y1="6" x2="21" y2="6" />
                    <polyline points="3 14 5 16 8 12" />
                    <line x1="12" y1="14" x2="21" y2="14" />
                  </svg>
                </button>

                {/* Decrease Indent */}
                <button type="button" className="t-icon-btn" title="Decrease Indent (Shift+Tab)" onClick={() => exec("outdent")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="21" y1="6" x2="11" y2="6" />
                    <line x1="21" y1="12" x2="11" y2="12" />
                    <line x1="21" y1="18" x2="11" y2="18" />
                    <polyline points="7 8 3 12 7 16" />
                  </svg>
                </button>

                {/* Increase Indent */}
                <button type="button" className="t-icon-btn" title="Increase Indent (Tab)" onClick={() => exec("indent")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="21" y1="6" x2="11" y2="6" />
                    <line x1="21" y1="12" x2="11" y2="12" />
                    <line x1="21" y1="18" x2="11" y2="18" />
                    <polyline points="3 8 7 12 3 16" />
                  </svg>
                </button>

                <div className="t-divider" />

                {/* Fullscreen */}
                <button
                  type="button"
                  className={`t-icon-btn ${isFullscreen ? "active" : ""}`}
                  title={isFullscreen ? "Exit Fullscreen (Esc / F11)" : "Fullscreen (F11)"}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
              </div>

              {/* FIND & REPLACE DRAWER */}
              {showFindReplace && (
                <div className="rich-fr-drawer">
                  <div className="fr-field-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="fr-icon">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Find in document..."
                      value={findText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFindText(val);
                        updateMatchCount(val, matchCase);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFindNext(); } }}
                      className="fr-text-input"
                      autoFocus
                    />
                  </div>
                  <div className="fr-field-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="fr-icon">
                      <path d="M4 14h10a4 4 0 0 0 0-8H4" /><polyline points="7 17 4 14 7 11" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Replace with..."
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      className="fr-text-input"
                    />
                  </div>
                  <span className="fr-match-badge">{matchCount} {matchCount === 1 ? "match" : "matches"}</span>
                  <label className="fr-check">
                    <input
                      type="checkbox"
                      checked={matchCase}
                      onChange={(e) => {
                        const nextCase = e.target.checked;
                        setMatchCase(nextCase);
                        updateMatchCount(findText, nextCase);
                      }}
                    />
                    <span>Match Case</span>
                  </label>
                  <button type="button" className="fr-btn" onClick={handleFindNext}>Find Next</button>
                  <button type="button" className="fr-btn" onClick={handleReplaceSingle}>Replace</button>
                  <button type="button" className="fr-btn primary" onClick={handleReplaceAll}>Replace All</button>
                  <button type="button" className="fr-close-btn" onClick={() => setShowFindReplace(false)} aria-label="Close find drawer">
                    ✕
                  </button>
                </div>
              )}

              {/* DOCUMENT EDITING CANVAS */}
              <div className="editor-canvas-container">
                {!isSourceView ? (
                  <div
                    ref={editorRef}
                    className={`doc-paper-sheet${isPainterArmed ? " format-painter-armed" : ""}${isPreviewMode ? " read-preview-mode" : ""}`}
                    contentEditable={!isPreviewMode}
                    suppressContentEditableWarning
                    spellCheck="true"
                    style={{
                      zoom: zoom / 100,
                      columnCount: Number(columnCount),
                      columnGap: Number(columnCount) > 1 ? "32px" : "normal",
                      lineHeight: lineSpacing,
                    }}
                    onInput={() => {
                      updateMetrics();
                      scheduleHistorySnapshot();
                      if (showFindReplace && findText) updateMatchCount();
                    }}
                    onMouseUp={() => {
                      if (isPainterArmed) applyCopiedFormat();
                      else syncSelectionState();
                    }}
                    onKeyUp={syncSelectionState}
                    onKeyDown={handleEditorKeyDown}
                    onBlur={saveSelection}
                    onClick={handleEditorClick}
                  />
                ) : (
                  <textarea
                    className="doc-source-textarea"
                    value={sourceCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSourceCode(val);
                      const tmp = document.createElement("div");
                      tmp.innerHTML = val;
                      updateMetrics(tmp.innerText || tmp.textContent || "");
                    }}
                    placeholder="Type or edit HTML code here..."
                  />
                )}
              </div>

              {/* BOTTOM STATUS BAR */}
              <div className="editor-status-bar">
                <div className="status-left">
                  <span className="status-item">
                    <strong className="status-num">{metrics.words}</strong> words
                  </span>
                  <span className="status-dot">•</span>
                  <span className="status-item">
                    <strong className="status-num">{metrics.chars}</strong> chars
                  </span>
                  <span className="status-dot">•</span>
                  <span className="status-item">
                    <strong className="status-num">{metrics.lines}</strong> lines
                  </span>
                  <span className="status-dot">•</span>
                  <span className="status-item">
                    Est. read: <strong className="status-num">{metrics.readTime}</strong>
                  </span>
                </div>

                <div className="status-right">
                  {isPreviewMode && (
                    <button type="button" className="status-btn" onClick={() => setIsPreviewMode(false)}>
                      Exit Read Preview
                    </button>
                  )}

                  <button
                    type="button"
                    className="status-btn"
                    onClick={() => setPaperTheme(paperTheme === "dark" ? "light" : "dark")}
                    title="Toggle Paper Appearance (Dark / White sheet)"
                  >
                    <span>Paper: {paperTheme === "dark" ? "Dark Slate" : "Clean White"}</span>
                  </button>

                  <div className="zoom-controls">
                    <button type="button" onClick={() => setZoom(Math.max(70, zoom - 10))} title="Zoom Out">−</button>
                    <span>{zoom}%</span>
                    <button type="button" onClick={() => setZoom(Math.min(150, zoom + 10))} title="Zoom In">+</button>
                  </div>

                  <span className="privacy-badge" title="Files are processed locally in your browser. Zero uploads.">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>100% Private & Offline</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Confirmation Modal (New / Clear) */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Discard all document content?"
        body="Are you sure you want to start a new document? Any unsaved changes in the editor will be cleared."
        confirmText="Discard & New"
        cancelText="Cancel"
        onConfirm={() => {
          if (editorRef.current) {
            pushHistory(editorRef.current.innerHTML);
            editorRef.current.innerHTML = DEFAULT_HTML;
            pushHistory(DEFAULT_HTML);
          }
          setSourceCode(DEFAULT_HTML);
          setIsConfirmOpen(false);
          updateMetrics("");
          setToastMessage("Created new document");
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {/* Insert / Edit Link Modal */}
      {activeModal === "link" && (
        <div className="custom-modal-overlay" onClick={() => setActiveModal(null)}>
          <form className="custom-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submitLinkModal}>
            <h3 className="modal-title">{linkForm.hasExisting ? "Edit Hyperlink" : "Insert Hyperlink"}</h3>
            <div className="editor-modal-form">
              <div className="editor-modal-field">
                <label>URL Destination</label>
                <input
                  type="url"
                  required
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>
              <div className="editor-modal-field">
                <label>Display Text</label>
                <input
                  type="text"
                  value={linkForm.text}
                  onChange={(e) => setLinkForm({ ...linkForm, text: e.target.value })}
                  placeholder="Link text (optional)"
                />
              </div>
              <label className="fr-check">
                <input
                  type="checkbox"
                  checked={linkForm.newTab}
                  onChange={(e) => setLinkForm({ ...linkForm, newTab: e.target.checked })}
                />
                <span>Open link in a new tab</span>
              </label>
            </div>
            <div className="modal-actions-right">
              {linkForm.hasExisting && (
                <button type="button" className="btn-secondary-cancel danger-text" onClick={removeActiveLink}>
                  Unlink
                </button>
              )}
              <button type="button" className="btn-secondary-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary-close">Apply Link</button>
            </div>
          </form>
        </div>
      )}

      {/* Insert Image URL Modal */}
      {activeModal === "image" && (
        <div className="custom-modal-overlay" onClick={() => setActiveModal(null)}>
          <form className="custom-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submitImageUrlModal}>
            <h3 className="modal-title">Insert Image from URL</h3>
            <div className="editor-modal-form">
              <div className="editor-modal-field">
                <label>Image URL</label>
                <input
                  type="url"
                  required
                  value={imageForm.url}
                  onChange={(e) => setImageForm({ ...imageForm, url: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  autoFocus
                />
              </div>
              <div className="editor-modal-field">
                <label>Alt Description</label>
                <input
                  type="text"
                  value={imageForm.alt}
                  onChange={(e) => setImageForm({ ...imageForm, alt: e.target.value })}
                />
              </div>
              <div className="editor-modal-field">
                <label>Width</label>
                <select value={imageForm.width} onChange={(e) => setImageForm({ ...imageForm, width: e.target.value })}>
                  <option value="100%">Full Width (100%)</option>
                  <option value="75%">Large (75%)</option>
                  <option value="50%">Medium (50%)</option>
                  <option value="280px">Small (280px)</option>
                </select>
              </div>
            </div>
            <div className="modal-actions-right">
              <button type="button" className="btn-secondary-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary-close">Insert Image</button>
            </div>
          </form>
        </div>
      )}

      {/* Insert Media Modal */}
      {activeModal === "media" && (
        <div className="custom-modal-overlay" onClick={() => setActiveModal(null)}>
          <form className="custom-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submitMediaModal}>
            <h3 className="modal-title">Embed Video or Audio</h3>
            <div className="editor-modal-form">
              <div className="editor-modal-field">
                <label>YouTube, Vimeo, or Direct .mp4 / .mp3 URL</label>
                <input
                  type="url"
                  required
                  value={mediaForm.url}
                  onChange={(e) => setMediaForm({ url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-actions-right">
              <button type="button" className="btn-secondary-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary-close">Embed Media</button>
            </div>
          </form>
        </div>
      )}

      {/* Embed Custom HTML Modal */}
      {activeModal === "embed" && (
        <div className="custom-modal-overlay" onClick={() => setActiveModal(null)}>
          <form className="custom-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submitEmbedModal}>
            <h3 className="modal-title">Embed Raw HTML Snippet</h3>
            <div className="editor-modal-form">
              <div className="editor-modal-field">
                <label>HTML Markup</label>
                <textarea
                  rows={5}
                  value={embedForm.html}
                  onChange={(e) => setEmbedForm({ html: e.target.value })}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-actions-right">
              <button type="button" className="btn-secondary-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary-close">Insert HTML</button>
            </div>
          </form>
        </div>
      )}

      {/* Bookmark Modal */}
      {activeModal === "bookmark" && (
        <div className="custom-modal-overlay" onClick={() => setActiveModal(null)}>
          <form className="custom-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submitBookmarkModal}>
            <h3 className="modal-title">Insert Bookmark Anchor</h3>
            <div className="editor-modal-form">
              <div className="editor-modal-field">
                <label>Bookmark Name</label>
                <input
                  type="text"
                  required
                  value={bookmarkName}
                  onChange={(e) => setBookmarkName(e.target.value)}
                  placeholder="Section 1"
                  autoFocus
                />
              </div>
              {bookmarksList.length > 0 && (
                <div className="editor-modal-field">
                  <label>Jump to Existing Bookmark</label>
                  <div className="shortcuts-list" style={{ margin: 0 }}>
                    {bookmarksList.map((b) => (
                      <button key={b.id} type="button" className="fr-btn" style={{ textAlign: "left" }} onClick={() => jumpToBookmark(b.id)}>
                        📌 {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions-right">
              <button type="button" className="btn-secondary-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary-close">Insert Bookmark</button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Overview Modal */}
      {activeModal === "stats" && (
        <div className="custom-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Document Statistics</h3>
            <div className="stats-grid-modal">
              <div className="stat-card-box">
                <div className="stat-big-val">{metrics.words}</div>
                <div className="stat-label">Total Words</div>
              </div>
              <div className="stat-card-box">
                <div className="stat-big-val">{metrics.chars}</div>
                <div className="stat-label">Characters</div>
              </div>
              <div className="stat-card-box">
                <div className="stat-big-val">{metrics.lines}</div>
                <div className="stat-label">Lines</div>
              </div>
              <div className="stat-card-box">
                <div className="stat-big-val">{metrics.sentences}</div>
                <div className="stat-label">Sentences</div>
              </div>
              <div className="stat-card-box full-width">
                <div className="stat-big-val">{metrics.readTime}</div>
                <div className="stat-label">Estimated Reading Time (@ 200 wpm)</div>
              </div>
            </div>
            <div className="modal-actions-right">
              <button type="button" className="btn-primary-close" onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {activeModal === "shortcuts" && (
        <div className="custom-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Keyboard Shortcuts</h3>
            <div className="shortcuts-list">
              <div className="shortcut-row"><span>Bold / Italic / Underline</span><kbd>Ctrl+B / I / U</kbd></div>
              <div className="shortcut-row"><span>Undo / Redo</span><kbd>Ctrl+Z / Ctrl+Y</kbd></div>
              <div className="shortcut-row"><span>Find & Replace</span><kbd>Ctrl+F</kbd></div>
              <div className="shortcut-row"><span>Insert / Edit Link</span><kbd>Ctrl+K</kbd></div>
              <div className="shortcut-row"><span>Import / Open File</span><kbd>Ctrl+O</kbd></div>
              <div className="shortcut-row"><span>Save as Word (.doc)</span><kbd>Ctrl+S</kbd></div>
              <div className="shortcut-row"><span>Print / Save as PDF</span><kbd>Ctrl+P</kbd></div>
              <div className="shortcut-row"><span>Toggle Fullscreen</span><kbd>F11</kbd></div>
            </div>
            <div className="modal-actions-right">
              <button type="button" className="btn-primary-close" onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="ocr-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      <Script id="schema-text-editor" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "RawPDF Rich Document Editor & Case Converter",
          "description": "An offline, browser-based rich document editor with Word, PDF, and Case conversion capabilities. Formats text, tables, and images locally and privately.",
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
