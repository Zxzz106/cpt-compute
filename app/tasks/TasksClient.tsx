"use client";
import JumpHome from "@/components/utils/jumpHome";
import { MyDebug } from "@/components/utils/MyDebug";
import { fetchExec, isSSHConnected } from "@/components/utils/sshClient";
import { useEffect, useState } from "react";
import TasksList from "./cards/TasksList";
import TerminalCard from "./cards/TerminalCard";
import { type SacctJob } from "@/components/utils/parseExec";
import MyAlert from "@/components/utils/MyAlert";
import { useRouter } from "next/navigation";

export const metadata = {
  title: "任务列表 | CPT Compute",
};

export default function Page() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [terminalShow, setTerminalShow] = useState(true);
  const [selectedJob, setSelectedJob] = useState<SacctJob | null>(null);
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  useEffect(() => {
    if (!isRefreshing) {
      return;
    }
    Promise.all([
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]).then(() => {
      setIsRefreshing(false);
    });
  }, [isRefreshing]);
  const handleOpenFolder = (path: string) => {
    const checkPathExistence = async () => {
        try {
            const result = await fetchExec(`test -d "${path}" && echo "exists" || echo "not exists"`);
            return result.trim() === "exists";
        } catch (error) {
            return false;
        }
    };
    checkPathExistence().then(pathExist => {
        if (!pathExist) {
            MyAlert('文件夹不存在，无法打开');
            return;
        }
      routeFiles(path);
    });
  }

    const routeFiles = (path: string) => {
    const encoded = encodeURIComponent(path);
    router.push(`/files?pwd=${encoded}`);
    };


  return (
    <>
      {!isSSHConnected() ? (
          <JumpHome />
        ) : (
        <main className="mx-auto px-4 lg:px-6 space-y-6 content-auto min-h-full flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold">任务列表</h2>
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
            <h3 className="text-sm font-semibold text-gray-500 tracking-wide">任务列表</h3>
            {isRefreshing && (
              <span className="inline-flex items-center text-xs text-primary">
                <i className="fas fa-circle-notch animate-spin mr-1"></i> 刷新中
              </span>
            )}

          </div>

          <section aria-busy={isRefreshing} className={`grid grid-cols-1 ${selectedJob ? 'lg:grid-cols-2' : ''} gap-6 flex-1`}>
            {/* File manager components */}
            <TasksList isRefreshing={isRefreshing} onChangeDate={() => setIsRefreshing(true)} showTerminal={selectedJob !== null} onSelectJob={setSelectedJob} onOpenFolder={handleOpenFolder} />
            {/* CodeMirror Editor */}
            {selectedJob && (
              <TerminalCard job={selectedJob} onClose={() => setSelectedJob(null)} onOpenFolder={handleOpenFolder} onScancel={() => setIsRefreshing(true)} />
              // Editor enters, the left shrinks and the right slides in
            )}

          </section>


        </main> 
        )}
      </>
  );
}
