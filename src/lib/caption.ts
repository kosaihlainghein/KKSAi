import { CAPTION_SERVER_URL } from './backend';

export interface CaptionResult { caption: string; confidence: number; }

export async function captionImage(file: File | Blob): Promise<CaptionResult | null> {
  try {
    const formData = new FormData();
    formData.append('image', file, 'image.jpg');
    const res = await fetch(`${CAPTION_SERVER_URL}/caption`, { method: 'POST', body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return { caption: data.caption, confidence: data.confidence ?? 0 };
  } catch { return null; }
}

export async function captionImageByPreview(previewUrl: string): Promise<CaptionResult | null> {
  try {
    const res = await fetch(previewUrl);
    const blob = await res.blob();
    return captionImage(blob);
  } catch { return null; }
}

export async function captionBatch(
  files: Array<{ id: string; preview: string }>,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, CaptionResult>> {
  const results = new Map<string, CaptionResult>();
  for (let i = 0; i < files.length; i++) {
    const result = await captionImageByPreview(files[i].preview);
    if (result) results.set(files[i].id, result);
    onProgress?.(i + 1, files.length);
  }
  return results;
}
