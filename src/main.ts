// import { app } from '../../../scripts/app.js'
// import { api } from '../../../scripts/api.js'
const { app } = window.comfyAPI.app
const { api } = window.comfyAPI.api

import { CameraWidget } from './CameraWidget'
import type { CameraState, QwenMultiangleNode, DOMWidget } from './types'

// Store widget instances for cleanup
const widgetInstances = new Map<number, CameraWidget>()

function createCameraWidget(node: QwenMultiangleNode): { widget: DOMWidget } {
  const container = document.createElement('div')
  container.id = `qwen-multiangle-widget-${node.id}`
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.minHeight = '350px'

  // Get initial values from node widgets
  const getWidgetValue = (name: string, defaultValue: number): number => {
    const widget = node.widgets?.find(w => w.name === name)
    return widget ? Number(widget.value) : defaultValue
  }

  const initialState: Partial<CameraState> = {
    azimuth: getWidgetValue('horizontal_angle', 0),
    elevation: getWidgetValue('vertical_angle', 0),
    distance: getWidgetValue('zoom', 5.0)
  }

  // Create DOM widget
  const widget = node.addDOMWidget(
    'camera_preview',
    'qwen-multiangle',
    container,
    {
      getMinHeight: () => 370,
      hideOnZoom: false,
      serialize: false
    }
  ) as DOMWidget

  // Create the camera widget after a small delay to ensure container is mounted
  setTimeout(() => {
    const cameraWidget = new CameraWidget({
      node,
      container,
      initialState,
      onStateChange: (state: CameraState) => {
        // Update node widgets when state changes
        const hWidget = node.widgets?.find(w => w.name === 'horizontal_angle')
        const vWidget = node.widgets?.find(w => w.name === 'vertical_angle')
        const zWidget = node.widgets?.find(w => w.name === 'zoom')

        if (hWidget) {
          hWidget.value = state.azimuth
        }
        if (vWidget) {
          vWidget.value = state.elevation
        }
        if (zWidget) {
          zWidget.value = state.distance
        }

        // Force canvas refresh to update slider display
        app.graph?.setDirtyCanvas(true, true)
      }
    })

    widgetInstances.set(node.id, cameraWidget)

    // Watch for widget value changes (from sliders)
    const setupWidgetSync = (widgetName: string, cam: CameraWidget) => {
      const w = node.widgets?.find(widget => widget.name === widgetName)
      if (w) {
        const origCallback = w.callback
        w.callback = (value: unknown) => {
          if (origCallback) {
            origCallback.call(w, value)
          }

          if (widgetName === 'horizontal_angle') {
            cam.setState({ azimuth: Number(value) })
          } else if (widgetName === 'vertical_angle') {
            cam.setState({ elevation: Number(value) })
          } else if (widgetName === 'zoom') {
            cam.setState({ distance: Number(value) })
          } else if (widgetName === 'camera_view') {
            cam.setCameraView(Boolean(value))
          }
        }
      }
    }

    setupWidgetSync('horizontal_angle', cameraWidget)
    setupWidgetSync('vertical_angle', cameraWidget)
    setupWidgetSync('zoom', cameraWidget)
    setupWidgetSync('camera_view', cameraWidget)

    const cameraViewWidget = node.widgets?.find(w => w.name === 'camera_view')
    if (cameraViewWidget && Boolean(cameraViewWidget.value)) {
      cameraWidget.setCameraView(true)
    }
  }, 100)

  // Cleanup on remove
  widget.onRemove = () => {
    const cameraWidget = widgetInstances.get(node.id)
    if (cameraWidget) {
      cameraWidget.dispose()
      widgetInstances.delete(node.id)
    }
  }

  return { widget }
}

// Handle image input updates
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

    // Check if image input changed
    if (slotType === 1 && slotIndex === 0) { // Input slot
      const cameraWidget = widgetInstances.get(node.id)
      if (cameraWidget) {
        if (isConnected) {
          // Try to get image from connected node
          // This will be updated when the graph executes
        } else {
          cameraWidget.updateImage(null)
        }
      }
    }
  }
}

// Register extension
app.registerExtension({
  name: 'ComfyUI.QwenMultiangle',

  nodeCreated(node: QwenMultiangleNode) {
    if (node.constructor?.comfyClass !== 'QwenMultiangleCameraNode') {
      return
    }

    // Adjust node size
    const [oldWidth, oldHeight] = node.size
    node.setSize([Math.max(oldWidth, 350), Math.max(oldHeight, 520)])

    // Create the camera preview widget
    createCameraWidget(node)

    // Setup image input handling
    setupImageInput(node)
  }
})

// Listen for node execution results
api.addEventListener('executed', (event: CustomEvent) => {
  const detail = event.detail
  if (!detail?.node || !detail?.output) return

  const nodeId = parseInt(detail.node, 10)
  const cameraWidget = widgetInstances.get(nodeId)
  if (!cameraWidget) return

  // Check if there's image data in the output
  const imageBase64 = detail.output?.image_base64 as string[] | undefined
  if (imageBase64 && imageBase64.length > 0 && imageBase64[0]) {
    cameraWidget.updateImage(imageBase64[0])
  }
})

export { CameraWidget }
