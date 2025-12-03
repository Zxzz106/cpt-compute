"use client";
import Image from "next/image";
import { isSSHConnected } from '@/components/utils/sshClient';
import { useLoginModal } from '@/components/context/LoginModalContext';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MyAlert from "@/components/utils/MyAlert";

export default function HomeClient() {
  const router = useRouter();
  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;
    let jumpTimeout: NodeJS.Timeout | null = null;
    const checkSSHAndRedirect = () => {
      if (jumpTimeout) return;
      if (isSSHConnected()) {
        MyAlert("已连接到服务器，正在跳转...", 1500);
        jumpTimeout = setTimeout(() => {
          if (isSSHConnected()) {
            try {
              router.push('/dashboard');
            } catch (err) {
              MyAlert("跳转失败: " + (err as Error).message, 3000);
            } finally {
              if (checkInterval) clearInterval(checkInterval);
              if (jumpTimeout) clearTimeout(jumpTimeout);
            }
          } else {
            jumpTimeout = null;
            MyAlert("跳转失败，连接已断开，请重新登录", 1500);
          }
        }, 1500);
      }
    };
    checkSSHAndRedirect();
    checkInterval = setInterval(checkSSHAndRedirect, 10000);
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      checkInterval = null;
      if (jumpTimeout) clearTimeout(jumpTimeout);
      jumpTimeout = null;
    }
  }, [router]);
  const { openLogin } = useLoginModal();
  return (
    <div className="items-center justify-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Welcome to CPT-Compute Web Application!
          </h1>
        </div>

        { !isSSHConnected() && (
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Please Login</h1>
                <p className="mb-6">An active SSH session is required to use this page. Please login to continue.</p>
                <button className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => { openLogin(); }}>
                  <i className="fas fa-sign-in mr-2 animate-pulse"></i>Open Login
                </button>
              </div>
            </div>
        ) }
        <div className="fixed bottom-4 right-4 opacity-50 hover:opacity-100 transition-opacity">
          <Image src="/public/CPT-logo.png" alt="CPT-Compute Logo" width={64} height={64} />
        </div>
    </div>


      

  );
}
