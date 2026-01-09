"""
QwenMultiangle Node for ComfyUI
A 3D camera control node that outputs angle prompts
"""

import numpy as np
from PIL import Image
import base64
import io
import hashlib


# Module-level cache to support multiple node instances independently
_cache = {}
_max_cache_size = 50  # Limit cache entries to prevent memory growth


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
                "camera_view": ("BOOLEAN", {
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

    def _compute_image_hash(self, image):
        """Compute a hash of the image tensor for cache key comparison."""
        if image is None:
            return None
        try:
            # Get numpy array and create a hashable representation
            if hasattr(image, 'cpu'):
                img_tensor = image[0] if len(image.shape) == 4 else image
                img_np = img_tensor.cpu().numpy()
            elif hasattr(image, 'numpy'):
                img_np = image.numpy()
                if len(img_np.shape) == 4:
                    img_np = img_np[0]
            else:
                img_np = image
                if len(img_np.shape) == 4:
                    img_np = img_np[0]
            # Use bytes of the array for hashing
            return hashlib.md5(img_np.tobytes()).hexdigest()
        except Exception:
            return str(hash(str(image)))

    def generate_prompt(self, horizontal_angle, vertical_angle, zoom, default_prompts=False, camera_view=False, image=None, unique_id=None):
        # Validate input ranges
        horizontal_angle = max(0, min(360, int(horizontal_angle)))
        vertical_angle = max(-30, min(90, int(vertical_angle)))
        zoom = max(0.0, min(10.0, float(zoom)))

        # Check cache for unchanged inputs
        cache_key = str(unique_id) if unique_id else "default"
        image_hash = self._compute_image_hash(image)

        cached = _cache.get(cache_key, {})
        if (cached.get('horizontal_angle') == horizontal_angle and
            cached.get('vertical_angle') == vertical_angle and
            cached.get('zoom') == zoom and
            cached.get('default_prompts') == default_prompts and
            cached.get('image_hash') == image_hash):
            # Return cached result without recomputing
            return cached['result']

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

        result = {"ui": {"image_base64": [image_base64]}, "result": (prompt,)}

        # Cache the result
        _cache[cache_key] = {
            'horizontal_angle': horizontal_angle,
            'vertical_angle': vertical_angle,
            'zoom': zoom,
            'default_prompts': default_prompts,
            'image_hash': image_hash,
            'result': result
        }

        # Limit cache size to prevent memory growth
        if len(_cache) > _max_cache_size:
            # Remove oldest entries
            keys_to_remove = list(_cache.keys())[:len(_cache) - _max_cache_size]
            for key in keys_to_remove:
                del _cache[key]

        return result

    @classmethod
    def IS_CHANGED(cls, horizontal_angle, vertical_angle, zoom, default_prompts=False, camera_view=False, image=None, unique_id=None):
        # Return a hash of inputs so node only re-runs when inputs actually change
        try:
            img_hash = ""
            if image is not None:
                if hasattr(image, 'cpu'):
                    img_tensor = image[0] if len(image.shape) == 4 else image
                    img_np = img_tensor.cpu().numpy()
                elif hasattr(image, 'numpy'):
                    img_np = image.numpy()
                    if len(img_np.shape) == 4:
                        img_np = img_np[0]
                else:
                    img_np = image
                    if len(img_np.shape) == 4:
                        img_np = img_np[0]
                img_hash = hashlib.md5(img_np.tobytes()).hexdigest()
            return f"{horizontal_angle}_{vertical_angle}_{zoom}_{default_prompts}_{img_hash}"
        except Exception:
            return f"{horizontal_angle}_{vertical_angle}_{zoom}_{default_prompts}"


NODE_CLASS_MAPPINGS = {
    "QwenMultiangleCameraNode": QwenMultiangleCameraNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "QwenMultiangleCameraNode": "Qwen Multiangle Camera",
}
