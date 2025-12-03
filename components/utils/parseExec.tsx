"use client";
import { TIMEOUT } from "dns";
import MyDebug from "./MyDebug";
import { isSSHConnected } from "./sshClient";
import { fetchExec } from "./sshClient";
import { Line } from "react-chartjs-2";
import { json } from "stream/consumers";

function toUTC8(timeStr: string): string {
    // timeStr is expected like 'HH:MM:SS' from sadf
    // Convert to today's date at that time in UTC, then add +8h
    // If parsing fails, return original.
    try {
        const parts = timeStr.split(':').map(p => parseInt(p, 10));
        if (parts.length < 2 || parts.some(isNaN)) return timeStr;
        const [hh, mm, ss = 0] = parts as [number, number, number?];
        const now = new Date();
        const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm, ss));
        const shifted = new Date(base.getTime() + 8 * 60 * 60 * 1000);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
    } catch {
        return timeStr;
    }
}

function convertTime(timeStr: string): string {
    // timeStr is expected like 'YYYY-MM-DDTHH:MM:SS' from sacct
    // Convert to 'YYYY-MM-DD HH:MM:SS'
    if (!timeStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
        return timeStr;
    }
    try {
        return timeStr.slice(0, 10) + ' ' + timeStr.slice(11, 19);
    } catch {
        return timeStr;
    }
}

function normalizeState(state: string): string {
    if(state.startsWith('COMPLETED')) state='COMPLETED';
    if(state.startsWith('FAILED')) state='FAILED';
    if(state.startsWith('RUNNING')) state='RUNNING';
    if(state.startsWith('PENDING')) state='PENDING';
    if(state.startsWith('CANCELLED')) state='CANCELLED';
    return state;
}

export async function parseUser() {
    if (!isSSHConnected()) {
        MyDebug('parseUser called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec("echo $USER@$HOSTNAME");
        const [name, hostname] = output.trim().split('@');
        return JSON.stringify({ name, hostname });
    } catch (err : any) {
        MyDebug('Error executing user command: ' + err.message);
        return null;
    }
}


export async function parseSinfo() {
    if (!isSSHConnected()) {
        MyDebug('parseSinfo called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec([
            "sinfo -h -N -o '%t'",
            "awk 'BEGIN {h=0} {if ($1 ~ /^idle$|^alloc$|^mix$/) h++} END {printf \"%d\\n%d\\n\", h, NR}'"
        ].join(' | '));
        const lines = output.trim().split('\n');
        const healthy=parseInt(lines[0], 10);
        const total=parseInt(lines[1], 10);
        return JSON.stringify({ healthy, total });
    } catch (err : any) {
        MyDebug('Error executing sinfo command: ' + err.message);
        return null;
    }
}


export async function parseCores() {
    if (!isSSHConnected()) {
        MyDebug('parseCores called but SSH connection not established');
        return null;
    }
    try {
        const output1 = await fetchExec([
            "scontrol show nodes",
            "sponge",
            "awk -F'[=,]' '/AllocTRES/ {for(i=1; i<=NF; i++) if($i==\"cpu\") sum+=$(i+1)} END {print sum+0}'"
        ].join(' | '));
        const usedCores = parseInt(output1.trim(), 10);

        const output2 = await fetchExec([
            "sinfo -h -N -o '%c'",
            "sponge",
            "awk '{sum += $1} END {print sum}'"
        ].join(' | '));
        const totalCores = parseInt(output2.trim(), 10);
        return JSON.stringify({ usedCores, totalCores });
    } catch (err : any) {
        MyDebug('Error executing cores command: ' + err.message);
        return null;
    }
}

export async function parseJobs() {
    if (!isSSHConnected()) {
        MyDebug('parseJobs called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec("bash -c \"trap '' SIGPIPE; "+ [
            "squeue -h -o %T",
            "awk 'BEGIN {R=0; P=0} {if (\\$1==\\\"RUNNING\\\") R++; else if (\\$1==\\\"PENDING\\\") P++;} END {print R; print P; print NR}'"
        ].join(' | ') + "\"");
        const [runningCountStr, pendingCountStr, totalCountStr] = output.trim().split('\n');
        const runningCount = parseInt(runningCountStr.trim(), 10);
        const pendingCount = parseInt(pendingCountStr.trim(), 10);
        const totalCount = parseInt(totalCountStr.trim(), 10);
        return JSON.stringify({ runningCount, pendingCount, totalCount });
    } catch (err : any) {
        MyDebug('Error executing jobs command: ' + err.message);
        return null;
    }
}

export async function parseStorage() {
    if (!isSSHConnected()) {
        MyDebug('parseStorage called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec([
            "df -h \"$HOME\"",
            "awk 'FNR == 2 {gsub(/%/,\"\",$5); printf \"%s,%s,%d\", $2, $3, $5+0}'"
        ].join(' | '));
        const [totalStorage, usedStorage, usedPercentStr] = output.trim().split(',');
        const usedPercent = parseInt(usedPercentStr, 10);
        return JSON.stringify({ totalStorage, usedStorage, usedPercent });
    } catch (err : any) {
        MyDebug('Error executing storage command: ' + err.message);
        return null;
    }
}

export async function parseMemory() {
    if (!isSSHConnected()) {
        MyDebug('parseMemory called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec([
            "free -h",
            "awk 'FNR == 2 {printf \"%s,%s\", $2, $3}'"
        ].join(' | '));
        const [totalMemory, usedMemory] = output.trim().split(',');
        const output2 = await fetchExec([
            "free -b",
            "awk 'FNR == 2 {printf \"%d\", int(($3/$2)*100)}'"
        ].join(' | '));
        const usedPercent = parseInt(output2.trim(), 10);
        return JSON.stringify({ totalMemory, usedMemory, usedPercent});
    } catch (err : any) {
        MyDebug('Error executing memory command: ' + err.message);
        return null;
    }
}


export async function parseTemp() {
    if (!isSSHConnected()) {
        MyDebug('parseTemp called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec([
            "sensors -j",
            "jq '[.. | objects | to_entries[] | select(.key | test(\"^temp[[:digit:]]+_input$\")) | select(.value | type == \"number\") | .value] | max'",
            "awk '{printf \"%.1f\", $1}'"
        ].join(' | '));

        const maxTemp = parseFloat(output.trim());
        return maxTemp;
    } catch (err : any) {
        MyDebug('Error executing temp command: ' + err.message);
        return null;
    }
}


export async function parseGpu() {
    if (!isSSHConnected()) {
        MyDebug('parseGpu called but SSH connection not established');
        return null;
    }
    try {
        const output1 = await fetchExec([
            "scontrol show nodes",
            "sponge",
            "awk -F'[=,]' '/AllocTRES/ {for(i=1; i<=NF; i++) if($i==\"gres/gpu\") sum+=$(i+1)} END {print sum+0}'"
        ].join(' | '));
        const usedGpu = parseInt(output1.trim(), 10);

        const output2 = await fetchExec([
            "sinfo -N -h -o '%G'",
            "sponge",
            "grep -oP 'gpu:\\w+:\\K\\d+'",
            "sponge",
            "awk '{sum+=$1} END {print sum+0}'"
        ].join(' | '));
        const totalGpu = parseInt(output2.trim(), 10);

        return JSON.stringify({ usedGpu, totalGpu });
    } catch (err : any) {
        MyDebug('Error executing GPU command: ' + err.message);
        return null;
    }
}


export async function parseTaskCount() {
    if (!isSSHConnected()) {
        MyDebug('parseTaskCount called but SSH connection not established');
        return null;
    }
    try {
        const output1 = await fetchExec([
            "sacct -a -n -X -S \"$(date -d '1 week ago' +'%Y-%m-%dT%H:%M:%S')\" -E \"$(date +'%Y-%m-%dT%H:%M:%S')\" -o JobID,State",
            "awk '{counts[$2]++} END {for (state in counts) print state\":\"counts[state]}'"
        ].join(' | '));

        const stateCounts: { [key: string]: number } = {};
        output1.trim().split('\n').forEach(line => {
            if(!line.includes(':')) return;
            let [state, countStr] = line.split(':');
            if(!state || !countStr) return;
            if(state.startsWith('COMPLETED')) state='COMPLETED';
            if(state.startsWith('FAILED')) state='FAILED';
            if(state.startsWith('RUNNING')) state='RUNNING';
            if(state.startsWith('PENDING')) state='PENDING';
            if(state.startsWith('CANCELLED')) state='CANCELLED';

            stateCounts[state] = parseInt(countStr, 10);
        });

        const taskCount7 = Object.values(stateCounts).reduce((a, b) => a + b, 0);
        
        const output2 = await fetchExec([
            "sacct -a -n -X -S \"$(date -d '2 week ago' +'%Y-%m-%dT%H:%M:%S')\" -E \"$(date -d '1 week ago' +'%Y-%m-%dT%H:%M:%S')\" -o JobID",
            "wc -l"
        ].join(' | '));
        const taskCount14 = parseInt(output2.trim(), 10);

        return JSON.stringify({ taskCount7, taskCount14 , stateCounts });
    } catch (err : any) {
        MyDebug('Error executing task count command: ' + err.message);
        return null;
    }
}


export async function parseSar(command: string) {
    if (!isSSHConnected()) {
        MyDebug('parseSar called but SSH connection not established');
        return null;
    }
    try {
        let output: string;
        switch (command) {
            case 'ldavg': {
                output = await fetchExec([
                    "sadf -j -- -q",
                    "jq -r -c '.sysstat.hosts[].statistics[] | {time: (.timestamp.time), load:( .queue.\"ldavg-15\")}'",
                    "sponge",
                    "tail -n 30"
                ].join(' | '));
                const data = output
                    .split('\n')
                    .filter(line => line.trim() !== '')
                    .map(line => JSON.parse(line))
                    .map(item => ({ timestamp: toUTC8(item.time), value: item.load }));
                return data;
            }
            case 'CPU': {
                output = await fetchExec([
                    "sadf -j -- -u",
                    "jq -r -c '.sysstat.hosts[].statistics[] | {time: (.timestamp.time), load:( .\"cpu-load\"[].idle)}'",
                    "sponge",
                    "tail -n 30"
                ].join(' | '));
                const idleData = output.split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
                const data = idleData.map(item => ({
                    timestamp: toUTC8(item.time),
                    value: parseFloat((100 - item.load).toFixed(2)) // used percent
                }));
                return data;
            }
            case 'MEM': {
                output = await fetchExec([
                    "sadf -j -- -r",
                    "jq -r -c '.sysstat.hosts[].statistics[] | {time: (.timestamp.time), used:( .memory.\"memused-percent\")}'",
                    "sponge",
                    "tail -n 30"
                ].join(' | '));
                const data = output
                    .split('\n')
                    .filter(line => line.trim() !== '')
                    .map(line => JSON.parse(line))
                    .map(item => ({ timestamp: toUTC8(item.time), value: item.used }));
                return data;
            }
            case 'DSK': {
                output = await fetchExec([
                    "sadf -j -- -b",
                    "jq -r -c '.sysstat.hosts[].statistics[] | {time: (.timestamp.time), tps:( .io.\"tps\")}'",
                    "sponge",
                    "tail -n 30"
                ].join(' | '));
                const data = output
                    .split('\n')
                    .filter(line => line.trim() !== '')
                    .map(line => JSON.parse(line))
                    .map(item => ({ timestamp: toUTC8(item.time), value: item.tps }));
                return data;
            }
            default:
                throw new Error(`Unsupported sar command: ${command}`);
                return null;
        }
        return null;
    } catch (err : any) {
        MyDebug('Error executing sar command: ' + err.message);
        return null;
    }
}



export type SacctJob = {
    jobId: string;
    user: string;
    jobName: string;
    state: string;
    exitCode: string;
    elapsed: string;
    start: string;
    end: string;
    allocTRES: string;
    workDir: string;
    submitLine: string;
};

export async function parseSacct() {
    if (!isSSHConnected()) {
        MyDebug('parseSacct called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec([
            "sacct -a -n -X -P -S \"$(date -d '3 day ago' +'%Y-%m-%dT%H:%M:%S')\" -E \"$(date +'%Y-%m-%dT%H:%M:%S')\" -o JobID,User,JobName,State,ExitCode,Elapsed,Start,End,AllocTRES,WorkDir,SubmitLine",
            "tail -n 30",
            "tac"
        ].join(' | '));
        const lines = output.trim().split('\n');
        const jobs: SacctJob[] = lines
            .filter(line => line && line.includes('|'))
            .map(line => {
                const [jobId, user, jobName, state, exitCode, elapsed, start, end, allocTRES, workDir, ...submitLineParts] = line.split('|');
                const submitLine = submitLineParts.join('|');
                return {
                    jobId: jobId || '',
                    user: user || '',
                    jobName: jobName || '',
                    state: normalizeState(state || ''),
                    exitCode: exitCode || '',
                    elapsed: elapsed || '',
                    start: start ? convertTime(start) : '',
                    end: end ? convertTime(end) : '',
                    allocTRES: allocTRES || '',
                    workDir: workDir || '',
                    submitLine: submitLine || ''
                };
            });

        return jobs;
        
    } catch (err : any) {
        MyDebug('Error executing sacct command: ' + err.message);
        return null;
    }
}

export async function parseUptime() {
    if (!isSSHConnected()) {
        MyDebug('parseUptime called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec("uptime -p");
        return output.trim();
    } catch (err : any) {
        MyDebug('Error executing uptime command: ' + err.message);
        return null;
    }
}

function calcSize(sizeStr: string): string {
    const size = parseInt(sizeStr, 10);
    if (isNaN(size)) return '-';
    if (size < 1024) return `${size} B`;
    else if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    else if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    else return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export async function parsePwdFiles(pwd: string, hidden: boolean) {
    if (!isSSHConnected()) {
        MyDebug('parsePwdFiles called but SSH connection not established');
        return null;
    }
    try {
        const command = hidden ? (
            `cd "${pwd.replace(/"/g, '\\"')}" && find . -maxdepth 1 -mindepth 1 -print0 | xargs -0r stat -c "%n|%s|%y|%f"`
        ) : (
            `cd "${pwd.replace(/"/g, '\\"')}" && find . -maxdepth 1 -mindepth 1 ! -name ".*" -print0 | xargs -0r stat -c "%n|%s|%y|%f"`
        );
        const output = await fetchExec(command);
        const lines = output.trim().split('\n').filter(line => line);
        const files = lines.map(line => {
            const parts = line.split('|');
            if (parts.length < 4) {
                MyDebug('Skipping line due to insufficient parts: ' + line);
                return null;
            }
            const name = parts[0].startsWith('./') ? parts[0].slice(2) : parts[0].replace(/^\.\//, '');
            const type = parts[3].startsWith('4') ? 1 : 0;
            const size = type ? '-' : calcSize(parts[1]);
            const modified = parts[2].split('.')[0]; // Remove fractional seconds
            return { name, type, size, modified };
        }).filter(item => item !== null).sort((a, b) => (
            (a!.type === b!.type) ? a!.name.localeCompare(b!.name) : (-a!.type + b!.type)
        )) as Array<{ name: string; type: number; size: string; modified: string }>;
        
        return files;
    } catch (err : any) {
        MyDebug('Error executing pwd files command: ' + err.message);
        return null;
    }
}


export async function parseUserSacct(date : number) {
    if (!isSSHConnected()) {
        MyDebug('parseUserSacct called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec([
            `sacct -u $USER -n -X -P -S "$(date -d '${date} week ago' +'%Y-%m-%dT%H:%M:%S')" -E "$(date -d '${date-1} week ago' +'%Y-%m-%dT%H:%M:%S')" -o JobID,JobName,State,ExitCode,Elapsed,Start,End,AllocTRES,WorkDir,SubmitLine`,
            "tac"
        ].join(' | '));
        const lines = output.trim().split('\n');
        const jobs: SacctJob[] = lines
            .filter(line => line && line.includes('|'))
            .map(line => {
                const [jobId, jobName, state, exitCode, elapsed, start, end, allocTRES, workDir, ...submitLineParts] = line.split('|');
                const submitLine = submitLineParts.join('|');
                return {
                    jobId: jobId || '',
                    user: '', // user is omitted here
                    jobName: jobName || '',
                    state: normalizeState(state || ''),
                    exitCode: exitCode || '',
                    elapsed: elapsed || '',
                    start: start ? convertTime(start) : '',
                    end: end ? convertTime(end) : '',
                    allocTRES: allocTRES || '',
                    workDir: workDir || '',
                    submitLine: submitLine || ''
                };
            });
            
        return jobs;
    } catch (err : any) {
        MyDebug('Error executing user sacct command: ' + err.message);
        return null;
    }
}

export async function parseTmuxActive() {
    if (!isSSHConnected()) {
        MyDebug('parseTmuxActive called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec("tmux ls -F \"#{session_id}|#{session_name}|#{t:session_created}|#{session_attached}\"");
        const sessions = output.trim().split('\n').map(line => {
            const parts = line.split('|');
            if(parts.length < 4) {
                return { id: '', name: '', time: '', attached: false };
            }
            const id = parts[0];
            const name = parts[1];
            const time = parts[2];
            const attached = parts[3] === '1';
            return { id, name, time, attached };
        });
        return sessions;
    } catch (err : any) {
        MyDebug('Error executing tmux ls command: ' + err.message);
        return null;
    }
}



export async function parseNewJobid() {
    if (!isSSHConnected()) {
        MyDebug('parseNewJobid called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec("sacct -a -n -X -o jobid | awk -F'.' '{print $1}' | sort -n | tail -1");
        const newJobId = parseInt(output.trim(), 10)+1;
        return newJobId;
    } catch (err : any) {
        MyDebug('Error executing new jobid command: ' + err.message);
        return null;
    }
}



export async function parseRealPath(path: string) {
    if (!isSSHConnected()) {
        MyDebug('parseRealPath called but SSH connection not established');
        return null;
    }
    try {
        const output = await fetchExec(`realpath "${path.replace(/"/g, '\\"')}"`);
        return output.trim();
    } catch (err : any) {
        MyDebug('Error executing realpath command: ' + err.message);
        return null;
    }
}