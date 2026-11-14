import { execSync } from 'child_process';

const PORTS = [3000, 3001, 3002, 3003, 3010, 3020];

function killPortsOnWindows() {
  const killedPids = new Set();
  
  for (const port of PORTS) {
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      
      for (const line of lines) {
        if (!line.includes('LISTENING') && !line.includes('ESTABLISHED')) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        
        if (pid && pid !== '0' && pid !== String(process.pid) && !killedPids.has(pid)) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            killedPids.add(pid);
            console.log(`[kill-ports] Freed port ${port} by terminating PID ${pid}`);
          } catch {
            // Process may have already exited
          }
        }
      }
    } catch {
      // Port is not in use
    }
  }

  if (killedPids.size === 0) {
    console.log('[kill-ports] Ports are clean.');
  } else {
    console.log(`[kill-ports] Successfully released ${killedPids.size} lingering process(es).`);
  }
}

killPortsOnWindows();
