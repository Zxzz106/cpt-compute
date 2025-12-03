"use client";

import templates from "@/components/configs/templates.json";
import MyDebug from "@/components/utils/MyDebug";
import NewTemplateModal from "../popup/NewTemplateModal";
import EditTemplateModal from "../popup/EditTemplateModal";
import { useEffect, useMemo, useState } from "react";

export type EnvVar = {
  name: string;
  description: string;
  type: "string" | "file" | "select";
  options?: string[];
};

type VerInfo = {
  environment: EnvVar[];
  script: string;
}

type TemplateInfo = {
  name: string;
  version: Record<string, VerInfo>;
  description?: string;
};

type TemplateRoot = TemplateInfo[];


function TemplateItem({ tpl, loc, onSelect, onClick, isEditing, onEdit }: { tpl: TemplateInfo; loc: string; onSelect: (e: EnvVar[], s: string) => void; onClick?: () => void; isEditing?: boolean; onEdit?: (tpl: TemplateInfo, versionKey: string) => void }) {
  return (
    Object.keys(tpl.version).map((v) => (
      <button
        key={`${tpl.name}_${v}_${loc}`}
        className="group flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md hover:bg-blue-100 active:bg-blue-200 transition icon-wrapper relative cursor-pointer min-w-0 overflow-hidden text-left"
        onClick={() => {
          if (loc === "user" && isEditing && onEdit) {
            MyDebug(`Editing user template: ${tpl.name}, ${v}`);
            onEdit(tpl, v);
            return;
          }
          onSelect(tpl.version[v].environment, tpl.version[v].script)
          if (onClick) onClick();
        }}>
        <div className="flex items-start justify-between">
          <div className="text-left">
            <div className="text-sm text-gray-500">{loc}</div>
            <div className="text-lg font-semibold text-gray-900 capitalize">{tpl.name}</div>
          </div>
          <span className={`rounded-full px-2 py-1 text-sm font-medium ${loc=="default" ? "text-primary bg-blue-50 group-hover:bg-blue-100" : "text-secondary bg-green-50 group-hover:bg-green-100"}  transition`}>
            {v}
          </span>
        </div>
      </button>
    )));
}

export default function TemplateCard({ onSelect, isRefreshing, onTempChange, isEditing }: { onSelect: (e: EnvVar[], s: string) => void, isRefreshing: boolean, onTempChange: () => void, isEditing: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplVersionLabel, setTplVersionLabel] = useState("v1");
  const [tplDescription, setTplDescription] = useState("");
  const [tplScript, setTplScript] = useState("#! /bin/bash\n\n");
  const [tplEnv, setTplEnv] = useState<EnvVar[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const idPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const sanitize = (v: string) => {
    if (!v) return '';
    const firstChar = v[0].replace(/[^A-Za-z_]/g, '');
    const rest = v.slice(1).replace(/[^A-Za-z0-9_]/g, '');
    return firstChar + rest;
  };
  const [editOriginalName, setEditOriginalName] = useState<string>("");
  const [editOriginalVer, setEditOriginalVer] = useState<string>("");

  const data = useMemo(() => {
    try {
      const files = (templates as unknown) as TemplateRoot;
      return files.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      MyDebug("Failed to load templates.json");
      return [];
    }
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      const userTemplates = localStorage.getItem("userTemplates");
      if (!userTemplates) {
        MyDebug("Initialized user templates in localStorage");
        setUserdata([]);
        return;
      }
      try {
        const parsed = JSON.parse(userTemplates) as TemplateInfo[];
        setUserdata(parsed);
      } catch {
        MyDebug("Failed to parse user templates from localStorage");
        setUserdata([]);
      }
      return;
    }
  }, [isRefreshing]);
  const [userdata, setUserdata] = useState<TemplateInfo[]>([]);
  useEffect(() => {
    const userTemplates = localStorage.getItem("userTemplates");
    if (!userTemplates) { 
      MyDebug("Initialized user templates in localStorage");
      setUserdata([]);
      return;
    }
    try {
      const parsed = JSON.parse(userTemplates) as TemplateInfo[];
      setUserdata(parsed);
    } catch {
      MyDebug("Failed to parse user templates from localStorage");
      setUserdata([]);
    }
  }, []);

  const addUserTemplate = () => {
    setIsOpen(true);
  }

  const resetForm = () => {
    setTplName("");
    setTplVersionLabel("");
    setTplDescription("");
    setTplScript("#! /bin/bash\n\n");
    setTplEnv([]);
  };

  // save logic moved into NewTemplateModal

  const addEnvVar = () => {
    setTplEnv((prev) => ([...prev, { name: "", description: "", type: "string" }]));
  };

  const updateEnvVar = (idx: number, field: keyof EnvVar, value: string) => {
    setTplEnv((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const next = { ...item, [field]: value } as EnvVar;
      // when changing type away from select, drop options
      if (field === "type" && value !== "select") {
        next.options = undefined;
      }
      return next;
    }));
  };

  const removeEnvVar = (idx: number) => {
    setTplEnv((prev) => prev.filter((_, i) => i !== idx));
  };

  const openEditTemplate = (tpl: TemplateInfo, versionKey: string) => {
    setErrors([]);
    setTplName(tpl.name);
    setTplVersionLabel(versionKey);
    setTplDescription(tpl.description || "");
    setTplScript(tpl.version[versionKey].script);
    setTplEnv((tpl.version[versionKey].environment || []).map(v => ({ ...v })));
    setEditOriginalName(tpl.name);
    setEditOriginalVer(versionKey);
    setIsEditOpen(true);
  };

  // edit/save/delete logic moved into EditTemplateModal

  // deleteTemplateVersion moved

  // deleteTemplateAll moved

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">

        {data.map((t) => (
            <TemplateItem key={`${t.name}_default`} tpl={t} loc="default" onSelect={onSelect} />
          ))
        }
        {userdata.map((t) => (
            <TemplateItem key={`${t.name}_user`} tpl={t} loc="user" onSelect={onSelect} isEditing={isEditing} onEdit={openEditTemplate} />
          ))
        }

        <TemplateItem key="create" tpl={ {name: "自定义", version: {"+": {environment: [] as EnvVar[], script: "#! /bin/bash\n\n"} as VerInfo}, description:"用户自定义" } as TemplateInfo } loc="New" onSelect={onSelect} onClick={addUserTemplate} />
        <NewTemplateModal
          isOpen={isOpen}
          tplName={tplName}
          tplVersionLabel={tplVersionLabel}
          tplDescription={tplDescription}
          tplScript={tplScript}
          tplEnv={tplEnv}
          sanitize={sanitize}
          setTplName={setTplName}
          setTplVersionLabel={setTplVersionLabel}
          setTplDescription={setTplDescription}
          setTplScript={setTplScript}
          addEnvVar={addEnvVar}
          updateEnvVar={updateEnvVar}
          removeEnvVar={removeEnvVar}
          onClose={() => setIsOpen(false)}
          onTempChange={onTempChange}
        />

        <EditTemplateModal
          isOpen={isEditOpen}
          tplName={tplName}
          tplVersionLabel={tplVersionLabel}
          tplDescription={tplDescription}
          tplScript={tplScript}
          tplEnv={tplEnv}
          sanitize={sanitize}
          setTplName={setTplName}
          setTplVersionLabel={setTplVersionLabel}
          setTplDescription={setTplDescription}
          setTplScript={setTplScript}
          addEnvVar={addEnvVar}
          updateEnvVar={updateEnvVar}
          removeEnvVar={removeEnvVar}
          onClose={() => setIsEditOpen(false)}
          onTempChange={onTempChange}
        />

    </div>
  );
}