import { ref, watch } from 'vue'
import { CameraWidget, buildPrompt } from '../CameraWidget'
import {
  QWEN_OUTPUT_FORMAT,
  type CameraState,
  type OutputFormat
} from '../types'

export function useCameraWidget(
  initialState: Partial<CameraState> = {},
  initialOutputFormat: OutputFormat = QWEN_OUTPUT_FORMAT,
  onExternalStateChange?: (state: CameraState) => void
) {
  const azimuth = ref(initialState.azimuth ?? 0)
  const elevation = ref(initialState.elevation ?? 0)
  const distance = ref(initialState.distance ?? 5)
  const imageUrl = ref<string | null>(null)
  const outputFormat = ref<OutputFormat>(initialOutputFormat)
  const prompt = ref(
    buildPrompt(
      {
        azimuth: azimuth.value,
        elevation: elevation.value,
        distance: distance.value
      },
      initialOutputFormat
    )
  )

  let widget: CameraWidget | null = null
  let updatingFromWidget = false
  let updatingFromExternal = false

  function notifyParent() {
    onExternalStateChange?.({
      azimuth: azimuth.value,
      elevation: elevation.value,
      distance: distance.value,
      imageUrl: imageUrl.value
    })
  }

  function initScene(container: HTMLElement) {
    widget = new CameraWidget({
      container,
      initialState: {
        azimuth: azimuth.value,
        elevation: elevation.value,
        distance: distance.value
      },
      onStateChange: (state: CameraState) => {
        updatingFromWidget = true
        azimuth.value = state.azimuth
        elevation.value = state.elevation
        distance.value = state.distance
        prompt.value = widget!.generatePrompt(outputFormat.value)
        updatingFromWidget = false
        notifyParent()
      }
    })
    prompt.value = widget.generatePrompt(outputFormat.value)
  }

  watch([azimuth, elevation, distance], () => {
    if (!updatingFromWidget && !updatingFromExternal && widget) {
      widget.setState({
        azimuth: azimuth.value,
        elevation: elevation.value,
        distance: distance.value
      })
      prompt.value = widget.generatePrompt(outputFormat.value)
      notifyParent()
    }
  }, { flush: 'sync' })

  function setState(state: Partial<CameraState>) {
    updatingFromExternal = true
    if (state.azimuth !== undefined) azimuth.value = state.azimuth
    if (state.elevation !== undefined) elevation.value = state.elevation
    if (state.distance !== undefined) distance.value = state.distance
    widget?.setState(state)
    if (widget) prompt.value = widget.generatePrompt(outputFormat.value)
    updatingFromExternal = false
  }

  function setOutputFormat(format: OutputFormat) {
    outputFormat.value = format
    if (widget) prompt.value = widget.generatePrompt(outputFormat.value)
  }

  function updateImage(url: string | null) {
    imageUrl.value = url
    widget?.updateImage(url)
  }

  function setCameraView(enabled: boolean) {
    widget?.setCameraView(enabled)
  }

  function reset() {
    updatingFromExternal = true
    azimuth.value = 0
    elevation.value = 0
    distance.value = 5
    updatingFromExternal = false
    widget?.setState({ azimuth: 0, elevation: 0, distance: 5 })
    if (widget) prompt.value = widget.generatePrompt(outputFormat.value)
    notifyParent()
  }

  function cleanup() {
    widget?.dispose()
    widget = null
  }

  return {
    azimuth,
    elevation,
    distance,
    imageUrl,
    prompt,
    initScene,
    setState,
    setOutputFormat,
    updateImage,
    setCameraView,
    reset,
    cleanup
  }
}
