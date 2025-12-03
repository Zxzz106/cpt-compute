"use client";

export default function ClusterHealth({ Clusters }: { Clusters: { healthy: number; total: number } }) {
	return (
		<div className={`bg-white rounded-xl shadow p-6 card-hover`}>
			<div className="flex justify-between items-start">
			<div>
				<p className={`grayDark text-sm`}>集群健康</p>
				<h3 className="text-2xl font-bold mt-1"><span className="smooth-value" key={Clusters.healthy}>{Clusters.healthy} / {Clusters.total}</span></h3>
				<span className="smooth-value" key={Clusters.healthy}>
				{Clusters.healthy === Clusters.total && Clusters.total ?(
					<p className={`text-success text-sm mt-2`}>
					<i className="fas fa-check-circle mr-1"></i>
					所有节点在线
					</p>
				): (
					<p className={`text-warning text-sm mt-2`}>
					<i className="fas fa-exclamation-triangle mr-1"></i>
					部分节点离线
					</p>
				)}
				</span>
			</div>
			<div className="rounded-full p-2 h-12 w-12 flex items-center justify-center bg-green-50">
				<i className="fas fa-heartbeat text-green-500 !text-xl"></i>
			</div>
			</div>
		</div>
	);
}