import { createApp, type App as VueApp } from 'vue'

const { app } = window.comfyAPI.app
const { api } = window.comfyAPI.api

import App from './App.vue'
import {
  JOYAI_OUTPUT_FORMAT,
  QWEN_OUTPUT_FORMAT,
  type CameraState,
  type AppExposed,
  type OutputFormat,
  type QwenMultiangleNode
} from './types'

// Inject CSS from built assets
;(() => {
  const cssUrl = new URL(/* @vite-ignore */ './assets/main.css', import.meta.url).href
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = cssUrl
  document.head.appendChild(link)
})()

interface QwenInstance {
  container: HTMLElement
  vueApp: VueApp
  exposed: AppExposed
  currentNode: QwenMultiangleNode
  widget: DOMWidgetInstance | null
  cleanupTimer: number | null
}

// Keyed by the node object itself. node.id cannot be used: ComfyUI fires
// nodeCreated from inside the LGraphNode constructor, BEFORE graph.add()
// assigns a real id, so every freshly-created node arrives here with the
// LiteGraph default id (-1). A Map keyed on -1 would let the second new
// node hit the first node's entry and steal its container DOM via
// addDOMWidget, wiping the first node's three.js view.
const instances = new WeakMap<QwenMultiangleNode, QwenInstance>()

const CLEANUP_DELAY_MS = 200

// Store the scene state on node.properties as well as on widgets. Properties
// are deserialised by LGraphNode.configure before widgets and survive reloads
// independently, so when the widget-sync timing is unreliable the property
// remains authoritative.
const PROP_KEY = 'qwenCameraState'

interface StoredCameraState {
  azimuth: number
  elevation: number
  distance: number
  cameraView: boolean
  outputFormat: OutputFormat
}

function getWidgetValue(
  node: QwenMultiangleNode,
  name: string,
  defaultValue: number
): number {
  const widget = node.widgets?.find(w => w.name === name)
  return widget ? Number(widget.value) : defaultValue
}

function readStoredProps(node: QwenMultiangleNode): Partial<StoredCameraState> | null {
  const raw = node.properties?.[PROP_KEY]
  if (!raw || typeof raw !== 'object') return null
  return raw as Partial<StoredCameraState>
}

function writeStoredProps(
  node: QwenMultiangleNode,
  patch: Partial<StoredCameraState>
): void {
  if (!node.properties) node.properties = {}
  const existing = (node.properties[PROP_KEY] as Partial<StoredCameraState>) ?? {}
  node.properties[PROP_KEY] = { ...existing, ...patch }
}

function readStateFromNode(node: QwenMultiangleNode): Partial<CameraState> {
  const stored = readStoredProps(node)
  return {
    azimuth: stored?.azimuth ?? getWidgetValue(node, 'horizontal_angle', 0),
    elevation: stored?.elevation ?? getWidgetValue(node, 'vertical_angle', 0),
    distance: stored?.distance ?? getWidgetValue(node, 'zoom', 5.0)
  }
}

function readCameraViewFromNode(node: QwenMultiangleNode): boolean {
  const stored = readStoredProps(node)
  if (stored?.cameraView !== undefined) return Boolean(stored.cameraView)
  const w = node.widgets?.find(w => w.name === 'camera_view')
  return Boolean(w?.value)
}

function asOutputFormat(value: unknown): OutputFormat {
  return value === JOYAI_OUTPUT_FORMAT ? JOYAI_OUTPUT_FORMAT : QWEN_OUTPUT_FORMAT
}

function readOutputFormatFromNode(node: QwenMultiangleNode): OutputFormat {
  const stored = readStoredProps(node)
  if (stored?.outputFormat !== undefined) return asOutputFormat(stored.outputFormat)
  const w = node.widgets?.find(w => w.name === 'output_format')
  return asOutputFormat(w?.value)
}

function syncWidgetsFromState(
  node: QwenMultiangleNode,
  state: Partial<StoredCameraState>
): void {
  const h = node.widgets?.find(w => w.name === 'horizontal_angle')
  const v = node.widgets?.find(w => w.name === 'vertical_angle')
  const z = node.widgets?.find(w => w.name === 'zoom')
  const cv = node.widgets?.find(w => w.name === 'camera_view')
  const outputFormat = node.widgets?.find(w => w.name === 'output_format')
  if (state.azimuth !== undefined && h) h.value = state.azimuth
  if (state.elevation !== undefined && v) v.value = state.elevation
  if (state.distance !== undefined && z) z.value = state.distance
  if (state.cameraView !== undefined && cv) cv.value = state.cameraView
  if (state.outputFormat !== undefined && outputFormat) {
    outputFormat.value = state.outputFormat
  }
}

function createInstance(node: QwenMultiangleNode): QwenInstance {
  const container = document.createElement('div')
  container.id = `qwen-multiangle-widget-${node.id}`
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.minHeight = '350px'

  const instance = {} as QwenInstance
  instance.container = container
  instance.currentNode = node
  instance.widget = null
  instance.cleanupTimer = null

  const vueApp = createApp(App, {
    initialState: readStateFromNode(node),
    initialOutputFormat: readOutputFormatFromNode(node),
    onStateChange: (state: CameraState) => {
      const live = instance.currentNode
      syncWidgetsFromState(live, {
        azimuth: state.azimuth,
        elevation: state.elevation,
        distance: state.distance
      })
      writeStoredProps(live, {
        azimuth: state.azimuth,
        elevation: state.elevation,
        distance: state.distance
      })
      app.graph?.setDirtyCanvas(true, true)
    }
  })
  const mounted = vueApp.mount(container)
  instance.vueApp = vueApp
  instance.exposed = mounted as unknown as AppExposed

  instances.set(node, instance)
  return instance
}

function bindWidgetCallbacks(
  node: QwenMultiangleNode,
  exposed: AppExposed
): void {
  const wire = (name: string, apply: (value: unknown) => void) => {
    const w = node.widgets?.find(widget => widget.name === name)
    if (!w) return
    const origCallback = w.callback
    w.callback = (value: unknown) => {
      origCallback?.call(w, value)
      apply(value)
    }
  }

  wire('horizontal_angle', v => {
    const azimuth = Number(v)
    exposed.setState({ azimuth })
    writeStoredProps(node, { azimuth })
  })
  wire('vertical_angle', v => {
    const elevation = Number(v)
    exposed.setState({ elevation })
    writeStoredProps(node, { elevation })
  })
  wire('zoom', v => {
    const distance = Number(v)
    exposed.setState({ distance })
    writeStoredProps(node, { distance })
  })
  wire('camera_view', v => {
    const cameraView = Boolean(v)
    exposed.setCameraView(cameraView)
    writeStoredProps(node, { cameraView })
  })
  wire('output_format', v => {
    const outputFormat = asOutputFormat(v)
    exposed.setOutputFormat(outputFormat)
    writeStoredProps(node, { outputFormat })
  })
}

function createCameraWidget(node: QwenMultiangleNode): DOMWidgetInstance {
  let instance = instances.get(node)

  if (instance) {
    if (instance.cleanupTimer !== null) {
      clearTimeout(instance.cleanupTimer)
      instance.cleanupTimer = null
    }
    instance.currentNode = node
    instance.exposed.setState(readStateFromNode(node))
    instance.exposed.setCameraView(readCameraViewFromNode(node))
    instance.exposed.setOutputFormat(readOutputFormatFromNode(node))
  } else {
    instance = createInstance(node)
    if (readCameraViewFromNode(node)) {
      instance.exposed.setCameraView(true)
    }
  }

  const widget = node.addDOMWidget(
    'camera_preview',
    'qwen-multiangle',
    instance.container,
    {
      getMinHeight: () => 370,
      hideOnZoom: false,
      serialize: false
    }
  )

  instance.widget = widget
  bindWidgetCallbacks(node, instance.exposed)

  const baseOnRemove = widget.onRemove?.bind(widget)
  widget.onRemove = () => {
    baseOnRemove?.()

    const current = instances.get(node)
    if (!current || current.widget !== widget) return

    current.cleanupTimer = window.setTimeout(() => {
      const still = instances.get(node)
      if (!still || still.widget !== widget) return
      still.exposed.cleanup()
      still.vueApp.unmount()
      instances.delete(node)
    }, CLEANUP_DELAY_MS)
  }

  return widget
}

function setupImageInput(node: QwenMultiangleNode): void {
  const originalOnConnectionsChange = node.onConnectionsChange

  node.onConnectionsChange = function(
    slotType: number,
    slotIndex: number,
    isConnected: boolean,
    link: unknown,
    ioSlot: unknown
  ) {
    if (originalOnConnectionsChange) {
      originalOnConnectionsChange.call(this, slotType, slotIndex, isConnected, link, ioSlot)
    }

    if (slotType === 1 && slotIndex === 0) {
      const inst = instances.get(node)
      if (inst && !isConnected) {
        inst.exposed.updateImage(null)
      }
    }
  }
}

type PreviewImage = { filename: string; subfolder: string; type: string }

function applyPreviewImageFromOutput(
  instance: QwenInstance,
  output: unknown
): void {
  if (!output || typeof output !== 'object') return
  const images = (output as { preview_images?: PreviewImage[] }).preview_images
  if (!images || images.length === 0) return
  const img = images[0]
  const params = new URLSearchParams({
    filename: img.filename,
    subfolder: img.subfolder,
    type: img.type
  })
  const url = api.apiURL(`/view?${params.toString()}`)
  instance.exposed.updateImage(url)
}

function setupOnExecuted(node: QwenMultiangleNode, instance: QwenInstance): void {
  const originalOnExecuted = node.onExecuted
  node.onExecuted = function(output: unknown) {
    originalOnExecuted?.call(this, output)
    applyPreviewImageFromOutput(instance, output)
  }
}

// LGraphNode.configure() fires onPropertyChanged for every restored property
// during workflow load. Use it to push the persisted camera state into the 3D
// scene and the number widgets — nodeCreated is too early to read them.
//
// The instance must be captured by closure, not looked up via instances.get:
// onPropertyChanged fires during configure(), which is exactly when node.id
// is transitioning from its constructor default (-1) to the serialised id,
// so a map lookup by current id would miss the entry registered under -1.
function setupOnPropertyChanged(
  node: QwenMultiangleNode,
  instance: QwenInstance
): void {
  const originalOnPropertyChanged = node.onPropertyChanged
  node.onPropertyChanged = function(key: string, value: unknown) {
    originalOnPropertyChanged?.call(this, key, value)
    if (key !== PROP_KEY) return
    if (!value || typeof value !== 'object') return

    const state = value as Partial<StoredCameraState>
    instance.exposed.setState({
      azimuth: state.azimuth,
      elevation: state.elevation,
      distance: state.distance
    })
    if (state.cameraView !== undefined) {
      instance.exposed.setCameraView(Boolean(state.cameraView))
    }
    if (state.outputFormat !== undefined) {
      instance.exposed.setOutputFormat(asOutputFormat(state.outputFormat))
    }
    syncWidgetsFromState(node, state)
  }
}

app.registerExtension({
  name: 'ComfyUI.QwenMultiangle',

  nodeCreated(node: QwenMultiangleNode) {
    if (node.constructor?.comfyClass !== 'QwenMultiangleCameraNode') {
      return
    }

    const [oldWidth, oldHeight] = node.size
    node.setSize([Math.max(oldWidth, 350), Math.max(oldHeight, 520)])

    createCameraWidget(node)
    setupImageInput(node)
    const inst = instances.get(node)
    if (inst) {
      setupOnExecuted(node, inst)
      setupOnPropertyChanged(node, inst)
    }
  }
})
