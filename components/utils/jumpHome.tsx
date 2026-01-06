"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MyAlert from "./MyAlert";
import { isSSHConnected } from "./sshClient";

export default function JumpHome() {
  const router = useRouter();
  useEffect(() => {
    // Redirect to home page if not already there
    if (window.location.pathname !== '/' && !isSSHConnected() && !window.location.pathname.includes('AminoDB')) {
      MyAlert("Session expired or not logged in. Redirecting to home page.");
      router.push('/');
    }
  }, [router]);
  return null;
}
