import React from "react";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "状态面板 | CPT Compute",
};

export default function Page() {
  return (
    <main  className="bg-zinc-50 dark:bg-black p-2 ml-2 mr-2 h-[100%] font-sans">
      <DashboardClient />
    </main>
  );
}
