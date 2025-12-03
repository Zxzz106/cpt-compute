"use client";
import JumpHome from "@/components/utils/jumpHome";
import { MyDebug } from "@/components/utils/MyDebug";
import { isSSHConnected, fetchExec } from "@/components/utils/sshClient";
import { useEffect, useState } from "react";

export default function DashboardClient() {
  const [isRefreshing, setIsRefreshing] = useState(true); 

  useEffect(() => {
    if (isRefreshing) {
      Promise.all([
        new Promise(resolve => setTimeout(resolve, 1000)) // Ensure at least 1 second spinner
      ]).finally(() => setIsRefreshing(false));
    }
  }, [isRefreshing]);

  return (
    <>
      {!isSSHConnected() ? (
          <JumpHome />
        ) : (
        <main className="mx-auto px-4 lg:px-6 space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold">胺数据库</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center text-sm text-gray-500">
                <span className={`h-2 w-2 rounded-full mr-2 ${isRefreshing ? 'bg-primary animate-pulse' : 'bg-emerald-500'}`}></span>
              </span>
              <button className="btn-primary inline-flex items-center cursor-pointer" onClick={() => setIsRefreshing(true)} disabled={isRefreshing}>
                <i className={`fas fa-rotate-right mr-2 ${isRefreshing ? 'animate-spin' : ''}`}></i>
                刷新
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wide">胺数据库</h3>
            {isRefreshing && (
              <span className="inline-flex items-center text-xs text-primary">
                <i className="fas fa-circle-notch animate-spin mr-1"></i> 刷新中
              </span>
            )}

          </div>

          <section aria-busy={isRefreshing} className={`grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden min-h-0`}>

          </section>


        </main> 
        )}
      </>
  );
}