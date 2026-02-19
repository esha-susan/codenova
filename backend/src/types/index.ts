export interface Profile {
    id: string;
    user_id: string;
    username: string;
    avatar_id: string;
    xp: number;
    level: number;
    created_at: string;
    updated_at: string;
  }
  
  export interface Checkpoint {
    id: string;
    order_index: number;
    title: string;
    narrative_intro: string;
    narrative_success: string;
    narrative_failure: string;
    challenge_description: string;
    starter_code: string;
    expected_output: string;
    test_input: string | null;
    xp_reward: number;
    is_active: boolean;
    created_at: string;
  }
  
  export interface UserProgress {
    id: string;
    user_id: string;
    checkpoint_id: string;
    status: 'locked' | 'unlocked' | 'completed';
    attempt_count: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface Achievement {
    id: string;
    key: string;
    title: string;
    description: string;
    icon: string;
    xp_bonus: number;
    created_at: string;
  }
  
  export interface UserAchievement {
    id: string;
    user_id: string;
    achievement_id: string;
    unlocked_at: string;
  }
  
  export interface SubmissionRequest {
    checkpoint_id: string;
    code: string;
  }
  
  export interface SubmissionResponse {
    success: boolean;
    narrative_response: string;
    updated_xp: number;
    updated_progress: UserProgress;
    sfx_trigger: 'success' | 'failure' | 'error';
    hint?: string;
    achievement?: Achievement;
    error_type?: 'syntax' | 'runtime' | 'timeout' | 'wrong_output';
  }
  
  export interface HintRequest {
    checkpoint_id: string;
    code: string;
    error_output?: string;
    attempt_count: number;
  }
  
  export interface HintResponse {
    hint: string;
    escalation_level: 1 | 2 | 3;
    dragon_message: string;
  }
  
  export interface Judge0Submission {
    source_code: string;
    language_id: number; // 71 = Python 3
    stdin?: string;
    expected_output?: string;
  }
  
  export interface Judge0Result {
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    status: {
      id: number;
      description: string;
    };
    time: string;
    memory: number;
  }
  
  // Judge0 status codes
  export const JUDGE0_STATUS = {
    IN_QUEUE: 1,
    PROCESSING: 2,
    ACCEPTED: 3,
    WRONG_ANSWER: 4,
    TIME_LIMIT_EXCEEDED: 5,
    COMPILATION_ERROR: 6,
    RUNTIME_ERROR_SIGSEGV: 7,
    RUNTIME_ERROR_SIGXFSZ: 8,
    RUNTIME_ERROR_SIGFPE: 9,
    RUNTIME_ERROR_SIGABRT: 10,
    RUNTIME_ERROR_NZEC: 11,
    RUNTIME_ERROR_OTHER: 12,
    INTERNAL_ERROR: 13,
    EXEC_FORMAT_ERROR: 14,
  } as const;
  
  export const PYTHON3_LANGUAGE_ID = 71;