"use client";
import JumpHome from "@/components/utils/jumpHome";
import { isSSHConnected } from "@/components/utils/sshClient";
import { useEffect, useState } from "react";
import TemplateCard from "./cards/TemplateCard";
import type { EnvVar } from "./cards/TemplateCard";
import MyDebug from "@/components/utils/MyDebug";
import EditJob from "./cards/EditJob";
import MyAlert from "@/components/utils/MyAlert";
import type { JobParams } from "./cards/EditJob";


export default function SubmitClient() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [env,setEnv] = useState<EnvVar[]>([]);
  const [script,setScript] = useState<string>("");
  const [isEditing,setIsEditing] = useState<boolean>(false);
  const [lastPayload,setLastPayload] = useState<JobParams | null>(null);
  useEffect(() => {
    try {
      const eStr = localStorage.getItem("submit.env");
      if (eStr) {
        setEnv(JSON.parse(eStr) as EnvVar[]);
      }
    } catch {}
    try {
      const s = localStorage.getItem("submit.script");
      if (s !== null) {
        setScript(s);
      }
    } catch {}
    try {
      const lpStr = localStorage.getItem("submit.lastPayload");
      if (!lpStr) return;
      const lp = JSON.parse(lpStr);
      setLastPayload(lp);
      MyDebug(`Loaded last payload from localStorage: ${JSON.stringify(lp)}`);
    } catch {}
  }, []);
  useEffect(() => {
    if (isRefreshing) {
      new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
        setIsRefreshing(false);
      });
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
              <h2 className="text-2xl font-bold">提交任务</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center text-sm text-gray-500">
                <span className={`h-2 w-2 rounded-full mr-2 ${isRefreshing ? 'bg-primary animate-pulse' : 'bg-emerald-500'}`}></span>
              </span>
              <button className="btn-primary inline-flex items-center cursor-pointer" onClick={() => setIsRefreshing(true)} disabled={isRefreshing}>
                <i className={`fas fa-rotate-right mr-2 ${isRefreshing ? 'animate-spin' : ''}`}></i>
                查询配置文件
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-between">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wide">配置模板</h3>
            {isRefreshing && (
              <span className="flex-1 inline-flex items-center text-xs text-primary">
                <i className="fas fa-circle-notch animate-spin mr-1"></i>刷新中
              </span>
            )}
            <button className={`${isEditing ? "btn-danger" : "btn-secondary"} inline-flex items-center cursor-pointer text-sm`} onClick={() => setIsEditing(!isEditing)}><i className="fas fa-edit" /> {isEditing ? "停止编辑" : "编辑用户模板"} </button>
          </div>

          <section aria-busy={isRefreshing} className={`grid grid-cols-1 gap-6 overflow-hidden min-h-0`}>
            {/* Submit form components */}
            <TemplateCard onSelect={(e: EnvVar[], s: string) => {setEnv(e); setScript(s);}} isRefreshing={isRefreshing} onTempChange={() => setIsRefreshing(true)} isEditing={isEditing} />
            

          </section>

          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wide">任务编辑</h3>
          </div>

          <section className={`grid grid-cols-1 gap-6 flex-1 overflow-hidden min-h-0`}>
            <EditJob env={env} script={script} lastPayload={lastPayload} />
            {/* Submit form components */}
          </section>


        </main> 
        )}
      </>
  );
}