import { supabase } from './supabase';
import type { DbTrainingJob, DbTrainingMetric, DbModelCheckpoint } from './supabase';

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

export async function createTrainingJob(projectId: string, mode: 'image' | 'video', config: TrainingConfig): Promise<DbTrainingJob | null> {
  const { data, error } = await supabase.from('training_jobs').insert({
    project_id: projectId, mode, config: config as unknown as Record<string, unknown>,
    status: 'running', progress: 0, logs: [],
  }).select().maybeSingle();
  if (error || !data) return null;
  return data as DbTrainingJob;
}

export async function completeJob(jobId: string): Promise<void> {
  await supabase.from('training_jobs').update({ status: 'completed', progress: 100, completed_at: new Date().toISOString() }).eq('id', jobId);
}

export async function stopJob(jobId: string): Promise<void> {
  await supabase.from('training_jobs').update({ status: 'stopped', completed_at: new Date().toISOString() }).eq('id', jobId);
}

export async function appendLog(jobId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
  const { data } = await supabase.from('training_jobs').select('logs').eq('id', jobId).maybeSingle();
  const existing = (data?.logs as Array<{ message: string; type: string; timestamp: string }>) ?? [];
  existing.push({ message, type, timestamp: new Date().toISOString() });
  await supabase.from('training_jobs').update({ logs: existing }).eq('id', jobId);
}

export async function addMetric(jobId: string, step: number, epoch: number, loss: number, lr: number, valLoss?: number): Promise<void> {
  await supabase.from('training_metrics').insert({ job_id: jobId, step, epoch, loss, learning_rate: lr, val_loss: valLoss ?? null });
}

export async function subscribeToMetrics(jobId: string, cb: (m: DbTrainingMetric) => void): Promise<() => void> {
  const channel = supabase.channel(`metrics_${jobId}`).on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'training_metrics', filter: `job_id=eq.${jobId}` },
    (p) => cb(p.new as DbTrainingMetric)).subscribe();
  return () => supabase.removeChannel(channel);
}

export async function addCheckpoint(jobId: string, step: number, filename: string, filePath: string, loss: number, isBest: boolean, isFinal: boolean, fileSizeMb?: number): Promise<void> {
  await supabase.from('model_checkpoints').insert({ job_id: jobId, step, filename, file_path: filePath, loss, is_best: isBest, is_final: isFinal, file_size_mb: fileSizeMb ?? null });
}

export async function subscribeToCheckpoints(jobId: string, cb: (c: DbModelCheckpoint) => void): Promise<() => void> {
  const channel = supabase.channel(`ckpt_${jobId}`).on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'model_checkpoints', filter: `job_id=eq.${jobId}` },
    (p) => cb(p.new as DbModelCheckpoint)).subscribe();
  return () => supabase.removeChannel(channel);
}

export interface SimulationCallbacks {
  onLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onProgress: (pct: number) => void;
  shouldStop: () => boolean;
}

export async function runSimulatedTraining(jobId: string, config: TrainingConfig, cb: SimulationCallbacks): Promise<void> {
  const totalSteps = config.steps;
  const epochSize = Math.max(1, Math.floor(totalSteps / 10));
  let bestLoss = Infinity;
  cb.onLog(`Training စတင်ပါပြီ - ${totalSteps} steps, LR=${config.learningRate}`, 'success');
  cb.onLog(`Mixed precision: ${config.mixedPrecision}, Optimizer: ${config.optimizer}`, 'info');
  await new Promise(r => setTimeout(r, 300));

  for (let step = 1; step <= totalSteps; step++) {
    if (cb.shouldStop()) { cb.onLog('အသုံးပြုသူက ရပ်နားတောင်းပါပြီ', 'warning'); return; }
    const epoch = Math.floor((step - 1) / epochSize) + 1;
    const baseLoss = 0.8 * Math.exp(-step / (totalSteps * 0.3)) + 0.05;
    const noise = (Math.random() - 0.5) * 0.02 * Math.exp(-step / totalSteps);
    const loss = Math.max(0.01, baseLoss + noise);
    const lr = config.learningRate * (1 - step / totalSteps * 0.5);
    const valLoss = step % config.validationEveryNSteps === 0 ? loss + Math.random() * 0.01 : undefined;
    await addMetric(jobId, step, epoch, loss, lr, valLoss);
    if (step % 50 === 0) cb.onLog(`Step ${step}/${totalSteps} | loss=${loss.toFixed(4)} | lr=${lr.toExponential(2)}`, 'info');
    if (step % config.saveEveryNSteps === 0) {
      const isBest = loss < bestLoss;
      if (isBest) bestLoss = loss;
      const fn = `checkpoint-${step}.safetensors`;
      await addCheckpoint(jobId, step, fn, `output/${jobId}/${fn}`, loss, isBest, false, 1024 + Math.random() * 512);
      cb.onLog(`Checkpoint သိမ်းဆည်းပြီ - ${fn} (loss=${loss.toFixed(4)}${isBest ? ' [BEST]' : ''})`, 'success');
    }
    cb.onProgress(Math.round((step / totalSteps) * 100));
    await new Promise(r => setTimeout(r, 80));
  }
  const finalLoss = 0.05 + Math.random() * 0.01;
  await addCheckpoint(jobId, totalSteps, 'checkpoint-final.safetensors', `output/${jobId}/checkpoint-final.safetensors`, finalLoss, finalLoss < bestLoss, true, 2048);
  cb.onLog(`Training ပြီးမြောက်ပါပြီ! နောက်ဆုံး loss: ${finalLoss.toFixed(4)}`, 'success');
  cb.onProgress(100);
}
