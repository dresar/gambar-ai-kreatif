/**
 * Salin teks ke clipboard — kompatibel HTTP non-localhost & browser lama.
 * Clipboard API sering gagal di HTTP; fallback textarea + execCommand.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const s = String(text ?? "");
  if (!s) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(s);
      return true;
    } catch {
      /* lanjut fallback */
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = s;
    ta.setAttribute("readonly", "true");
    ta.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;padding:0;border:none;outline:none;opacity:0;";
    document.body.appendChild(ta);
    ta.focus({ preventScroll: true });
    if (ta.setSelectionRange) ta.setSelectionRange(0, s.length);
    else ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return true;
  } catch {
    /* */
  }
  return false;
}
