"use client";
import JumpHome from "@/components/utils/jumpHome";
import { MyDebug } from "@/components/utils/MyDebug";
import { isSSHConnected, fetchExec } from "@/components/utils/sshClient";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FileManager from "./cards/FileManager";
import EditorCard from "./cards/EditorCard";
import MyAlert from "@/components/utils/MyAlert";

export default function FileClient() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <FileClientContent />
    </Suspense>
  )
}
function FileClientContent() {
  const searchParams = useSearchParams();
  const initialPwd = searchParams.get("pwd") || "$HOME";
  const [isRefreshing, setIsRefreshing] = useState(true); 
  const [pwd, setPwd] = useState<string>(initialPwd);
  const [editorShow, setEditorShow] = useState(false);
  const [openFile, setOpenFile] = useState<string>("");

  useEffect(() => {
    if (isRefreshing) {
      Promise.allSettled([
        new Promise(resolve => setTimeout(resolve, 1000)) // Ensure at least 1 second spinner
      ]).finally(() => setIsRefreshing(false));
    }
  }, [isRefreshing]);


  const handleOpenItem = (name: string, isDir: boolean, fileSize: string) => {
    const lessThan10MB = (sizeStr: string): boolean => {
      const sizePattern = /^([\d.]+)\s*(B|KB|MB|GB|TB)$/i;
      const match = sizeStr.match(sizePattern);
      if (!match) return false;
      const sizeValue = parseFloat(match[1]);
      const sizeUnit = match[2].toUpperCase();
      const sizeInBytes = sizeValue * (sizeUnit === 'B' ? 1 : sizeUnit === 'KB' ? 1024 : sizeUnit === 'MB' ? 1024 * 1024 : sizeUnit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024 * 1024 * 1024);
      return sizeInBytes < 10 * 1024 * 1024;
    }
    MyDebug(`Open item: ${name}, isDir: ${isDir}, size: ${fileSize}`);
    if (isDir) {
      const base = pwd.replace(/\/+$/, "");
      setOpenFile("");
      setPwd(`${base}/${name}`);
      setIsRefreshing(true);
    } else if (lessThan10MB(fileSize)) {
      setOpenFile(name);
      if (!editorShow) setEditorShow(true);
    } else {
      MyAlert('文件过大 (超过10MB)，无法在编辑器中打开');
    }
  };

  const handleChangePwd = (next: string) => {
    setOpenFile("");
    setPwd(next || "/");
    setIsRefreshing(true);
  };

  return (
    <>
      {!isSSHConnected() ? (
          <JumpHome />
        ) : (
        <main className="mx-auto px-4 lg:px-6 space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold">文件管理</h2>
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
            <h3 className="text-sm font-semibold text-gray-500 tracking-wide">文件管理器</h3>
            {isRefreshing && (
              <span className="inline-flex items-center text-xs text-primary">
                <i className="fas fa-circle-notch animate-spin mr-1"></i> 刷新中
              </span>
            )}

          </div>

          <section aria-busy={isRefreshing} className={`grid grid-cols-1 ${editorShow ? 'lg:grid-cols-2' : ''} gap-6 flex-1 overflow-hidden min-h-0`}>
            {/* File manager components */}
            <FileManager pwd={pwd} editorShow={editorShow} onOpenItem={handleOpenItem} onChangePwd={handleChangePwd} isRefreshing={isRefreshing} onToggleHidden={() => {setIsRefreshing(true)}} />
            {/* CodeMirror Editor */}
            {editorShow && (
              <EditorCard pwd={pwd} openFile={openFile} onDiscard={() => setEditorShow(false)} />
              // Editor enters, the left shrinks and the right slides in
            )}

          </section>


        </main> 
        )}
      </>
  );
}