"use client";

export default function TasksStat({ TaskCount }: { TaskCount: { taskCount7: number; taskCount14: number } }) {
	return (
		<div className={`bg-white rounded-xl shadow p-6 card-hover`}>
			<div className="flex justify-between items-start">
				<div>
					<p className={`grayDark text-sm`}>一周任务数</p>
					<h3 className="text-2xl font-bold mt-1">{TaskCount.taskCount7 > -1 ? TaskCount.taskCount7 : "N/A"}</h3>
					{ TaskCount.taskCount7 > -1 && TaskCount.taskCount14 > -1 ? (
						(() => {
							if (TaskCount.taskCount7 > TaskCount.taskCount14) {
								return (
									<p className={`text-success text-sm mt-2`}>
										<i className="fas fa-arrow-up mr-1"></i>
										环比增加 {TaskCount.taskCount7 - TaskCount.taskCount14} 个
									</p>
								);
						} else if (TaskCount.taskCount7 < TaskCount.taskCount14)  {
								return (
									<p className={`text-danger text-sm mt-2`}>
										<i className="fas fa-arrow-down mr-1"></i>
										环比减少 {TaskCount.taskCount14 - TaskCount.taskCount7} 个
									</p>
								);
						} else {
							return (
								<p className={`text-equal text-sm mt-2`}>
									<i className="fas fa-equals mr-1"></i>
									环比持平
								</p>
							);
						}
						})()
						) : (
							<p className={`text-warning text-sm mt-2`}>
								<i className={`fas fa-question-circle mr-1`}></i>
								任务数未知
							</p>
						)
					}
				</div>
				<div className="rounded-full p-2 h-12 w-12 flex items-center justify-center bg-teal-50">
						<i className="fas fa-chart-line text-teal-500 !text-xl"></i>
				</div>
			</div>
		</div>
	);
}