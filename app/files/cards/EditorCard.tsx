"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TextEditor from "@/components/utils/TextEditor";
import { fetchExec } from "@/components/utils/sshClient";
import MyDebug from "@/components/utils/MyDebug";



export default function EditorCard( {pwd, openFile, onDiscard}:{pwd:string, openFile:string, onDiscard: () => void} ) {
	const [content, setContent] = useState<string>("");
	const [original, setOriginal] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const dirty = useMemo(() => content !== original, [content, original]);
	const [wrap, setWrap] = useState(false);

	const fullPath = useMemo(() => {
		// MyDebug(`EditorCard fullPath calc: pwd='${pwd}', openFile='${openFile}'`);
		if (!pwd || !openFile) return '';
		const clean = pwd.replace(/\/+$/,'');
		return `${clean}/${openFile}`;
	}, [pwd, openFile]);

	const loadFile = async () => {
		if (!openFile) { setContent(""); setOriginal(""); return; }
		setLoading(true);
		try {
			const out = await fetchExec(`cd "${pwd.replace(/"/g, '\\"')}" && base64 -w 0 -- "${openFile.replace(/"/g, '\\"')}"`);
			const b64 = (out || '').trim();
			const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
			const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
			setContent(text);
			setOriginal(text);
		} catch (e) {
			MyDebug('read file failed: ' + (e as any)?.message || String(e));
			setContent('');
			setOriginal('');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadFile(); }, [pwd, openFile]);

	const handleDiscard = () => {
		if (dirty && window.confirm('放弃未保存的更改？')) {
			setContent(original);
		}
		onDiscard();
	};

	const handleSave = async () => {
		if (!openFile) return;
		const marker = '__CPT_EOF__' + Math.random().toString(36).slice(2);
			const cmd = `cd "${pwd.replace(/"/g, '\\"')}" && cat > "${openFile.replace(/"/g, '\\"')}" <<'${marker}'\n${content}\n${marker}\n`;
		setLoading(true);
		try {
			await fetchExec(cmd);
			setOriginal(content);
		} catch (e) {
			MyDebug('save file failed: ' + (e as any)?.message || String(e));
			alert('保存失败');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={`bg-white rounded-xl shadow p-6 flex flex-col flex-1 min-h-0 overflow-hidden`}>
			<div className="flex flex-col flex-1 gap-3 min-h-0 overflow-hidden">
			    <div className="flex items-center justify-between gap-2">
					<div className="flex gap-2">
						<button className="btn-secondary cursor-pointer disabled:cursor-not-allowed" onClick={handleDiscard} disabled={loading}><i className="fas fa-rotate-left mr-1"/>放弃更改</button>
						<button className="btn-primary cursor-pointer disabled:cursor-not-allowed" onClick={handleSave} disabled={!dirty || loading}><i className="fas fa-save mr-1"/>保存</button>
					</div>
					
					<div className="flex max-w-md min-w-0 text-md text-gray-600 text-right" title={fullPath}>
						{openFile ? fullPath : '未选择文件'}
					</div>
				</div>

				<div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
					{openFile ? (
						<div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden rounded">
							<TextEditor value={content} onChange={setContent} filename={openFile} className="border border-gray-300 flex-1 w-full overflow-auto min-h-0 max-h-[calc(100vh-8rem)]" wrap={wrap}/>
							<div className="flex items-center gap-2 text-sm text-gray-600 justify-end mt-2">
								<label className="inline-flex items-center gap-2 cursor-pointer">
									<input className="form-checkbox cursor-pointer" type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} /> 自动换行
								</label>
							</div>
						</div>
					) : (
						<div className="flex flex-1 justify-center items-center text-gray-400 text-md">选择左侧文件以编辑</div>
					)}
				</div>
        
			</div>
		</div>
	);
}