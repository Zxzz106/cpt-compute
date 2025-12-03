export function handleExec({ ws, msg, sessions }) {
  const session = sessions.get(ws);
  const responseID= msg.id || null;
  if (session && session.client) {
    try {
      if (session.execStream) {
        try {
          session.execStream.destroy();
        } catch (e) {
          console.log('Error destroying previous exec stream:', e);
        }
        session.execStream = null;
      }
      session.client.exec(
        msg.data, {
          highWaterMark: 64 * 1024,
        }, 
        (err, stream) => {
        if (err) {
          ws.send(JSON.stringify({ type: 'exec-response', id: responseID, stdout: '', stderr:err.message, code:1 }));
          session.execStream = null;
          return;
        }
        let stdoutBuffer = '';
        let stderrBuffer = '';
        stream.on('close', (code, signal) => {
          ws.send(JSON.stringify({ type: 'exec-response', id: responseID, stdout: stdoutBuffer, stderr: stderrBuffer, code: code, signal: signal }));
          session.execStream = null;
        }).on('data', (data) => {
          stdoutBuffer += data.toString('utf-8');
        }).stderr.on('data', (data) => {
          stderrBuffer += data.toString('utf-8');
        });
        session.execStream = stream;
        // console.log(`Started exec command: \"${msg.data}\" for ID: ${responseID}`);
      });
    } catch (err) {
      ws.send(JSON.stringify({ type: 'exec-response', id: responseID, stdout: '', stderr: err.message, code: 1 }));
      session.execStream = null;
    }
  } else {
    ws.send(JSON.stringify({ type: 'exec-response', id: responseID, stdout: '', stderr: 'no active SSH session', code: 1 }));
  }
}
