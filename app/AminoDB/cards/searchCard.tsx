"use client";

import datalist from "@/components/configs/aminodb.json";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

type ConditionDetail = {
	condition: string | null;
	reac_heat: number | null;
	eq_solubility: number | null;
	peak_time: number | null;
	data_source: string | null;
	condition_id: number;
};

type AminoRecord = {
	item_id: number;
	category: string;
	name: string;
	cas: string;
	abbr: string;
	conditions_details: ConditionDetail[];
};

export default function SearchCard() {
	const [inputValue, setInputValue] = useState("");
	const [matchedList, setMatchedList] = useState<AminoRecord[]>([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedItem, setSelectedItem] = useState<AminoRecord | null>(null);
	const [history, setHistory] = useState<AminoRecord[]>([]);
	const HISTORY_KEY = "amino-search-history";

	const inputRef = useRef<HTMLInputElement | null>(null);
	const dropdownRef = useRef<HTMLUListElement | null>(null);

	const sequenceMatch = (pattern: string, value: string) => {
		let patternIndex = 0;
		let valueIndex = 0;
		while (patternIndex < pattern.length && valueIndex < value.length) {
			if (pattern[patternIndex] === value[valueIndex]) patternIndex++;
			valueIndex++;
		}
		return patternIndex === pattern.length;
	};

	const matchKeywords = (item: AminoRecord, input: string) => {
		const trimmed = input.trim().toLowerCase();
		if (!trimmed) return false;
		for (const value of [
			item.category,
			item.name,
			item.cas,
			item.abbr,
		]) {
			const normalized = String(value ?? "").toLowerCase();
			if (!normalized) continue;
			if (sequenceMatch(trimmed, normalized)) return true;
		}
		return false;
	};

	const handleInputChange = (value: string) => {
		setInputValue(value);
		setSelectedItem(null);
		if (value.trim() === "") {
			setMatchedList([]);
			setShowDropdown(false);
			return;
		}
		const matches = (datalist as AminoRecord[]).filter((item) =>
			matchKeywords(item, value),
		);
		setMatchedList(matches);
		setShowDropdown(matches.length > 0);
	};

	const handleItemClick = (item: AminoRecord) => {
		setSelectedItem(item);
		setInputValue(['category','name','cas','abbr'].map(k=>item[k as keyof AminoRecord]).map(v=>v||"N/A").join(" | "));
		setShowDropdown(false);
		setHistory((prev) => {
			const exists = prev.find((row) => row.item_id === item.item_id);
			if (exists) return prev; // preserve existing order when re-querying from history
			return [item, ...prev].slice(0, 6);
		});
	};



	const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		handleInputChange(e.target.value);
	};

	useEffect(() => {
		try {
			const saved = localStorage.getItem(HISTORY_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed)) {
					const cleaned = parsed
						.filter((item) => item && typeof item.item_id === "number" && item.base_info)
						.slice(0, 6);
					setHistory(cleaned);
				}
			}
		} catch (err) {
			console.error("Failed to load history", err);
		}
	}, []);

	useEffect(() => {
		try {
			if (history.length === 0) {
				localStorage.removeItem(HISTORY_KEY);
				return;
			}
			localStorage.setItem(
				HISTORY_KEY,
				JSON.stringify(history.slice(0, 6)),
			);
		} catch (err) {
			console.error("Failed to save history", err);
		}
	}, [history]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				inputRef.current && !inputRef.current.contains(e.target as Node) &&
				dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
			) {
				setShowDropdown(false);
			}
		};

		document.addEventListener("click", handleClickOutside);
		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, []);

	return (
		<div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-xl border border-slate-200 shadow-lg p-8 h-full flex flex-col gap-8">
			<div className="flex flex-col items-center gap-6">
				<div className="text-center space-y-2">
					<h3 className="text-2xl font-semibold text-slate-800">查询数据库</h3>
					<p className="text-sm text-slate-500">输入类别、名称、CAS、缩写，快速查找氨基吸收剂信息</p>
				</div>

					<div className="relative w-[560px] max-w-full">
					<div className="relative shadow-sm">
						<span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
								<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
							</svg>
						</span>
						<input
						ref={inputRef}
						type="text"
						value={inputValue}
						onChange={onInputChange}
						placeholder="输入类别/名称/CAS/缩写以查询"
						className="w-full h-[48px] pl-12 pr-4 py-2 border border-slate-200 rounded-lg text-base text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-all"
						/>

						<ul
							ref={dropdownRef}
							className={`absolute top-full left-0 z-10 w-full max-h-[400px] mt-1 mb-0 p-0 list-none bg-white border border-gray-200 rounded-md shadow-lg overflow-y-auto transition-all ${showDropdown ? 'block' : 'hidden'}`}
							role="listbox"
						>
							{matchedList.map((item) => (
								<li key={item.item_id} className="m-0 p-0 border-b border-gray-100 last:border-0">
									<button
										className="block w-full px-4 py-3 text-base transition-colors whitespace-normal hover:bg-blue-500 hover:text-white text-left"
										role="option"
										onClick={(e) => {
										e.preventDefault();
										handleItemClick(item);
									}}
									>
									<div className="flex flex-col gap-1">
										<div className="font-semibold text-slate-800 leading-snug break-words">
											{['category','name','cas','abbr'].map(k=>item[k as keyof AminoRecord]).map(v=>v||"N/A").join(" | ")}
										</div>
										<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
											<span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">ID {item.item_id}</span>
											{item.abbr && <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{item.abbr}</span>}
											{item.category && <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{item.category}</span>}
										</div>
									</div>
									</button>
								</li>
							))}
						</ul>
					</div>
				
					{/* 结果显示区域 */}
						{selectedItem && (
							<div className="mt-5 p-6 border border-slate-200 rounded-xl bg-white/80 w-[560px] max-w-full shadow-sm">
								<div className="flex items-start justify-between gap-3 mb-4">
									<h4 className="text-lg font-semibold text-slate-800">查询结果</h4>
									<div className="flex flex-wrap gap-2 text-xs">
										{selectedItem.category && <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{selectedItem.category}</span>}
										{selectedItem.abbr && <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{selectedItem.abbr}</span>}
										<span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">ID {selectedItem.item_id}</span>
									</div>
								</div>
								<div className="grid grid-cols-1 gap-3 text-base leading-7 text-slate-700">
									<p><strong>名称:</strong> {selectedItem.name}</p>
									<p><strong>CAS:</strong> {selectedItem.cas}</p>
									<p><strong>缩写:</strong> {selectedItem.abbr || "-"}</p>
									<p><strong>类别:</strong> {selectedItem.category || "-"}</p>
								</div>
								<div className="mt-4 space-y-3">
									<div className="flex items-center justify-between">
										<h5 className="text-sm font-semibold text-slate-700">实验条件</h5>
										<span className="text-xs text-slate-500">{selectedItem.conditions_details.length || 0} 条</span>
									</div>
									{selectedItem.conditions_details.length === 0 ? (
										<div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-3 text-sm text-slate-500">暂无条件数据</div>
									) : (
										<div className="space-y-2">
											{selectedItem.conditions_details.map((detail) => (
												<div key={detail.condition_id} className="rounded-lg border border-slate-200 bg-white/90 p-3 text-sm text-slate-700 shadow-sm">
													<div className="font-semibold text-slate-800">{detail.condition || "-"}</div>
													<div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
														<span>反应热(kJ/mol): {detail.reac_heat ?? "-"}</span>
														<span>平衡溶解度(mol/mol): {detail.eq_solubility ?? "-"}</span>
														<span>峰值时间(min): {detail.peak_time ?? "-"}</span>
														<span>数据来源: {detail.data_source ?? "-"}</span>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						)}
				</div>

				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<h4 className="text-lg font-semibold text-slate-800">历史查询</h4>
					</div>
					{history.length === 0 ? (
						<div className="w-full rounded-lg border border-dashed border-slate-200 bg-white/70 p-4 text-center text-slate-500 text-sm">暂无历史记录，选择一条结果后会出现在这里</div>
					) : (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{history.map((item, idx) => (
								<button
									key={item.item_id ?? idx}
									onClick={() => handleItemClick(item)}
									className="group w-full rounded-lg border border-slate-200 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="font-semibold text-slate-800 group-hover:text-blue-600 leading-snug line-clamp-2">
											{item.name || item.cas || item.abbr || "N/A"}
										</div>
										<span className="text-xs text-slate-500">ID {item.item_id}</span>
									</div>
									<div className="mt-2 flex flex-wrap gap-2 text-xs">
										{item.abbr && <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{item.abbr}</span>}
										{item.category && <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{item.category}</span>}
									</div>
									<p className="mt-2 text-xs text-slate-500 line-clamp-2">CAS: {item.cas || "-"}</p>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}