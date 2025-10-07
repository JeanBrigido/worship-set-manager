#!/usr/bin/env node

/**
 * Port Cleanup Script for Worship Set Manager
 *
 * This script kills any processes running on ports 3000 and 3001
 * to ensure clean startup of frontend and backend servers.
 *
 * Works on both Windows and Unix-based systems.
 */

const { execSync } = require('child_process');
const os = require('os');

const PORTS_TO_CLEAN = [3000, 3001];
const isWindows = os.platform() === 'win32';

/**
 * Get the PID of the process using a specific port
 * @param {number} port - Port number to check
 * @returns {string|null} - PID of the process or null if port is free
 */
function getProcessOnPort(port) {
  try {
    if (isWindows) {
      // Use PowerShell to get the process on Windows
      const command = `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`;
      const output = execSync(command, { encoding: 'utf8' }).trim();
      return output || null;
    } else {
      // Use lsof on Unix-based systems
      const command = `lsof -t -i:${port}`;
      const output = execSync(command, { encoding: 'utf8' }).trim();
      return output || null;
    }
  } catch (error) {
    // No process found on this port
    return null;
  }
}

/**
 * Kill a process by PID
 * @param {string} pid - Process ID to kill
 * @param {number} port - Port number (for logging)
 * @returns {boolean} - Success status
 */
function killProcess(pid, port) {
  try {
    if (isWindows) {
      // Use taskkill on Windows
      execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8', shell: 'cmd.exe' });
    } else {
      // Use kill on Unix-based systems
      execSync(`kill -9 ${pid}`, { encoding: 'utf8' });
    }
    console.log(`✓ Killed process ${pid} on port ${port}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to kill process ${pid} on port ${port}: ${error.message}`);
    return false;
  }
}

/**
 * Clean up all specified ports
 */
function cleanupPorts() {
  console.log('🧹 Cleaning up ports for Worship Set Manager...\n');

  let killedCount = 0;
  let freeCount = 0;

  for (const port of PORTS_TO_CLEAN) {
    console.log(`Checking port ${port}...`);
    const pid = getProcessOnPort(port);

    if (pid) {
      console.log(`  Found process ${pid} using port ${port}`);
      if (killProcess(pid, port)) {
        killedCount++;
      }
    } else {
      console.log(`  Port ${port} is free`);
      freeCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Summary: ${killedCount} process(es) killed, ${freeCount} port(s) already free`);
  console.log('='.repeat(50) + '\n');

  if (killedCount > 0) {
    console.log('Ports cleaned successfully! Ready to start servers.\n');
  } else {
    console.log('All ports were already available.\n');
  }
}

// Run the cleanup
try {
  cleanupPorts();
  process.exit(0);
} catch (error) {
  console.error('❌ Cleanup failed:', error.message);
  process.exit(1);
}
