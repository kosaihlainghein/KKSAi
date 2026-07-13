// BLIP caption server client — talks to the local Python caption server (port 8189).
// Falls back to mock captions when offline.

import { CAPTION_SERVER_URL } from './backend';

export interface CaptionResult {
  caption: string;
  confidence: number;
}

export async function captionImage(file: File | Blob): Promise<CaptionResult | null> {
  try {
    const formData = new FormData();
    formData.append('image', file, 'image.jpg');
    const res = await fetch(`${CAPTION_SERVER_URL}/caption`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { caption: data.caption, confidence: data.confidence ?? 0 };
  } catch {
    return null;
  }
}

export async function captionImageByPreview(previewUrl: string): Promise<CaptionResult | null> {
  try {
    const res = await fetch(previewUrl);
    const blob = await res.blob();
    return captionImage(blob);
  } catch {
    return null;
  }
}

// Batch caption — sends multiple images and returns all captions
export async function captionBatch(
  files: Array<{ id: string; preview: string }>,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, CaptionResult>> {
  const results = new Map<string, CaptionResult>();
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await captionImageByPreview(file.preview);
    if (result) {
      results.set(file.id, result);
    }
    onProgress?.(i + 1, total);
  }

  return results;
}
