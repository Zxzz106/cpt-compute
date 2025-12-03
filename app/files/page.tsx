import FileClient from "./FileClient";
import React from "react";

export const metadata = {
  title: "文件管理 | CPT Compute",
};

export default function Page() {
  return (
    <main className="bg-zinc-50 dark:bg-black p-2 ml-2 mr-2 h-[100%] font-sans">
      <FileClient />
    </main>
  );
}
