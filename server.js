#!/usr/bin/env node
import http from 'http';
import url from 'url';
import next from 'next';
import WebSocket, { WebSocketServer } from 'ws';
import { createSSHSession } from './server/utils/sshSession.js';
import { handleStdin } from './server/utils/handleStdin.js';
import { handleResize } from './server/utils/handleResize.js';
import { handleExec } from './server/utils/handleExec.js';
import { handleSshLogin } from './server/utils/handleSshLogin.js';
import { handleSftpUpload } from './server/utils/handleSftpUpload.js';
import { handleSftpDownload } from './server/utils/handleSftpDownload.js';

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT ? Number(process.env.PORT) : 31801;
const WS_PATH = process.env.WS_PATH || '/ws';

// Create Next.js app and request handler
const app = next({ dev });
const handle = app.getRequestHandler();

// Sessions map for ws -> session data
const sessions = new Map();

const messageHandlers = {
  'ssh-login': handleSshLogin,
  'stdin': handleStdin,
  'resize': handleResize,
  'fetch-exec': handleExec,
  'sftp-upload': handleSftpUpload,
  'sftp-download': handleSftpDownload,
};

// Use noServer so we can attach the WebSocket to the same HTTP server
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  console.log(`Active connections: ${wss.clients.size}`);

  ws.on('message', async (raw, isBinary) => {
    if (isBinary) {
      handleStdin({ ws, msg: { data: raw }, sessions });
      return;
    }
    let msg;
    try {
      msg = JSON.parse(raw.toString());
      console.log('Received message:', msg);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'invalid-json' }));
      return;
    }

    const handler = messageHandlers[msg.type];
    if (handler) {
      try {
        await handler({ ws, msg, sessions });
      } catch (err) {
        console.error(`Error handling message of type ${msg.type}:`, err);
        ws.send(JSON.stringify({ type: 'error', message: 'internal-server-error' }));
      }
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'unknown-message-type' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    const session = sessions.get(ws);
    if (session) {
      if (session.client) session.client.end();
      if (session.inputQueue) session.inputQueue = [];
      sessions.delete(ws);
    }
  });
});

// Prepare Next and start HTTP server
app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    // Let Next.js handle all HTTP requests
    handle(req, res);
  });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = url.parse(request.url);
    if (pathname === WS_PATH) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(PORT, () => {
    console.log(`HTTP server (Next.js) listening on http://0.0.0.0:${PORT}`);
    console.log(`WebSocket server path mounted at ws://0.0.0.0:${PORT}${WS_PATH}`);
  });
}).catch((err) => {
  console.error('Failed to start Next.js app:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Shutting down server');
  try {
    wss.close();
  } finally {
    process.exit(0);
  }
});
