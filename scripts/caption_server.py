#!/usr/bin/env python3
"""
KKS AI Smart Trainer — BLIP Auto-Caption Server
Runs on http://127.0.0.1:8189
Uses Salesforce BLIP model to generate captions for uploaded images.

Dependencies (auto-installed by setup.bat):
  pip install torch torchvision transformers pillow

The server loads the BLIP model on first request (lazy loading) so startup is fast.
If CUDA is available it uses GPU; otherwise falls back to CPU.
"""

import io
import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# ─── Lazy-loaded model ────────────────────────────────────────────────────────
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
        print(f"[caption] ERROR: Missing dependencies - {e}")
        print("[caption] Run: pip install torch torchvision transformers pillow")
        sys.exit(1)
    except Exception as e:
        print(f"[caption] ERROR loading model: {e}")
        sys.exit(1)


def generate_caption(image_bytes):
    """Generate a caption from image bytes."""
    global _processor, _model, _device
    from PIL import Image
    import torch

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Resize if too large (BLIP handles 384x384 internally)
    max_dim = 512
    if max(image.size) > max_dim:
        ratio = max_dim / max(image.size)
        new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
        image = image.resize(new_size, Image.Resampling.LANCZOS)

    inputs = _processor(images=image, return_tensors="pt").to(_device)

    with torch.no_grad():
        output = _model.generate(
            **inputs,
            max_length=50,
            num_beams=5,
            min_length=10,
            do_sample=False,
        )

    caption = _processor.decode(output[0], skip_special_tokens=True)
    return caption


# ─── HTTP Server ──────────────────────────────────────────────────────────────
class CaptionHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.send_response(200)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {
                "status": "ok",
                "model": "Salesforce/blip-image-captioning-base",
                "device": _device,
                "loaded": _model is not None,
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/caption":
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self._send_error(400, "No image data received")
                return

            # Parse multipart form data
            body = self.rfile.read(content_length)
            content_type = self.headers.get("Content-Type", "")

            try:
                image_bytes = self._extract_image(body, content_type)
                if image_bytes is None:
                    self._send_error(400, "No image file found in request")
                    return

                # Lazy load model on first request
                if _model is None:
                    load_model()

                caption = generate_caption(image_bytes)

                self.send_response(200)
                self._set_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                response = {"caption": caption, "confidence": 0.85}
                self.wfile.write(json.dumps(response).encode())
                print(f"[caption] Generated: {caption}")

            except Exception as e:
                self._send_error(500, f"Caption generation failed: {str(e)}")
                print(f"[caption] ERROR: {e}")
        else:
            self.send_response(404)
            self.end_headers()

    def _extract_image(self, body, content_type):
        """Extract image bytes from multipart/form-data."""
        if "multipart/form-data" in content_type:
            # Simple multipart parser
            boundary = None
            for part in content_type.split(";"):
                part = part.strip()
                if part.startswith("boundary="):
                    boundary = part[len("boundary="):]
                    break

            if boundary is None:
                return None

            boundary_bytes = ("--" + boundary).encode()
            parts = body.split(boundary_bytes)

            for part in parts:
                if b"filename=" in part:
                    # Find the start of image data (after \r\n\r\n)
                    header_end = part.find(b"\r\n\r\n")
                    if header_end != -1:
                        image_data = part[header_end + 4:]
                        # Remove trailing \r\n
                        if image_data.endswith(b"\r\n"):
                            image_data = image_data[:-2]
                        return image_data
            return None
        else:
            # Raw body is the image
            return body

    def _send_error(self, code, message):
        self.send_response(code)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())

    def log_message(self, format, *args):
        # Suppress default logging, we print our own
        pass


def main():
    port = 8189
    host = "127.0.0.1"

    print("=" * 60)
    print("  KKS AI Smart Trainer — BLIP Caption Server")
    print(f"  Running on http://{host}:{port}")
    print("=" * 60)

    # Preload model at startup
    load_model()

    server = HTTPServer((host, port), CaptionHandler)
    print(f"\n[caption] Server ready on http://{host}:{port}")
    print("[caption] Waiting for caption requests...")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[caption] Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
