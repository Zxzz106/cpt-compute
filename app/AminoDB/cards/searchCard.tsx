"use client";

import datalist from "@/components/configs/aminodb.json";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

type AminoRecord = {
	index: number;
	combined_index: string;
	category: string;
	name: string;
	cas: string;
	abbr: string;
	conditions: string;
	reac_heat: number | string;
	eq_solubility: string | number;
	peak_time: string | number;
	data_source: string;
};

export default function SearchCard() {
	const [inputValue, setInputValue] = useState("");
	const [matchedList, setMatchedList] = useState<AminoRecord[]>([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedItem, setSelectedItem] = useState<AminoRecord | null>(null);

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
		for (const key of [
			"category",
			"name",
			"cas",
			"abbr",
		]) {
			const value = String(item[key as keyof AminoRecord] ?? "").toLowerCase();
			if (!value) continue;
			if (sequenceMatch(trimmed, value)) return true;
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
		setInputValue(item.combined_index);
		setShowDropdown(false);
	};



	const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		handleInputChange(e.target.value);
	};

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
		<div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-xl border border-slate-200 shadow-lg p-8 h-full flex flex-col">
			<div className="flex flex-col items-center gap-6 h-full">
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
								<li key={item.index} className="m-0 p-0 border-b border-gray-100 last:border-0">
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
											{item.combined_index}
										</div>
										<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
											<span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">ID {item.index}</span>
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
										<span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">ID {selectedItem.index}</span>
									</div>
								</div>
								<div className="grid grid-cols-1 gap-3 text-base leading-7 text-slate-700">
									<p><strong>名称:</strong> {selectedItem.name}</p>
									<p><strong>CAS:</strong> {selectedItem.cas}</p>
									<p><strong>缩写:</strong> {selectedItem.abbr || "-"}</p>
									<p><strong>反应条件:</strong> {selectedItem.conditions || "-"}</p>
									<p><strong>反应热(kJ/mol):</strong> {selectedItem.reac_heat || "-"}</p>
									<p><strong>平衡溶解度(mol/mol):</strong> {selectedItem.eq_solubility || "-"}</p>
									<p><strong>峰值时间(min):</strong> {selectedItem.peak_time || "-"}</p>
									<p><strong>数据来源:</strong> {selectedItem.data_source || "-"}</p>
								</div>
							</div>
						)}
				</div>
			</div>
		</div>
	);
}