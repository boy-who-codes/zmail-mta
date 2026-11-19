/**
 * Universal clipboard copy utility with fallback for non-secure contexts (HTTP IP access).
 * In modern browsers, navigator.clipboard is only exposed in secure contexts (HTTPS or localhost).
 * On HTTP IP access, this transparently uses document.execCommand('copy') via a temporary textarea.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern async Clipboard API if in a secure context
  if (typeof window !== "undefined" && window.isSecureContext && navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // 2. Synchronous execCommand fallback for non-secure contexts (HTTP IP access)
  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      // Prevent scrolling or zooming in mobile browsers
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.width = "2em";
      textarea.style.height = "2em";
      textarea.style.padding = "0";
      textarea.style.border = "none";
      textarea.style.outline = "none";
      textarea.style.boxShadow = "none";
      textarea.style.background = "transparent";
      textarea.setAttribute("readonly", "");
      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (successful) return true;
    } catch (err) {
      console.error("execCommand fallback copy failed:", err);
    }
  }

  return false;
}

export const copyToClipboardSafe = copyToClipboard;
