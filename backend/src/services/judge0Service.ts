import axios from 'axios';
import { env } from '../config/env';
import {
  Judge0Submission,
  Judge0Result,
  JUDGE0_STATUS,
  PYTHON3_LANGUAGE_ID,
} from '../types';

const judge0Client = axios.create({
  baseURL: env.JUDGE0_API_URL,
  headers: {
    'X-RapidAPI-Key': env.JUDGE0_API_KEY,
    'X-RapidAPI-Host': env.JUDGE0_HOST,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export type ExecutionResult = {
  stdout: string;
  stderr: string;
  compile_output: string;
  status_id: number;
  status_description: string;
  execution_time: string;
  error_type: 'none' | 'syntax' | 'runtime' | 'timeout' | 'internal';
};

export const executeCode = async (
  code: string,
  stdin?: string
): Promise<ExecutionResult> => {
  const submission: Judge0Submission = {
    source_code: Buffer.from(code).toString('base64'),
    language_id: PYTHON3_LANGUAGE_ID,
    stdin: stdin ? Buffer.from(stdin).toString('base64') : undefined,
  };

  // Submit to Judge0
  const { data: submitData } = await judge0Client.post(
    '/submissions?base64_encoded=true&wait=false',
    submission
  );

  const token = submitData.token;
  if (!token) {
    throw new Error('Judge0 did not return a submission token.');
  }

  // Poll for result (max 10 attempts, 2s apart)
  let result: Judge0Result | null = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(2000);
    const { data } = await judge0Client.get(
      `/submissions/${token}?base64_encoded=true`
    );

    const statusId = data.status?.id;
    if (statusId !== JUDGE0_STATUS.IN_QUEUE && statusId !== JUDGE0_STATUS.PROCESSING) {
      result = data;
      break;
    }
  }

  if (!result) {
    return {
      stdout: '',
      stderr: '',
      compile_output: '',
      status_id: JUDGE0_STATUS.TIME_LIMIT_EXCEEDED,
      status_description: 'Time Limit Exceeded',
      execution_time: '0',
      error_type: 'timeout',
    };
  }

  const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8') : '';
  const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : '';
  const compile_output = result.compile_output
    ? Buffer.from(result.compile_output, 'base64').toString('utf-8')
    : '';

  const statusId = result.status.id;

  let error_type: ExecutionResult['error_type'] = 'none';
  if (statusId === JUDGE0_STATUS.COMPILATION_ERROR) error_type = 'syntax';
  else if (statusId === JUDGE0_STATUS.TIME_LIMIT_EXCEEDED) error_type = 'timeout';
  else if (statusId >= JUDGE0_STATUS.RUNTIME_ERROR_SIGSEGV && statusId <= JUDGE0_STATUS.RUNTIME_ERROR_OTHER) {
    error_type = 'runtime';
  } else if (statusId === JUDGE0_STATUS.INTERNAL_ERROR || statusId === JUDGE0_STATUS.EXEC_FORMAT_ERROR) {
    error_type = 'internal';
  }

  return {
    stdout,
    stderr,
    compile_output,
    status_id: statusId,
    status_description: result.status.description,
    execution_time: result.time,
    error_type,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));