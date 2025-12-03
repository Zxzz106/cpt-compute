"use client";

export default function TempMonitor({ TempUsage }: { TempUsage: number | null }) {
	return (
            <div className={`bg-white rounded-xl shadow p-6 card-hover`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className={`grayDark text-sm`}>系统温度</p>
                  <h3 className="text-2xl font-bold mt-1 relative whitespace-nowrap" >
                    <span className="smooth-value" key={TempUsage}>{TempUsage !== null ? `${TempUsage} °C` : "N/A"}</span>
                  </h3>
                    { TempUsage !== null && TempUsage < 90 ?(
                      <p className={`text-success text-sm mt-2`}>
                        <i className="fas fa-check-circle mr-1"></i>
                        系统温度正常
                      </p>
                    ): (
                      <p className={`text-warning text-sm mt-2`}>
                        <span className="smooth-value" key={TempUsage}>
                          <i className={`fas ${TempUsage ? "fa-fire" : "fa-question-circle"} mr-1`}></i>
                          {TempUsage ? "系统温度过高" : "系统温度未知"}
                        </span>
                      </p>
                    )}
                </div>
                <div className="rounded-full p-2 h-12 w-12 flex items-center justify-center bg-orange-50">
                  <i className="fas fa-thermometer-half  text-orange-500 !text-xl"></i>
                </div>
              </div>
            </div>
	);
}