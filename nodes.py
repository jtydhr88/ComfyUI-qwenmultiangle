"""
QwenMultiangle Node for ComfyUI (V3 API)
A 3D camera control node that outputs angle prompts
"""

from __future__ import annotations

import math
import os

import numpy as np
from PIL import Image

import folder_paths
from comfy_api.latest import ComfyExtension, io, UI
from comfy_api.latest._io import _UIOutput, FolderType
from comfy_api.latest._ui import ImageSaveHelper, SavedResult
from typing_extensions import override

from .camera_glossary import (
    TARGET_LANGUAGE_OPTIONS,
    label_to_code,
    translate_camera_terms,
)


# Must match CameraWidget.ts — keep in sync so camera_info describes the preview camera.
_SCENE_CENTER_Y = 0.5


def _build_camera_info(horizontal_angle: int, vertical_angle: int, zoom: float) -> dict:
    az_rad = math.radians(horizontal_angle)
    el_rad = math.radians(vertical_angle)
    visual_dist = 2.6 - (zoom / 10.0) * 2.0

    cam_x = visual_dist * math.sin(az_rad) * math.cos(el_rad)
    cam_y = _SCENE_CENTER_Y + visual_dist * math.sin(el_rad)
    cam_z = visual_dist * math.cos(az_rad) * math.cos(el_rad)

    return {
        "position": {"x": cam_x, "y": cam_y, "z": cam_z},
        "target": {"x": 0.0, "y": _SCENE_CENTER_Y, "z": 0.0},
        "zoom": 1,
        "cameraType": "perspective",
    }


class _WidgetPreviewImages(_UIOutput):
    """Custom UI output that sends image metadata to our widget only,
    without triggering ComfyUI's built-in image preview."""

    def __init__(self, results: list[SavedResult]):
        super().__init__()
        self.results = results

    def as_dict(self) -> dict:
        return {"preview_images": self.results}


class QwenMultiangleCameraNode(io.ComfyNode):
    """
    3D Camera Angle Control Node
    Provides a 3D scene to adjust camera angles and outputs a formatted prompt string
    """

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="QwenMultiangleCameraNode",
            display_name="Qwen Multiangle Camera",
            category="image/multiangle",
            is_output_node=True,
            description="Interactive 3D camera angle control for multi-angle image generation",
            inputs=[
                io.Int.Input(
                    "horizontal_angle",
                    default=0, min=0, max=360, step=1,
                    display_name="Horizontal Angle",
                    tooltip="Camera azimuth angle (0-360°)",
                ),
                io.Int.Input(
                    "vertical_angle",
                    default=0, min=-30, max=60, step=1,
                    display_name="Vertical Angle",
                    tooltip="Camera elevation angle (-30° to 60°)",
                ),
                io.Float.Input(
                    "zoom",
                    default=5.0, min=0.0, max=10.0, step=0.1,
                    display_name="Zoom",
                    tooltip="Camera distance (0=wide, 10=close-up)",
                ),
                io.Boolean.Input(
                    "default_prompts",
                    default=True,
                    display_name="Default Prompts",
                    tooltip="Deprecated, kept for backward compatibility",
                ),
                io.Boolean.Input(
                    "camera_view",
                    default=False,
                    display_name="Camera View",
                    tooltip="Toggle camera perspective preview",
                ),
                io.Image.Input(
                    "image",
                    optional=True,
                    tooltip="Optional input image to display in the 3D scene",
                ),
            ],
            outputs=[
                io.String.Output("prompt", display_name="Prompt"),
                io.Load3DCamera.Output("camera_info", display_name="Camera Info"),
            ],
            hidden=[io.Hidden.unique_id],
        )

    @classmethod
    def execute(
        cls,
        horizontal_angle,
        vertical_angle,
        zoom,
        default_prompts=True,
        camera_view=False,
        image=None,
    ) -> io.NodeOutput:
        horizontal_angle = max(0, min(360, int(horizontal_angle)))
        vertical_angle = max(-30, min(60, int(vertical_angle)))
        zoom = max(0.0, min(10.0, float(zoom)))

        h_angle = horizontal_angle % 360

        if h_angle < 22.5 or h_angle >= 337.5:
            h_direction = "front view"
        elif h_angle < 67.5:
            h_direction = "front-right quarter view"
        elif h_angle < 112.5:
            h_direction = "right side view"
        elif h_angle < 157.5:
            h_direction = "back-right quarter view"
        elif h_angle < 202.5:
            h_direction = "back view"
        elif h_angle < 247.5:
            h_direction = "back-left quarter view"
        elif h_angle < 292.5:
            h_direction = "left side view"
        else:
            h_direction = "front-left quarter view"

        if vertical_angle < -15:
            v_direction = "low-angle shot"
        elif vertical_angle < 15:
            v_direction = "eye-level shot"
        elif vertical_angle < 45:
            v_direction = "elevated shot"
        else:
            v_direction = "high-angle shot"

        if zoom < 2:
            distance = "wide shot"
        elif zoom < 6:
            distance = "medium shot"
        else:
            distance = "close-up"

        prompt = f"<sks> {h_direction} {v_direction} {distance}"

        # Save image to temp file for the frontend 3D widget
        ui_results: list[SavedResult] = []
        if image is not None:
            try:
                unique_id = cls.hidden.unique_id if cls.hidden else "preview"
                prefix = f"qwen_multiangle_{unique_id}_"
                ui_results = ImageSaveHelper.save_images(
                    image[:1],
                    filename_prefix=prefix,
                    folder_type=FolderType.temp,
                    cls=None,
                    compress_level=1,
                )
            except Exception as e:
                print(f"[QwenMultiangle] Error saving preview image: {e}")

        camera_info = _build_camera_info(horizontal_angle, vertical_angle, zoom)

        return io.NodeOutput(prompt, camera_info, ui=_WidgetPreviewImages(ui_results))

    @classmethod
    def fingerprint_inputs(
        cls,
        horizontal_angle,
        vertical_angle,
        zoom,
        default_prompts=True,
        camera_view=False,
        image=None,
    ):
        parts = [str(horizontal_angle), str(vertical_angle), str(zoom)]
        if image is not None:
            parts.append(str(image.shape))
            try:
                parts.append(f"{image[0, 0, 0, 0].item():.6f}")
                parts.append(f"{image[0, -1, -1, -1].item():.6f}")
            except Exception:
                parts.append(str(id(image)))
        return "_".join(parts)


class QwenMultiangleCameraTranslateNode(io.ComfyNode):

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="QwenMultiangleCameraTranslateNode",
            display_name="Qwen Multiangle Camera Translate",
            category="image/multiangle",
            description=(
                "Translate camera/shot terms in a prompt to a target language "
                "via a maintained glossary; non-camera words pass through."
            ),
            inputs=[
                io.String.Input(
                    "prompt",
                    multiline=True,
                    default="",
                    display_name="Prompt",
                    tooltip="Prompt text containing camera terms to translate (link from the camera node, or paste text)",
                ),
                io.Combo.Input(
                    "target_language",
                    options=TARGET_LANGUAGE_OPTIONS,
                    default=TARGET_LANGUAGE_OPTIONS[0],
                    display_name="Target Language",
                    tooltip=(
                        "Language to translate camera terms into. Only glossary "
                        "phrases are translated; everything else is untouched. "
                        "Select English for a pass-through."
                    ),
                ),
            ],
            outputs=[
                io.String.Output("prompt", display_name="Prompt"),
            ],
        )

    @classmethod
    def execute(cls, prompt, target_language) -> io.NodeOutput:
        lang_code = label_to_code(target_language)
        translated = translate_camera_terms(prompt or "", lang_code)
        return io.NodeOutput(translated)


class QwenMultiangleExtension(ComfyExtension):
    @override
    async def get_node_list(self):
        return [
            QwenMultiangleCameraNode,
            QwenMultiangleCameraTranslateNode,
        ]


async def comfy_entrypoint():
    return QwenMultiangleExtension()
