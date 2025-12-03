"use client";

import { useState } from "react";
import MyAlert from "@/components/utils/MyAlert";
import MyDebug from "@/components/utils/MyDebug";
import { isSSHConnected, fetchExec } from "@/components/utils/sshClient";


type JobParams = {
  jobName: string;
  workDir: string;
  nodes: number;
  cores: number;
}



export default function NewSession({ onCreate }: { onCreate: (session: {id: string, name: string}) => void }) {
  const [params, setParams] = useState<JobParams>({
      jobName: "",
      workDir: "~",
      nodes: 1,
      cores: 1,
    });
  const [submitting, setSubmitting] = useState(false);

  const handleParamChange = (key: keyof JobParams, val: string) => {
    setParams((p) => ({
      ...p,
      [key]: key === "nodes" || key === "cores" ? Number(val || 0) : val,
    }));
  };

  return (
    <div className={`bg-white rounded-xl shadow p-6 flex flex-col min-h-0 overflow-hidden`}>
      <h4 className="font-semibold text-gray-800 pb-2 border-b border-gray-200">启动任务</h4>
      <div className="flex flex-col gap-4">
        <label className="text-sm text-gray-600 mt-2">任务名称</label>
        <input
          type="text"
          className="input input-bordered border-gray-200 border-2 rounded-lg p-2"
          placeholder="e.g. my-job"
          value={params.jobName}
          onChange={(e) => handleParamChange("jobName", e.target.value)}
        />

        <label className="text-sm text-gray-600 mt-2">工作目录</label>
        <input
          type="text"
          className="input input-bordered border-gray-200 border-2 rounded-lg p-2"
          placeholder="e.g. ~/projects/demo"
          value={params.workDir}
          onChange={(e) => handleParamChange("workDir", e.target.value)}
        />

        <label className="text-sm text-gray-600 mt-2">节点数</label>
        <input
          type="number"
          min={1}
          className="input input-bordered border-gray-200 border-2 rounded-lg p-2"
          value={params.nodes}
          onChange={(e) => handleParamChange("nodes", e.target.value)}
        />

        <label className="text-sm text-gray-600 mt-2">核数</label>
        <input
          type="number"
          min={1}
          className="input input-bordered border-gray-200 border-2 rounded-lg p-2"
          value={params.cores}
          onChange={(e) => handleParamChange("cores", e.target.value)}
        />

        <div className="flex gap-2">
          <button
            className={`btn-primary ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={submitting}
            onClick={async () => {
              if (submitting) return;
              try {
                if (!isSSHConnected()) {
                  MyAlert('SSH未连接，请先登录');
                  return;
                }

                const nodes = Math.max(1, Number(params.nodes) || 1);
                const cores = Math.max(1, Number(params.cores) || 1);
                const workDir = params.workDir?.trim() || '~';
                const fallbackName = `sess-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`;
                const session = (params.jobName?.trim() || fallbackName).replace(/[^A-Za-z0-9_.:-]/g, '-');

                const shq = (s: string) => {
                  if (s === '~') return '~'; 
                  return `'${s.replace(/'/g, "'\\''")}'`;
                };
                const bashCmd = `cd ${shq(workDir)} && salloc -N ${nodes} -n ${cores} -J ${shq(session)} bash -l`;
                const full = `tmux new-session -d -s ${shq(session)} bash -lc ${shq(bashCmd)}`;

                setSubmitting(true);
                MyDebug(`Starting tmux session ${session}: ${full}`);
                await fetchExec(full);
                MyAlert(`已创建会话: ${session}`);
                onCreate({id: '', name: shq(session)});
              } catch (err: any) {
                MyDebug(`Create session failed: ${err?.message || String(err)}`);
                MyAlert(`创建失败: ${err?.message || String(err)}`);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? '创建中…' : '提交任务'}
          </button>
        </div>
      </div>
    </div>

  );
}