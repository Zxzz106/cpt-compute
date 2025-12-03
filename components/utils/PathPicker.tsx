"use client";

import { useEffect, useState } from "react";
import FileManager from "@/app/files/cards/FileManager";

export default function PathPicker({
  visible,
  initialPath,
  mode,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  initialPath: string; // like "$HOME" or absolute path
  mode: "dir" | "file";
  onCancel: () => void;
  onConfirm: (absPath: string) => void; // returns path like "$HOME/..." or "/..."
}) {
  const [pwd, setPwd] = useState<string>(initialPath || "$HOME");
  const [chosenFile, setChosenFile] = useState<string | null>(null);

  useEffect(() => {
    setPwd(initialPath || "$HOME");
    setChosenFile(null);
  }, [initialPath, visible]);

  const joinPath = (base: string, name: string) => {
    if (!base || base === "/") return `/${name}`;
    return `${base.replace(/\/$/, "")}/${name}`;
  };

  const confirmLabel = mode === "dir" ? "选择此目录" : "选择此文件";
  const headerLabel = mode === "dir" ? "选择目录" : "选择文件";
  const basename = (p: string) => {
    if (!p) return p;
    const idx = p.lastIndexOf('/');
    return idx >= 0 ? p.slice(idx + 1) : p;
  };

  return (
    visible ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
        <div className="bg-white rounded-xl shadow-2xl w-[min(95vw,1100px)] h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">{headerLabel}</h3>
            <div className="flex items-center gap-2">
              <button className="btn-secondary btn-sm" onClick={onCancel}>取消</button>
              <button
                className="btn-primary btn-sm"
                disabled={mode === "file" && !chosenFile}
                onClick={() => {
                  const path = mode === "dir" ? pwd : basename(chosenFile || "");
                  onConfirm(path);
                }}
              >{confirmLabel}</button>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-4">
            <FileManager
              pwd={pwd}
              editorShow={false}
              onOpenItem={(name, isDir, _size) => {
                if (isDir) {
                  setPwd((cur) => joinPath(cur, name));
                  setChosenFile(null);
                } else if (mode === "file") {
                  setChosenFile(joinPath(pwd, name));
                }
              }}
              onChangePwd={(next) => {
                setPwd(next);
                setChosenFile(null);
              }}
              isRefreshing={true}
              onToggleHidden={() => {}}
            />
          </div>
          {mode === "file" && chosenFile && (
            <div className="px-4 py-2 border-t text-sm text-gray-600">已选择文件：{basename(chosenFile)}</div>
          )}
        </div>
      </div>
    ) : null
  );
}
