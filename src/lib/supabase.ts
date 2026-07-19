import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbProject {
  id: string;
  name: string;
  type: string;
  status: 'draft' | 'training' | 'ready';
  progress: number;
  thumbnail_url: string | null;
  is_video: boolean;
  created_at: string;
}

export interface DbChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface DbTrainingJob {
  id: string;
  project_id: string | null;
  mode: 'image' | 'video';
  config: Record<string, unknown>;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  progress: number;
  logs: Array<{ message: string; type: string; timestamp: string }>;
  created_at: string;
  completed_at: string | null;
}

export interface DbDatasetFile {
  id: string;
  project_id: string | null;
  name: string;
  file_type: 'image' | 'video';
  caption: string;
  preview_url: string | null;
  duration: string | null;
  created_at: string;
}

export interface DbTrainingMetric {
  id: string;
  job_id: string;
  step: number;
  epoch: number;
  loss: number;
  learning_rate: number;
  val_loss: number | null;
  created_at: string;
}

export interface DbModelCheckpoint {
  id: string;
  job_id: string;
  step: number;
  filename: string;
  file_path: string;
  loss: number;
  is_best: boolean;
  is_final: boolean;
  file_size_mb: number | null;
  created_at: string;
}

export const SESSION_ID = (() => {
  const key = 'kks_chat_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
})();
