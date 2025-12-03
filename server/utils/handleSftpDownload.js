export function handleSftpDownload({ ws, msg, sessions }) {
  const session = sessions.get(ws);
  const responseID = msg.id || null;
  if (!session || !session.client) {
    try {
      ws.send(JSON.stringify({ type: 'sftp-download-response', id: responseID, ok: false, error: 'no active SSH session' }));
    } catch (e) {}
    return;
  }

  const path = msg.path;
  if (!path) {
    ws.send(JSON.stringify({ type: 'sftp-download-response', id: responseID, ok: false, error: 'missing-path' }));
    return;
  }

  try {
    session.client.sftp((err, sftp) => {
      if (err) {
        ws.send(JSON.stringify({ type: 'sftp-download-response', id: responseID, ok: false, error: err.message }));
        return;
      }
      try {
        const readStream = sftp.createReadStream(path);
        const chunks = [];
        readStream.on('data', (chunk) => chunks.push(chunk));
        readStream.on('error', (e) => {
          ws.send(JSON.stringify({ type: 'sftp-download-response', id: responseID, ok: false, error: e.message }));
          try { sftp.end?.(); } catch {}
        });
        readStream.on('close', () => {
          const buf = Buffer.concat(chunks);
          const b64 = buf.toString('base64');
          ws.send(JSON.stringify({ type: 'sftp-download-response', id: responseID, ok: true, dataB64: b64 }));
          try { sftp.end?.(); } catch {}
        });
      } catch (e) {
        ws.send(JSON.stringify({ type: 'sftp-download-response', id: responseID, ok: false, error: (e?.message || String(e)) }));
        try { sftp.end?.(); } catch {}
      }
    });
  } catch (e) {
    ws.send(JSON.stringify({ type: 'sftp-download-response', id: responseID, ok: false, error: (e?.message || String(e)) }));
  }
}
