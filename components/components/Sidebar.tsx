"use client";

import Link from "next/link";

type Props = { onSectionChange?: (section: string) => void, onDebugToggle?: (toggle: (prev: boolean) => boolean) => void };

export default function Sidebar({ onSectionChange, onDebugToggle }: Props) {
  const handle = (section: string) => {
    onSectionChange?.(section);
  };
  const ToggleDebug = () => {
    onDebugToggle?.(prev => !prev);
    console.log("Toggled Debug Panel from Sidebar");
  }

  return (
    <aside className={`bg-white shadow-lg w-16 flex flex-col items-center sidebar open`}>
      <Link href="/dashboard" aria-label="状态面板" className="group" onClick={() => handle("Dashboard")}>
        <div className="sidebar-icon">
        <i className="fas fa-tachometer text-xl!"></i>
        <span className="sidebar-tooltip group-hover:scale-100">状态面板</span>
        </div>
      </Link>

      <Link href="/files" aria-label="文件管理" className="group" onClick={() => handle("Files")}>
        <div className="sidebar-icon">
        <i className="fas fa-folder-open text-xl!"></i>
        <span className="sidebar-tooltip group-hover:scale-100">文件管理</span>
        </div>
      </Link>


      <Link href="/submit" aria-label="提交作业" className="group" onClick={() => handle("Submit")}>
        <div className="sidebar-icon">
        <i className="fas fa-upload text-xl!"></i>
        <span className="sidebar-tooltip group-hover:scale-100">提交作业</span>
        </div>
      </Link>
    

      <Link href="/tasks" aria-label="任务列表" className="group" onClick={() => handle("Tasks")}>
        <div className="sidebar-icon">
        <i className="fas fa-tasks text-xl!"></i>
        <span className="sidebar-tooltip group-hover:scale-100">任务列表</span>
        </div>
      </Link>

      <Link href="/interactive" aria-label="交互式作业" className="group" onClick={() => handle("Interactive")}>
        <div className="sidebar-icon">
        <i className="fas fa-terminal text-xl!"></i>
        <span className="sidebar-tooltip group-hover:scale-100">交互式作业</span>
        </div>
      </Link>

      <Link href="/AminoDB" aria-label="胺数据库" className="group" onClick={() => handle("AminoDB")}>
        <div className="sidebar-icon">
        <i className="fa fa-database text-xl!"></i>
        <span className="sidebar-tooltip group-hover:scale-100">胺数据库</span>
        </div>
      </Link>

      <Link href="/settings" aria-label="设置" className="group" onClick={() => handle("Settings")}>
        <div className="sidebar-icon">
        <i className="fas fa-cog text-xl!"></i>
        <span className="sidebar-tooltip group-hover:scale-100">设置</span>
        </div>
      </Link>
      
      <div className="mt-auto">
        <div className="sidebar-icon" onClick={() => ToggleDebug()} style={{ marginTop: 'auto' }}>
          <i className="fas fa-bug text-xl!"></i>
          <span className="sidebar-tooltip group-hover:scale-100">调试控制台</span>
        </div>
      </div>
      </aside>
    );
}
