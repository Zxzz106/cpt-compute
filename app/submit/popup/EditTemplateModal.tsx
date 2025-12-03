"use client";

import React from "react";
import { EnvVar } from "../cards/TemplateCard";

export default function EditTemplateModal({
  isOpen,
  tplName,
  tplVersionLabel,
  tplDescription,
  tplScript,
  tplEnv,
  sanitize,
  setTplName,
  setTplVersionLabel,
  setTplDescription,
  setTplScript,
  addEnvVar,
  updateEnvVar,
  removeEnvVar,
  onClose,
  onTempChange,
}: {
  isOpen: boolean;
  tplName: string;
  tplVersionLabel: string;
  tplDescription: string;
  tplScript: string;
  tplEnv: EnvVar[];
  sanitize: (v: string) => string;
  setTplName: (v: string) => void;
  setTplVersionLabel: (v: string) => void;
  setTplDescription: (v: string) => void;
  setTplScript: (v: string) => void;
  addEnvVar: () => void;
  updateEnvVar: (idx: number, field: keyof EnvVar, value: string) => void;
  removeEnvVar: (idx: number) => void;
  onClose: () => void;
  onTempChange: () => void;
}) {
  if (!isOpen) return null;
  const [errors, setErrors] = React.useState<string[]>([]);
  const idPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

  const onSave = () => {
    const newErrors: string[] = [];
    const name = tplName.trim();
    const verLabel = (tplVersionLabel.trim() || "v1");
    const script = tplScript.trim();
    if (!name) newErrors.push("模板名称不能为空");
    if (name && !idPattern.test(name)) newErrors.push("模板名称只能包含字母和下划线");
    if (!verLabel) newErrors.push("版本标签不能为空");
    if (verLabel && !idPattern.test(verLabel)) newErrors.push("版本标签只能包含字母和下划线");
    if (!script) newErrors.push("脚本不能为空");
    tplEnv.forEach((v, i) => {
      if (!v.name.trim()) newErrors.push(`环境变量第${i + 1}名称不能为空`);
      if (v.name.trim() && !idPattern.test(v.name.trim())) newErrors.push(`环境变量第${i + 1}名称只能包含字母和下划线`);
      if (v.type === "select" && (!v.options || v.options.length === 0)) newErrors.push(`环境变量第${i + 1}需要至少一个选项`);
    });

    const userTemplates = localStorage.getItem("userTemplates");
    let parsed: { name: string; version: Record<string, { environment: EnvVar[]; script: string }>; description?: string }[] = [];
    if (userTemplates) {
      try {
        parsed = JSON.parse(userTemplates) as any[];
      } catch {
        parsed = [];
      }
    }

    // In edit mode, if same name+version exists, we will replace it

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const normalizedEnv = tplEnv.map((v) => (
      v.type === "select" ? v : { ...v, options: undefined }
    ));

    // Replace if exists, otherwise upsert under current name
    const targetIdx = parsed.findIndex(t => t.name === name);
    if (targetIdx !== -1) {
      parsed[targetIdx].version[verLabel] = { environment: normalizedEnv, script: tplScript };
      parsed[targetIdx].description = tplDescription;
    } else {
      parsed.push({ name, version: { [verLabel]: { environment: normalizedEnv, script: tplScript } }, description: tplDescription });
    }

    localStorage.setItem("userTemplates", JSON.stringify(parsed));
    setErrors([]);
    onClose();
    onTempChange();
  };

  const onDeleteVersion = () => {
    const userTemplates = localStorage.getItem("userTemplates");
    let parsed: { name: string; version: Record<string, { environment: EnvVar[]; script: string }>; description?: string }[] = [];
    if (userTemplates) {
      try {
        parsed = JSON.parse(userTemplates) as any[];
      } catch {
        parsed = [];
      }
    }
    const idx = parsed.findIndex(t => t.name === tplName);
    if (idx !== -1) {
      delete parsed[idx].version[tplVersionLabel];
      if (Object.keys(parsed[idx].version).length === 0) {
        parsed.splice(idx, 1);
      }
      localStorage.setItem("userTemplates", JSON.stringify(parsed));
      onClose();
      onTempChange();
    }
  };

  const onDeleteAll = () => {
    const userTemplates = localStorage.getItem("userTemplates");
    let parsed: { name: string; version: Record<string, { environment: EnvVar[]; script: string }>; description?: string }[] = [];
    if (userTemplates) {
      try {
        parsed = JSON.parse(userTemplates) as any[];
      } catch {
        parsed = [];
      }
    }
    const next = parsed.filter(t => t.name !== tplName);
    localStorage.setItem("userTemplates", JSON.stringify(next));
    onClose();
    onTempChange();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">编辑用户模板</h2>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>
        {errors.length > 0 && (
          <div className="mb-4 space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="text-sm text-red-600">{e}</div>
            ))}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">模板名称</label>
            <input className="w-full border rounded px-3 py-2" value={tplName} onChange={(e) => setTplName(sanitize(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">版本标签</label>
            <input className="w-full border rounded px-3 py-2" value={tplVersionLabel} onChange={(e) => setTplVersionLabel(sanitize(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">描述</label>
            <input className="w-full border rounded px-3 py-2" value={tplDescription} onChange={(e) => setTplDescription(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">脚本</label>
            <textarea className="w-full h-40 border rounded px-3 py-2 font-mono" value={tplScript} onChange={(e) => setTplScript(e.target.value)} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-600">环境变量</label>
              <button className="text-primary hover:underline" onClick={addEnvVar}>+ 添加变量</button>
            </div>
            <div className="space-y-2">
              {tplEnv.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-9 gap-2 items-center">
                  <input className="border rounded px-2 py-1 md:col-span-2" placeholder="名称" value={item.name} onChange={(e) => updateEnvVar(idx, "name", sanitize(e.target.value))} />
                  <input className="border rounded px-2 py-1 md:col-span-4" placeholder="描述" value={item.description} onChange={(e) => updateEnvVar(idx, "description", e.target.value)} />
                  <select className="border rounded px-2 py-1 md:col-span-2" value={item.type} onChange={(e) => updateEnvVar(idx, "type", e.target.value)}>
                    <option value="string">string</option>
                    <option value="file">file</option>
                    <option value="select">select</option>
                  </select>
                  <button className="text-red-600 md:col-span-1" onClick={() => removeEnvVar(idx)}>删除</button>
                </div>
              ))}
              {tplEnv.map((item, idx) => (
                item.type === "select" ? (
                  <div key={`edit-opts-${idx}`} className="grid grid-cols-1 gap-2">
                    <input
                      className="border rounded px-2 py-1"
                      placeholder="选项（用逗号分隔）"
                      value={(item.options || []).join(",")}
                      onChange={(e) => {
                        const parts = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                        // options update via updateEnvVar is typed workaround
                        updateEnvVar(idx, "options" as unknown as keyof EnvVar, parts as unknown as string);
                      }}
                    />
                  </div>
                ) : null
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-red-300 text-red-600 rounded" onClick={onDeleteVersion}>删除版本</button>
            <button className="px-4 py-2 border border-red-500 text-red-700 rounded" onClick={onDeleteAll}>删除模板</button>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border rounded" onClick={onClose}>取消</button>
            <button className="px-4 py-2 bg-primary text-white rounded" onClick={onSave}>保存修改</button>
          </div>
        </div>
      </div>
    </div>
  );
}
