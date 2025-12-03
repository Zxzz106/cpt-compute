"use client";

import { DataGrid, GridColDef, GridRowSelectionModel, GridRowParams } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { parsePwdFiles, parseRealPath } from "@/components/utils/parseExec";
import MyDebug from "@/components/utils/MyDebug";
import { fetchExec, sftpUpload, sftpDownload } from "@/components/utils/sshClient";
import { on } from "events";
import iconSelect from "@/components/resources/iconSelect";
import MyAlert from "@/components/utils/MyAlert";




export default function FileManager( {
        pwd, editorShow, onOpenItem, 
        onChangePwd, isRefreshing, onToggleHidden: onToggleHidden
    }:{
        pwd:string, editorShow:boolean, onOpenItem: (name: string, isDir: boolean, fileSize: string) => void, 
        onChangePwd: (nextPwd: string) => void, isRefreshing: boolean, onToggleHidden: () => void} ) {
    
    interface FileRow { id: number; name: string; pureName: string; size: string; modified: string; isDir: boolean }
    const [fileRows, setFileRows] = useState<FileRow[]>([]);
    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({type: "include", ids: new Set()});
    const [showHidden, setShowHidden] = useState<boolean>(false);
    const [copyBuffer, setCopyBuffer] = useState<{ sourcePwd: string; names: string[] } | null>(null);
    // type 1 for folder, 0 for file


    const clearSelection = () => {
        setRowSelectionModel({type: "include", ids: new Set()});
    }

    // Columns for the file list
    const columns: GridColDef[] = [
        { field: "name", headerName: "名称", flex: 1, minWidth: 160 },
        { field: "size", headerName: "大小", width: 80, align: "right", headerAlign: "right" },
        { field: "modified", headerName: "修改时间", flex: 0.8, minWidth: 160, align: "right", headerAlign: "right" },
    ];

    const refreshData = async () => {
        const fileData = await parsePwdFiles(pwd, showHidden);

        if (fileData && Array.isArray(fileData)) {
            const formattedData = fileData.map((file, index) => ({
                id: index+1,
                name: (file.type === 1 ? "📂" : iconSelect(file.name)) + " " + file.name,
                pureName: file.name,
                size: file.size,
                modified: file.modified,
                isDir: file.type === 1 ? true : false,
            }));
            setFileRows(formattedData);
            // MyDebug('FileManager Details: ' + JSON.stringify(formattedData));
            return;
        } else {
            setFileRows([]);
            return;
        }
    };
    useEffect(() => {
        if (!isRefreshing) {
            return;
        }
        refreshData();
    }, [isRefreshing, pwd, showHidden]);

    const breadcrumbs = useMemo(() => {
        if (!pwd) return [] as string[];
        const parts = pwd.split('/').filter(Boolean);
        const rootslash = pwd.startsWith('/') ? '/' : '';
        const paths: string[] = [];
        let current = rootslash;
        for (let i = 0; i < parts.length; i++) {
            current = (current === '/' ? '/' : current + '/') + parts[i];
            paths.push(current);
        }
        return paths;
    }, [pwd]);


    const handleRowClick = (params: GridRowParams) => {
        const row: any = params.row;
        if (!row) return;
        const isDir = !!row.isDir;
        const pureName = row.pureName as string;
        if (!pureName) return;
        const fileSize = row.size as string;
        onOpenItem(pureName, isDir, fileSize);
    };

    const esc = (s: string) => s.replace(/"/g, '\\"');

    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            const sub = bytes.subarray(i, i + chunk);
            binary += String.fromCharCode.apply(null, Array.from(sub) as any);
        }
        return btoa(binary);
    };

    const handleNewFolder = async () => {
        const name = window.prompt('新建文件夹名称');
        if (!name) return;
        try {
            await fetchExec(`cd "${pwd.replace(/"/g, '\\"')}" && mkdir -p -- "${name.replace(/"/g, '\\"')}"`);
            await refreshData();
        } catch (e) {
            MyDebug('mkdir failed: ' + (e as any)?.message || String(e));
            MyAlert('新建文件夹失败');
        }
    };

    const handleNewFile = async () => {
        const name = window.prompt('新建文件名称');
        if (!name) return;
        try {
            await fetchExec(`cd "${esc(pwd)}" && touch -- "${esc(name)}"`);
            await refreshData();
            onOpenItem(name, false, '0');
        } catch (e) {
            MyDebug('new file failed: ' + ((e as any)?.message || String(e)));
            MyAlert('新建文件失败');
        }
    };

    const handleUpload = async () => {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = async () => {
                const files = Array.from(input.files || []);
                for (const f of files) {
                    if (f.size > 2 * 1024 * 1024 * 1024) { // 2GB 安全上限，防止超时
                        MyAlert(`暂不支持上传超过2GB的文件：${f.name}`);
                        continue;
                    }
                    try {
                        const ab = await f.arrayBuffer();
                        const b64 = arrayBufferToBase64(ab);
                        const fullPath = await parseRealPath(`${pwd.replace(/^\/\$HOME/, '$HOME').replace(/\/$/, '')}/${f.name}`) || `${pwd.replace(/^\/\$HOME/, '$HOME').replace(/\/$/, '')}/${f.name}`;
                        await sftpUpload(fullPath, b64, 0o644);
                    } catch (e) {
                        MyDebug('upload one file failed: ' + ((e as any)?.message || String(e)));
                        MyAlert(`上传失败：${f.name}`);
                    }
                }
                await refreshData();
            };
            input.click();
        } catch (e) {
            MyDebug('upload failed: ' + ((e as any)?.message || String(e)));
            MyAlert('上传失败');
        }
    };

    const handleDownload = async () => {
        if (selectedItems.length !== 1) {
            MyAlert('请选择单个文件进行下载');
            return;
        }
        const item = selectedItems[0];
        if (item.isDir) {
            MyAlert('暂不支持下载文件夹');
            return;
        }
        try {
            const fullPath = await parseRealPath(`${pwd.replace(/^\/\$HOME/, '$HOME').replace(/\/$/, '')}/${item.pureName}`) || `${pwd.replace(/^\/\$HOME/, '$HOME').replace(/\/$/, '')}/${item.pureName}`;
            const b64 = (await sftpDownload(fullPath)).trim();
            const byteString = atob(b64);
            const len = byteString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = byteString.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'application/octet-stream' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = item.pureName;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                URL.revokeObjectURL(a.href);
                try { document.body.removeChild(a); } catch {}
            }, 2000);
        } catch (e) {
            MyDebug('download failed: ' + ((e as any)?.message || String(e)));
            MyAlert('下载失败');
        } finally {
            clearSelection();
        }
    };

    const handleCopy = () => {
        if (selectedItems.length === 0) {
            MyAlert('请选择要复制的文件/文件夹');
            return;
        }
        setCopyBuffer({ sourcePwd: pwd, names: selectedItems.map(it => it.pureName) });
        MyAlert(`已复制 ${selectedItems.length} 个项目`);
        clearSelection();
    };

    const handlePaste = async () => {
        if (!copyBuffer) {
            MyAlert('剪贴板为空');
            return;
        }
        if (copyBuffer.sourcePwd === pwd) {
            MyAlert('源目录与目标目录相同，请切换到其他目录后粘贴');
            return;
        }
        try {
            const src = esc(copyBuffer.sourcePwd);
            const dst = esc(pwd);
            const cmds = copyBuffer.names.map(n => `cp -r -p -- "${src}/${esc(n)}" "${dst}/"`).join(' ; ');
            await fetchExec(cmds);
            await refreshData();
            MyAlert('粘贴完成');
        } catch (e) {
            MyDebug('paste failed: ' + ((e as any)?.message || String(e)));
            alert('粘贴失败');
        } finally {
            // setCopyBuffer(null);
        }
    };

    const selectedItems: FileRow[] = useMemo(() => {
        let idsSet: Set<string | number> = new Set();
        let exclude = false;
        if (Array.isArray(rowSelectionModel)) {
            idsSet = new Set(rowSelectionModel as (string | number)[]);
        } else if (rowSelectionModel && typeof rowSelectionModel === 'object' && 'ids' in (rowSelectionModel as any)) {
            const model: any = rowSelectionModel as any;
            const ids = model.ids;
            if (ids instanceof Set) {
                idsSet = ids as Set<string | number>;
            } else if (Array.isArray(ids)) {
                idsSet = new Set(ids as (string | number)[]);
            }
            exclude = model.type === 'exclude';
        }
        if (!exclude) {
            return fileRows.filter(r => idsSet.has(r.id));
        }
        return fileRows.filter(r => !idsSet.has(r.id));
    }, [rowSelectionModel, fileRows]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter') {
            if (selectedItems.length > 0) {
                const first = selectedItems[0];
                onOpenItem(first.pureName, first.isDir, first.size);
            }
        } else if (e.key === 'F2') {
            e.preventDefault();
            if (selectedItems.length === 1) {
                handleRename();
            }
        } else if (e.key === 'Delete') {
            e.preventDefault();
            if (selectedItems.length > 0) {
                handleDelete();
            }
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            // Go up one directory
            if (pwd && pwd !== '/' && pwd !== '$HOME') {
                const up = pwd.replace(/\/$/,'').split('/').filter(Boolean).slice(0, -1);
                const newPwd = (pwd.startsWith('/') ? '/' : '') + up.join('/');
                onChangePwd(newPwd === '' ? '/' : newPwd);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            clearSelection();
        }
    };

    const handleDelete = async () => {
        MyDebug(`Deleting ${selectedItems.length} items`);
        if (selectedItems.length === 0) return;
        if (!window.confirm(`确认删除选中的 ${selectedItems.length} 个项目？`)) return;
        try {
            const cmds = selectedItems.map(it => `rm -rf -- "${it.pureName.replace(/"/g, '\\"')}"`).join(' ; ');
            await fetchExec(`cd "${pwd.replace(/"/g, '\\"')}" && ${cmds}`);
            await refreshData();
        } catch (e) {
            MyDebug('delete failed: ' + (e as any)?.message || String(e));
            alert('删除失败');
        } finally {
            clearSelection();
        }
    };

    const handleRename = async () => {
        if (selectedItems.length !== 1) {
            alert('请只选择一个项目进行重命名');
            return;
        }
        const oldName = selectedItems[0].pureName;
        const newName = window.prompt('输入新名称', oldName);
        if (!newName || newName === oldName) return;
        try {
            await fetchExec(`cd "${pwd.replace(/"/g, '\\"')}" && mv -f -- "${oldName.replace(/"/g, '\\"')}" "${newName.replace(/"/g, '\\"')}"`);
            await refreshData();
        } catch (e) {
            MyDebug('rename failed: ' + (e as any)?.message || String(e));
            alert('重命名失败');
        } finally {
            clearSelection();
        }
    };

    const handleCompress = async () => {
        if (selectedItems.length === 0) {
            MyAlert('请选择要压缩的文件/文件夹');
            return;
        }
        const archiveName = (pwd.replace(/\/$/, '').split('/').filter(part => part).pop() || 'archive') + '_' + Date.now() + '.zip';
        try {
            const items = selectedItems.map(it => `"${it.pureName.replace(/"/g, '\\"')}"`).join(' ');
            MyAlert(`正在压缩，文件名：${archiveName}`);
            await fetchExec(`cd "${pwd.replace(/"/g, '\\"')}" && zip -r -q "${archiveName.replace(/"/g, '\\"')}" ${items}`, 60000);
            await refreshData();
            MyAlert(`压缩完成，生成文件：${archiveName}`);
        } catch (e) {
            MyDebug('compress failed: ' + ((e as any)?.message || String(e)));
            MyAlert('压缩失败');
        } finally {
            clearSelection();
        }
    }

    const handleExtract = async () => {
        if (selectedItems.length === 0) {
            MyAlert('请选择要解压的文件/文件夹');
            return;
        }
        if (selectedItems.length !== 1) {
            MyAlert('请选择单个压缩文件进行解压');
            return;
        }
        const item = selectedItems[0];
        if (item.isDir || !item.pureName.toLowerCase().endsWith('.zip')) {
            MyAlert('请选择ZIP格式的压缩文件进行解压');
            return;
        }
        try {
            MyAlert(`正在解压：${item.pureName}`);
            await fetchExec(`cd "${pwd.replace(/"/g, '\\"')}" && unzip -o -q "${item.pureName.replace(/"/g, '\\"')}" -d "${item.pureName.replace(/"/g, '\\"')}_extracted"`, 60000); 
            await refreshData();
            MyAlert(`解压完成，生成文件夹：${item.pureName}_extracted`);
        } catch (e) {
            MyDebug('extract failed: ' + ((e as any)?.message || String(e)));
            MyAlert('解压失败');
        } finally {
            clearSelection();
        }
    }

	return (
        <div className={`bg-white rounded-xl shadow p-6 h-full flex flex-col`}>
            <div className="flex flex-col gap-3 h-full">


                {/* Header: actions + breadcrumbs */}
                <div className="flex flex-col items-start justify-between gap-3 flex-wrap">
                    <div className="flex flex-wrap gap-2 items-center justify-between w-full">
                        <div className="flex gap-2 justify-between items-center">
                            <button className="btn-primary cursor-pointer" onClick={handleUpload}><i className="fas fa-upload mr-1"/>上传</button>
                            <button className="btn-primary cursor-pointer" onClick={handleDownload} disabled={!(selectedItems.length === 1 && !selectedItems[0].isDir)}><i className="fas fa-download mr-1"/>下载</button>
                            <p> </p>
                            <button className="btn-secondary cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400 relative icon-wrapper border border-gray-200 rounded-lg p-1 hover:bg-primary" onClick={handleNewFile} disabled={false}>
                                <i className="fas fa-file-alt m-1 text-xl"/>
                                <span className="icon-tooltip">新建文件</span>
                            </button>
                            <button className="btn-secondary cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400 relative icon-wrapper border border-gray-200 rounded-lg p-1" onClick={handleNewFolder} disabled={false}>
                                <i className="fas fa-folder-plus m-1 hover:text-primary text-xl"/>
                                <span className="icon-tooltip">新建文件夹</span>
                            </button>
                            <button className="btn-secondary cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400 relative icon-wrapper border border-gray-200 rounded-lg p-1" onClick={handleRename} disabled={!(selectedItems.length === 1)}>
                                <i className="fas fa-edit m-1 hover:text-primary text-xl"/>
                                <span className="icon-tooltip">重命名</span>
                            </button>
                            <button className="btn-secondary cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400 relative icon-wrapper border border-gray-200 rounded-lg p-1" onClick={handleCopy} disabled={selectedItems.length === 0}>
                                <i className="fas fa-copy m-1 hover:text-primary text-xl"/>
                                <span className="icon-tooltip">复制</span>
                               </button>
                            <button className="btn-secondary cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400 relative icon-wrapper border border-gray-200 rounded-lg p-1" onClick={handlePaste} disabled={!copyBuffer}>
                                <i className="fas fa-paste m-1 hover:text-primary text-xl"/>
                                <span className="icon-tooltip">粘贴</span>
                            </button>
                            <button className="btn-danger cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400 relative icon-wrapper border border-gray-200 rounded-lg p-1" onClick={handleDelete} disabled={selectedItems.length === 0}>
                                <i className="fas fa-trash m-1 text-xl"/>
                                <span className="icon-tooltip">删除</span>
                            </button>
                            <button className="btn-secondary cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400 relative icon-wrapper border border-gray-200 rounded-lg p-1" onClick={handleCompress} disabled={selectedItems.length === 0}>
                                <i className="fas fa-file-archive m-1 hover:text-primary text-xl"/>
                                <span className="icon-tooltip">压缩</span>
                            </button>
                            <button className="btn-secondary cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400 relative icon-wrapper border border-gray-200 rounded-lg p-1" onClick={handleExtract} disabled={selectedItems.length !== 1}>
                                <i className="fas fa-box-open m-1 hover:text-primary text-xl"/>
                                <span className="icon-tooltip">解压</span>
                            </button>

                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                <input className="form-checkbox cursor-pointer" type="checkbox" checked={showHidden} onChange={(e) => { setShowHidden(e.target.checked); onToggleHidden(); }} /> 隐藏文件
                            </label>
                        </div>
                    </div>


                    <div className="flex justify-between items-center min-w-0 overflow-x-auto p-1 w-full">
                        <div className="flex-shrink-0 px-2">
                            <button className="btn-secondary float-right text-sm" onClick={() => {onChangePwd('$HOME')}}><i className="fas fa-home"/></button>
                        </div>
                        <div className="flex flex-1 text-sm text-gray-600 whitespace-wrap text-start border border-gray-300 p-2 rounded-lg" >
                            {breadcrumbs.length === 0 ? (
                                <span>{pwd}</span>
                            ) : (
                                <>
                                    {breadcrumbs.map((full, idx) => {
                                        const name = full === '/' ? '/' : full.split('/').filter(Boolean).slice(-1)[0];
                                        return (
                                            <span key={full}>
                                                <button className="text-primary hover:underline" onClick={() => onChangePwd(full)}>{name}</button>
                                                {idx < breadcrumbs.length - 1 && <span className="mx-1 text-gray-400">/</span>}
                                            </span>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                            <button className="btn-primary float-right text-xs" onClick={async () => {navigator.clipboard.writeText(pwd).then(() => MyAlert("路径已复制到剪贴板"))}}><i className="fas fa-copy mr-1"/>复制</button>
                        </div>
                    </div>
                </div>

                {/* Table area */}
                <div className="flex-1 min-w-0 overflow-hidden"> 
                    {/* List show Files */}
                    <div className="w-full overflow-y-auto h-full">
                        <div tabIndex={0} onKeyDown={handleKeyDown} className="focus:outline-none h-full border border-gray-300 rounded-lg max-h-[calc(100vh-10rem)]">
                        <DataGrid
                            rows={fileRows}
                            columns={columns}
                            density="compact"
                            checkboxSelection
                            disableRowSelectionOnClick
                            rowSelectionModel={rowSelectionModel}
                            onRowSelectionModelChange={setRowSelectionModel}
                            autoHeight={false}
                            sx={{
                                height: '100%',
                                // minHeight: '200px',
                                '& .MuiDataGrid-cell': { outline: 'none' },
                                '& .even-row': {
                                    backgroundColor: '#f7f7f7',
                                },
                                '& .odd-row': {
                                    backgroundColor: '#ffffff',
                                },
                                '& .MuiDataGrid-columnHeaders': { position: 'sticky', top: 0, backgroundColor: 'inherit', zIndex: 1 },
                                '& .MuiDataGrid-footerContainer': { position: 'sticky', bottom: 0, backgroundColor: 'inherit', zIndex: 1 },
                                '& .MuiDataGrid-virtualScroller': { overflowY: 'auto' }
                            }}
                            getRowClassName={(params) =>
                                (params.indexRelativeToCurrentPage ?? 0) % 2 === 0 ? 'even-row' : 'odd-row'
                            }
                            onRowDoubleClick={handleRowClick}
                        />
                        </div>
                    </div>

                </div>

			</div>
		</div>
	);
}