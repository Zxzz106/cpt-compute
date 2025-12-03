import React from "react";
import HomeClient from "./HomeClient";

export const metadata = {
  title: "CPT Compute",
};

export default function Home() {
  return (
    <div className="flex flex-col h-[100%] items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <HomeClient />
    </div>
  );
}
