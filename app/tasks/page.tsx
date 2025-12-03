import React from "react";
import TasksClient from "./TasksClient";

export const metadata = {
  title: "任务列表 | CPT Compute",
};

export default function Page() {
  return (
    <main className="bg-zinc-50 dark:bg-black p-2 ml-2 mr-2 h-[100%] font-sans">
      <TasksClient />
    </main>
  );
}
