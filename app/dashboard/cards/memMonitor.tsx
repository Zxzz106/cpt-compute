"use client";

import { useEffect, useRef, useState } from "react";


export default function MemMonitor(MemoryUsage: { totalMemory: string; usedMemory: string; usedPercent: number }) {
  const hideRef = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [hideOverflow, setHideOverflow] = useState(false);
  
  // Recompute when memory values change
  useEffect(() => {
    const update = () => {
      if (!hideRef.current || !measureRef.current) return;
      const clientWidth = hideRef.current.clientWidth;
      const fullWidth = measureRef.current.scrollWidth;
      setHideOverflow(fullWidth > clientWidth + 1);
    };
    update();
  }, [MemoryUsage]);

  // Observe container size changes once
  useEffect(() => {
    if (!hideRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!hideRef.current || !measureRef.current) return;
      const clientWidth = hideRef.current.clientWidth;
      const fullWidth = measureRef.current.scrollWidth;
      setHideOverflow(fullWidth > clientWidth + 1);
    });
    ro.observe(hideRef.current);
    return () => {
      ro.disconnect();
    };
  }, []);

    return (
            <div className={`bg-white rounded-xl shadow p-6 card-hover`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className={`grayDark text-sm`}>内存占用</p>
                  <h3 className="text-2xl font-bold mt-1 relative whitespace-nowrap" ref={hideRef}>
                    <span className="smooth-value" key={MemoryUsage.usedMemory}>
                    {MemoryUsage.usedMemory}
                    {!hideOverflow && MemoryUsage.totalMemory ? ` / ${MemoryUsage.totalMemory}` : ""}
                    <span ref={measureRef} className="absolute invisible whitespace-nowrap">
                      {MemoryUsage.usedMemory}{MemoryUsage.totalMemory ? ` / ${MemoryUsage.totalMemory}` : ""}
                    </span>
                    </span>
                  </h3>
                  <span className="smooth-value" key={MemoryUsage.usedPercent}>
                    { MemoryUsage.usedPercent < 80 && MemoryUsage.totalMemory ?(
                      <p className={`text-success text-sm mt-2`}>
                        <i className="fas fa-check-circle mr-1"></i>
                        内存资源充足
                      </p>
                    ): (
                      <p className={`text-warning text-sm mt-2`}>
                        <i className="fas fa-bolt mr-1"></i>
                        内存资源紧张
                      </p>
                    )}
                  </span>
                </div>
                <div className="rounded-full p-2 h-12 w-12 flex items-center justify-center bg-sky-50">
                  <i className="fas fa-memory text-sky-500 !text-xl"></i>
                </div>
              </div>
            </div>

    );
}