/**
 * Send a debug message to the DebugPanel right container as plain text.
 * Safe to call even if the debug panel is not open — falls back to console.
 *
 * @param message - The string (or value) to send to the debug area
 */
export function MyDebug(message: unknown) {
  try {
    const text = String(message ?? '');
    const prefix = `[${new Date().toISOString()}] `;

    // Only run DOM operations in the browser
    if (typeof window !== 'undefined') {
      const container = document.getElementById('debug-right-container');
      if (container) {
        const line = document.createElement('div');
        line.textContent = prefix + text;
        line.style.whiteSpace = 'pre-wrap';
        line.style.fontFamily = 'monospace';
        line.style.fontSize = '12px';
        line.style.padding = '2px 4px';
        container.appendChild(line);
        // keep newest message visible
        container.scrollTop = container.scrollHeight;
        return;
      }
    }

    // Fallback to console when container isn't available (server or not mounted)
    // eslint-disable-next-line no-console
    console.debug(prefix + text);
  } catch (e) {
    // noop
  }
}

export default MyDebug;
