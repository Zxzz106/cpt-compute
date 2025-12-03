"use client";
import JumpHome from "@/components/utils/jumpHome";
import { MyDebug } from "@/components/utils/MyDebug";
import { isSSHConnected, fetchExec } from "@/components/utils/sshClient";
import { useEffect, useState } from "react";
import NewSession from "./cards/NewSession";
import ShowSessions from "./cards/showSessons";
import TerminalCard from "./cards/TerminalCard";

export default function DashboardClient() {
  const [isRefreshing, setIsRefreshing] = useState(true); 
  const [currentSession, setCurrentSession] = useState({id: '', name: ''});

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
              <h2 className="text-2xl font-bold">交互式任务</h2>
            </div>
            <div className="flex items-center gap-3">
              
            </div>
          </div>

          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wide">交互式任务</h3>
            {isRefreshing && (
              <span className="inline-flex items-center text-xs text-primary">
                <i className="fas fa-circle-notch animate-spin mr-1"></i> 刷新中
              </span>
            )}

          </div>

          <section aria-busy={isRefreshing} className={`grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-0`}>
            <div className="col-span-1 flex flex-col gap-4">

            {/* 创建新会话 */}
            <NewSession onCreate={setCurrentSession} />
            {/* 正在运行的会话 */}
            <ShowSessions onAttach={setCurrentSession} activeSession={currentSession.id} sessionName={currentSession.name}/>
            </div>

            <div className="col-span-2 flex flex-col gap-4">
            {/* 终端 */}
            <TerminalCard activeSession={currentSession.id} sessionName={currentSession.name}/>
            </div>


          </section>


        </main> 
        )}
      </>
  );
}