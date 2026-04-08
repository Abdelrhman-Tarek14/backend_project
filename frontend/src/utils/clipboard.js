/**
 * Robust copy to clipboard utility that works across different browser contexts,
 * including Document Picture-in-Picture (PiP) windows where focus might be restricted.
 */
export const copyToClipboard = async (text) => {
    // 1. Try Modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Silently fail and move to fallback
            // This often happens in PiP mode due to lack of document focus
        }
    }

    // 2. Fallback to Legacy execCommand('copy')
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Ensure the element is not visible and doesn't affect layout
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        textArea.style.opacity = "0";
        textArea.setAttribute("readonly", ""); // Prevent mobile keyboard from popping up

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        return successful;
    } catch (err) {
        console.error('Final clipboard fallback failed:', err);
        return false;
    }
};
