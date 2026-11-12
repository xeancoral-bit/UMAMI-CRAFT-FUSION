#!/usr/bin/env node
import { execSync } from 'child_process';

const DEFAULT_PORTS = [3000, 3001, 3002, 3003, 3010, 3020];

// Accept optional CLI port arguments: node scripts/kill-ports.js 3000 3001
const customPorts = process.argv.slice(2).map(Number).filter(n => !isNaN(n) && n > 0);
const targetPorts = new Set(customPorts.length > 0 ? customPorts : DEFAULT_PORTS);

function killPorts() {
  const isWin = process.platform === 'win32';
  const myPid = process.pid;
  const pidsToKill = new Map(); // pid -> Set of ports

  if (isWin) {
    let netstatSucceeded = false;
    try {
      // Run `netstat -ano` (without `-p tcp`) so both IPv4 and IPv6 ([::]:port) listeners are included
      const output = execSync('netstat -ano', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      netstatSucceeded = true;
      const lines = output.split(/\r?\n/);

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5) continue;
        const proto = parts[0].toUpperCase();
        const localAddr = parts[1];
        const state = parts[3].toUpperCase();
        const pid = Number(parts[4]);

        if (!proto.startsWith('TCP') || state !== 'LISTENING' || !pid || pid === myPid) continue;

        const portStr = localAddr.split(':').pop();
        const port = Number(portStr);
        if (targetPorts.has(port)) {
          if (!pidsToKill.has(pid)) {
            pidsToKill.set(pid, new Set());
          }
          pidsToKill.get(pid).add(port);
        }
      }
    } catch (_) {
      netstatSucceeded = false;
    }

    // Fallback to PowerShell if netstat failed
    if (!netstatSucceeded && pidsToKill.size === 0) {
      try {
        const portList = Array.from(targetPorts).join(',');
        const psCmd = `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${portList} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`;
        const psOut = execSync(psCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const pids = psOut.split(/\r?\n/).map(s => Number(s.trim())).filter(n => n > 0 && n !== myPid);
        for (const pid of pids) {
          if (!pidsToKill.has(pid)) {
            pidsToKill.set(pid, new Set(['target']));
          }
        }
      } catch (_) {}
    }

    if (pidsToKill.size === 0) {
      console.log(`[kill:ports] Success: Ports [${Array.from(targetPorts).join(', ')}] are clear and ready.`);
      return;
    }

    for (const [pid, ports] of pidsToKill.entries()) {
      const portNames = Array.from(ports).join(', ');
      let killed = false;

      // 1. Force kill process tree with Windows taskkill (/F = force, /T = terminate entire process tree)
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        killed = true;
      } catch (_) {}

      // 2. Fallback to process.kill
      if (!killed) {
        try {
          process.kill(pid, 'SIGKILL');
          killed = true;
        } catch (_) {
          try {
            process.kill(pid);
            killed = true;
          } catch (_) {}
        }
      }

      if (killed) {
        console.log(`[kill:ports] Successfully freed port(s) ${portNames} (Terminated PID ${pid})`);
      } else {
        console.warn(`[kill:ports] Notice: PID ${pid} for port(s) ${portNames} was already terminated.`);
      }
    }
  } else {
    // POSIX (macOS / Linux)
    for (const port of targetPorts) {
      try {
        const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const pids = out.split(/\r?\n/).map(s => Number(s.trim())).filter(n => n > 0 && n !== myPid);
        for (const pid of pids) {
          try {
            process.kill(pid, 'SIGKILL');
            console.log(`[kill:ports] Successfully freed port ${port} (PID ${pid})`);
          } catch (_) {}
        }
      } catch (_) {}
    }
  }
}

try {
  killPorts();
} catch (_) {}
