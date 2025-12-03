"use client";

export default function GpuResource({ GpuUsage }: { GpuUsage: { usedGpu: number; totalGpu: number } }) {
	return (
            <div className={`bg-white rounded-xl shadow p-6 card-hover`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`grayDark text-sm`}>GPU资源</p>
                  <h3 className="text-2xl font-bold mt-1"><span className="smooth-value" key={GpuUsage.usedGpu}>{GpuUsage.usedGpu} / {GpuUsage.totalGpu}</span></h3>
                  <span className="smooth-value" key={GpuUsage.usedGpu}>
                    {GpuUsage.usedGpu < GpuUsage.totalGpu && GpuUsage.totalGpu ?(
                      <p className={`text-success text-sm mt-2`}>
                        <i className="fas fa-check-circle mr-1"></i>
                        GPU资源充足
                      </p>
                    ): (
                      <p className={`text-warning text-sm mt-2`}>
                        <i className={`fas ${GpuUsage.totalGpu===0 ? "fa-ban" : "fa-fire"} mr-1`}></i>
                        {GpuUsage.totalGpu===0?"无GPU资源":"GPU资源紧张"}
                      </p>
                    )}
                  </span>
                </div>
                <div className="rounded-full p-2 h-12 w-12 flex items-center justify-center bg-violet-50">
                  <i className="fas fa-microchip text-violet-500 !text-xl"></i>
                </div>
              </div>
            </div>
	);
}