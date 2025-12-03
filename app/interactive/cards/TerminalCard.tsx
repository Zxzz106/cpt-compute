"use client";

import MyDebug from "@/components/utils/MyDebug";
import { useEffect, useRef } from "react";
import '@xterm/xterm/css/xterm.css';
import { getActiveConnection, isSSHConnected } from "@/components/utils/sshClient";


export default function TerminalCard({activeSession, sessionName}: {activeSession: string, sessionName?: string}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    let dataDisposable: { dispose: () => void } | null = null;
    let wsListener: ((ev: MessageEvent) => void) | null = null;

    const init = async () => {
      const el = containerRef.current;
      if (!el) return;
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit')
      ]);

      // Dispose existing terminal if re-initializing
      if (termRef.current) {
        try { termRef.current.dispose(); } catch {}
      }

      const term = new Terminal({
        fontSize: 14,
        fontFamily: 'monospace',
        cursorBlink: true,
        theme: { background: '#000000', foreground: '#00ff7f' }
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      termRef.current = term;
      fitRef.current = fit;
      term.open(el);

      const doFit = () => {
        // Avoid fitting when element has no size; renderer may be undefined otherwise
        if (!el) return;
        const { clientWidth, clientHeight } = el;
        if (clientWidth === 0 || clientHeight === 0) return;
        try {
          fit.fit();
          // Notify backend of terminal size
          const conn = getActiveConnection();
          if (conn && isSSHConnected()) {
            conn.sendJson({ type: 'resize', cols: term.cols, rows: term.rows });
          }
        } catch {}
      };

      // Fit after first paint to ensure renderer is ready
      requestAnimationFrame(doFit);

      // Observe container size changes
      try {
        resizeObserver = new ResizeObserver(() => requestAnimationFrame(doFit));
        resizeObserver.observe(el);
      } catch {
        // Fallback to window resize
        const onResize = () => requestAnimationFrame(doFit);
        window.addEventListener('resize', onResize);
      }

      term.writeln('\x1b[1;32mInteractive Session Terminal\x1b[0m');
      term.writeln(activeSession ? `Connected to session: ${activeSession}` : 'No session selected.');
      term.writeln('---------------------------------------------');
      term.write('> ');

      // Wire terminal input to active SSH connection
      dataDisposable = term.onData((data: string) => {
        try {
          const conn = getActiveConnection();
          if (conn && isSSHConnected()) {
            const enc = new TextEncoder();
            conn.sendBinary(enc.encode(data));
          }
        } catch {}
      });

      // Stream SSH output into this terminal
      try {
        const conn = getActiveConnection();
        if (conn && conn.ws) {
          wsListener = (ev: MessageEvent) => {
            try {
              if (typeof ev.data === 'string') {
                // JSON control messages are ignored here
                return;
              }
              if (ev.data instanceof ArrayBuffer) {
                const text = new TextDecoder('utf-8').decode(new Uint8Array(ev.data));
                term.write(text);
                return;
              }
              if (ev.data instanceof Blob) {
                ev.data.arrayBuffer().then((buf) => {
                  const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
                  term.write(text);
                }).catch(() => {});
              }
            } catch {}
          };
          conn.ws.addEventListener('message', wsListener);
        }
      } catch {}
    };

    init();
    MyDebug(`TerminalCard mounted with session: ${activeSession}`);

    return () => {
      try { dataDisposable?.dispose(); } catch {}
      try {
        const conn = getActiveConnection();
        if (conn && wsListener) conn.ws.removeEventListener('message', wsListener);
      } catch {}
      try { resizeObserver?.disconnect(); } catch {}
      try { termRef.current?.dispose(); } catch {}
      termRef.current = null;
      fitRef.current = null;
    };
  }, [activeSession, sessionName]);

  // Attach to tmux session when activeSession changes (non-empty)
  useEffect(() => {
    if (!activeSession && !sessionName) return;
    MyDebug(`Attaching to tmux session: ${activeSession} - ${sessionName}`);
    try {
      const conn = getActiveConnection();
      if (!conn || !isSSHConnected()) return;
      const enc = new TextEncoder();
      const command = sessionName ? `\ntmux attach -t ${sessionName}\n` : `\ntmux attach -t \\${activeSession}\n`;
      const cmd = command;
      conn.sendBinary(enc.encode(cmd));
    } catch {}
  }, [activeSession, sessionName]);

  return (
    <div className={`bg-white rounded-xl shadow p-6 flex flex-col flex-1 min-h-0 overflow-hidden`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <h4 className="font-semibold text-gray-800">交互终端</h4>
        <div>
          {activeSession || sessionName ? (
            <span className="text-sm text-gray-500">当前会话: {activeSession} - {sessionName}</span>
          ) : (
            <span className="text-sm text-gray-500">未选择会话</span>
          )}
        </div>
      </div>
      <div className="flex-1 rounded overflow-hidden">
        <div ref={containerRef} className={`w-full h-full ${activeSession || sessionName ? '' : 'opacity-50 pointer-events-none cursor-not-allowed'}`} />
      </div>
    </div>
  );
}