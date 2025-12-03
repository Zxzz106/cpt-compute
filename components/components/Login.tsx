"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { writeTerminal, writelnTerminal, clearTerminal, setTerminalInputHandler } from '../utils/terminalBridge';
import { connectSSH, getActiveConnection, isSSHConnected } from '../utils/sshClient';
import MyAlert from '../utils/MyAlert';
// import UserState from "../utils/useServer";
import MyDebug from "../utils/MyDebug";

export default function LoginWindow({ show, onClose }: { show: boolean, onClose: () => void }) {
  const router = useRouter();
  const [formUser, setFormUser] = useState('');
  const [formPass, setFormPass] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [wsConnecting, setWsConnecting] = useState(false);
  const wsRef = useRef<any | null>(null);
  const alertedRef = useRef(false);

  // Call hook at top-level of component (valid hook usage)
  // const { name: serverName, hostname: serverHost } = UserState({ onUsernameChange: () => {}, onHostnameChange: () => {} });


  useEffect(() => {
    if (!show) {
      // Do NOT close the SSH connection when closing the login modal.
      // Keep session active until explicit logout.
      setWsConnected(Boolean(isSSHConnected()));
      clearTerminal();
      setFormPass('');
    }
  }, [show]);

  // Close modal on Escape key when shown
  useEffect(() => {
    if (!show) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try { onClose(); } catch (e) {}
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [show, onClose]);


  // terminal rendering now lives in DebugPanel; input is forwarded via terminalBridge

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 transition-opacity duration-300 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-lg p-8 min-w-[320px] relative transform transition-all duration-300 scale-95 opacity-0 animate-modalIn">
        <button className="absolute top-1 right-2 text-gray-500 hover:text-gray-700 text-3xl" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Login {/*serverHostname*/}</h2>
        {!wsConnected ? (
          <form
            onSubmit={(e) => {
                e.preventDefault();
                try {
                  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
                  const wsHost = window.location.hostname;
                  const wsPort = 33250;
                  const url = `${wsProtocol}://${wsHost}:${wsPort}`;

                  const payload = {
                    type: 'ssh-login',
                    username: formUser,
                    password: formPass,
                    host: '127.0.0.1',
                    port: 31607,
                  };

                  const conn = connectSSH(url, payload, {
                    onOpen: () => {
                      setWsConnecting(true);
                    },
                    onReady: () => {
                      setWsConnected(true);
                      setWsConnecting(false);
                      MyAlert('Login successful');
                      MyDebug(`SSH connection established, username:${payload.username}, host:${payload.host}:${payload.port}`);
                      try { router.push('/dashboard'); } catch (e) {}
                      try { onClose(); } catch (e) {}
                    },
                    onStdout: (text) => {
                      writeTerminal(text);
                    },
                    onError: (err) => {
                      setWsConnecting(false);
                      // writelnTerminal(`Error: ${err.message || String(err)}`);
                      MyDebug(`SSH Error: ${err.message || String(err)}`);
                      alert(`⚠️  ${err.message || String(err)}`);
                    },
                    onClose: () => {
                      setWsConnecting(false);
                      setWsConnected(false);
                      // `useServer` hook is already called at component top-level
                      // writelnTerminal('SSH closed');
                      MyDebug('SSH connection closed');
                    },
                    onFunction: (data) => {
                    }
                  });

                  // Keep a reference to the connection manager for optional local use
                  wsRef.current = conn;

                  // Forward terminal user input to the SSH connection
                  setTerminalInputHandler((data: string) => {
                    try {
                      const encoder = new TextEncoder();
                      const binary = encoder.encode(data);
                      // Use active connection's sendBinary
                      conn.sendBinary(binary);
                    } catch (e) {
                      // ignore
                    }
                  });
                } catch (err) {
                  writelnTerminal(`Connect failed: ${String(err)}`);
                  setWsConnected(Boolean(isSSHConnected()));
                }
              }}
          >
            <input
              type="text"
              placeholder="用户名"
              className="w-full mb-2 p-2 border rounded"
              value={formUser}
              onChange={(e) => setFormUser(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="密码"
              className="w-full mb-4 p-2 border rounded"
              value={formPass}
              onChange={(e) => setFormPass(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
              <span className="animate-spin" style={{ display: wsConnecting ? 'inline-block' : 'none' , marginRight: '0.5rem' }}><i className="fas fa-spinner"></i></span>
              Connect
            </button>
          </form>
        ) : 
          <div>Login successful</div>
        }
      </div>
    </div>
  );
}
