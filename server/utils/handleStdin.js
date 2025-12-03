export function handleStdin({ ws, msg, sessions }) {
  const session = sessions.get(ws);
  if (session && session.client) {
    if (session.shellStream) {
      try {
        // msg.data is now a Buffer (binary data from WebSocket)
        session.shellStream.write(msg.data);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'ssh-error', message: 'write-failed', detail: err.message }));
      }
    } else {
      if (!session.inputQueue) {
        session.inputQueue = [];
      }
      session.inputQueue.push(msg.data);
      ws.send(JSON.stringify({ type: 'ssh-info', message: 'input-queued' }));
    }
  } else {
    ws.send(JSON.stringify({ type: 'ssh-error', message: 'no-session' }));
  }
}
