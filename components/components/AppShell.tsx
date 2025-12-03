"use client";

import React, { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import DebugPanel from "./DebugPanel";
import { LoginModalProvider } from "../context/LoginModalContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
	const [currentsection, setCurrentSection] = useState<string>("Dashboard");
	const [debugOpen, setDebugOpen] = useState<boolean>(false);

	useEffect(() => {
		console.log("Current Section:", currentsection);
	}, [currentsection]);

	return (
		<LoginModalProvider>
			<div className={`app-shell ${debugOpen ? 'debug-open' : ''} bg-zinc-50`}>
				<Header />
				<div className="shell-body relative">
					<Sidebar onSectionChange={setCurrentSection} onDebugToggle={setDebugOpen} />
					<main className="main-content">{children}</main>
				</div>
				<DebugPanel open={debugOpen} onClose={() => setDebugOpen(false)} />
			</div>
		</LoginModalProvider>
	);
}
