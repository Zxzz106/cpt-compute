"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { disconnectSSH, isSSHConnected, clearPersistedLogin } from '../utils/sshClient';
import { clearTerminal, setTerminalInputHandler } from '../utils/terminalBridge';
import MyAlert from '../utils/MyAlert';
import { useLoginModal } from '../context/LoginModalContext';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseUser } from "../utils/parseExec";
import { User } from "lucide-react";
import JumpHome from "../utils/jumpHome";

export default function Header() {
  const { showLogin, openLogin, closeLogin } = useLoginModal();
  const [isConnected, setIsConnected] = useState<boolean>(isSSHConnected());
  const router = useRouter();
  const [user, setUser] = useState<{ name: string | null; hostname: string | null }> ({ name: null, hostname: null });

  // Keep local connection state in sync with the singleton SSH client.
  React.useEffect(() => {
    // initial
    setIsConnected(isSSHConnected());
    const t = setInterval(() => {
      const val = isSSHConnected();
      setIsConnected(prev => (prev === val ? prev : val));
    }, 1000);
    return () => clearInterval(t);
  }, []);


  React.useEffect(() => {
    const fetchUser = async () => {
      if (!isConnected) {
        setUser({ name: null, hostname: null });
        return;
      }
      const UserOutput=await parseUser();
      setUser(UserOutput ? JSON.parse(UserOutput) : { name: null, hostname: null });
    }
    const intervalId = setInterval(fetchUser, 30000); // Refresh every 30 seconds
    fetchUser();
    return () => clearInterval(intervalId);
  }, [isConnected]);

  // Dynamically import LoginWindow to avoid SSR issues with xterm.js
  const LoginWindow = dynamic(() => import('./Login'), { ssr: false });


  return (
    <>
      {!isConnected ? <JumpHome /> : null}
      <header className="topnav bg-white shadow-sm h-16 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="mr-4">
          <h1 className="text-2xl font-extrabold text-primary" style={{ color: '#165DFF' }}>
            {user.hostname ? user.hostname : 'CPT-Compute'}
          </h1>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center px-5 relative group p-2 rounded hover:bg-gray-100 cursor-pointer">
            <span className="font-medium cursor-pointer justify-center">{user.name ? user.name : 'Guest'}</span>
              <div className="absolute right-0 top-full w-40 bg-white border rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-100">
              <ul className="py-2">
                <li>
                {!isConnected && (
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={openLogin}>Login</button>
                )}
                </li>
                 {/* <li>
                 <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => {}}>Change Password</button>
                 </li> */}
                <li>
                {isConnected && (
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => {
                  try {
                    clearPersistedLogin();
                    disconnectSSH();
                    clearTerminal();
                    setTerminalInputHandler(null);
                    closeLogin();
                    MyAlert('Logged out');
                    // try { window.location.reload(); } catch (e) { /* ignore */ }
                    router.push('/');
                  } catch (e) {
                    // ignore
                  }
                }}>Logout</button>
                )}
                </li>
              </ul>
              </div>
          </div>
        </div>
      </header>
      {/* Login Modal Overlay */}
      {showLogin && (
        <LoginWindow show={showLogin} onClose={() => closeLogin()} />
      )}
    <style jsx global>{`
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .animate-fadeIn {
        animation: fadeIn 0.3s ease;
      }
      @keyframes modalIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .animate-modalIn {
        animation: modalIn 0.3s cubic-bezier(0.4,0,0.2,1);
        opacity: 1 !important;
        transform: scale(1) !important;
      }
    `}</style>
    </>
  );
}
