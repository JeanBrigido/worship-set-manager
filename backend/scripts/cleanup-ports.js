#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PORTS_TO_CLEAN = [3000, 3001];

async function findProcessOnPort(port) {
  try {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // Windows command using netstat
      const { stdout } = await execPromise(`netstat -ano | grep ":${port}"`);
      const lines = stdout.trim().split('\n');

      if (lines.length === 0 || !lines[0]) {
        return null;
      }

      // Extract PID from the output (last column)
      const match = lines[0].match(/LISTENING\s+(\d+)/);
      return match ? match[1] : null;
    } else {
      // Unix-like systems (macOS, Linux)
      const { stdout } = await execPromise(`lsof -ti :${port}`);
      return stdout.trim() || null;
    }
  } catch (error) {
    // No process found on this port
    return null;
  }
}

async function killProcess(pid) {
  try {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // Windows uses taskkill with double slashes in MINGW
      await execPromise(`taskkill //F //PID ${pid}`);
    } else {
      // Unix-like systems use kill
      await execPromise(`kill -9 ${pid}`);
    }

    return true;
  } catch (error) {
    console.error(`Failed to kill process ${pid}:`, error.message);
    return false;
  }
}

async function cleanupPorts() {
  console.log('🧹 Cleaning up ports...');

  for (const port of PORTS_TO_CLEAN) {
    console.log(`\n📍 Checking port ${port}...`);

    const pid = await findProcessOnPort(port);

    if (pid) {
      console.log(`   ⚠️  Found process ${pid} using port ${port}`);
      const success = await killProcess(pid);

      if (success) {
        console.log(`   ✅ Successfully killed process ${pid}`);
      } else {
        console.log(`   ❌ Failed to kill process ${pid}`);
      }
    } else {
      console.log(`   ✅ Port ${port} is free`);
    }
  }

  console.log('\n✨ Port cleanup complete!\n');
}

// Run the cleanup
cleanupPorts().catch((error) => {
  console.error('Error during port cleanup:', error);
  process.exit(1);
});
