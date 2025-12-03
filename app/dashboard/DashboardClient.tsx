"use client";
import JumpHome from "@/components/utils/jumpHome";
import { MyDebug } from "@/components/utils/MyDebug";
import { isSSHConnected, fetchExec } from "@/components/utils/sshClient";
import { useState, useEffect, useRef } from "react";
import { parseCores, parseSinfo, parseJobs, parseStorage, parseMemory, parseTemp, parseGpu, parseTaskCount, parseUptime } from "@/components/utils/parseExec";
import ClusterHealth from "./cards/clusterHealth";
import TasksMonitor from "./cards/tasksMonitor";
import StoMonitor from "./cards/stoMonitor";
import MemMonitor from "./cards/memMonitor";
import TasksStat from "./cards/tasksStat";
import CoreResource from "./cards/coreResource";
import TempMonitor from "./cards/tempMonitor";
import GpuResource from "./cards/gpuResource";
import ResCanvas from "./cards/resCanvas";
import TaskGraph from "./cards/taskGraph";
import TaskList from "./cards/taskList";

export default function DashboardClient() {
  const [Uptime,setUptime] = useState("");
  const [Clusters, setClusters] = useState({ healthy: 0, total: 0 });
  const [CoreUsage, setCoreUsage] = useState({ usedCores: 0, totalCores: 0 });
  const [JobStats, setJobStats] = useState({ runningCount: 0, pendingCount: 0, totalCount: 0 });
  const [StorageUsage, setStorageUsage] = useState({ usedStorage: "", totalStorage: "", usedPercent: 100 });
  const [MemoryUsage, setMemoryUsage] = useState({ totalMemory: "", usedMemory: "", usedPercent: 100 });
  const [TempUsage, setTempUsage] = useState<number | null>(null);
  const [GpuUsage, setGpuUsage] = useState({ usedGpu: 0, totalGpu: 0 });
  const [TaskCount, setTaskCount] = useState({ taskCount7: -1, taskCount14: -1, stateCounts: {} as { [key: string]: number } });
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [cardRefreshing, setCardRefreshing] = useState<{[key:string]: boolean}>({});
  const hasFetchedRef = useRef(false);
  const refreshData = async () => {
    if (!isSSHConnected()) {
      setIsRefreshing(false);
      return;
    }
    try {
      setIsRefreshing(true);
      const refreshPromises = [
        parseUptime().then(output => {setUptime(output ? output : "")}),
        parseSinfo().then(output => {setClusters(output ? JSON.parse(output) : { healthy: 0, total: 0 })}),
        parseCores().then(output => {setCoreUsage(output ? JSON.parse(output) : { usedCores: 0, totalCores: 0 })}),
        parseJobs().then(output => {setJobStats(output ? JSON.parse(output) : { runningCount: 0, pendingCount: 0, totalCount: 0 })}),
        parseStorage().then(output => {setStorageUsage(output ? JSON.parse(output) : { usedStorage: "", totalStorage: "", usedPercent: 100 })}),
        parseMemory().then(output => {setMemoryUsage(output ? JSON.parse(output) : { totalMemory: "", usedMemory: "", usedPercent: 100 })}),
        parseTemp().then(output => {setTempUsage(output !== null ? output : null)}),
        parseGpu().then(output => {setGpuUsage(output ? JSON.parse(output) : { usedGpu: 0, totalGpu: 0 })}),
        parseTaskCount().then(output => {setTaskCount(output ? JSON.parse(output) : { taskCount7: -1, taskCount14: -1, stateCounts: {} as { [key: string]: number } })})
      ];
      await Promise.allSettled(refreshPromises);
    } catch (err) {
      MyDebug('Error refreshing dashboard data: ' + (err as Error).message);  
    }
  };
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setIsRefreshing(true);
    }

    const interval = setInterval(() => setIsRefreshing(true), 120000); // Refresh every 2 minutes

    return () => {
      clearInterval(interval);
    }; 
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      Promise.all([
        refreshData(),
        new Promise(resolve => setTimeout(resolve, 1000)) // Ensure at least 1 second spinner
      ]).finally(() => setIsRefreshing(false));
    }
  }, [isRefreshing]);

  // Individual refresh helpers -------------------------------------------------
  const wrapCardRefresh = async (key: string, fn: () => Promise<void>) => {
    if (!isSSHConnected()) return;
    setCardRefreshing(prev => ({ ...prev, [key]: true }));
    try {
      await fn();
    } catch (err) {
      MyDebug('Card refresh error ['+ key +']: ' + (err as Error).message);
    } finally {
      setCardRefreshing(prev => ({ ...prev, [key]: false }));
    }
  };

  const refreshCluster = () => wrapCardRefresh('clusters', async () => {
    const output = await parseSinfo();
    setClusters(output ? JSON.parse(output) : { healthy: 0, total: 0 });
  });
  const refreshCore = () => wrapCardRefresh('cores', async () => {
    const output = await parseCores();
    setCoreUsage(output ? JSON.parse(output) : { usedCores: 0, totalCores: 0 });
  });
  const refreshGpu = () => wrapCardRefresh('gpu', async () => {
    const output = await parseGpu();
    setGpuUsage(output ? JSON.parse(output) : { usedGpu: 0, totalGpu: 0 });
  });
  const refreshJobs = () => wrapCardRefresh('jobs', async () => {
    const output = await parseJobs();
    setJobStats(output ? JSON.parse(output) : { runningCount: 0, pendingCount: 0, totalCount: 0 });
  });
  const refreshMemory = () => wrapCardRefresh('memory', async () => {
    const output = await parseMemory();
    setMemoryUsage(output ? JSON.parse(output) : { totalMemory: "", usedMemory: "", usedPercent: 100 });
  });
  const refreshStorage = () => wrapCardRefresh('storage', async () => {
    const output = await parseStorage();
    setStorageUsage(output ? JSON.parse(output) : { usedStorage: "", totalStorage: "", usedPercent: 100 });
  });
  const refreshTemp = () => wrapCardRefresh('temp', async () => {
    const output = await parseTemp();
    setTempUsage(output !== null ? output : null);
  });
  const refreshTaskCount = () => wrapCardRefresh('taskCount', async () => {
    const output = await parseTaskCount();
    setTaskCount(output ? JSON.parse(output) : { taskCount7: -1, taskCount14: -1, stateCounts: {} as { [key: string]: number } });
  });




  return (
    <>
      {!isSSHConnected() ? (
          <JumpHome />
        ) : (
        <main className="mx-auto px-4 lg:px-6 space-y-6 content-auto">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold">状态面板</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center text-sm text-gray-500">
                <span className={`h-2 w-2 rounded-full mr-2 ${isRefreshing ? 'bg-primary animate-pulse' : 'bg-emerald-500'}`}></span>
                {Uptime}
              </span>
              <button className="btn-primary inline-flex items-center cursor-pointer" onClick={() => setIsRefreshing(true)} disabled={isRefreshing}>
                <i className={`fas fa-rotate-right mr-2 ${isRefreshing ? 'animate-spin' : ''}`}></i>
                刷新
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wide">总体概览</h3>
            {isRefreshing && (
              <span className="inline-flex items-center text-xs text-primary">
                <i className="fas fa-circle-notch animate-spin mr-1"></i> 刷新中
              </span>
            )}
          </div>

          <section aria-busy={isRefreshing} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div onClick={refreshCluster} role="button"> 
              <ClusterHealth Clusters={Clusters} />
            </div>
            <div onClick={refreshCore} role="button"> 
              <CoreResource CoreUsage={CoreUsage} />
            </div>
            <div onClick={refreshGpu} role="button"> 
              <GpuResource GpuUsage={GpuUsage} />
            </div>
            <div onClick={refreshJobs} role="button"> 
              <TasksMonitor JobStats={JobStats} />
            </div>
            <div onClick={refreshMemory} role="button"> 
              <MemMonitor totalMemory={MemoryUsage.totalMemory} usedMemory={MemoryUsage.usedMemory} usedPercent={MemoryUsage.usedPercent} />
            </div>
            <div onClick={refreshStorage} role="button"> 
              <StoMonitor StorageUsage={StorageUsage} />
            </div>
            <div onClick={refreshTemp} role="button"> 
              <TempMonitor TempUsage={TempUsage} />
            </div>
            <div onClick={refreshTaskCount} role="button"> 
              <TasksStat TaskCount={TaskCount} />
            </div>
          </section>
          
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wide">趋势与图表</h3>
          </div>

          <section aria-busy={isRefreshing} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ResCanvas isRefreshing={isRefreshing} />
                <TaskGraph TaskCount={TaskCount} />
          </section>
          
          
          <section aria-busy={isRefreshing} className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <TaskList isRefreshing={isRefreshing} />
          </section>
        </main> 
        )}
      </>
  );
}