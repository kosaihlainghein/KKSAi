// ComfyUI API client — builds workflow JSON, queues prompts, polls for results.
// Supports: text-to-image (SD1.5/SDXL), image-to-video (AnimateDiff + AnimateLCM).

import { COMFYUI_URL, fetchImage, uploadImage } from './backend';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GenerationParams {
  prompt: string;
  negativePrompt: string;
  seed: number;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  modelName: string;
  batchSize: number;
}

export interface VideoParams {
  prompt: string;
  negativePrompt: string;
  seed: number;
  steps: number;
  cfgScale: number;
  modelName: string;
  referenceImageName: string | null; // ComfyUI upload name
  frames: number;
  motionScale: number;
}

export interface GenerationResult {
  images: string[]; // blob URLs
  seed: number;
}

export interface VideoResult {
  videoUrl: string; // blob URL
  seed: number;
}

interface PromptResponse {
  prompt_id: string;
}


// ── Workflow builders ─────────────────────────────────────────────────────────

function buildImageWorkflow(p: GenerationParams): Record<string, unknown> {
  const batch = Math.min(p.batchSize, 4);
  const nodes: Record<string, unknown> = {
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: p.modelName },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width: p.width, height: p.height, batch_size: batch },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: p.negativePrompt, clip: ['4', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: p.prompt, clip: ['4', 1] },
    },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: p.seed,
        steps: p.steps,
        cfg: p.cfgScale,
        sampler_name: 'dpmpp_2m',
        scheduler: 'karras',
        denoise: 1,
        model: ['4', 0],
        positive: ['7', 0],
        negative: ['6', 0],
        latent_image: ['5', 0],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { images: ['8', 0], filename_prefix: 'KKS_Generate' },
    },
  };
  return nodes;
}

function buildVideoWorkflow(p: VideoParams): Record<string, unknown> {
  // AnimateDiff + AnimateLCM pipeline for image-to-video
  // Requires ComfyUI-AnimateDiff-Evolved custom node
  const nodes: Record<string, unknown> = {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: p.modelName },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: { text: p.prompt, clip: ['1', 1] },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: { text: p.negativePrompt, clip: ['1', 1] },
    },
    '4': {
      class_type: 'ADE_AnimateDiffLoaderGen1',
      inputs: {
        model: ['1', 0],
        model_name: 'mm_sd_v15_v2.ckpt',
        beta_schedule: 'sqrt_linear',
        motion_model_settings: ['5', 0],
      },
    },
    '5': {
      class_type: 'ADE_AnimateDiffUniformSettingsProvider',
      inputs: { batch_size: p.frames, motion_length: 16, closed_loop: 'N' },
    },
    '6': p.referenceImageName
      ? {
          class_type: 'LoadImage',
          inputs: { image: p.referenceImageName },
        }
      : {
          class_type: 'EmptyLatentImage',
          inputs: { width: 512, height: 512, batch_size: p.frames },
        },
    '7': p.referenceImageName
      ? {
          class_type: 'VAEEncode',
          inputs: { pixels: ['6', 0], vae: ['1', 2] },
        }
      : { class_type: 'Reroute', inputs: { '0': ['6', 0] } },
    '8': {
      class_type: 'KSampler',
      inputs: {
        seed: p.seed,
        steps: p.steps,
        cfg: p.cfgScale,
        sampler_name: 'dpmpp_2m',
        scheduler: 'karras',
        denoise: p.referenceImageName ? 0.65 : 1,
        model: ['4', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: p.referenceImageName ? ['7', 0] : ['6', 0],
      },
    },
    '9': {
      class_type: 'VAEDecode',
      inputs: { samples: ['8', 0], vae: ['1', 2] },
    },
    '10': {
      class_type: 'SaveAnimatedWEBP',
      inputs: {
        images: ['9', 0],
        filename_prefix: 'KKS_Video',
        fps: 8,
        lossless: false,
        quality: 90,
        method: 'default',
        fps_override: 8,
      },
    },
  };
  return nodes;
}

// ── Queue + poll ──────────────────────────────────────────────────────────────

async function queuePrompt(workflow: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PromptResponse;
    return data.prompt_id ?? null;
  } catch {
    return null;
  }
}

async function pollResult(
  promptId: string,
  isVideo: boolean,
  onProgress?: (pct: number) => void
): Promise<GenerationResult | VideoResult | null> {
  const maxWait = 300000; // 5 min
  const interval = 1000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch(`${COMFYUI_URL}/queue`),
        fetch(`${COMFYUI_URL}/history/${promptId}`),
      ]);

      if (historyRes.ok) {
        const history = await historyRes.json();
        const entry = history?.[promptId];
        if (entry?.outputs) {
          if (isVideo) {
            // SaveAnimatedWEBP outputs in node '10'
            const out = entry.outputs['10'] ?? entry.outputs['9'];
            if (out?.gifs?.[0]?.filename) {
              const fn = out.gifs[0].filename;
              const subfolder = out.gifs[0].subfolder ?? '';
              const videoUrl = await fetchVideo(fn, subfolder);
              if (videoUrl) {
                return { videoUrl, seed: 0 } as VideoResult;
              }
            }
          } else {
            // SaveImage outputs in node '9'
            const out = entry.outputs['9'];
            if (out?.images) {
              const images: string[] = [];
              for (const img of out.images) {
                const url = await fetchImage(img.filename);
                if (url) images.push(url);
              }
              if (images.length > 0) {
                return { images, seed: 0 } as GenerationResult;
              }
            }
          }
        }
      }

      // Estimate progress from queue position
      if (onProgress && statusRes.ok) {
        const status = await statusRes.json();
        const queueLen = status?.queue_running?.length ?? 0;
        if (queueLen > 0) {
          onProgress(30);
        } else {
          onProgress(60);
        }
      }
    } catch {
      // ignore transient fetch errors
    }

    await new Promise(r => setTimeout(r, interval));
  }

  return null;
}

async function fetchVideo(filename: string, subfolder: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ filename, type: 'output' });
    if (subfolder) params.set('subfolder', subfolder);
    const res = await fetch(`${COMFYUI_URL}/view?${params}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateImages(
  params: GenerationParams,
  onProgress?: (pct: number) => void
): Promise<GenerationResult | null> {
  const workflow = buildImageWorkflow(params);
  const promptId = await queuePrompt(workflow);
  if (!promptId) return null;
  return (await pollResult(promptId, false, onProgress)) as GenerationResult | null;
}

export async function generateVideo(
  params: VideoParams,
  onProgress?: (pct: number) => void
): Promise<VideoResult | null> {
  const workflow = buildVideoWorkflow(params);
  const promptId = await queuePrompt(workflow);
  if (!promptId) return null;
  return (await pollResult(promptId, true, onProgress)) as VideoResult | null;
}

export async function uploadReferenceImage(file: File): Promise<string | null> {
  return uploadImage(file, `ref_${Date.now()}.${file.name.split('.').pop() || 'png'}`);
}

// Interrupt current generation
export async function interruptGeneration(): Promise<void> {
  try {
    await fetch(`${COMFYUI_URL}/interrupt`, { method: 'POST' });
  } catch {
    // ignore
  }
}
