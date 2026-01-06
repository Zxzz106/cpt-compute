import { Settings } from "lucide-react";
import React from "react";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "设置 | CPT Compute",
};

export default function Page() {
  return (

        <main  className="bg-zinc-50 dark:bg-black p-2 ml-2 mr-2 h-[100%] font-sans">
          <SettingsClient />
        </main>
  );
}
