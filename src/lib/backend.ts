export const COMFYUI_URL = 'http://127.0.0.1:8188';
export const CAPTION_SERVER_URL = 'http://127.0.0.1:8189';

export async function checkComfyUI(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

export async function checkCaptionServer(): Promise<boolean> {
  try {
    const res = await fetch(`${CAPTION_SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const res = await fetch(`${COMFYUI_URL}/object_info/CheckpointLoaderSimple`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
  } catch { return []; }
}

export async function uploadImage(file: File | Blob, filename: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('image', file, filename);
    const res = await fetch(`${COMFYUI_URL}/upload/image`, { method: 'POST', body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return data.name ?? null;
  } catch { return null; }
}

export async function fetchImage(filename: string): Promise<string | null> {
  try {
    const res = await fetch(`${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&type=output`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch { return null; }
}
