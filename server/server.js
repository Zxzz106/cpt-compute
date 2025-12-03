#!/usr/bin/env node
import WebSocket, { WebSocketServer } from 'ws';
import { createSSHSession } from './utils/sshSession.js';
import { handleStdin } from './utils/handleStdin.js';
import { handleResize } from './utils/handleResize.js';
import { handleExec } from './utils/handleExec.js';
import { handleSshLogin } from './utils/handleSshLogin.js';
import { handleSftpUpload } from './utils/handleSftpUpload.js';
import { handleSftpDownload } from './utils/handleSftpDownload.js';

const WS_PORT = process.env.WS_PORT ? Number(process.env.WS_PORT) : 33250;

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`WebSocket SSH login server listening on ws://0.0.0.0:${WS_PORT}`);

// Keep mapping ws -> session data
const sessions = new Map();

const messageHandlers = {
  'ssh-login': handleSshLogin,
  'stdin': handleStdin,
  'resize': handleResize,
  'fetch-exec': handleExec,
  'sftp-upload': handleSftpUpload,
  'sftp-download': handleSftpDownload,
};

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  console.log(`Active connections: ${wss.clients.size}`);
  console.log(`clientIP: ${ws._socket.remoteAddress}`);

  ws.on('message', async (raw, isBinary) => {
    if (isBinary) {
      // Binary data: treat as stdin
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
      return;
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'unknown-message-type' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    const session = sessions.get(ws);
    if (session) {
      if (session.client) session.client.end();
      // Clear input queue to avoid memory leaks
      if (session.inputQueue) session.inputQueue = [];
      sessions.delete(ws);
    }
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down server');
  wss.close(() => process.exit(0));
});
