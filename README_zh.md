# ComfyUI-qwenmultiangle

**Language / 语言 / 言語 / 언어:** [English](README.md) | [中文](README_zh.md) | [日本語](README_ja.md) | [한국어](README_ko.md)

一个用于 3D 相机角度控制的 ComfyUI 自定义节点。提供交互式 Three.js 视口来调整相机角度，并输出格式化的提示词字符串，用于多角度图像生成。
![img.png](img.png)
## 功能特性

- **交互式 3D 相机控制** - 在 Three.js 视口中拖动手柄来调整：
  - 水平角度（方位角）：0° - 360°
  - 垂直角度（仰角）：-30° 到 60°
  - 缩放级别：0 - 10
- **快速选择下拉菜单** - 三个下拉菜单用于快速选择预设相机角度：
  - 方位角：正面、四分之一视角、侧面、背面
  - 仰角：仰拍、平视、高角度、俯拍
  - 距离：远景、中景、特写
- **实时预览** - 连接图像输入，在 3D 场景中以卡片形式显示，具有正确的颜色渲染
- **相机视角模式** - 切换 `camera_view` 从相机指示器的视角预览场景，支持交互式轨道控制（拖拽旋转，滚轮缩放）
- **提示词输出** - 输出与 [Qwen-Image-Edit-2511-Multiple-Angles-LoRA](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA) 兼容的格式化提示词
- **双向同步** - 滑块组件、3D 手柄和下拉菜单保持同步
- **多语言支持** - UI 标签支持英语、中文、日语和韩语（根据 ComfyUI 设置自动检测）
- **相机提示词翻译** - 可选的配套节点（**Qwen Multiangle Camera Translate**）将相机术语翻译成中文、日语或韩语，使其与非英语的基础提示词保持一致

## 安装

1. 进入 ComfyUI 自定义节点文件夹：
   ```bash
   cd ComfyUI/custom_nodes
   ```

2. 克隆此仓库：
   ```bash
   git clone https://github.com/jtydhr88/ComfyUI-qwenmultiangle.git
   ```

3. 重启 ComfyUI

4. 从 https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA/tree/main 下载 LoRA 到你的 lora 文件夹

## 开发

本项目使用 Vue 3、TypeScript 和 Vite 构建前端。3D 视口使用 Three.js 构建。后端使用 ComfyUI V3 节点 API。

### 前置要求

- Node.js 18+
- npm

### 构建

```bash
# 安装依赖
npm install

# 生产构建
npm run build

# 监听模式构建（用于开发）
npm run dev

# 类型检查
npm run typecheck
```

### 项目结构

```
ComfyUI-qwenmultiangle/
├── src/
│   ├── main.ts                        # 扩展入口点（Vue 应用挂载）
│   ├── App.vue                        # 根 Vue 组件
│   ├── CameraWidget.ts               # 无头 Three.js 相机控制引擎
│   ├── i18n.ts                        # 国际化 (en/zh/ja/ko)
│   ├── types.ts                       # TypeScript 类型定义
│   ├── components/
│   │   ├── SceneCanvas.vue            # Three.js 画布容器
│   │   └── ControlPanel.vue           # 下拉控件和数值显示
│   └── composables/
│       └── useCameraWidget.ts         # 响应式状态桥接（Vue ↔ Three.js）
├── js/                                # 构建输出（已提交用于分发）
│   ├── main.js
│   └── assets/
│       └── main.css
├── nodes.py                           # ComfyUI V3 节点定义
├── __init__.py                        # Python 模块初始化
├── package.json
├── tsconfig.json
└── vite.config.mts
```

## 使用方法

1. 从 `image/multiangle` 类别添加 **Qwen Multiangle Camera** 节点
2. 可选：连接 IMAGE 输入以在 3D 场景中预览
3. 通过以下方式调整相机角度：
   - 在 3D 视口中拖动彩色手柄
   - 使用滑块组件
   - 从下拉菜单中选择预设值
4. 切换 `camera_view` 从相机视角查看预览
5. 节点输出描述相机角度的提示词字符串

### 组件

| 组件 | 类型 | 描述 |
|------|------|------|
| horizontal_angle | 滑块 | 相机方位角 (0° - 360°) |
| vertical_angle | 滑块 | 相机仰角 (-30° 到 60°) |
| zoom | 滑块 | 相机距离/缩放级别 (0 - 10) |
| default_prompts | 复选框 | **已弃用** - 仅为向后兼容保留，无实际效果 |
| camera_view | 复选框 | 从相机视角预览场景 |

### 3D 视口控制

| 手柄 | 颜色 | 控制 |
|------|------|------|
| 环形手柄 | 粉色 | 水平角度（方位角） |
| 弧形手柄 | 青色 | 垂直角度（仰角） |
| 线形手柄 | 金色 | 缩放/距离 |

图像预览以卡片形式显示 - 正面显示图像，从背面观看时显示网格图案。

### 相机视角模式控制

启用 `camera_view` 后，可以使用鼠标交互控制相机：

| 操作 | 控制 |
|------|------|
| 左右拖拽 | 水平旋转（方位角） |
| 上下拖拽 | 垂直旋转（仰角） |
| 向上滚动 | 放大（增加距离） |
| 向下滚动 | 缩小（减少距离） |

所有交互都遵循与滑块相同的限制：
- 方位角：0° - 360°（循环）
- 仰角：-30° 到 60°
- 距离：0 - 10

通过轨道控制所做的更改会自动同步到滑块组件。

### 快速选择下拉菜单

3D 视口中有三个下拉菜单可用于快速选择预设相机角度：

| 下拉菜单 | 选项 |
|----------|------|
| 水平 (H) | 正面视角、右前方视角、右侧视角、右后方视角、背面视角、左后方视角、左侧视角、左前方视角 |
| 垂直 (V) | 仰拍、平视、高角度、俯拍 |
| 距离 (Z) | 远景、中景、特写 |

选择预设值将自动更新 3D 手柄和滑块组件。

### 国际化

UI 标签会根据你的 ComfyUI 语言设置自动翻译：

| 语言 | 代码 |
|------|------|
| 英语 | en |
| 简体中文 | zh |
| 日语 | ja |
| 韩语 | ko |

无论 UI 语言如何，输出的提示词始终为英语。

### 输出提示词格式

节点输出符合 [Qwen-Image-Edit-2511-Multiple-Angles-LoRA](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA) 要求格式的提示词：

```
<sks> {方位角} {仰角} {距离}
```

示例：
- `<sks> front view eye-level shot medium shot`
- `<sks> right side view high-angle shot close-up`
- `<sks> back-left quarter view low-angle shot wide shot`

#### 支持的值

| 参数 | 值 |
|------|-----|
| 方位角 | `front view`、`front-right quarter view`、`right side view`、`back-right quarter view`、`back view`、`back-left quarter view`、`left side view`、`front-left quarter view` |
| 仰角 | `low-angle shot` (-30°)、`eye-level shot` (0°)、`elevated shot` (30°)、`high-angle shot` (60°) |
| 距离 | `close-up`、`medium shot`、`wide shot` |

## 相机提示词翻译节点

相机节点始终输出**英语**术语。当你的基础提示词使用其他语言（例如中文）时，附加英语相机术语可能会削弱甚至完全破坏相机效果，因为模型往往会忽略与上下文语言不匹配的指令。

**Qwen Multiangle Camera Translate** 节点用于解决这个问题。它接收一段提示词字符串，*只*把相机/镜头术语通过手动维护的词表翻译成目标语言。其余部分——你的基础提示词、`<sks>` token、标点——都原样保留。

这是**独立**的节点，是有意为之：原相机节点保持不变，现有工作流照常运行。只在需要时再加上翻译节点即可。

### 使用方法

1. 从 `image/multiangle` 类别添加 **Qwen Multiangle Camera Translate** 节点
2. 将 **Qwen Multiangle Camera** 的 `prompt` 输出连到它的 `prompt` 输入（也可以直接粘贴文本）
3. 选择**目标语言**
4. 将翻译后的输出接入文本编码器

典型连接方式：`Qwen Multiangle Camera → Qwen Multiangle Camera Translate → CLIP Text Encode`

### 输入 / 输出

| 端口 | 类型 | 描述 |
|------|------|------|
| prompt（输入） | String | 包含相机术语的提示词（从相机节点连线，或粘贴文本） |
| target_language | 下拉菜单 | 相机术语的目标语言 |
| prompt（输出） | String | 相机术语已翻译的提示词 |

### 目标语言

与本 README 提供的语言一致：

| 选项 | 行为 |
|------|------|
| 中文 (Chinese) | 将相机术语翻译成中文 |
| 日本語 (Japanese) | 将相机术语翻译成日语 |
| 한국어 (Korean) | 将相机术语翻译成韩语 |
| English | 原样透传（不变） |

只有词表中存在的短语才会被翻译；任何未识别的词都会原样放行。词表位于 `camera_glossary.py`，并与 `src/i18n.ts` 中的 UI 翻译保持同步，便于手动扩展或修改。

### 示例

同一相机姿态（`front view` / `eye-level shot` / `medium shot`）在各目标语言下的输出：

| 目标 | 输出 |
|------|------|
| English | `<sks> front view eye-level shot medium shot` |
| 中文 | `<sks> 正面视角 平视 中景` |
| 日本語 | `<sks> 正面 アイレベル ミディアムショット` |
| 한국어 | `<sks> 정면 아이 레벨 미디엄 샷` |

## 致谢

### 原始实现

此 ComfyUI 节点基于 [qwenmultiangle](https://github.com/amrrs/qwenmultiangle)，一个独立的相机角度控制 Web 应用程序。

原始项目的灵感来自：
- Hugging Face Spaces 上的 [multimodalart/qwen-image-multiple-angles-3d-camera](https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera)
- [fal.ai - Qwen Image Edit 2511 Multiple Angles](https://fal.ai/models/fal-ai/qwen-image-edit-2511-multiple-angles/)

## 相关项目

- [ComfyUI-qwenmultiangle-plus](https://github.com/cjlang2020/ComfyUI-qwenmultiangle-plus) - 基于本项目的另一个改版

## 许可证

MIT
