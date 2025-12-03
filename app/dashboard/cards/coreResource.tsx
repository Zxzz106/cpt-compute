"use client";

export default function CoreResource({ CoreUsage }: { CoreUsage: { usedCores: number; totalCores: number } }) {
	return (
			<div className={`bg-white rounded-xl shadow p-6 card-hover`}>
			  <div className="flex justify-between items-start">
				<div>
				  <p className={`grayDark text-sm`}>核心资源</p>
				  <h3 className="text-2xl font-bold mt-1"><span className="smooth-value" key={CoreUsage.usedCores}>{CoreUsage.usedCores} / {CoreUsage.totalCores}</span></h3>
					<span className="smooth-value" key={CoreUsage.usedCores}>
					{CoreUsage.usedCores < 0.8 * CoreUsage.totalCores && CoreUsage.totalCores ?(
					  <p className={`text-success text-sm mt-2`}>
						<i className="fas fa-check-circle mr-1"></i>
						核心资源充足
					  </p>
					): (
					  <p className={`text-warning text-sm mt-2`}>
						<i className="fas fa-fire mr-1"></i>
						核心资源紧张
					  </p>
					)}
					</span>
				</div>
				<div className="rounded-full p-2 h-12 w-12 flex items-center justify-center bg-blue-50">
				  <i className="fas fa-server text-blue-500 !text-xl"></i>
				</div>
			  </div>
			</div>
	);
}