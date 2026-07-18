// Training backend client — manages training jobs, live metrics, and model
// checkpoints in Supabase. The UI uses this to start/stop training, stream
// per-step metrics into charts, and list/download saved checkpoints.

import { supabase } from './supabase';
import type {
  DbTrainingJob,
  DbTrainingMetric,
  DbModelCheckpoint,
} from './supabase';

export interface TrainingConfig {
  learningRate: number;
  steps: number;
  batchSize: number;
  resolution: number;
  optimizer: 'adamw' | 'adam8bit' | 'sgd';
  mixedPrecision: 'fp16' | 'fp32' | 'bf16';
  gradientCheckpointing: boolean;
  loraRank: number;
  saveEveryNSteps: number;
  validationEveryNSteps: number;
}

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  learningRate: 1e-6,
  steps: 1000,
  batchSize: 1,
  resolution: 512,
  optimizer: 'adamw',
  mixedPrecision: 'fp16',
  gradientCheckpointing: true,
  loraRank: 32,
  saveEveryNSteps: 200,
  validationEveryNSteps: 100,
};

// ─── Job lifecycle ────────────────────────────────────────────────────────────

export async function createTrainingJob(
  projectId: string,
  mode: 'image' | 'video',
  config: TrainingConfig
): Promise<DbTrainingJob | null> {
  const { data, error } = await supabase
    .from('training_jobs')
    .insert({
      project_id: projectId,
      mode,
      config: config as unknown as Record<string, unknown>,
      status: 'running',
      progress: 0,
      logs: [],
    })
    .select()
    .maybeSingle();

  if (error || !data) return null;
  return data as DbTrainingJob;
}

export async function updateJobProgress(
  jobId: string,
  progress: number,
  logs?: Array<{ message: string; type: string; timestamp: string }>
): Promise<void> {
  const update: Record<string, unknown> = { progress };
  if (logs) update.logs = logs;
  await supabase.from('training_jobs').update(update).eq('id', jobId);
}

export async function completeJob(jobId: string, finalProgress: number): Promise<void> {
  await supabase
    .from('training_jobs')
    .update({ status: 'completed', progress: finalProgress, completed_at: new Date().toISOString() })
    .eq('id', jobId);
}

export async function stopJob(jobId: string): Promise<void> {
  await supabase
    .from('training_jobs')
    .update({ status: 'stopped', completed_at: new Date().toISOString() })
    .eq('id', jobId);
}

export async function failJob(jobId: string, errorMsg: string): Promise<void> {
  await supabase
    .from('training_jobs')
    .update({ status: 'failed', completed_at: new Date().toISOString() })
    .eq('id', jobId);
  await appendLog(jobId, errorMsg, 'error');
}

export async function appendLog(
  jobId: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): Promise<void> {
  const { data } = await supabase.from('training_jobs').select('logs').eq('id', jobId).maybeSingle();
  const existingLogs = (data?.logs as Array<{ message: string; type: string; timestamp: string }>) ?? [];
  existingLogs.push({ message, type, timestamp: new Date().toISOString() });
  await supabase.from('training_jobs').update({ logs: existingLogs }).eq('id', jobId);
}

export async function getJob(jobId: string): Promise<DbTrainingJob | null> {
  const { data, error } = await supabase
    .from('training_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();
  if (error || !data) return null;
  return data as DbTrainingJob;
}

export async function getJobsForProject(projectId: string): Promise<DbTrainingJob[]> {
  const { data, error } = await supabase
    .from('training_jobs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as DbTrainingJob[];
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export async function addMetric(
  jobId: string,
  step: number,
  epoch: number,
  loss: number,
  learningRate: number,
  valLoss?: number
): Promise<void> {
  await supabase.from('training_metrics').insert({
    job_id: jobId,
    step,
    epoch,
    loss,
    learning_rate: learningRate,
    val_loss: valLoss ?? null,
  });
}

export async function getMetrics(jobId: string): Promise<DbTrainingMetric[]> {
  const { data, error } = await supabase
    .from('training_metrics')
    .select('*')
    .eq('job_id', jobId)
    .order('step', { ascending: true });
  if (error || !data) return [];
  return data as DbTrainingMetric[];
}

export async function subscribeToMetrics(
  jobId: string,
  callback: (metric: DbTrainingMetric) => void
): Promise<() => void> {
  const channel = supabase
    .channel(`metrics_${jobId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'training_metrics', filter: `job_id=eq.${jobId}` },
      (payload) => callback(payload.new as DbTrainingMetric)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─── Checkpoints ──────────────────────────────────────────────────────────────

export async function addCheckpoint(
  jobId: string,
  step: number,
  filename: string,
  filePath: string,
  loss: number,
  isBest: boolean,
  isFinal: boolean,
  fileSizeMb?: number
): Promise<void> {
  await supabase.from('model_checkpoints').insert({
    job_id: jobId,
    step,
    filename,
    file_path: filePath,
    loss,
    is_best: isBest,
    is_final: isFinal,
    file_size_mb: fileSizeMb ?? null,
  });
}

export async function getCheckpoints(jobId: string): Promise<DbModelCheckpoint[]> {
  const { data, error } = await supabase
    .from('model_checkpoints')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as DbModelCheckpoint[];
}

export async function subscribeToCheckpoints(
  jobId: string,
  callback: (checkpoint: DbModelCheckpoint) => void
): Promise<() => void> {
  const channel = supabase
    .channel(`checkpoints_${jobId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'model_checkpoints', filter: `job_id=eq.${jobId}` },
      (payload) => callback(payload.new as DbModelCheckpoint)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─── Simulated training (demo mode when no local backend) ─────────────────────

export interface SimulationCallbacks {
  onLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onMetric: (step: number, epoch: number, loss: number, lr: number, valLoss?: number) => void;
  onCheckpoint: (step: number, loss: number, isBest: boolean, isFinal: boolean) => void;
  onProgress: (pct: number) => void;
  shouldStop: () => boolean;
}

export async function runSimulatedTraining(
  jobId: string,
  config: TrainingConfig,
  callbacks: SimulationCallbacks
): Promise<void> {
  const totalSteps = config.steps;
  const epochSize = Math.max(1, Math.floor(totalSteps / 10));
  let bestLoss = Infinity;

  callbacks.onLog(`Training started: ${totalSteps} steps, LR=${config.learningRate}`, 'success');
  callbacks.onLog(`Mixed precision: ${config.mixedPrecision}, optimizer: ${config.optimizer}`, 'info');
  await new Promise((r) => setTimeout(r, 300));

  for (let step = 1; step <= totalSteps; step++) {
    if (callbacks.shouldStop()) {
      callbacks.onLog('Training stopped by user', 'warning');
      return;
    }

    const epoch = Math.floor((step - 1) / epochSize) + 1;
    // Simulate decreasing loss with noise
    const baseLoss = 0.8 * Math.exp(-step / (totalSteps * 0.3)) + 0.05;
    const noise = (Math.random() - 0.5) * 0.02 * Math.exp(-step / totalSteps);
    const loss = Math.max(0.01, baseLoss + noise);
    const lr = config.learningRate * (1 - step / totalSteps * 0.5);
    const valLoss = step % config.validationEveryNSteps === 0 ? loss + Math.random() * 0.01 : undefined;

    callbacks.onMetric(step, epoch, loss, lr, valLoss);
    await addMetric(jobId, step, epoch, loss, lr, valLoss);

    if (step % 50 === 0) {
      callbacks.onLog(`Step ${step}/${totalSteps} | loss=${loss.toFixed(4)} | lr=${lr.toExponential(2)}`, 'info');
    }

    if (step % config.saveEveryNSteps === 0) {
      const isBest = loss < bestLoss;
      if (isBest) bestLoss = loss;
      const filename = `checkpoint-${step}.safetensors`;
      const filePath = `output/${jobId}/${filename}`;
      callbacks.onCheckpoint(step, loss, isBest, false);
      await addCheckpoint(jobId, step, filename, filePath, loss, isBest, false, 1024 + Math.random() * 512);
      callbacks.onLog(`Checkpoint saved: ${filename} (loss=${loss.toFixed(4)}${isBest ? ' [BEST]' : ''})`, 'success');
    }

    callbacks.onProgress(Math.round((step / totalSteps) * 100));
    await new Promise((r) => setTimeout(r, 80));
  }

  const finalLoss = 0.05 + Math.random() * 0.01;
  callbacks.onCheckpoint(totalSteps, finalLoss, finalLoss < bestLoss, true);
  await addCheckpoint(jobId, totalSteps, `checkpoint-final.safetensors`, `output/${jobId}/checkpoint-final.safetensors`, finalLoss, finalLoss < bestLoss, true, 2048);
  callbacks.onLog(`Training complete! Final loss: ${finalLoss.toFixed(4)}`, 'success');
  callbacks.onProgress(100);
}
