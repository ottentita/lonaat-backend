"""Simple runner for the video renderer to aid local testing.

Usage:
  python backend/workers/video_renderer_runner.py [template.json]

If no template path is provided a default template (color clip) will be rendered.
"""
import json
import os
import sys
from backend.workers.render_pipeline import render_from_template, store_output


def main():
    if len(sys.argv) > 1:
        tpl_path = sys.argv[1]
        with open(tpl_path, "r", encoding="utf-8") as f:
            template = json.load(f)
    else:
        template = {"output_filename": "sample_render.mp4", "duration": 4}

    tmp_out = os.path.abspath(".tmp_renders")
    final_storage = os.environ.get("VIDEO_RENDER_STORAGE", "storage/outputs")

    print("Rendering to temporary directory:", tmp_out)
    out = render_from_template(template, tmp_out)
    print("Rendered:", out)
    stored = store_output(out, final_storage)
    print("Stored at:", stored)


if __name__ == "__main__":
    main()
