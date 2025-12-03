"use client";

import MyDebug from "@/components/utils/MyDebug";
import { Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
    taskCount7: number;
    taskCount14: number;
    stateCounts: { [key: string]: number };
};

export default function TaskGraph({ TaskCount }: { TaskCount: Props }) {
    const { stateCounts } = TaskCount;
    const primaryStates = [
        "COMPLETED",
        "FAILED",
        "RUNNING",
        "PENDING",
        "CANCELLED",
    ];

    const normalizedCounts: Record<string, number> = {};
    let others = 0;
    Object.entries(stateCounts || {}).forEach(([key, val]) => {
        if (primaryStates.includes(key)) {
            normalizedCounts[key] = (normalizedCounts[key] || 0) + (val || 0);
        } else {
            others += val || 0;
        }
    });

    const labels = [...primaryStates, "Others"];
    const dataValues = [
        normalizedCounts["COMPLETED"] || 0,
        normalizedCounts["FAILED"] || 0,
        normalizedCounts["RUNNING"] || 0,
        normalizedCounts["PENDING"] || 0,
        normalizedCounts["CANCELLED"] || 0,
        others,
    ];

    const toZH_CN = (state: string) => {
        switch (state) {
            case "COMPLETED":
                return "已完成";
            case "FAILED":
                return "失败";
            case "RUNNING":
                return "运行中";
            case "PENDING":
                return "等待中";
            case "CANCELLED":
                return "已取消";
            case "Others":
                return "其他";
            default:
                return state;
        }
    }

    const data = {
        labels,
        datasets: [
            {
                data: dataValues,
                backgroundColor: [
                    "#4ade80", // COMPLETED
                    "#f87171", // FAILED
                    "#60a5fa", // RUNNING
                    "#facc15", // PENDING
                    "#c084fc", // CANCELLED
                    "#cbd5e1", // Others
                ],
                borderColor: "#ffffff",
                borderWidth: 5,
                hoverOffset: 8,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom" as const,
                labels: {
                    boxWidth: 16,
                    boxHeight: 16,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    pointRadius: 4,
                    generateLabels: (chart: any) => {
                        return chart.data.labels.map((label: string, index: number) => ({
                            text: `${toZH_CN(label)}: ${chart.data.datasets[0].data[index] || 0}`,
                            fillStyle: chart.data.datasets[0].backgroundColor[index],
                            strokeStyle: chart.data.datasets[0].borderColor,
                            lineWidth: chart.data.datasets[0].borderWidth,
                            hidden: false,
                            index: index,
                        }));
                    }
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderWidth: 2,
                displayColors: false,
                callbacks: {
                    label: function (context: any) {
                        const label = context.label || "";
                        const value = (context.raw ?? context.parsed) || 0;
                        return `${toZH_CN(label)}: ${value}`;
                    },
                },
            },
        },
        cutout: '70%',
    };

    return (
        <div className={`bg-white rounded-xl shadow p-6 card-hover`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">任务状态</h3>
            </div>
            <div className="w-full h-[300px] flex items-center justify-center">
                <Pie data={data} options={options} />
            </div>
        </div>
    );
}