/*
# KKS AI Smart Trainer — Full Schema

## Summary
Creates the complete backend schema for KKS AI Smart Trainer.
All tables are single-tenant (no user auth), so every policy targets
`anon, authenticated` roles and uses `USING (true)` for intentionally
shared/public data.

## New Tables

### 1. `projects`
Stores AI model training projects.
- `id` uuid PK
- `name` text — project display name
- `type` text — training type: Fine-tune, Dreambooth, Style Transfer, Image-to-Video
- `status` text — 'draft' | 'training' | 'ready'
- `progress` int — 0-100 training progress
- `thumbnail_url` text — preview image URL
- `is_video` boolean — whether this is a video model project
- `created_at` timestamptz

### 2. `chat_messages`
Persists AI assistant chat history with session grouping.
- `id` uuid PK
- `session_id` text — groups messages by browser session
- `role` text — 'user' | 'assistant'
- `content` text — message body (Myanmar + English)
- `created_at` timestamptz

### 3. `training_jobs`
Records training runs per project with config + logs.
- `id` uuid PK
- `project_id` uuid FK → projects
- `mode` text — 'image' | 'video'
- `config` jsonb — full training configuration snapshot
- `status` text — 'running' | 'completed' | 'stopped' | 'failed'
- `progress` int — 0-100
- `logs` jsonb — array of log line objects
- `created_at` timestamptz
- `completed_at` timestamptz (nullable)

### 4. `dataset_files`
Metadata for files uploaded to a project's dataset.
- `id` uuid PK
- `project_id` uuid FK → projects (nullable for unassigned)
- `name` text — original filename
- `file_type` text — 'image' | 'video'
- `caption` text — AI-generated or manual caption/tags
- `preview_url` text — thumbnail/preview URL
- `duration` text — video duration string e.g. "3s" (nullable)
- `created_at` timestamptz

## Security
- RLS enabled on all tables.
- Single-tenant app (no login): all policies target `anon, authenticated`.
- `USING (true)` is intentional — data is shared across the app instance.

## Indexes
- `chat_messages.session_id` for fast session history lookups.
- `training_jobs.project_id` for project → jobs queries.
- `dataset_files.project_id` for project → files queries.
*/

-- ─── projects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  type         text NOT NULL DEFAULT 'Fine-tune',
  status       text NOT NULL DEFAULT 'draft',
  progress     int  NOT NULL DEFAULT 0,
  thumbnail_url text,
  is_video     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

-- ─── chat_messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL DEFAULT 'default',
  role       text NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session
  ON chat_messages (session_id, created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat" ON chat_messages;
CREATE POLICY "anon_select_chat" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat" ON chat_messages;
CREATE POLICY "anon_insert_chat" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat" ON chat_messages;
CREATE POLICY "anon_delete_chat" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

-- ─── training_jobs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
  mode         text NOT NULL DEFAULT 'image',
  config       jsonb NOT NULL DEFAULT '{}',
  status       text NOT NULL DEFAULT 'running',
  progress     int  NOT NULL DEFAULT 0,
  logs         jsonb NOT NULL DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_training_jobs_project
  ON training_jobs (project_id, created_at DESC);

ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_jobs" ON training_jobs;
CREATE POLICY "anon_select_jobs" ON training_jobs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_jobs" ON training_jobs;
CREATE POLICY "anon_insert_jobs" ON training_jobs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_jobs" ON training_jobs;
CREATE POLICY "anon_update_jobs" ON training_jobs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_jobs" ON training_jobs;
CREATE POLICY "anon_delete_jobs" ON training_jobs FOR DELETE
  TO anon, authenticated USING (true);

-- ─── dataset_files ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dataset_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  file_type   text NOT NULL DEFAULT 'image',
  caption     text NOT NULL DEFAULT '',
  preview_url text,
  duration    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dataset_files_project
  ON dataset_files (project_id, created_at);

ALTER TABLE dataset_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_files" ON dataset_files;
CREATE POLICY "anon_select_files" ON dataset_files FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_files" ON dataset_files;
CREATE POLICY "anon_insert_files" ON dataset_files FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_files" ON dataset_files;
CREATE POLICY "anon_update_files" ON dataset_files FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_files" ON dataset_files;
CREATE POLICY "anon_delete_files" ON dataset_files FOR DELETE
  TO anon, authenticated USING (true);
