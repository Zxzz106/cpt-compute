"use client";

export default function TasksMonitor({JobStats}: {JobStats: { runningCount: number; pendingCount: number; totalCount: number; }}) {
	return (
			<div className={`bg-white rounded-xl shadow p-6 card-hover`}>
			  <div className="flex justify-between items-start">
				<div>
				  <p className={`grayDark text-sm`}>任务队列</p>
				  <h3 className="text-2xl font-bold mt-1"><span className="smooth-value" key={`${JobStats.runningCount}/${JobStats.totalCount}`}>{JobStats.runningCount} / {JobStats.totalCount}</span></h3>
				  <span className="smooth-value" key={JobStats.pendingCount}>
					{JobStats.pendingCount === 0 ?(
					  <p className={`text-success text-sm mt-2`}>
						<i className="fas fa-check-circle mr-1"></i>
						无排队任务
					  </p>
					): (
					  <p className={`text-warning text-sm mt-2`}>
						<i className="fas fa-users mr-1"></i>
						{JobStats.pendingCount}个任务排队中
					  </p>
					)}
				  </span>
				</div>
				<div className="rounded-full p-2 h-12 w-12 flex items-center justify-center bg-indigo-50">
				  <i className="fas fa-tasks text-indigo-500 !text-xl"></i>
				</div>
			  </div>
			</div>
	);
}