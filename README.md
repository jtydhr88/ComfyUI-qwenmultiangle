# ComfyUI-qwenmultiangle

A ComfyUI custom node for 3D camera angle control. Provides an interactive Three.js viewport to adjust camera angles and outputs formatted prompt strings for multi-angle image generation.
![img.png](img.png)
## Features

- **Interactive 3D Camera Control** - Drag handles in the Three.js viewport to adjust:
  - Horizontal angle (azimuth): 0° - 360°
  - Vertical angle (elevation): -30° to 90°
  - Zoom level: 0 - 10
- **Real-time Preview** - Connect an image input to see it displayed in the 3D scene as a card with proper color rendering
- **Camera View Mode** - Toggle `camera_view` to preview the scene from the camera indicator's perspective
- **Prompt Output** - Outputs descriptive camera angle prompts
- **Default Prompts** - Toggle `default_prompts` to switch between detailed and Qwen-style prompt formats
- **Bidirectional Sync** - Slider widgets and 3D handles stay synchronized

## Installation

1. Navigate to your ComfyUI custom nodes folder:
   ```bash
   cd ComfyUI/custom_nodes
   ```

2. Clone this repository:
   ```bash
   git clone https://github.com/jtydhr88/ComfyUI-qwenmultiangle.git
   ```

3. Restart ComfyUI

4. download lora from https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA/tree/main into your lora folder

## Usage

1. Add the **Qwen Multiangle Camera** node from the `image/multiangle` category
2. Optionally connect an IMAGE input to preview in the 3D scene
3. Adjust camera angles by:
   - Dragging the colored handles in the 3D viewport
   - Using the slider widgets
4. Toggle `camera_view` to see the preview from the camera's perspective
5. Toggle `default_prompts` to use Qwen-style prompt format
6. The node outputs a prompt string describing the camera angle

### Widgets

| Widget | Type | Description |
|--------|------|-------------|
| horizontal_angle | Slider | Camera azimuth angle (0° - 360°) |
| vertical_angle | Slider | Camera elevation angle (-30° to 90°) |
| zoom | Slider | Camera distance/zoom level (0 - 10) |
| default_prompts | Checkbox | Use Qwen-style prompt format |
| camera_view | Checkbox | Preview scene from camera's perspective |

### 3D Viewport Controls

| Handle | Color | Control |
|--------|-------|---------|
| Ring handle | Pink | Horizontal angle (azimuth) |
| Arc handle | Cyan | Vertical angle (elevation) |
| Line handle | Gold | Zoom/distance |

The image preview displays as a card - front shows the image, back shows a grid pattern when viewed from behind.

### Output Prompt Format

**Default format:**
```
{direction}, {elevation}, {shot_type} (horizontal: {h}°, vertical: {v}°, zoom: {z})
```

**Qwen format (default_prompts enabled):**
```
{direction} {elevation} {shot_type}
```

Examples:
- Default: `front view, eye level, medium shot (horizontal: 0, vertical: 0, zoom: 5.0)`
- Qwen: `front view eye-level shot medium shot`

## Credits

### Original Implementation

This ComfyUI node is based on [qwenmultiangle](https://github.com/amrrs/qwenmultiangle), a standalone web application for camera angle control.

The original project was inspired by:
- [multimodalart/qwen-image-multiple-angles-3d-camera](https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera) on Hugging Face Spaces
- [fal.ai - Qwen Image Edit 2511 Multiple Angles](https://fal.ai/models/fal-ai/qwen-image-edit-2511-multiple-angles/)

## License

MIT
