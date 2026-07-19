#!/usr/bin/env python3
"""
KKS AI Design Studio - BLIP Auto-Caption Server
Runs on http://127.0.0.1:8189
Uses Salesforce BLIP model to generate captions for uploaded images.
"""

import io
import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

_processor = None
_model = None
_device = "cpu"

def load_model():
    global _processor, _model, _device
    if _model is not None:
        return
    print("[caption] Loading BLIP model...")
    try:
        import torch
        from transformers import BlipProcessor, BlipForConditionalGeneration
        from PIL import Image
        _device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[caption] Using device: {_device}")
        _processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        _model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        ).to(_device)
        _model.eval()
        print("[caption] BLIP model loaded successfully.")
    except ImportError as e:
        print(f"[caption] ERROR: {e}")
        print("[caption] Run: pip install torch torchvision transformers pillow")
        sys.exit(1)

def generate_caption(image_bytes):
    global _processor, _model, _device
    from PIL import Image
    import torch
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    if max(image.size) > 512:
        ratio = 512 / max(image.size)
        image = image.resize((int(image.size[0]*ratio), int(image.size[1]*ratio)), Image.Resampling.LANCZOS)
    inputs = _processor(images=image, return_tensors="pt").to(_device)
    with torch.no_grad():
        output = _model.generate(**inputs, max_length=50, num_beams=5, min_length=10, do_sample=False)
    return _processor.decode(output[0], skip_special_tokens=True)

class CaptionHandler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if urlparse(self.path).path == "/health":
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "device": _device, "loaded": _model is not None}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if urlparse(self.path).path != "/caption":
            self.send_response(404)
            self.end_headers()
            return
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        ct = self.headers.get("Content-Type", "")
        try:
            img = self._extract(body, ct)
            if img is None:
                self._err(400, "No image found")
                return
            if _model is None:
                load_model()
            cap = generate_caption(img)
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"caption": cap, "confidence": 0.85}).encode())
        except Exception as e:
            self._err(500, str(e))

    def _extract(self, body, ct):
        if "multipart" in ct:
            boundary = None
            for p in ct.split(";"):
                p = p.strip()
                if p.startswith("boundary="):
                    boundary = p[9:]
                    break
            if not boundary:
                return None
            parts = body.split(("--" + boundary).encode())
            for p in parts:
                if b"filename=" in p:
                    h = p.find(b"\r\n\r\n")
                    if h != -1:
                        d = p[h+4:]
                        if d.endswith(b"\r\n"):
                            d = d[:-2]
                        return d
            return None
        return body

    def _err(self, code, msg):
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

    def log_message(self, *args):
        pass

if __name__ == "__main__":
    print("=" * 60)
    print("  KKS AI Design Studio - BLIP Caption Server")
    print("  http://127.0.0.1:8189")
    print("=" * 60)
    load_model()
    HTTPServer(("127.0.0.1", 8189), CaptionHandler).serve_forever()
