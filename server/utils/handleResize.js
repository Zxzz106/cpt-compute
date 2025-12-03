export function handleResize({ ws, msg, sessions }) {
  const session = sessions.get(ws);
  if (session && session.shellStream && session.shellStream.setWindow) {
    const cols = msg.cols || 80;
    const rows = msg.rows || 24;
    session.shellStream.setWindow(rows, cols, 0, 0);
    console.log(`Resized terminal to ${cols} cols and ${rows} rows`);
  }
}
