"use client";

import { parseTmuxActive } from "@/components/utils/parseExec";
import MyAlert from "@/components/utils/MyAlert";
import { parse, resolve } from "path";
import { use, useEffect, useState } from "react";
import { promiseHooks } from "v8";
import { fetchExec } from "@/components/utils/sshClient";
import MyDebug from "@/components/utils/MyDebug";

type TmuxSessions = {
  id: string;
  name: string;
  time: string;
  attached?: boolean;
}

export default function ShowSessions({ onAttach, activeSession, sessionName }: { onAttach: (session: {id: string, name: string}) => void, activeSession?: string, sessionName?: string }) {
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [tmuxSessions, setTmuxSessions] = useState<TmuxSessions[]>([]);
  const refreshdata = async () => {
    const sessions = await parseTmuxActive();
    return sessions
  };
  const delayedRefresh = () => {
    new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
      refreshdata().then((sessions) => {
        setTmuxSessions(Array.isArray(sessions) ? sessions : []);
      });
    });
  }
  const handleAttach = (id: string, name: string) => {
    if (!id) return;
    onAttach({id, name});
    MyAlert(`准备附着到会话: ${id}`, 800);
    delayedRefresh();
  };
  const handleDetach = async (id: string, name: string) => {
    if (!id) return;
    MyAlert(`准备从会话分离: ${id}`, 800);
    onAttach({id: '', name: ''});
    try {
      const output = await fetchExec(`tmux detach -s \\${id}`);
      MyAlert(`已从会话分离: ${id}`, 800);
      MyDebug(`Detached from session: ${id}: ${output}`);
    } catch (error: any) {
      MyAlert(`分离会话失败: ${error.message || error.toString()}`, 3000);
      return;
    } finally {
      delayedRefresh();
    }
    // try {
    //   const { detachTmuxSession } = await import('@/components/utils/sshClient');
    //   await detachTmuxSession(id);
    //   MyAlert(`已从会话分离: ${id}`, 800);
    //   setIsRefreshing(true);
    // } catch (error: any) {
    //   MyAlert(`分离会话失败: ${error.message || error.toString()}`, 3000, 'error');
    // }
  }
  const handleDelete = async (id: string, name: string) => {
    if (!id) return;
    if (!confirm(`确定要删除会话: ${id} 吗？此操作不可撤销。`)) return;
    MyAlert(`正在删除会话: ${id}`, 800);
    try {
      const output = await fetchExec(`tmux kill-session -t \\${id}`);
      MyAlert(`已删除会话: ${id}`, 800);
      MyDebug(`Deleted session: ${id}: ${output}`);
    } catch (error: any) {
      MyAlert(`删除会话失败: ${error.message || error.toString()}`, 3000);
      return;
    } finally {
      delayedRefresh();
    }
  }
  useEffect(() => {
    if (!activeSession && sessionName) {
      delayedRefresh();
    }
  }, [activeSession, sessionName]);

  useEffect(() => {
    if(!isRefreshing) return;
    Promise.allSettled([
      refreshdata().then((sessions) => {
        setTmuxSessions(Array.isArray(sessions) ? sessions : []);
      }),
      new Promise(resolve => setTimeout(resolve, 1000))
    ]).finally(() => setIsRefreshing(false));
  }, [isRefreshing]);
  return (
    <div className={`bg-white rounded-xl shadow p-6 flex flex-col flex-1 min-h-0 overflow-hidden`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <h4 className="font-semibold text-gray-800">活动会话</h4>
        <button className="btn-primary inline-flex items-center cursor-pointer" onClick={() => setIsRefreshing(true)} disabled={isRefreshing}>
          <i className={`fas fa-rotate-right mr-2 ${isRefreshing ? 'animate-spin' : ''}`}></i>
          刷新
        </button>
      </div>
      {isRefreshing ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
              <div className="flex items-center gap-3 w-full">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-200"></span>
                <div className="flex-1">
                  <div className="h-3 w-40 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-24 bg-gray-100 rounded mt-2 animate-pulse"></div>
                </div>
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      ) : tmuxSessions.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          <div className="text-sm">暂无活动会话</div>
          <div className="text-xs mt-1">点击上方“刷新”重试</div>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {tmuxSessions.map((session, index) => (
            <li key={index} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`h-2.5 w-2.5 rounded-full ${session.attached ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{session.name || 'Unnamed Session'}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{session.time}</div>
                </div>
              </div>
              <div className="ml-4 shrink-0 flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${session.attached ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-500/20'}`}>
                  {session.attached ? 'Attached' : 'Detached'}
                </span>
                {session.attached ? (
                  <button
                    className="btn-danger text-xs px-2 py-1"
                    title={`Detach ${session.name}`}
                    onClick={() => {handleDetach(session.id, session.name);}}
                  >
                    <i className="fas fa-unlink mr-1"/>Detach
                  </button>
                ) : (
                  <button
                    className="btn-primary text-xs px-2 py-1"
                    title={`Attach to ${session.name}`}
                    onClick={() => {handleAttach(session.id, session.name);}}
                  >
                    <i className="fas fa-link mr-1"/>Attach
                  </button>
                )}
                <button
                    className="btn-danger text-xs px-2 py-1"
                    title={`Delete ${session.name}`}
                    onClick={() => {handleDelete(session.id, session.name);}}
                  >
                  <i className="fas fa-trash"/>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}