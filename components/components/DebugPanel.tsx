"use client";

import React, { useEffect, useRef } from "react";
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { setTerminalWriter, removeTerminalWriter, callInputHandler } from '../utils/terminalBridge';

interface DebugPanelProps {
  open: boolean;
  onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ open, onClose }) => {
  const leftContainerRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  // const termRef2 = useRef<Terminal | null>(null);


  useEffect(() => {
    if (!open) return;
    if (!leftContainerRef.current || !rightContainerRef.current) return;

    // Create terminal (omit fixed rows/cols so xterm calculates geometry from container)
    const term = new Terminal({
      theme: { background: '#000', foreground: '#fff' },
      fontFamily: 'monospace',
      fontSize: 12,
      cursorBlink: true,
      scrollback: 1000,
    });
    termRef.current = term;
    term.open(leftContainerRef.current);
    term.focus();

    // Wire bridge
    setTerminalWriter((text: string) => {
      try { term.write(text); } catch (e) { /* noop */ }
    }, () => {
      try { term.clear(); } catch (e) {}
    });

    // forward user input to whoever registered the input handler
    term.onData((data) => {
      try { callInputHandler(data); } catch (e) {}
    });


    return () => {
      try { term.dispose(); } catch (e) {}
      termRef.current = null;
      // removeTerminalWriter();
    };
  }, [open]);

  return (
    <div
      className={`fixed left-0 bottom-0 w-full transition-all duration-300 z-[60] ${open ? 'h-94' : 'h-0'} bg-gray-900 text-white shadow-lg overflow-hidden debug-panel`}
      style={{ borderTop: open ? '2px solid #165DFF' : 'none' }}
    >
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-lg">调试控制台</span>
            <button
              className="bg-gray-700 hover:bg-gray-600 rounded px-2 py-1 text-sm"
              onClick={onClose}
            >关闭</button>
          </div>
            <div className="flex-1 overflow-y-auto rounded text-xs">
              <div className="h-full w-full grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-5">
                <div ref={leftContainerRef} className="min-h-[300px] bg-black" />
                <div id="debug-right-container" ref={rightContainerRef} className="min-h-[300px] bg-black px-2 py-1 overflow-y-auto" />
              </div>
            </div>
        </div>
    </div>
  );
};

export default DebugPanel;
