"""
QwenMultiangle Node for ComfyUI
A 3D camera control node that outputs angle prompts
"""

import numpy as np
from PIL import Image
import base64
import io


class QwenMultiangleCameraNode:
    """
    3D Camera Angle Control Node
    Provides a 3D scene to adjust camera angles and outputs a formatted prompt string
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "horizontal_angle": ("INT", {
                    "default": 0,
                    "min": 0,
                    "max": 360,
                    "step": 1,
                    "display": "slider"
                }),
                "vertical_angle": ("INT", {
                    "default": 0,
                    "min": -30,
                    "max": 90,
                    "step": 1,
                    "display": "slider"
                }),
                "zoom": ("FLOAT", {
                    "default": 5.0,
                    "min": 0.0,
                    "max": 10.0,
                    "step": 0.1,
                    "display": "slider"
                }),
                "default_prompts": ("BOOLEAN", {
                    "default": False,
                    "display": "checkbox"
                }),
            },
            "optional": {
                "image": ("IMAGE",),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "generate_prompt"
    CATEGORY = "image/multiangle"
    OUTPUT_NODE = True

    def generate_prompt(self, horizontal_angle, vertical_angle, zoom, default_prompts=False, image=None, unique_id=None):
        # Validate input ranges
        horizontal_angle = max(0, min(360, int(horizontal_angle)))
        vertical_angle = max(-30, min(90, int(vertical_angle)))
        zoom = max(0.0, min(10.0, float(zoom)))

        h_angle = horizontal_angle % 360

        if default_prompts:
            # Qwen-style prompts format
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
            elif vertical_angle < 75:
                v_direction = "elevated shot"
            else:
                v_direction = "high-angle shot"

            if zoom < 2:
                distance = "wide shot"
            elif zoom < 6:
                distance = "medium shot"
            else:
                distance = "close-up"

            prompt = f"{h_direction} {v_direction} {distance}"
        else:
            # Default format
            if h_angle < 22.5 or h_angle >= 337.5:
                h_direction = "front view"
            elif h_angle < 67.5:
                h_direction = "front-right view"
            elif h_angle < 112.5:
                h_direction = "right side view"
            elif h_angle < 157.5:
                h_direction = "back-right view"
            elif h_angle < 202.5:
                h_direction = "back view"
            elif h_angle < 247.5:
                h_direction = "back-left view"
            elif h_angle < 292.5:
                h_direction = "left side view"
            else:
                h_direction = "front-left view"

            if vertical_angle < -15:
                v_direction = "low angle"
            elif vertical_angle < 15:
                v_direction = "eye level"
            elif vertical_angle < 45:
                v_direction = "high angle"
            elif vertical_angle < 75:
                v_direction = "bird's eye view"
            else:
                v_direction = "top-down view"

            if zoom < 2:
                distance = "wide shot"
            elif zoom < 4:
                distance = "medium-wide shot"
            elif zoom < 6:
                distance = "medium shot"
            elif zoom < 8:
                distance = "medium close-up"
            else:
                distance = "close-up"

            prompt = f"{h_direction}, {v_direction}, {distance}"
            prompt += f" (horizontal: {horizontal_angle}, vertical: {vertical_angle}, zoom: {zoom:.1f})"

        # Convert image to base64 for frontend display
        image_base64 = ""
        if image is not None:
            try:
                # Handle different tensor formats
                if hasattr(image, 'cpu'):
                    # PyTorch tensor
                    img_tensor = image[0] if len(image.shape) == 4 else image
                    img_np = img_tensor.cpu().numpy()
                elif hasattr(image, 'numpy'):
                    # Already numpy or tensor with numpy method
                    img_np = image.numpy()
                    if len(img_np.shape) == 4:
                        img_np = img_np[0]
                else:
                    # Assume numpy array
                    img_np = image
                    if len(img_np.shape) == 4:
                        img_np = img_np[0]

                # Convert to uint8 and create PIL image
                img_np = (np.clip(img_np, 0, 1) * 255).astype(np.uint8)

                # Handle different channel orders (HWC, CHW, etc.)
                if img_np.ndim == 3:
                    if img_np.shape[0] in (1, 3, 4):  # CHW format
                        img_np = np.transpose(img_np, (1, 2, 0))
                    if img_np.shape[-1] == 1:  # Grayscale
                        img_np = np.concatenate([img_np] * 3, axis=-1)
                    elif img_np.shape[-1] == 4:  # RGBA, convert to RGB
                        img_np = img_np[..., :3]

                pil_image = Image.fromarray(img_np)
                buffer = io.BytesIO()
                pil_image.save(buffer, format="PNG")
                image_base64 = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("utf-8")
            except Exception:
                # Silently fail on image conversion errors
                pass

        return {"ui": {"image_base64": [image_base64]}, "result": (prompt,)}

    @classmethod
    def IS_CHANGED(cls, horizontal_angle, vertical_angle, zoom, default_prompts=False, image=None, unique_id=None):
        import time
        return time.time()


NODE_CLASS_MAPPINGS = {
    "QwenMultiangleCameraNode": QwenMultiangleCameraNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "QwenMultiangleCameraNode": "Qwen Multiangle Camera",
}
