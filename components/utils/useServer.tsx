"use client";
import React, { useState, useEffect } from "react";
import { getActiveConnection } from './sshClient';


export default function useServer({ onUsernameChange, onHostnameChange }: { onUsernameChange?: (username: string) => void; onHostnameChange?: (hostname: string) => void; } = {}) {
    useEffect(() => {
        const updateUserInfo = () => {
            const conn = getActiveConnection();
            if (conn) {
                const username = conn.username || '';
                const hostname = conn.hostname || '';
                if (onUsernameChange) onUsernameChange(username);
                if (onHostnameChange) onHostnameChange(hostname);
            } else {
                if (onUsernameChange) onUsernameChange('');
                if (onHostnameChange) onHostnameChange('');
            }
        };
        updateUserInfo();
    }, [onUsernameChange, onHostnameChange]);

    return { name: '', hostname: '' };
}
