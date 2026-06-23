export function loadScript(src) {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const exists = document.querySelector(`script[src="${src}"]`);
    if (exists) {
      if (exists.getAttribute("data-loaded") === "true") {
        resolve();
      } else {
        exists.addEventListener("load", () => resolve());
        exists.addEventListener("error", (e) => reject(e));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-loaded", "false");
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}
