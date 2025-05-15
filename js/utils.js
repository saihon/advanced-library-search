/**
 * Escapes HTML special characters in a string.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) {
    return "";
  }
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getDefaultFavicon() {
  // Placeholder for a default favicon, e.g., a generic globe icon
  return "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>";
}

export function getFaviconUrl(pageUrl) {
  if (!pageUrl) return getDefaultFavicon();
  // Using Google's favicon service as an example.
  return `https://www.google.com/s2/favicons?domain=${
    new URL(pageUrl).hostname
  }&sz=16`;
  // return `chrome://favicon/size/16@1x/${pageUrl}`; // More reliable for browser extensions
}
