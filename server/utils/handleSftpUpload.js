export function handleSftpUpload({ ws, msg, sessions }) {
  const session = sessions.get(ws);
  const responseID = msg.id || null;
  if (!session || !session.client) {
    try {
      ws.send(JSON.stringify({ type: 'sftp-upload-response', id: responseID, ok: false, error: 'no active SSH session' }));
    } catch (e) {}
    return;
  }

  const path = msg.path;
  const dataB64 = msg.dataB64;
  const mode = msg.mode || 0o644;
  if (!path || !dataB64) {
    ws.send(JSON.stringify({ type: 'sftp-upload-response', id: responseID, ok: false, error: 'missing-path-or-data' }));
    return;
  }

  try {
    session.client.sftp((err, sftp) => {
      if (err) {
        ws.send(JSON.stringify({ type: 'sftp-upload-response', id: responseID, ok: false, error: err.message }));
        return;
      }
      try {
        const buf = Buffer.from(dataB64, 'base64');
        const writeStream = sftp.createWriteStream(path, { flags: 'w', mode });
        writeStream.on('close', () => {
          ws.send(JSON.stringify({ type: 'sftp-upload-response', id: responseID, ok: true }));
          try { sftp.end?.(); } catch {}
        });
        writeStream.on('error', (e) => {
          ws.send(JSON.stringify({ type: 'sftp-upload-response', id: responseID, ok: false, error: e.message }));
          try { sftp.end?.(); } catch {}
        });
        writeStream.end(buf);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'sftp-upload-response', id: responseID, ok: false, error: (e?.message || String(e)) }));
        try { sftp.end?.(); } catch {}
      }
    });
  } catch (e) {
    ws.send(JSON.stringify({ type: 'sftp-upload-response', id: responseID, ok: false, error: (e?.message || String(e)) }));
  }
}
