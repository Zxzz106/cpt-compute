import { matchesGlob } from 'path';
import MyDebug from './MyDebug';
import { v4 as uuidv4 } from 'uuid';

export type SSHCallbacks = {
  onReady?: (message?: any) => void;
  onStdout?: (text: string) => void;
  onError?: (err: any) => void;
  onClose?: (info?: any) => void;
  onOpen?: () => void;
  onFunction?: (data: string) => void;
};

// Broadcast stdout to interested listeners (e.g., TailView subscribers)
const stdoutListeners = new Set<(text: string) => void>();
export function addStdoutListener(fn: (text: string) => void) {
  stdoutListeners.add(fn);
}
export function removeStdoutListener(fn: (text: string) => void) {
  stdoutListeners.delete(fn);
}

const pendingRequests= new Map<string, {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}>();

// Concurrency control for fetchExec
const MAX_PARALLEL_EXEC = 2;
let activeExecCount = 0;
const execQueue: Array<{
  command: string;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeoutMs?: number;
}> = [];

function runNextExecs() {
  while (activeExecCount < MAX_PARALLEL_EXEC && execQueue.length > 0 && isSSHConnected() && activeConn) {
    const item = execQueue.shift();
    if (!item) break;
    dispatchExec(item.command, item.resolve, item.reject, item.timeoutMs);
  }
}

function dispatchExec(command: string, resolve: (value: any) => void, reject: (reason?: any) => void, timeoutMs = 5000) {
  if (!isSSHConnected() || !activeConn) {
    reject('SSH connection not established');
    return;
  }
  activeExecCount++;
  const requestID = uuidv4();
  pendingRequests.set(requestID, { resolve, reject });
  activeConn?.sendJson({ type: 'fetch-exec', data: command, id: requestID });
  const timeoutID = setTimeout(() => {
    const req = pendingRequests.get(requestID);
    if (req) {
      pendingRequests.delete(requestID);
      activeExecCount = Math.max(0, activeExecCount - 1);
      reject(new Error('Timeout waiting for command response'));
      runNextExecs();
    }
  }, timeoutMs);
  const req = pendingRequests.get(requestID);
  if (req) {
    (req as any).timeoutID = timeoutID;
  }
}

// Singleton connection manager so the SSH session persists until explicit logout
let activeConn: ReturnType<typeof createRawConnection> | null = null;

const STORAGE_KEY = 'sshLoginPayload';

function persistLoginPayload(payload: { username: string; password?: string; host?: string; port?: number }) {
  // try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) {}
}

function getPersistedLoginPayload(): { username: string; password?: string; host?: string; port?: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function clearPersistedLogin() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

function createRawConnection(url: string, payload: any, callbacks: SSHCallbacks) {
  const ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    try {
      ws.send(JSON.stringify(payload));
    } catch (e) {
      callbacks.onError?.(e);
    }
    callbacks.onOpen?.();
  };

  ws.onmessage = (ev: MessageEvent) => {
    try {
      if (typeof ev.data === 'string') {
        let msg = JSON.parse(ev.data);
        if ((msg.type === 'exec-response' || msg.type === 'sftp-upload-response' || msg.type === 'sftp-download-response') && msg.id) {
          const request= pendingRequests.get(msg.id);
          if (request) {
            clearTimeout((request as any).timeoutID);
            if (msg.type === 'exec-response') {
              if (msg.code) {
                if (msg.code === 141) {
                  request.resolve(msg.stdout || '');
                } else {
                  MyDebug(`Error code ${msg.code} stdout:(${msg.stdout}); stderr:(${String(msg.stderr)}); signal:(${String(msg.signal)})`);
                  request.reject(new Error(msg.stderr));
                }
              } else {
                request.resolve(msg.stdout);
              }
            } else if (msg.type === 'sftp-upload-response') {
              if (msg.ok) {
                request.resolve(true);
              } else {
                request.reject(new Error(msg.error || 'sftp-upload-failed'));
              }
            } else if (msg.type === 'sftp-download-response') {
              if (msg.ok) {
                request.resolve(msg.dataB64 || '');
              } else {
                request.reject(new Error(msg.error || 'sftp-download-failed'));
              }
            }
            pendingRequests.delete(msg.id);
            // Update concurrency counters and process queued commands
            activeExecCount = Math.max(0, activeExecCount - 1);
            runNextExecs();
          } else {
            MyDebug(`No pending request found for response with requestID ${msg.id}`);
          }
          return;
        }

        if (msg.type === 'ssh-ready') {
          callbacks.onReady?.(msg);
          MyDebug(`SSH ready: ${JSON.stringify(msg)}`);
        } else if (msg.type === 'ssh-error') {
          callbacks.onError?.(msg);
          MyDebug(`SSH error: ${JSON.stringify(msg)}`);
        } else if (msg.type === 'ssh-closed') {
          MyDebug(`SSH closed: ${JSON.stringify(msg)}`);
          callbacks.onClose?.(msg);
        } else {
          MyDebug(`SSH message: ${JSON.stringify(msg)}`);
          callbacks.onStdout?.(JSON.stringify(msg));
        }
        return;
      }

      if (ev.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(ev.data);
        const text = new TextDecoder('utf-8').decode(bytes);
        callbacks.onStdout?.(text);
        try { stdoutListeners.forEach(l => l(text)); } catch {}
        return;
      }

      if (ev.data instanceof Blob) {
        ev.data.arrayBuffer().then(buffer => {
          const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
          callbacks.onStdout?.(text);
          try { stdoutListeners.forEach(l => l(text)); } catch {}
        }).catch(err => callbacks.onError?.(err));
        return;
      }

      const text = String(ev.data);
      callbacks.onStdout?.(text);
      try { stdoutListeners.forEach(l => l(text)); } catch {}
    } catch (err) {
      callbacks.onError?.(err);
    }
  };

  ws.onclose = (ev) => {
    callbacks.onClose?.({ code: ev.code, reason: ev.reason });
  };

  ws.onerror = (err) => {
    callbacks.onError?.(err);
  };

  return {
    ws,
    username: payload.username || '',
    hostname: payload.host || '',
    sendBinary(data: Uint8Array | ArrayBuffer) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data as any);
      }
    },
    sendJson(obj: any) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(obj));
      }
    },
    close() {
      try { ws.close(); } catch (e) {}
    }
  };
}

export function connectSSH(url: string, payload: any, callbacks: SSHCallbacks) {
  if (activeConn) return activeConn;
  activeConn = createRawConnection(url, payload, callbacks);
  // try { persistLoginPayload({ username: payload.username, password: payload.password, host: payload.host, port: payload.port }); } catch (e) {}
  return activeConn;
}

export function disconnectSSH() {
  try {
    activeConn?.close();
  } catch (e) {}
  activeConn = null;
}

export function getActiveConnection() {
  return activeConn;
}

export function isSSHConnected() {
  return !!(activeConn && activeConn.ws && activeConn.ws.readyState === WebSocket.OPEN);
}

export function fetchExec(command0: string, timeoutMs = 5000) {
  return new Promise<string>((resolve, reject) => {
    if (!isSSHConnected() || !activeConn) {
      MyDebug('fetchExec called but SSH connection not established');
      reject('SSH connection not established');
      return;
    }
    const command= " " + command0.trim();
    if (activeExecCount < MAX_PARALLEL_EXEC) {
      dispatchExec(" " + command, resolve, reject, timeoutMs);
    } else {
      execQueue.push({ command: " " + command, resolve, reject, timeoutMs });
      // MyDebug(`Command queued. Queue length: ${execQueue.length}`);
    }
  });
}

// Streamed exec via interactive shell (supports commands like `tail -f`).
// Returns a simple controller with `stop()` to send Ctrl-C and `send()`
// to write arbitrary input to the running command.
export function fetchStreamExec(command: string) {
  if (!isSSHConnected() || !activeConn) {
    throw new Error('SSH connection not established');
  }

  const enc = new TextEncoder();
  // Write the command followed by newline into the interactive shell.
  activeConn.sendBinary(enc.encode(`${command}\n`));

  return {
    // Send Ctrl-C (ETX, 0x03) to terminate long-running commands like tail -f
    stop() {
      try {
        activeConn?.sendBinary(Uint8Array.from([0x03]));
      } catch (e) {
        // noop
      }
    },
    // Send additional input to the running command
    send(data: string | Uint8Array) {
      try {
        const payload = typeof data === 'string' ? enc.encode(data) : data;
        activeConn?.sendBinary(payload);
      } catch (e) {
        // noop
      }
    }
  };
}

// SFTP request helper using the same pendingRequests mechanism
function dispatchJsonWithId(payload: any, resolve: (value: any) => void, reject: (reason?: any) => void, timeoutMs = 60000) {
  if (!isSSHConnected() || !activeConn) {
    reject('SSH connection not established');
    return;
  }
  const requestID = uuidv4();
  payload.id = requestID;
  pendingRequests.set(requestID, { resolve, reject } as any);
  // Do not use exec concurrency counters for SFTP; just send
  activeConn?.sendJson(payload);
  const timeoutID = setTimeout(() => {
    const req = pendingRequests.get(requestID) as any;
    if (req) {
      pendingRequests.delete(requestID);
      reject(new Error('Timeout waiting for SFTP response'));
    }
  }, timeoutMs);
  const req = pendingRequests.get(requestID) as any;
  if (req) req.timeoutID = timeoutID;
}

export function sftpUpload(path: string, dataB64: string, mode?: number, timeoutMs = 60000) {
  return new Promise<boolean>((resolve, reject) => {
    dispatchJsonWithId({ type: 'sftp-upload', path, dataB64, mode }, resolve, reject, timeoutMs);
  });
}

export function sftpDownload(path: string, timeoutMs = 60000) {
  return new Promise<string>((resolve, reject) => {
    dispatchJsonWithId({ type: 'sftp-download', path }, resolve, reject, timeoutMs);
  });
}

// // Attempt auto reconnect on module load (client side only)
// if (typeof window !== 'undefined' && !activeConn) {
//   const persisted = getPersistedLoginPayload();
//   if (persisted && persisted.username && persisted.password) {
//     try {
//       const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
//       const wsHost = window.location.hostname;
//       const wsPort = 33250;
//       const url = `${wsProtocol}://${wsHost}:${wsPort}`;
//       connectSSH(url, { type: 'ssh-login', username: persisted.username, password: persisted.password, host: persisted.host || '127.0.0.1', port: persisted.port || 22 }, {
//         onReady: () => { MyDebug('Auto reconnect SSH ready'); },
//         onError: (err) => { MyDebug('Auto reconnect SSH error ' + (err?.message || String(err))); },
//         onClose: () => { MyDebug('Auto reconnect SSH closed'); }
//       });
//     } catch (e) {
//       MyDebug('Auto reconnect failed: ' + (e as any)?.message || String(e));
//     }
//   }
// }

export { persistLoginPayload as persistLogin };