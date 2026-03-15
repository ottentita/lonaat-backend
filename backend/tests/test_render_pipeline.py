import os
import tempfile
import shutil
import pytest

from backend.workers.render_pipeline import ffmpeg_exists, render_from_template, store_output


def test_render_and_store_lifecycle():
    # Create temporary dirs for render output and final storage
    with tempfile.TemporaryDirectory() as render_dir, tempfile.TemporaryDirectory() as storage_dir:
        template = {"output_filename": "test_out.mp4", "duration": 2}

        if not ffmpeg_exists():
            pytest.skip("ffmpeg not available on PATH; skipping end-to-end render test")

        # Render
        out_path = render_from_template(template, render_dir)
        assert os.path.exists(out_path), "Rendered file was not created"
        assert os.path.getsize(out_path) > 0

        # Store
        stored = store_output(out_path, storage_dir)
        assert os.path.exists(stored)
        assert os.path.getsize(stored) > 0

        # Ensure original no longer exists in render dir
        assert not os.path.exists(out_path)
