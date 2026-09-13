<template>
  <div class="qwen-container">
    <SceneCanvas :init-scene="initScene" />
    <div class="prompt-overlay">{{ prompt }}</div>
    <ControlPanel
      :azimuth="azimuth"
      :elevation="elevation"
      :distance="distance"
      @update:azimuth="azimuth = $event"
      @update:elevation="elevation = $event"
      @update:distance="distance = $event"
      @reset="reset"
    />
  </div>
</template>

<script setup lang="ts">
import SceneCanvas from './components/SceneCanvas.vue'
import ControlPanel from './components/ControlPanel.vue'
import { useCameraWidget } from './composables/useCameraWidget'
import type { CameraState, OutputFormat } from './types'

const props = defineProps<{
  initialState?: Partial<CameraState>
  initialOutputFormat?: OutputFormat
  onStateChange?: (state: CameraState) => void
}>()

const {
  azimuth,
  elevation,
  distance,
  prompt,
  initScene,
  setState,
  setOutputFormat,
  updateImage,
  setCameraView,
  reset,
  cleanup
} = useCameraWidget(
  props.initialState,
  props.initialOutputFormat,
  props.onStateChange
)

defineExpose({ updateImage, setCameraView, setOutputFormat, setState, cleanup })
</script>

<style scoped>
.qwen-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #0a0a0f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border-radius: 8px;
  overflow: hidden;
}

.prompt-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  background: rgba(10, 10, 15, 0.9);
  border: 1px solid rgba(233, 61, 130, 0.3);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  color: #E93D82;
  backdrop-filter: blur(4px);
  font-family: 'Consolas', 'Monaco', monospace;
  word-break: break-all;
  line-height: 1.4;
  pointer-events: none;
  z-index: 10;
}
</style>
