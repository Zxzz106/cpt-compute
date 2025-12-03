"use client";

import { DataGrid, GridColDef, GridRowSelectionModel, GridRowParams } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { parsePwdFiles } from "@/components/utils/parseExec";
import MyDebug from "@/components/utils/MyDebug";
import { fetchExec } from "@/components/utils/sshClient";
import { on } from "events";
import iconSelect from "@/components/resources/iconSelect";
import { type SacctJob } from "@/components/utils/parseExec";
import MyAlert from "@/components/utils/MyAlert";
import { TIMEOUT } from "dns";
import TextEditor from "@/components/utils/TextEditor";

export const STATE_META: Record<string, { label: string; color: string; icon: string; group: "finished"|"failed"|"cancel"|"running"|"pending"|"other" }> = {
    RUNNING: { label: "运行中", color: "text-indigo-600 bg-indigo-50", icon: "fas fa-play", group: "running" },
    PENDING: { label: "排队", color: "text-amber-600 bg-amber-50", icon: "fas fa-clock", group: "pending" },
    COMPLETED: { label: "完成", color: "text-emerald-600 bg-emerald-50", icon: "fas fa-check", group: "finished" },
    FAILED: { label: "失败", color: "text-rose-600 bg-rose-50", icon: "fas fa-times", group: "failed" },
    OUT_OF_MEMORY: { label: "内存不足", color: "text-rose-600 bg-rose-50", icon: "fas fa-memory", group: "failed" },
    TIMEOUT: { label: "超时", color: "text-rose-600 bg-rose-50", icon: "fas fa-hourglass-end", group: "failed" },
    CANCELLED: { label: "取消", color: "text-gray-600 bg-gray-100", icon: "fas fa-ban", group: "cancel" },
    default: { label: "其他", color: "text-gray-600 bg-gray-100", icon: "fas fa-briefcase", group: "other" },
};



export default function TerminalCard( {job, onClose, onOpenFolder, onScancel}:{job: SacctJob, onClose: () => void, onOpenFolder: (path: string) => void, onScancel: () => void} ) {
    const [pathExist, setPathExist] = useState<boolean>(false);
    const [stdout, setStdout] = useState<string>("");
    const [tailing, setTailing] = useState<boolean>(false);
    const [autoScroll, setAutoScroll] = useState<boolean>(true);
    const logRef = useMemo(() => ({ current: null as null | HTMLDivElement }), []);
    
    const onCloseClick = () => {
        onClose();
    }
    useEffect(() => {
        // Check if the path exists when the component mounts
        const checkPathExistence = async () => {
            try {
                const result = await fetchExec(`test -d "${job.workDir}" && echo "exists" || echo "not exists"`);
                setPathExist(result.trim() === "exists");
                MyDebug(`Checked path existence for '${job.workDir}': ${result.trim()}`);
            } catch (error) {
                setPathExist(false);
            }
        };
        checkPathExistence();
    }, [job.workDir]);


            


    return (
		<div className={`bg-white rounded-xl shadow p-6 flex flex-col flex-1 min-h-0 overflow-hidden`}>
			<div className="flex flex-col flex-1 gap-3 min-h-0 overflow-hidden">
			    <div className="flex items-center justify-between gap-2">
					<div className="flex gap-2">
						<button className="btn-secondary cursor-pointer" onClick={onCloseClick} ><i className="fas fa-close mr-1"/>关闭</button>
						{/* <button className="btn-primary cursor-pointer disabled:cursor-not-allowed" onClick={handleSave} disabled={!dirty || loading}><i className="fas fa-save mr-1"/>保存</button> */}
					</div>
					
					<div className="flex justify-center items-center text-md text-gray-600 truncate gap-3" title={job.workDir}>
                        <div className="flex flex-col text-right">
                            <p className="truncate">
                                
                                {(() => {
                                    const meta = STATE_META[job.state] || STATE_META['default'];
                                    return <span className={`${meta.color} rounded-full px-2`}>{ "Job " + job.jobId}</span>;
                                })()}
                                {": " + job.jobName}
                            </p>
                            <p className="truncate">{job.workDir}</p>
                            {/* <p className="flex-1 truncate">{job.submitLine}</p> */}
                        </div>
                        <div className="flex justify-center items-center gap-3">
                            <button className="btn-primary cursor-pointer disabled:cursor-not-allowed" disabled={!pathExist} onClick={() => onOpenFolder(job.workDir)}><i className="fas fa-folder-open mr-1"/>打开文件夹</button>
                        </div>

                    </div>
				</div>
                
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden border rounded-lg bg-gray-50">
                    { job.state.toUpperCase()==="RUNNING" ? (
                        <>
                            {/* Tail -f slurm_job_${job.jobId}.stdout */}
                            <TailView
                                workDir={job.workDir}
                                jobId={job.jobId}
                                onContent={(txt) => setStdout(txt)}
                                onTailing={(v) => setTailing(v)}
                                autoScroll={autoScroll}
                            />
                            <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
                                <div className="text-sm text-gray-600">
                                    {tailing ? <span className="text-emerald-600"><i className="fas fa-play mr-1"/>跟随输出中</span> : <span className="text-gray-500"><i className="fas fa-pause mr-1"/>已暂停</span>}
                                </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600 flex items-center gap-2">
                                        {/* <input type="checkbox" checked={autoScroll} onChange={(e)=>setAutoScroll(e.target.checked)} /> 自动滚动 */}
                                    </label>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-3" ref={(el)=>{(logRef as any).current = el}} onScroll={(e)=>{
                                const el = (logRef as any).current as HTMLDivElement | null;
                                if (!el) return;
                                const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
                                if (!nearBottom && autoScroll) {
                                    setAutoScroll(false);
                                }
                            }}>
                                <pre className="text-xs whitespace-pre-wrap break-words leading-5 font-mono text-gray-800">
                                    {stdout || "(无输出)"}
                                </pre>
                            </div>
                        </>
                    ) : (
                        <>
                            <StdEditors workDir={job.workDir} jobId={job.jobId} />
                        </>
                    ) }
                </div>

                <div className="flex justify-end gap-2">
                    { job.state.toUpperCase() === "RUNNING" ?
                        <button className="btn-danger cursor-pointer" onClick={async () => {
                            if (!window.confirm(`确定要取消作业 ${job.jobId} 吗？`)) {
                                return;
                            }
                            const res = await fetchExec(`scancel ${job.jobId}`);
                            MyAlert("取消作业请求已发送。");
                            await new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
                                onScancel();
                            });

                        }} ><i className="fas fa-stop mr-1"/>取消作业</button>
                        : null
                    }
                </div>







            </div>
        </div>
    );
}

function TailView({ workDir, jobId, onContent, onTailing, autoScroll }:{
    workDir: string;
    jobId: string;
    onContent: (text: string) => void;
    onTailing: (val: boolean) => void;
    autoScroll: boolean;
}) {
    const [timer, setTimer] = useState<number | null>(null);

    useEffect(() => {
        let disposed = false;
        const fetchOnce = async () => {
            try {
                const cmd = `cd "${workDir}" && tail -n 50 "slurm_job_${jobId}.stdout" 2>/dev/null || true`;
                const res = await fetchExec(cmd);
                if (!disposed) {
                    onContent(res);
                }
            } catch (e) {
                if (!disposed) onContent("(读取输出失败)");
            }
        };
        // start polling
        onTailing(true);
        fetchOnce();
        const id = window.setInterval(fetchOnce, 1000);
        setTimer(id);
        return () => {
            disposed = true;
            if (id) window.clearInterval(id);
            onTailing(false);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workDir, jobId]);

    useEffect(() => {
        // noop: autoScroll state handled in parent scroll listener
    }, [autoScroll]);

    return null;
}

function StdEditors({ workDir, jobId }:{ workDir: string; jobId: string; }) {
    const [loading, setLoading] = useState(true);
    const [stdoutText, setStdoutText] = useState<string>("");
    const [stderrText, setStderrText] = useState<string>("");
    const [tooLarge, setTooLarge] = useState<{out:boolean; err:boolean}>({out:false, err:false});

    useEffect(() => {
        let disposed = false;
        const load = async () => {
            setLoading(true);
            try {
                const sizeCmd = `cd "${workDir}" && for f in slurm_job_${jobId}.stdout slurm_job_${jobId}.stderr; do [ -f "$f" ] && stat -c %s "$f" || echo 0; done`;
                const sizesRaw = await fetchExec(sizeCmd);
                const [outSizeStr, errSizeStr] = sizesRaw.trim().split(/\n/);
                const outSize = parseInt(outSizeStr || "0", 10) || 0;
                const errSize = parseInt(errSizeStr || "0", 10) || 0;
                const limit = 10 * 1024 * 1024; // 10MB
                const outTooLarge = outSize > limit;
                const errTooLarge = errSize > limit;
                if (!disposed) setTooLarge({out: outTooLarge, err: errTooLarge});

                const catOutCmd = `cd "${workDir}" && [ -f "slurm_job_${jobId}.stdout" ] && cat "slurm_job_${jobId}.stdout" || true`;
                const catErrCmd = `cd "${workDir}" && [ -f "slurm_job_${jobId}.stderr" ] && cat "slurm_job_${jobId}.stderr" || true`;
                const [outText, errText] = await Promise.all([
                    outTooLarge ? Promise.resolve("(文件大于10MB，请在文件管理器中打开)") : fetchExec(catOutCmd),
                    errTooLarge ? Promise.resolve("(文件大于10MB，请在文件管理器中打开)") : fetchExec(catErrCmd)
                ]);
                if (!disposed) {
                    setStdoutText(outText || "");
                    setStderrText(errText || "");
                }
            } catch (e) {
                if (!disposed) {
                    setStdoutText("(读取失败)");
                    setStderrText("(读取失败)");
                }
            } finally {
                if (!disposed) setLoading(false);
            }
        };
        load();
        return () => { disposed = true; };
    }, [workDir, jobId]);

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-white text-sm text-gray-600">
                <span><i className="fas fa-file-alt mr-1"/>作业输出</span>
                {loading ? <span className="text-gray-500"><i className="fas fa-spinner fa-spin mr-1"/>加载中</span> : null}
            </div>
            <div className="flex-1 flex flex-col gap-3 p-3 overflow-auto">
                <div className="flex flex-col min-h-0 max-h-[calc(50vh)]">
                    <div className="text-xs text-gray-600 mb-2"><i className="fas fa-arrow-right mr-1"/>stdout</div>
                    <div className="flex-1 min-h-0 border rounded bg-white overflow-hidden">
                        <TextEditor value={stdoutText} onChange={()=>{}} readOnly height="300px" filename={`slurm_job_${jobId}.stdout`} />
                    </div>
                    {tooLarge.out ? <div className="text-xs text-amber-600 mt-1">文件超过 10MB，建议用“打开文件夹”查看</div> : null}
                </div>
                <div className="flex flex-col min-h-0 max-h-[calc(50vh)]">
                    <div className="text-xs text-gray-600 mb-2"><i className="fas fa-exclamation-triangle mr-1"/>stderr</div>
                    <div className="flex-1 min-h-0 border rounded bg-white overflow-hidden">
                        <TextEditor value={stderrText} onChange={()=>{}} readOnly height="300px" filename={`slurm_job_${jobId}.stderr`} />
                    </div>
                    {tooLarge.err ? <div className="text-xs text-amber-600 mt-1">文件超过 10MB，建议用“打开文件夹”查看</div> : null}
                </div>
            </div>
        </div>
    );
}