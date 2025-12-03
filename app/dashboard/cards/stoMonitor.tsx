"use client";

import { useEffect, useRef, useState } from "react";


export default function StoMonitor({ StorageUsage }: { StorageUsage: { usedStorage: string; totalStorage: string; usedPercent: number } }) {
  const hideRef = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [hideOverflow, setHideOverflow] = useState(false);
  
  // Recompute when storage values change
  useEffect(() => {
    const update = () => {
      if (!hideRef.current || !measureRef.current) return;
      const clientWidth = hideRef.current.clientWidth;
      const fullWidth = measureRef.current.scrollWidth;
      setHideOverflow(fullWidth > clientWidth + 1);
    };
    update();
  }, [StorageUsage]);

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
                  <p className={`grayDark text-sm`}>存储占用</p>
                  <h3 className="text-2xl font-bold mt-1 relative whitespace-nowrap" ref={hideRef}>
                    <span className="smooth-value" key={StorageUsage.usedStorage}>
                    {StorageUsage.usedStorage}
                    {!hideOverflow && StorageUsage.totalStorage ? ` / ${StorageUsage.totalStorage}` : ""}
                    <span ref={measureRef} className="absolute invisible whitespace-nowrap">
                      {StorageUsage.usedStorage}{StorageUsage.totalStorage ? ` / ${StorageUsage.totalStorage}` : ""}
                    </span>
                    </span>
                  </h3>
                  <span className="smooth-value" key={StorageUsage.usedStorage}>
                    { StorageUsage.usedPercent < 80 && StorageUsage.totalStorage ?(
                      <p className={`text-success text-sm mt-2`}>
                        <i className="fas fa-check-circle mr-1"></i>
                        存储资源充足
                      </p>
                    ): (
                      <p className={`text-warning text-sm mt-2`}>
                        <i className="fas fa-hdd mr-1"></i>
                        存储资源紧张
                      </p>
                    )}
                  </span>
                </div>
                <div className="rounded-full p-2 h-12 w-12 flex items-center justify-center bg-purple-50">
                  <i className="fas fa-hdd text-purple-500 !text-xl"></i>
                </div>
              </div>
            </div>
	);
}