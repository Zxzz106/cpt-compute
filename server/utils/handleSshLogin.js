import { createSSHSession } from './sshSession.js';

export function handleSshLogin({ ws, msg, sessions }) {
    const username = msg.username;
    const password = msg.password;
    const host = msg.host || '127.0.0.1';
    const port = msg.port || 22;
    if (!username || !password) {
    ws.send(JSON.stringify({ type: 'ssh-error', message: 'missing-credentials' }));
    return;
    }
    console.log(`Starting SSH session to ${username}@${host}:${port}`);
    createSSHSession({ ws, username, password, host, port, sessions });
    return;
}