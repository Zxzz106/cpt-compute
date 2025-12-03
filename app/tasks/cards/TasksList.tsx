"use client";

import { useEffect, useMemo, useState } from "react";
import { parseUserSacct } from "@/components/utils/parseExec";
import { isSSHConnected } from "@/components/utils/sshClient";
import MyDebug from "@/components/utils/MyDebug";
import Link from "next/link";
import { type SacctJob } from "@/components/utils/parseExec";

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

export default function TasksList({ isRefreshing, onChangeDate, showTerminal, onSelectJob, onOpenFolder }: { isRefreshing: boolean, onChangeDate: () => void, showTerminal: boolean, onSelectJob: (job: SacctJob) => void, onOpenFolder: (path: string) => void }) {
    const [filter, setFilter] = useState<"all" | "finished" | "failed" | "cancel">("all");
    const [weeksAgo, setWeeksAgo] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [jobs, setJobs] = useState<SacctJob[]>([]);

    const refreshData = async () => {
        if (!isSSHConnected()) {
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const sacctOut = await parseUserSacct(weeksAgo);
            setJobs(Array.isArray(sacctOut) ? sacctOut : []);
        } catch (e: any) {
            setError(e?.message || "加载失败");
        } finally {
            setIsLoading(false);
        }
    }
    useEffect(() => {
        MyDebug(`TasksList useEffect isRefreshing with isRefreshing=${isRefreshing}`);
        if (!isRefreshing) {
            return;
        }
        refreshData();
    }, [isRefreshing]);

    const items = useMemo(() => {
        if (filter === "all") return jobs.slice(0, 10);
        return jobs.filter(job => {
            const s = job.state || "";
            if (filter === "finished") return s.startsWith("COMPLETED");
            if (filter === "failed") return s.startsWith("FAILED") || s.includes("TIMEOUT") || s.includes("OUT_OF_MEMORY") || s.includes("NODE_FAIL");
            if (filter === "cancel") return s.startsWith("CANCELLED");
            return true;
        });
    }, [jobs, filter]);


    return (
        <div className={`bg-white rounded-xl shadow p-6 h-full`}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    {/* <h3 className="font-bold text-lg">最近任务</h3> */}
                    <span className="text-lg font-semibold text-gray-800">最近</span>
                    <input 
                        type="number" 
                        value={weeksAgo} 
                        onChange={e => {
                            if (parseInt(e.target.value, 10) < 1) return;
                            if (isRefreshing) {
                                e.target.value = weeksAgo.toString();
                                return;
                            }
                            setWeeksAgo(parseInt(e.target.value, 10) || 1);
                            onChangeDate();
                        }}
                        min={1} 
                        className={`w-12 px-2 py-1 border border-gray-300 rounded-md text-sm font-semibold text-center focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all`}
                    />
                    <span className="text-lg font-semibold text-gray-800">周</span>
                </div >

                <div className="flex space-x-2">
                    <button className={`text-sm px-3 py-1 ${filter === "all" ? "bg-primary-10 text-primary" : "bg-gray-100 text-gray-500"} rounded-full`} onClick={() => setFilter("all")}>全部</button>
                    <button className={`text-sm px-3 py-1 ${filter === "finished" ? "bg-primary-10 text-primary" : "bg-gray-100 text-gray-500"} rounded-full`} onClick={() => setFilter("finished")}>完成</button>
                    <button className={`text-sm px-3 py-1 ${filter === "failed" ? "bg-primary-10 text-primary" : "bg-gray-100 text-gray-500"} rounded-full`} onClick={() => setFilter("failed")}>失败</button>
                    <button className={`text-sm px-3 py-1 ${filter === "cancel" ? "bg-primary-10 text-primary" : "bg-gray-100 text-gray-500"} rounded-full`} onClick={() => setFilter("cancel")}>取消</button>
                </div>
            </div>
            <div className="flex flex-col max-h-200 min-h-[240px] relative">
                {error ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-rose-600">加载失败：{error}</p>
                    </div>
                ) : items.length === 0 && !isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="grayDark text-sm">暂无任务数据</p>
                    </div>
                ) : (
                    <ul className="flex-1 divide-y divide-gray-100 overflow-auto pr-1">
                        {items.map((job) => {
                            const base = (job.state || '').split(':')[0];
                            const meta = STATE_META[base] || { label: base, color: "text-gray-600 bg-gray-100", icon: "fas fa-briefcase", group: "other" as const };
                            return (
                                <li key={job.jobId} className="py-3 grid grid-cols-24 gap-3 items-center">
                                    <div className={`${!showTerminal ? 'col-span-6' : 'col-span-8'} flex items-center space-x-3 min-w-0`}>
                                        <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${meta.color}`}>
                                            <i className={`${meta.icon} !text-sm`}></i>
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate" title={job.jobName}>{job.jobName || '(无名称)'}</p>
                                            <p className="text-xs text-gray-400">ID: {job.jobId}</p>
                                        </div>
                                    </div>

                                    <div className={`${!showTerminal ? 'col-span-2' : 'col-span-4'} min-w-0 flex flex-col text-left`}>
                                        {job.allocTRES ? (
                                            job.allocTRES.split(',').filter(s => s && s.trim().length > 0 && !s.startsWith('billing')).map((seg, idx) => (
                                                <p key={idx} className="text-sm text-gray-400 truncate" title={seg.trim()}>{seg.trim()}</p>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-400">-</p>
                                        )}
                                    </div>

                                    <div className={`${!showTerminal ? 'col-span-2' : 'col-span-2'}`}>
                                        <span className={`text-xs px-2 py-1 rounded-full ${meta.color.replace('bg-', 'bg-opacity-20 bg-')}`}>{meta.label}</span>
                                    </div>
                                    {!showTerminal && (
                                        <div className="col-span-2 text-right">
                                            <p className="text-xs text-gray-500 truncate" title={job.elapsed}>{job.elapsed}</p>
                                        </div>
                                    )}
                                    <div className={`${!showTerminal ? 'col-span-4' : 'col-span-6'} text-right min-w-0 items-end flex flex-col`}>
                                        {job.start && job.start !== "Unknown" ? (
                                            <p className="text-xs text-gray-500 truncate" title={job.start}>{job.start}</p>
                                        ) : (
                                            <p className="text-xs text-gray-500">PENDING</p>
                                        )}
                                        {job.end && job.end !== "Unknown" ? (
                                            <p className="text-xs text-gray-500 truncate" title={job.end}>{job.end}</p>
                                        ) : job.start && job.start !== "Unknown" ? (
                                            <p className="text-xs text-gray-500">RUNNING</p>
                                        ) : (
                                            <p className="text-xs text-gray-500">PENDING</p>
                                        )}
                                    </div>
                                    {!showTerminal && (
                                        <div className="col-span-6 text-right">
                                            <p className="text-xs text-gray-500 truncate" title={job.workDir}>{job.workDir}</p>
                                        </div>
                                    )}
                                    <div className={`${!showTerminal ? 'col-span-2' : 'col-span-4'} text-right px-1`}>

                                        <button className="px-1 cursor-pointer relative icon-wrapper" onClick={() => {onSelectJob(job);}}>
                                            <i className="fas fa-terminal mr-1 text-primary hover:text-primary-10 text-xl"/>
                                            <span className="icon-tooltip">跟踪</span>
                                        </button>
                                        <button className="px-1 cursor-pointer relative icon-wrapper" onClick={() => {onOpenFolder(job.workDir);}}>
                                            <i className="fas fa-folder-open mr-1 text-primary hover:text-primary-10 text-xl"/>
                                            <span className="icon-tooltip">打开</span>
                                        </button>
                                        {/* 详细信息+跟踪输出 */}
                                        {/* 打开文件夹 */}
                                        

                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-primary" />
                    </div>
                )}
            </div>
        </div>
    );
}
                
                