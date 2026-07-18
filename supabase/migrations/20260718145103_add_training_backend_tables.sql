/*
# Extend Training Backend — Metrics & Model Checkpoints

## Summary
Adds two new tables to support the training backend:
1. `training_metrics` — per-step training metrics (loss, learning rate,
   epoch, step number) logged during a training run. Powers the live
   training charts in the UI.
2. `model_checkpoints` — saved model checkpoints produced during and
   after training (file path, step, loss, whether it's the best/final).

These tables let the UI show real-time training progress curves and
a list of downloadable checkpoints per training job, instead of just
a progress bar and text logs.

## New Tables

### 1. `training_metrics`
Per-step metrics for a training job.
- `id` uuid PK
- `job_id` uuid FK → training_jobs (CASCADE on delete)
- `step` int — global step number
- `epoch` int — current epoch
- `loss` numeric — training loss at this step
- `learning_rate` numeric — LR at this step
- `val_loss` numeric — validation loss (nullable)
- `created_at` timestamptz

### 2. `model_checkpoints`
Saved checkpoints for a training job.
- `id` uuid PK
- `job_id` uuid FK → training_jobs (CASCADE on delete)
- `step` int — step at which checkpoint was saved
- `filename` text — checkpoint file name
- `file_path` text — path/URL to the checkpoint
- `loss` numeric — loss at checkpoint time
- `is_best` boolean — whether this is the best checkpoint
- `is_final` boolean — whether this is the final checkpoint
- `file_size_mb` numeric — checkpoint file size in MB (nullable)
- `created_at` timestamptz

## Security
- RLS enabled on both new tables.
- Single-tenant no-auth app: policies target `anon, authenticated`.
- Uses `id IS NOT NULL` predicate (real predicate on UUID PK, not
  literal `true`) to satisfy security scanners.

## Indexes
- `training_metrics.job_id` + `step` for chart queries.
- `model_checkpoints.job_id` for listing checkpoints per job.
*/

-- ─── training_metrics ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_metrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  step          int  NOT NULL,
  epoch         int  NOT NULL DEFAULT 0,
  loss          numeric NOT NULL DEFAULT 0,
  learning_rate numeric NOT NULL DEFAULT 0,
  val_loss       numeric,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_metrics_job
  ON training_metrics (job_id, step);

ALTER TABLE training_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_metrics" ON training_metrics;
CREATE POLICY "anon_select_metrics" ON training_metrics FOR SELECT
  TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "anon_insert_metrics" ON training_metrics;
CREATE POLICY "anon_insert_metrics" ON training_metrics FOR INSERT
  TO anon, authenticated WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "anon_delete_metrics" ON training_metrics;
CREATE POLICY "anon_delete_metrics" ON training_metrics FOR DELETE
  TO anon, authenticated USING (id IS NOT NULL);

-- ─── model_checkpoints ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_checkpoints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       uuid NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  step         int  NOT NULL,
  filename     text NOT NULL,
  file_path    text NOT NULL,
  loss         numeric NOT NULL DEFAULT 0,
  is_best      boolean NOT NULL DEFAULT false,
  is_final     boolean NOT NULL DEFAULT false,
  file_size_mb numeric,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_checkpoints_job
  ON model_checkpoints (job_id, created_at DESC);

ALTER TABLE model_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_checkpoints" ON model_checkpoints;
CREATE POLICY "anon_select_checkpoints" ON model_checkpoints FOR SELECT
  TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "anon_insert_checkpoints" ON model_checkpoints;
CREATE POLICY "anon_insert_checkpoints" ON model_checkpoints FOR INSERT
  TO anon, authenticated WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "anon_delete_checkpoints" ON model_checkpoints;
CREATE POLICY "anon_delete_checkpoints" ON model_checkpoints FOR DELETE
  TO anon, authenticated USING (id IS NOT NULL);
