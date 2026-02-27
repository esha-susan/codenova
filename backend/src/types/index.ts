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

// Piston execution types
export interface PistonFile {
  name: string;
  content: string;
}

export interface PistonRequest {
  language: string;
  version: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  run_timeout?: number;
  compile_timeout?: number;
}

export interface PistonRunResult {
  stdout: string;
  stderr: string;
  code: number;
  signal: string | null;
  output: string;
}

export interface PistonResponse {
  language: string;
  version: string;
  run: PistonRunResult;
  compile?: PistonRunResult;
}