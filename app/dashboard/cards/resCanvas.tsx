"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseSar } from "@/components/utils/parseExec";
import { isSSHConnected } from "@/components/utils/sshClient";
import MyDebug from "@/components/utils/MyDebug";
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const toZH_CN = (resource: string) => {
    switch (resource) {
        case "ldavg":
            return "15分钟负载";
        case "CPU":
            return "CPU使用率";
        case "MEM":
            return "内存使用率";
        case "DSK":
            return "磁盘 I/O";
        default:
            return resource;
    }
}

export default function ResCanvas({ isRefreshing }: {isRefreshing: boolean}) {
    const [selectedResource, setSelectedResource] = useState("ldavg");
    const [sarData, setSarData] = useState<{ timestamp: string; value: number }[]>([]);

    // Track previous data for change detection and update mode control
    const prevDataRef = useRef<{ timestamp: string; value: number }[] | null>(null);
    const updateModeRef = useRef<'none' | 'active'>('none');

    const isSameSeries = (
        a: { timestamp: string; value: number }[] | null | undefined,
        b: { timestamp: string; value: number }[] | null | undefined,
    ) => {
        if (!a || !b) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i].timestamp !== b[i].timestamp || a[i].value !== b[i].value) {
                return false;
            }
        }
        return true;
    };

    const refreshData = async () => {
        // Logic to update the canvas based on selectedResource
        if(!isSSHConnected()){
            return;
        }
        try {
            const sarPromise = parseSar(selectedResource);
            const sarOut = await sarPromise;
            const nextData = sarOut || [];

            // Decide whether to update chart and animation mode
            if (isSameSeries(prevDataRef.current, nextData)) {
                updateModeRef.current = 'none';
                return;
            }

            updateModeRef.current = 'active';
            prevDataRef.current = nextData;
            setSarData(nextData);
        } catch (error) {
            MyDebug("Error fetching SAR data: " + error);
        }
    }
    useEffect(() => {
        refreshData();
    }, [selectedResource]);

    useEffect(() => {
        if (!isRefreshing) {
            return;
        }
        refreshData();
    }, [isRefreshing]);

    const chartData = useMemo(() => ({
        labels: sarData.map((dataPoint) => dataPoint.timestamp),
        datasets: [{
            id: 'res-usage',
            label: ` ${toZH_CN(selectedResource)}`,
            data: sarData.map((dataPoint) => dataPoint.value),
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 4,
            borderWidth: 2,
        }],
    }), [sarData, selectedResource]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 600,
            easing: 'easeOutQuart',
        },
        transitions: {
            active: {
                animation: { duration: 600 },
            },
            resize: {
                animation: { duration: 300 },
            },
        },
        plugins: {
            legend: {
                display: false,
                labels: {
                    color: '#6b7280',
                    boxWidth: 12,
                    padding: 16,
                    usePointStyle: true,
                },
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleColor: '#fff',
                bodyColor: '#e5e7eb',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                    label: (ctx: any) => {
                        switch (selectedResource) {
                            case "ldavg":
                                return `${toZH_CN(selectedResource)}: ${ctx.parsed.y}`;
                            case "CPU":
                                return `${toZH_CN(selectedResource)}: ${ctx.parsed.y}%`;
                            case "MEM":
                                return `${toZH_CN(selectedResource)}: ${ctx.parsed.y}%`;
                            case "DSK":
                                return `${toZH_CN(selectedResource)}: ${ctx.parsed.y}`;
                            default:
                                return '';
                        }
                    },
                },
            },
        },
        scales: {
            x: {
                type: 'category',
                grid: { display: false },
                ticks: {
                    color: '#9ca3af',
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 8,
                },
            },
            y: {
                type: 'linear',
                grid: {
                    color: 'rgba(229, 231, 235, 0.6)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#9ca3af',
                    callback: (tickValue: number | string) => `${tickValue}`,
                },
                beginAtZero: true,
            },
        },
    }) as const, [selectedResource]);

    return (
        <div className={`bg-white rounded-xl shadow p-6 lg:col-span-2 card-hover`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">资源使用率</h3>
                <div className="flex space-x-2">
                    <button className={`text-sm px-3 py-1 ${selectedResource === "ldavg" ? "bg-primary-10 text-primary" : "bg-gray-100 text-gray-500"} rounded-full`} onClick={() => setSelectedResource("ldavg")}>负载</button>
                    <button className={`text-sm px-3 py-1 ${selectedResource === "CPU" ? "bg-primary-10 text-primary" : "bg-gray-100 text-gray-500"} rounded-full`} onClick={() => setSelectedResource("CPU")}>CPU</button>
                    <button className={`text-sm px-3 py-1 ${selectedResource === "MEM" ? "bg-primary-10 text-primary" : "bg-gray-100 text-gray-500"} rounded-full`} onClick={() => setSelectedResource("MEM")}>内存</button>
                    <button className={`text-sm px-3 py-1 ${selectedResource === "DSK" ? "bg-primary-10 text-primary" : "bg-gray-100 text-gray-500"} rounded-full`} onClick={() => setSelectedResource("DSK")}>I/O</button>

                </div>
            </div>
            <div className="h-80">
                {/* {isLoading ? ( */}
                {0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-primary" />
                    </div>
                ) : (
                    <Line datasetIdKey="id" data={chartData} options={chartOptions} updateMode={updateModeRef.current} />
                )}
            </div>

        </div>
    );
}