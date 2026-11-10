import { useEffect, useRef, useState } from "react";

function applyThemeClasses(theme) {
  const isLight = theme === "light";
  document.documentElement.classList.toggle("theme-light", isLight);
  document.body.classList.toggle("theme-light", isLight);
}

export function useAppTheme(onThemeChange) {
  const [theme, setTheme] = useState("dark");
  const onThemeChangeRef = useRef(onThemeChange);

  useEffect(() => {
    onThemeChangeRef.current = onThemeChange;
  }, [onThemeChange]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("mergeStudioTheme") || "dark";
    applyThemeClasses(savedTheme);
    const raf = requestAnimationFrame(() => {
      setTheme(savedTheme);
      onThemeChangeRef.current?.(savedTheme);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("mergeStudioTheme", nextTheme);
    applyThemeClasses(nextTheme);
    onThemeChangeRef.current?.(nextTheme);
  };

  return { theme, toggleTheme };
}

