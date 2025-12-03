"use client";

import { useState, useEffect, useMemo } from "react";
import { parseSacct, type SacctJob } from "@/components/utils/parseExec";
import { isSSHConnected } from "@/components/utils/sshClient";
import MyDebug from "@/components/utils/MyDebug";
import Link from "next/link";

const STATE_META: Record<string, { label: string; color: string; icon: string; group: "finished"|"failed"|"cancel"|"running"|"pending"|"other" }> = {
    RUNNING: { label: "运行中", color: "text-indigo-600 bg-indigo-50", icon: "fas fa-play", group: "running" },
    PENDING: { label: "排队", color: "text-amber-600 bg-amber-50", icon: "fas fa-clock", group: "pending" },
    COMPLETED: { label: "完成", color: "text-emerald-600 bg-emerald-50", icon: "fas fa-check", group: "finished" },
    FAILED: { label: "失败", color: "text-rose-600 bg-rose-50", icon: "fas fa-times", group: "failed" },
    OUT_OF_MEMORY: { label: "内存不足", color: "text-rose-600 bg-rose-50", icon: "fas fa-memory", group: "failed" },
    TIMEOUT: { label: "超时", color: "text-rose-600 bg-rose-50", icon: "fas fa-hourglass-end", group: "failed" },
    CANCELLED: { label: "取消", color: "text-gray-600 bg-gray-100", icon: "fas fa-ban", group: "cancel" },
};

export default function TaskList({isRefreshing}: { isRefreshing: boolean }) {
    const [filter, setFilter] = useState<"all" | "finished" | "failed" | "cancel">("all");
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
            const sacctOut = await parseSacct();
            // MyDebug(`Fetched sacct output: ` + (sacctOut as any)?.map((item: any) => JSON.stringify(item)).join(", "));
            setJobs(Array.isArray(sacctOut) ? sacctOut : []);
        } catch (e: any) {
            setError(e?.message || "加载失败");
        } finally {
            setIsLoading(false);
        }
    }
    useEffect(() => {
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

    const hasJobs = jobs.length > 0;

    return (
        <div className={`bg-white rounded-xl shadow p-6 card-hover`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">最近任务</h3>
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
                                <li key={job.jobId} className="py-3 grid grid-cols-12 gap-3 items-center">
                                    <div className="col-span-4 flex items-center space-x-3 min-w-0">
                                        <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${meta.color}`}>
                                            <i className={`${meta.icon} !text-sm`}></i>
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate" title={job.jobName}>{job.jobName || '(无名称)'}</p>
                                            <p className="text-xs text-gray-400">ID: {job.jobId}</p>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm">{(job as any).user || '-'}</p>
                                        <p className="text-xs text-gray-400">耗时: {job.elapsed || '-'}</p>
                                    </div>
                                    <div className="col-span-3 min-w-0">
                                        {job.allocTRES ? (
                                            job.allocTRES.split(',').filter(s => s && s.trim().length > 0 && !s.startsWith('billing')).map((seg, idx) => (
                                                <p key={idx} className="text-sm text-gray-400 truncate" title={seg.trim()}>{seg.trim()}</p>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-400">-</p>
                                        )}
                                    </div>
                                    <div className="col-span-1">
                                        <span className={`text-xs px-2 py-1 rounded-full ${meta.color.replace('bg-', 'bg-opacity-20 bg-')}`}>{meta.label}</span>
                                    </div>
                                    <div className="col-span-2 text-right min-w-0 items-end">
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

                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                    <button onClick={refreshData} className="text-sm text-gray-500 hover:text-primary transition-colors disabled:opacity-50" disabled={isLoading}>
                        <i className={`fas fa-rotate-right mr-1 ${isLoading ? 'animate-spin' : ''}`}></i> 刷新
                    </button>
                    <Link prefetch={false} href="/tasks" className="text-sm text-primary hover:underline">
                        查看全部任务
                    </Link>
                </div>
            </div>
        </div>
    );
}