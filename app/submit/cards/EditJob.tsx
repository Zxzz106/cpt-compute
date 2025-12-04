"use client";

import { useEffect, useMemo, useState } from "react";
import MyDebug from "@/components/utils/MyDebug";
import MyAlert from "@/components/utils/MyAlert";
import TextEditor from "@/components/utils/TextEditor";
import type { EnvVar } from "./TemplateCard";
import PathPicker from "@/components/utils/PathPicker";
import { parseNewJobid } from "@/components/utils/parseExec";
import { fetchExec, sftpUpload, isSSHConnected } from "@/components/utils/sshClient";

export type JobParams = {
  jobName: string;
  workDir: string;
  nodes: number;
  cores: number;
  email: string;
};

export type jobPayload = {
  job_name?: string;
  work_dir?: string;
  nodes?: number;
  cores?: number;
  email?: string;
  script?: string;
  environment?: Record<string, string>;
};

function initEnvValues(env: EnvVar[]) {
  const values: Record<string, string> = {};
  for (const e of env || []) {
    if (e.type === "select" && e.options && e.options.length > 0) {
      values[e.name] = e.options[0] || "";
    } else {
      values[e.name] = "";
    }
  }
  return values;
}

export default function EditJob({ env, script, lastPayload }: { env: EnvVar[]; script: string; lastPayload: jobPayload | null }) {
  const [params, setParams] = useState<JobParams>({
    jobName: "",
    workDir: "~",
    nodes: 1,
    cores: 1,
    email: "",
  });



  const [envValues, setEnvValues] = useState<Record<string, string>>(() => initEnvValues(env));
  const [baseScript, setBaseScript] = useState<string>(script || "");
  const [editorScript, setEditorScript] = useState<string>(script || "");

  // Shared path picker modal state
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerInitial, setPickerInitial] = useState<string>("$HOME");
  const [pickerMode, setPickerMode] = useState<"dir" | "file">("dir");
  const [pickerTarget, setPickerTarget] = useState<{ type: "workDir" } | { type: "envVar"; name: string }>({ type: "workDir" });



  useEffect(() => {
    try {
      if (lastPayload) {
        MyDebug(`Initializing form with last payload: ${JSON.stringify(lastPayload)}`);
        setParams({
          jobName: lastPayload.job_name || "",
          workDir: lastPayload.work_dir || "~",
          nodes: Number(lastPayload.nodes) || 1,
          cores: Number(lastPayload.cores) || 1,
          email: lastPayload.email || "",
        });
      }
    } catch {}
  }, [lastPayload]);

  // Reinitialize when template changes
  useEffect(() => {
    setEnvValues(initEnvValues(env));
    try {
      if (lastPayload && lastPayload.environment) {
        const payloadKeys = Object.keys(lastPayload.environment || {});
        const envNamesSet = new Set((env || []).map((e) => e.name));
        const exactMatch = payloadKeys.length === envNamesSet.size && payloadKeys.every((k) => envNamesSet.has(k));
        if (exactMatch) {
          const newEnvValues: Record<string, string> = { ...envValues };
          for (const [k, v] of Object.entries(lastPayload.environment)) {
            newEnvValues[k] = String(v);
          }
          setEnvValues(newEnvValues);
        }
      }
    } catch {}
  }, [env]);

  useEffect(() => {
    setBaseScript(script || "");
    setEditorScript(script || "");
  }, [script]);

  const handleParamChange = (key: keyof JobParams, val: string) => {
    setParams((p) => ({
      ...p,
      [key]: key === "nodes" || key === "cores" ? Number(val || 0) : val,
    }));
  };

  const handleEnvChange = (name: string, val: string) => {
    setEnvValues((v) => ({ ...v, [name]: val }));
  };

  const resetToTemplate = () => {
    setEditorScript(baseScript || "");
  };


  const envList = useMemo(() => env || [], [env]);

  // Helpers for converting between UI path (~) and FileManager path ($HOME)
  const toPickerPwd = (p: string) => {
    if (!p) return "$HOME";
    if (p.startsWith("~")) return "$HOME" + p.slice(1);
    return p;
  };
  const fromPickerPwd = (p: string) => {
    if (!p) return "~";
    if (p.startsWith("$HOME")) return "~" + p.slice("$HOME".length);
    return p;
  };

  const joinPath = (base: string, name: string) => {
    if (!base || base === "/") return `/${name}`;
    return `${base.replace(/\/$/, "")}/${name}`;
  };

  const doSubmitJob = async (payload: any, jobId: string) => {
    if (!isSSHConnected()) {
      MyAlert("未连接到计算节点 (SSH 未建立)");
      throw new Error("SSH not connected");
    }

    const safeJobId = String(jobId).trim();
    const jobBase = `slurm_job_${safeJobId}`;

    const workDirRaw: string = (payload.work_dir || payload.workDir || "~").trim();

    // Resolve remote absolute workDir (expand ~ to $HOME)
    const home = (await fetchExec("echo -n $HOME")).trim();
    let absWorkDir = workDirRaw.replace(/^(?:~|\/?\$HOME)(?=\/?|$)/, home);

    if (!absWorkDir) absWorkDir = home;

    // Ensure directory exists
    await fetchExec(`mkdir -p "${absWorkDir.replace(/\"/g, '\\\"')}"`);

    // Build environment export lines
    const envObj: Record<string, string> = payload.environment || {};
    const envLines = Object.entries(envObj)
      .filter(([_, v]) => v !== undefined && v !== null && String(v).length > 0)
      .map(([k, v]) => `export ${k}=${shellQuote(String(v))}`)
      .join("\n");

    // Build script content
    const email: string | undefined = payload.email?.trim() || undefined;
    const sbatch = [
      "#!/bin/bash",
      `#SBATCH -D ${shellQuote(absWorkDir)}`,
      `#SBATCH -N ${Number(payload.nodes) || 1}`,
      `#SBATCH -n ${Number(payload.cores) || 1}`,
      `#SBATCH -J ${shellQuote(payload.job_name || payload.jobName || jobBase)}`,
      `#SBATCH -o ${shellQuote(jobBase + ".stdout")}`,
      `#SBATCH -e ${shellQuote(jobBase + ".stderr")}`,
      ...(email ? [`#SBATCH --mail-user=${shellQuote(email)}`, `#SBATCH --mail-type=ALL`] : []),
      "",
      envLines,
      "",
      String(payload.script || "").trim()
    ].join("\n");

    MyDebug(`Submitting job with script: \n${sbatch}`);
    MyDebug(`Uploading to remote path: ${joinPath(absWorkDir, jobBase + ".sh")}`);


    const scriptPath = `${absWorkDir.replace(/\/$/, "")}/${jobBase}.sh`;
    const dataB64 = toBase64Utf8(sbatch);

    // Upload script and set executable
    await sftpUpload(scriptPath, dataB64, 0o700);
    await fetchExec(`chmod +x "${scriptPath.replace(/\"/g, '\\\"')}"`);

    // Submit job via sbatch
    const submitOut = await fetchExec(`sbatch "${scriptPath.replace(/\"/g, '\\\"')}"`);
    MyDebug(`sbatch output: ${submitOut}`);
  };

  function toBase64Utf8(text: string): string {
    try {
      // Browser-safe UTF-8 base64
      // eslint-disable-next-line no-undef
      return btoa(unescape(encodeURIComponent(text)));
    } catch {
      // Fallback (may break on non-ASCII in some runtimes)
      // eslint-disable-next-line no-undef
      return btoa(text);
    }
  }

  function shellQuote(v: string): string {
    // Quote for shell usage (single-quote safe)
    if (v === "") return "''";
    return `'${v.replace(/'/g, "'\\''")}'`;
  }

  const handleSubmit = async () => {
    const jobName = params.jobName.trim();
    const workDir = params.workDir.trim() || "~";
    const nodes = params.nodes;
    const cores = params.cores;
    const email = params.email.trim();
    if (!jobName) {
      MyAlert("任务名称不能为空");
      return;
    }
    if (nodes <= 0) {
      MyAlert("节点数必须大于0");
      return;
    }
    if (cores <= 0) {
      MyAlert("核数必须大于0");
      return;
    }

    // Construct job submission payload
    const payload: any = {
      job_name: jobName,
      work_dir: workDir,
      nodes: nodes,
      cores: cores,
      script: editorScript,
      environment: envValues,
    };
    if (email) {
      payload.email = email;
    }

    localStorage.setItem("submit.lastPayload", JSON.stringify(payload));
    localStorage.setItem("submit.env", JSON.stringify(env));
    localStorage.setItem("submit.script", script);

    // MyDebug(`Submitting job with payload: ${JSON.stringify(payload)}`);
    try {
      const newJobIdNum = await parseNewJobid();
      if (!newJobIdNum) {
        MyAlert("获取任务ID失败");
        return;
      }
      await doSubmitJob(payload, String(newJobIdNum));
      MyAlert(`任务提交成功！任务ID: ${newJobIdNum}`);
    } catch (e: any) {
      MyAlert(`任务提交失败: ${e?.message || String(e)}`);
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow p-6 h-full flex flex-col`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden min-h-0 flex-1">
        {/* Left: Job params and environment */}
        <div className="flex flex-col gap-4">
          <div className="p-4">
            <h4 className="font-semibold text-gray-800 pb-4 border-b border-gray-200">任务参数</h4>
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
                <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input input-bordered border-gray-200 border-2 rounded-lg p-2 flex-1"
                  placeholder="e.g. ~/projects/demo"
                  value={params.workDir}
                  onChange={(e) => handleParamChange("workDir", e.target.value)}
                />
                <button
                            className="btn-secondary btn-sm"
                            onClick={() => {
                              setPickerInitial(toPickerPwd(params.workDir || "~"));
                              setPickerMode("dir");
                              setPickerTarget({ type: "workDir" });
                              setPickerVisible(true);
                            }}
                          >
                            选择目录
                          </button>
                </div>

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

                <label className="text-sm text-gray-600 mt-2">通知邮箱（可选）</label>
                <input
                  type="email"
                  className="input input-bordered border-gray-200 border-2 rounded-lg p-2"
                  placeholder="name@example.com"
                  value={params.email}
                  onChange={(e) => handleParamChange("email", e.target.value)}
                />

            </div>
          </div>

          <div className="flex flex-col gap-4 p-4">
            <h4 className="font-semibold text-gray-800 pb-4 border-b border-gray-200">运行环境</h4>
            {envList.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">未选择模板或该模板无环境变量。</p>
            ) : (
              <div>
                {envList.map((v) => (
                  <div key={v.name} className="flex flex-col gap-4 mt-2">
                    <label className="text-sm text-gray-600 flex items-center justify-between mt-2">
                      <span>{v.description || v.name}</span>
                      <span className="text-xs text-gray-400">{`$${v.name}`}</span>
                    </label>
                    {v.type === "select" && v.options ? (
                      <select
                        className="select select-bordered border-gray-200 border-2 rounded-lg p-2"
                        value={envValues[v.name] ?? ""}
                        onChange={(e) => handleEnvChange(v.name, e.target.value)}
                      >
                        {v.options.map((opt) => (
                          <option key={`${v.name}_${opt}`} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="input input-bordered border-gray-200 border-2 rounded-lg p-2 flex-1"
                          placeholder={v.type === "file" ? "请输入文件名" : "请输入参数"}
                          value={envValues[v.name] ?? ""}
                          onChange={(e) => handleEnvChange(v.name, e.target.value)}
                        />
                        {v.type === "file" && (
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => {
                              setPickerInitial(toPickerPwd(params.workDir || "~"));
                              setPickerMode("file");
                              setPickerTarget({ type: "envVar", name: v.name });
                              setPickerVisible(true);
                            }}
                          >
                            选择文件
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
              </div>
            )}
          </div>

          <div className="flex gap-2 px-4">
            <button className="btn-primary" onClick={handleSubmit}>
              提交任务
            </button>
            <button className="btn-secondary" onClick={resetToTemplate}>
              重置脚本
            </button>
          </div>
        </div>

        {/* Right: Script editor */}
        <div className="flex flex-col min-h-0 p-4">
          <h4 className="font-semibold text-gray-800 pb-4">脚本编辑</h4>
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
            <TextEditor value={editorScript} onChange={setEditorScript} filename="job.sh" className="h-full" wrap />
          </div>
        </div>
      </div>

      {/* Shared Path Picker Modal */}
      <PathPicker
        visible={pickerVisible}
        initialPath={pickerInitial}
        mode={pickerMode}
        onCancel={() => setPickerVisible(false)}
        onConfirm={(absPath) => {
          const chosen = fromPickerPwd(absPath);
          if (pickerTarget.type === "workDir") {
            setParams((p) => ({ ...p, workDir: chosen || "~" }));
          } else {
            setEnvValues((v) => ({ ...v, [pickerTarget.name]: chosen }));
          }
          setPickerVisible(false);
        }}
      />
    </div>
  );
}
