"use client";
import { MyDebug } from "@/components/utils/MyDebug";
import { useEffect, useState } from "react";
import SearchCard from "./cards/searchCard";

export default function DashboardClient() {
  return (
    <>
      <main className="mx-auto px-4 lg:px-6 space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold">胺数据库</h2>
          </div>
          <div className="flex items-center gap-3">
          </div>
        </div>

        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-500 tracking-wide">胺数据库</h3>
        </div>


        <section className={`grid grid-cols-1 gap-6 flex-1 overflow-hidden min-h-0`}>
          <SearchCard />
        </section>

      </main> 
    </>
  );
}