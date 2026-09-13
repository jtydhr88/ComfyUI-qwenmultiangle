export interface CameraState {
  azimuth: number
  elevation: number
  distance: number
  imageUrl: string | null
}

export const QWEN_OUTPUT_FORMAT = 'Qwen Image Edit Multiple Angles'
export const JOYAI_OUTPUT_FORMAT = 'JoyAI Image'
export type OutputFormat = typeof QWEN_OUTPUT_FORMAT | typeof JOYAI_OUTPUT_FORMAT

export interface CameraWidgetOptions {
  container: HTMLElement
  initialState?: Partial<CameraState>
  onStateChange?: (state: CameraState) => void
}

export interface AppExposed {
  updateImage: (url: string | null) => void
  setCameraView: (enabled: boolean) => void
  setOutputFormat: (format: OutputFormat) => void
  setState: (state: Partial<CameraState>) => void
  cleanup: () => void
}

export type QwenMultiangleNode = ComfyNode
