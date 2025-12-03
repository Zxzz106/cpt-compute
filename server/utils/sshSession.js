import { Client as SSHClient } from 'ssh2';

export function createSSHSession({ ws, username, password, host, port, sessions }) {
  const client = new SSHClient();
  let shellStream = null;

  client.on('ready', () => {
    ws.send(JSON.stringify({ type: 'ssh-ready', message: 'connected' }));
    client.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        ws.send(JSON.stringify({ type: 'ssh-error', message: 'shell-failed', detail: err.message }));
        client.end();
        return;
      }
      shellStream = stream;
      // Add stream event listeners
      stream.on('data', (data) => {
        // Send terminal output as binary WebSocket message
        ws.send(data, { binary: true });
      });
      stream.on('close', () => {
        ws.send(JSON.stringify({ type: 'ssh-closed', message: 'remote-shell-closed' }));
        client.end();
      });
      // Update session object and process queued input
      const session = sessions.get(ws);
      if (session) {
        session.shellStream = shellStream;
        if (session.inputQueue && session.inputQueue.length > 0) {
          session.inputQueue.forEach((data) => {
            try {
              shellStream.write(data);
            } catch (err) {
              console.error('Error processing queued input:', err);
            }
          });
          session.inputQueue = [];
        }
        sessions.set(ws, session);
      }
    });
  });

  client.on('error', (err) => {
    try {
      ws.send(JSON.stringify({ type: 'ssh-error', message: err.message || String(err) }));
    } catch (e) {}
    client.end();
  });

  client.on('close', () => {
    try { ws.send(JSON.stringify({ type: 'ssh-closed', message: 'connection-closed' })); } catch (e) {}
  });

  client.connect({ host, port, username, password, readyTimeout: 20000 });
  sessions.set(ws, { client, shellStream });
}
