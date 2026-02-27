import { exec } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type ExecutionResult = {
  stdout: string;
  stderr: string;
  compile_output: string;
  status_id: number;
  status_description: string;
  execution_time: string;
  error_type: 'none' | 'syntax' | 'runtime' | 'timeout' | 'internal';
};

// Maximum time allowed for code execution in milliseconds
const EXECUTION_TIMEOUT_MS = 10000; // 10 seconds

// Detect python command — python3 on Mac/Linux, python on Windows
const getPythonCommand = (): string => {
  return process.platform === 'win32' ? 'python' : 'python3';
};

export const executeCode = async (
  code: string,
  stdin?: string
): Promise<ExecutionResult> => {
  // Create a unique temp directory for this execution
  const executionId = randomUUID();
  const tempDir = join(tmpdir(), `codenova_${executionId}`);
  const codePath = join(tempDir, 'main.py');
  const stdinPath = join(tempDir, 'stdin.txt');

  try {
    // Create temp directory
    await mkdir(tempDir, { recursive: true });

    // Write code to temp file
    await writeFile(codePath, code, 'utf8');

    // Write stdin to temp file if provided
    if (stdin && stdin.trim() !== '') {
      await writeFile(stdinPath, stdin, 'utf8');
    }

    const pythonCmd = getPythonCommand();

    // Build command — pipe stdin file if it exists
    const command = (stdin && stdin.trim() !== '')
      ? `${pythonCmd} "${codePath}" < "${stdinPath}"`
      : `${pythonCmd} "${codePath}"`;

    console.log(`[LocalPython] Executing: ${pythonCmd} main.py`);

    const startTime = Date.now();

    const { stdout, stderr } = await execAsync(command, {
      timeout: EXECUTION_TIMEOUT_MS,
      maxBuffer: 1024 * 1024, // 1MB max output
      windowsHide: true,      // Hide console window on Windows
    });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(3);

    console.log('[LocalPython] Execution complete:', {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      time: `${executionTime}s`,
    });

    // Check if stderr has content — could be runtime error or just warnings
    let error_type: ExecutionResult['error_type'] = 'none';
    let status_description = 'Accepted';

    if (stderr && stderr.trim() !== '') {
      if (
        stderr.includes('SyntaxError') ||
        stderr.includes('IndentationError') ||
        stderr.includes('TabError')
      ) {
        error_type = 'syntax';
        status_description = 'Syntax Error';
      } else {
        error_type = 'runtime';
        status_description = 'Runtime Error';
      }
    }

    return {
      stdout,
      stderr,
      compile_output: '',
      status_id: 0,
      status_description,
      execution_time: executionTime,
      error_type,
    };
  } catch (err: any) {
    console.error('[LocalPython] Execution failed:', err.message);

    // Handle timeout
    if (
      err.killed ||
      err.signal === 'SIGTERM' ||
      err.code === 'ETIMEDOUT' ||
      err.message?.includes('timeout')
    ) {
      return {
        stdout: '',
        stderr: '',
        compile_output: '',
        status_id: -1,
        status_description: 'Time Limit Exceeded',
        execution_time: `${EXECUTION_TIMEOUT_MS / 1000}`,
        error_type: 'timeout',
      };
    }

    // execAsync throws when exit code is non-zero (runtime/syntax errors)
    // The actual error output is in err.stderr
    const stderr = err.stderr ?? '';
    const stdout = err.stdout ?? '';

    let error_type: ExecutionResult['error_type'] = 'runtime';
    let status_description = 'Runtime Error';

    if (
      stderr.includes('SyntaxError') ||
      stderr.includes('IndentationError') ||
      stderr.includes('TabError')
    ) {
      error_type = 'syntax';
      status_description = 'Syntax Error';
    }

    console.log('[LocalPython] Error output:', {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    });

    return {
      stdout,
      stderr,
      compile_output: '',
      status_id: 1,
      status_description,
      execution_time: '0',
      error_type,
    };
  } finally {
    // Always clean up temp files
    await cleanup(codePath, stdinPath, tempDir);
  }
};

const cleanup = async (
  codePath: string,
  stdinPath: string,
  tempDir: string
): Promise<void> => {
  try {
    await unlink(codePath).catch(() => {});
    await unlink(stdinPath).catch(() => {});
    // Remove the temp directory
    const { rmdir } = await import('fs/promises');
    await rmdir(tempDir).catch(() => {});
  } catch {
    // Cleanup failure is non-critical — ignore silently
  }
};