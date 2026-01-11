import * as THREE from 'three'
import type { CameraState, CameraWidgetOptions } from './types'
import { injectStyles } from './styles'
import { t, initI18n, type Translations } from './i18n'

interface DropdownOption {
  key: keyof Translations
  promptKey: string
  value: number
}

export class CameraWidget {
  private container: HTMLElement
  private state: CameraState
  private onStateChange?: (state: CameraState) => void

  // Three.js objects
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private previewCamera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private activeCamera!: THREE.Camera

  // Scene objects
  private cameraIndicator!: THREE.Mesh
  private camGlow!: THREE.Mesh
  private azimuthHandle!: THREE.Mesh
  private azGlow!: THREE.Mesh
  private elevationHandle!: THREE.Mesh
  private elGlow!: THREE.Mesh
  private distanceHandle!: THREE.Mesh
  private distGlow!: THREE.Mesh
  private glowRing!: THREE.Mesh
  private imagePlane!: THREE.Mesh
  private imageFrame!: THREE.LineSegments
  private planeMat!: THREE.MeshBasicMaterial
  private distanceTube: THREE.Mesh | null = null

  // Control objects
  private azimuthRing!: THREE.Mesh
  private elevationArc!: THREE.Mesh
  private gridHelper!: THREE.GridHelper

  // Constants
  private readonly CENTER = new THREE.Vector3(0, 0.5, 0)
  private readonly AZIMUTH_RADIUS = 1.8
  private readonly ELEVATION_RADIUS = 1.4
  private readonly ELEV_ARC_X = -0.8

  // Live values for smooth updates
  private liveAzimuth = 0
  private liveElevation = 0
  private liveDistance = 5

  // Interaction state
  private isDragging = false
  private dragTarget: string | null = null
  private hoveredHandle: { mesh: THREE.Mesh; glow: THREE.Mesh; name: string } | null = null
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()

  // Camera view mode
  private useCameraView = false

  // Orbit control state (for camera_view mode)
  private isOrbitDragging = false
  private orbitStartX = 0
  private orbitStartY = 0
  private orbitStartAzimuth = 0
  private orbitStartElevation = 0

  // Animation
  private animationId: number | null = null
  private time = 0

  // DOM elements
  private canvasContainer!: HTMLElement
  private promptEl!: HTMLElement
  private hValueEl!: HTMLElement
  private vValueEl!: HTMLElement
  private zValueEl!: HTMLElement
  private azimuthSelect!: HTMLSelectElement
  private elevationSelect!: HTMLSelectElement
  private distanceSelect!: HTMLSelectElement

  // Dropdown options mapping (key is i18n key, promptKey is for output)
  private readonly AZIMUTH_OPTIONS: DropdownOption[] = [
    { key: 'frontView', promptKey: 'front view', value: 0 },
    { key: 'frontRightQuarterView', promptKey: 'front-right quarter view', value: 45 },
    { key: 'rightSideView', promptKey: 'right side view', value: 90 },
    { key: 'backRightQuarterView', promptKey: 'back-right quarter view', value: 135 },
    { key: 'backView', promptKey: 'back view', value: 180 },
    { key: 'backLeftQuarterView', promptKey: 'back-left quarter view', value: 225 },
    { key: 'leftSideView', promptKey: 'left side view', value: 270 },
    { key: 'frontLeftQuarterView', promptKey: 'front-left quarter view', value: 315 }
  ]

  private readonly ELEVATION_OPTIONS: DropdownOption[] = [
    { key: 'lowAngleShot', promptKey: 'low-angle shot', value: -30 },
    { key: 'eyeLevelShot', promptKey: 'eye-level shot', value: 0 },
    { key: 'elevatedShot', promptKey: 'elevated shot', value: 30 },
    { key: 'highAngleShot', promptKey: 'high-angle shot', value: 60 }
  ]

  private readonly DISTANCE_OPTIONS: DropdownOption[] = [
    { key: 'wideShot', promptKey: 'wide shot', value: 1 },
    { key: 'mediumShot', promptKey: 'medium shot', value: 4 },
    { key: 'closeUp', promptKey: 'close-up', value: 8 }
  ]

  constructor(options: CameraWidgetOptions) {
    initI18n()
    injectStyles()

    this.container = options.container
    this.onStateChange = options.onStateChange
    this.state = {
      azimuth: options.initialState?.azimuth ?? 0,
      elevation: options.initialState?.elevation ?? 0,
      distance: options.initialState?.distance ?? 5,
      imageUrl: options.initialState?.imageUrl ?? null
    }

    this.liveAzimuth = this.state.azimuth
    this.liveElevation = this.state.elevation
    this.liveDistance = this.state.distance

    this.createDOM()
    this.initThreeJS()
    this.bindEvents()
    this.updateDisplay()
    this.animate()
  }

  private createDOM(): void {
    // Generate dropdown options HTML with translations
    const azimuthOptionsHtml = this.AZIMUTH_OPTIONS
      .map(opt => `<option value="${opt.value}">${t(opt.key)}</option>`)
      .join('')
    const elevationOptionsHtml = this.ELEVATION_OPTIONS
      .map(opt => `<option value="${opt.value}">${t(opt.key)}</option>`)
      .join('')
    const distanceOptionsHtml = this.DISTANCE_OPTIONS
      .map(opt => `<option value="${opt.value}">${t(opt.key)}</option>`)
      .join('')

    this.container.innerHTML = `
      <div class="qwen-multiangle-container">
        <div class="qwen-multiangle-canvas"></div>
        <div class="qwen-multiangle-prompt">&lt;sks&gt; front view eye-level shot medium shot</div>
        <div class="qwen-multiangle-dropdowns">
          <div class="qwen-multiangle-dropdown">
            <span class="qwen-multiangle-dropdown-label azimuth">${t('horizontal')}</span>
            <select class="qwen-multiangle-select azimuth">${azimuthOptionsHtml}</select>
          </div>
          <div class="qwen-multiangle-dropdown">
            <span class="qwen-multiangle-dropdown-label elevation">${t('vertical')}</span>
            <select class="qwen-multiangle-select elevation">${elevationOptionsHtml}</select>
          </div>
          <div class="qwen-multiangle-dropdown">
            <span class="qwen-multiangle-dropdown-label distance">${t('zoom')}</span>
            <select class="qwen-multiangle-select distance">${distanceOptionsHtml}</select>
          </div>
        </div>
        <div class="qwen-multiangle-info">
          <div class="qwen-multiangle-param">
            <div class="qwen-multiangle-param-label">${t('horizontalFull')}</div>
            <div class="qwen-multiangle-param-value azimuth">0°</div>
          </div>
          <div class="qwen-multiangle-param">
            <div class="qwen-multiangle-param-label">${t('verticalFull')}</div>
            <div class="qwen-multiangle-param-value elevation">0°</div>
          </div>
          <div class="qwen-multiangle-param">
            <div class="qwen-multiangle-param-label">${t('zoomFull')}</div>
            <div class="qwen-multiangle-param-value zoom">5.0</div>
          </div>
          <button class="qwen-multiangle-reset" title="${t('resetToDefaults')}">↺</button>
        </div>
      </div>
    `

    const containerEl = this.container.querySelector('.qwen-multiangle-container') as HTMLElement
    this.canvasContainer = containerEl.querySelector('.qwen-multiangle-canvas') as HTMLElement
    this.promptEl = containerEl.querySelector('.qwen-multiangle-prompt') as HTMLElement
    this.hValueEl = containerEl.querySelector('.qwen-multiangle-param-value.azimuth') as HTMLElement
    this.vValueEl = containerEl.querySelector('.qwen-multiangle-param-value.elevation') as HTMLElement
    this.zValueEl = containerEl.querySelector('.qwen-multiangle-param-value.zoom') as HTMLElement
    this.azimuthSelect = containerEl.querySelector('.qwen-multiangle-select.azimuth') as HTMLSelectElement
    this.elevationSelect = containerEl.querySelector('.qwen-multiangle-select.elevation') as HTMLSelectElement
    this.distanceSelect = containerEl.querySelector('.qwen-multiangle-select.distance') as HTMLSelectElement

    const resetBtn = containerEl.querySelector('.qwen-multiangle-info .qwen-multiangle-reset') as HTMLButtonElement
    resetBtn.addEventListener('click', () => this.resetToDefaults())

    // Dropdown event handlers
    this.azimuthSelect.addEventListener('change', () => {
      const value = parseInt(this.azimuthSelect.value, 10)
      this.state.azimuth = value
      this.liveAzimuth = value
      this.updateVisuals()
      this.updateDisplay()
      this.notifyStateChange()
    })

    this.elevationSelect.addEventListener('change', () => {
      const value = parseInt(this.elevationSelect.value, 10)
      this.state.elevation = value
      this.liveElevation = value
      this.updateVisuals()
      this.updateDisplay()
      this.notifyStateChange()
    })

    this.distanceSelect.addEventListener('change', () => {
      const value = parseInt(this.distanceSelect.value, 10)
      this.state.distance = value
      this.liveDistance = value
      this.updateVisuals()
      this.updateDisplay()
      this.notifyStateChange()
    })
  }

  private initThreeJS(): void {
    const width = this.canvasContainer.clientWidth || 300
    const height = this.canvasContainer.clientHeight || 300

    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a0f)

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    this.camera.position.set(4, 3.5, 4)
    this.camera.lookAt(0, 0.3, 0)

    // Preview camera
    this.previewCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    this.activeCamera = this.camera

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.canvasContainer.appendChild(this.renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
    mainLight.position.set(5, 10, 5)
    this.scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xE93D82, 0.3)
    fillLight.position.set(-5, 5, -5)
    this.scene.add(fillLight)

    // Grid
    this.gridHelper = new THREE.GridHelper(5, 20, 0x1a1a2e, 0x12121a)
    this.gridHelper.position.y = -0.01
    this.scene.add(this.gridHelper)

    this.createSubject()
    this.createCameraIndicator()
    this.createAzimuthRing()
    this.createElevationArc()
    this.createDistanceHandle()
    this.updateVisuals()
  }

  private createGridTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    const size = 256
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#1a1a2a'
    ctx.fillRect(0, 0, size, size)

    ctx.strokeStyle = '#2a2a3a'
    ctx.lineWidth = 1
    const gridSize = 16
    for (let i = 0; i <= size; i += gridSize) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(size, i)
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    return texture
  }

  private createSubject(): void {
    const cardThickness = 0.02
    const cardGeo = new THREE.BoxGeometry(1.2, 1.2, cardThickness)

    const frontMat = new THREE.MeshBasicMaterial({ color: 0x3a3a4a })
    const backMat = new THREE.MeshBasicMaterial({ map: this.createGridTexture() })
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2a })

    const cardMaterials = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat]
    this.imagePlane = new THREE.Mesh(cardGeo, cardMaterials)
    this.imagePlane.position.copy(this.CENTER)
    this.scene.add(this.imagePlane)

    this.planeMat = frontMat

    // Frame
    const frameGeo = new THREE.EdgesGeometry(cardGeo)
    const frameMat = new THREE.LineBasicMaterial({ color: 0xE93D82 })
    this.imageFrame = new THREE.LineSegments(frameGeo, frameMat)
    this.imageFrame.position.copy(this.CENTER)
    this.scene.add(this.imageFrame)

    // Glow ring
    const glowRingGeo = new THREE.RingGeometry(0.55, 0.58, 64)
    const glowRingMat = new THREE.MeshBasicMaterial({
      color: 0xE93D82,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    })
    this.glowRing = new THREE.Mesh(glowRingGeo, glowRingMat)
    this.glowRing.position.set(0, 0.01, 0)
    this.glowRing.rotation.x = -Math.PI / 2
    this.scene.add(this.glowRing)
  }

  private createCameraIndicator(): void {
    const camGeo = new THREE.ConeGeometry(0.15, 0.4, 4)
    const camMat = new THREE.MeshStandardMaterial({
      color: 0xE93D82,
      emissive: 0xE93D82,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    })
    this.cameraIndicator = new THREE.Mesh(camGeo, camMat)
    this.scene.add(this.cameraIndicator)

    const camGlowGeo = new THREE.SphereGeometry(0.08, 16, 16)
    const camGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff6ba8,
      transparent: true,
      opacity: 0.8
    })
    this.camGlow = new THREE.Mesh(camGlowGeo, camGlowMat)
    this.scene.add(this.camGlow)
  }

  private createAzimuthRing(): void {
    const azRingGeo = new THREE.TorusGeometry(this.AZIMUTH_RADIUS, 0.04, 16, 100)
    const azRingMat = new THREE.MeshBasicMaterial({
      color: 0xE93D82,
      transparent: true,
      opacity: 0.7
    })
    this.azimuthRing = new THREE.Mesh(azRingGeo, azRingMat)
    this.azimuthRing.rotation.x = Math.PI / 2
    this.azimuthRing.position.y = 0.02
    this.scene.add(this.azimuthRing)

    // Handle
    const azHandleGeo = new THREE.SphereGeometry(0.16, 32, 32)
    const azHandleMat = new THREE.MeshStandardMaterial({
      color: 0xE93D82,
      emissive: 0xE93D82,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.4
    })
    this.azimuthHandle = new THREE.Mesh(azHandleGeo, azHandleMat)
    this.scene.add(this.azimuthHandle)

    const azGlowGeo = new THREE.SphereGeometry(0.22, 16, 16)
    const azGlowMat = new THREE.MeshBasicMaterial({
      color: 0xE93D82,
      transparent: true,
      opacity: 0.2
    })
    this.azGlow = new THREE.Mesh(azGlowGeo, azGlowMat)
    this.scene.add(this.azGlow)
  }

  private createElevationArc(): void {
    const arcPoints: THREE.Vector3[] = []
    for (let i = 0; i <= 32; i++) {
      const angle = (-30 + (90 * i / 32)) * Math.PI / 180
      arcPoints.push(new THREE.Vector3(
        this.ELEV_ARC_X,
        this.ELEVATION_RADIUS * Math.sin(angle) + this.CENTER.y,
        this.ELEVATION_RADIUS * Math.cos(angle)
      ))
    }
    const arcCurve = new THREE.CatmullRomCurve3(arcPoints)
    const elArcGeo = new THREE.TubeGeometry(arcCurve, 32, 0.04, 8, false)
    const elArcMat = new THREE.MeshBasicMaterial({
      color: 0x00FFD0,
      transparent: true,
      opacity: 0.8
    })
    this.elevationArc = new THREE.Mesh(elArcGeo, elArcMat)
    this.scene.add(this.elevationArc)

    // Handle
    const elHandleGeo = new THREE.SphereGeometry(0.16, 32, 32)
    const elHandleMat = new THREE.MeshStandardMaterial({
      color: 0x00FFD0,
      emissive: 0x00FFD0,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.4
    })
    this.elevationHandle = new THREE.Mesh(elHandleGeo, elHandleMat)
    this.scene.add(this.elevationHandle)

    const elGlowGeo = new THREE.SphereGeometry(0.22, 16, 16)
    const elGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00FFD0,
      transparent: true,
      opacity: 0.2
    })
    this.elGlow = new THREE.Mesh(elGlowGeo, elGlowMat)
    this.scene.add(this.elGlow)
  }

  private createDistanceHandle(): void {
    const distHandleGeo = new THREE.SphereGeometry(0.15, 32, 32)
    const distHandleMat = new THREE.MeshStandardMaterial({
      color: 0xFFB800,
      emissive: 0xFFB800,
      emissiveIntensity: 0.7,
      metalness: 0.5,
      roughness: 0.3
    })
    this.distanceHandle = new THREE.Mesh(distHandleGeo, distHandleMat)
    this.scene.add(this.distanceHandle)

    const distGlowGeo = new THREE.SphereGeometry(0.22, 16, 16)
    const distGlowMat = new THREE.MeshBasicMaterial({
      color: 0xFFB800,
      transparent: true,
      opacity: 0.25
    })
    this.distGlow = new THREE.Mesh(distGlowGeo, distGlowMat)
    this.scene.add(this.distGlow)
  }

  private updateDistanceLine(start: THREE.Vector3, end: THREE.Vector3): void {
    if (this.distanceTube) {
      this.scene.remove(this.distanceTube)
      this.distanceTube.geometry.dispose()
      ;(this.distanceTube.material as THREE.Material).dispose()
    }
    const path = new THREE.LineCurve3(start, end)
    const tubeGeo = new THREE.TubeGeometry(path, 1, 0.025, 8, false)
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xFFB800,
      transparent: true,
      opacity: 0.8
    })
    this.distanceTube = new THREE.Mesh(tubeGeo, tubeMat)
    this.scene.add(this.distanceTube)
  }

  private updateVisuals(): void {
    const azRad = (this.liveAzimuth * Math.PI) / 180
    const elRad = (this.liveElevation * Math.PI) / 180
    const visualDist = 2.6 - (this.liveDistance / 10) * 2.0

    // Camera indicator
    const camX = visualDist * Math.sin(azRad) * Math.cos(elRad)
    const camY = this.CENTER.y + visualDist * Math.sin(elRad)
    const camZ = visualDist * Math.cos(azRad) * Math.cos(elRad)

    this.cameraIndicator.position.set(camX, camY, camZ)
    this.cameraIndicator.lookAt(this.CENTER)
    this.cameraIndicator.rotateX(Math.PI / 2)
    this.camGlow.position.copy(this.cameraIndicator.position)

    // Azimuth handle
    const azX = this.AZIMUTH_RADIUS * Math.sin(azRad)
    const azZ = this.AZIMUTH_RADIUS * Math.cos(azRad)
    this.azimuthHandle.position.set(azX, 0.16, azZ)
    this.azGlow.position.copy(this.azimuthHandle.position)

    // Elevation handle
    const elY = this.CENTER.y + this.ELEVATION_RADIUS * Math.sin(elRad)
    const elZ = this.ELEVATION_RADIUS * Math.cos(elRad)
    this.elevationHandle.position.set(this.ELEV_ARC_X, elY, elZ)
    this.elGlow.position.copy(this.elevationHandle.position)

    // Distance handle
    const distT = 0.15 + ((10 - this.liveDistance) / 10) * 0.7
    this.distanceHandle.position.lerpVectors(this.CENTER, this.cameraIndicator.position, distT)
    this.distGlow.position.copy(this.distanceHandle.position)

    // Distance line
    this.updateDistanceLine(this.CENTER.clone(), this.cameraIndicator.position.clone())

    // Preview camera
    this.previewCamera.position.copy(this.cameraIndicator.position)
    this.previewCamera.lookAt(this.CENTER)

    // Glow ring animation
    this.glowRing.rotation.z += 0.005
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement

    canvas.addEventListener('mousedown', this.onPointerDown.bind(this))
    canvas.addEventListener('mousemove', this.onPointerMove.bind(this))
    canvas.addEventListener('mouseup', this.onPointerUp.bind(this))
    canvas.addEventListener('mouseleave', this.onPointerUp.bind(this))

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.onPointerDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as MouseEvent)
    }, { passive: false })

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      this.onPointerMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as MouseEvent)
    }, { passive: false })

    canvas.addEventListener('touchend', () => this.onPointerUp())

    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false })

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      this.onResize()
    })
    resizeObserver.observe(this.canvasContainer)
  }

  private getMousePos(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  private setHandleScale(handle: THREE.Mesh, glow: THREE.Mesh | null, scale: number): void {
    handle.scale.setScalar(scale)
    if (glow) glow.scale.setScalar(scale)
  }

  private onPointerDown(event: MouseEvent): void {
    this.getMousePos(event)

    if (this.useCameraView) {
      this.isOrbitDragging = true
      this.orbitStartX = event.clientX
      this.orbitStartY = event.clientY
      this.orbitStartAzimuth = this.liveAzimuth
      this.orbitStartElevation = this.liveElevation
      this.renderer.domElement.style.cursor = 'grabbing'
      return
    }

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const handles = [
      { mesh: this.azimuthHandle, glow: this.azGlow, name: 'azimuth' },
      { mesh: this.elevationHandle, glow: this.elGlow, name: 'elevation' },
      { mesh: this.distanceHandle, glow: this.distGlow, name: 'distance' }
    ]

    for (const h of handles) {
      if (this.raycaster.intersectObject(h.mesh).length > 0) {
        this.isDragging = true
        this.dragTarget = h.name
        this.setHandleScale(h.mesh, h.glow, 1.3)
        this.renderer.domElement.style.cursor = 'grabbing'
        return
      }
    }
  }

  private onPointerMove(event: MouseEvent): void {
    this.getMousePos(event)

    if (this.useCameraView && this.isOrbitDragging) {
      const deltaX = event.clientX - this.orbitStartX
      const deltaY = event.clientY - this.orbitStartY

      const sensitivity = 0.5

      let newAzimuth = this.orbitStartAzimuth - deltaX * sensitivity

      while (newAzimuth < 0) newAzimuth += 360
      while (newAzimuth >= 360) newAzimuth -= 360
      this.liveAzimuth = newAzimuth
      this.state.azimuth = Math.round(this.liveAzimuth)

      let newElevation = this.orbitStartElevation + deltaY * sensitivity

      newElevation = Math.max(-30, Math.min(60, newElevation))
      this.liveElevation = newElevation
      this.state.elevation = Math.round(this.liveElevation)

      this.updateVisuals()
      this.updateDisplay()
      this.notifyStateChange()
      return
    }

    this.raycaster.setFromCamera(this.mouse, this.camera)

    if (!this.isDragging) {
      const handles = [
        { mesh: this.azimuthHandle, glow: this.azGlow, name: 'azimuth' },
        { mesh: this.elevationHandle, glow: this.elGlow, name: 'elevation' },
        { mesh: this.distanceHandle, glow: this.distGlow, name: 'distance' }
      ]

      let foundHover: typeof handles[0] | null = null
      for (const h of handles) {
        if (this.raycaster.intersectObject(h.mesh).length > 0) {
          foundHover = h
          break
        }
      }

      if (this.hoveredHandle && this.hoveredHandle !== foundHover) {
        this.setHandleScale(this.hoveredHandle.mesh, this.hoveredHandle.glow, 1.0)
      }

      if (foundHover) {
        this.setHandleScale(foundHover.mesh, foundHover.glow, 1.15)
        this.renderer.domElement.style.cursor = 'grab'
        this.hoveredHandle = foundHover
      } else {
        this.renderer.domElement.style.cursor = 'default'
        this.hoveredHandle = null
      }
      return
    }

    // Dragging
    const plane = new THREE.Plane()
    const intersect = new THREE.Vector3()

    if (this.dragTarget === 'azimuth') {
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0))
      if (this.raycaster.ray.intersectPlane(plane, intersect)) {
        let angle = Math.atan2(intersect.x, intersect.z) * (180 / Math.PI)
        if (angle < 0) angle += 360
        this.liveAzimuth = Math.max(0, Math.min(360, angle))
        this.state.azimuth = Math.round(this.liveAzimuth)
        this.updateDisplay()
        this.updateVisuals()
        this.notifyStateChange()
      }
    } else if (this.dragTarget === 'elevation') {
      const elevPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -this.ELEV_ARC_X)
      if (this.raycaster.ray.intersectPlane(elevPlane, intersect)) {
        const relY = intersect.y - this.CENTER.y
        const relZ = intersect.z
        let angle = Math.atan2(relY, relZ) * (180 / Math.PI)
        angle = Math.max(-30, Math.min(60, angle))
        this.liveElevation = angle
        this.state.elevation = Math.round(this.liveElevation)
        this.updateDisplay()
        this.updateVisuals()
        this.notifyStateChange()
      }
    } else if (this.dragTarget === 'distance') {
      const newDist = 5 - this.mouse.y * 5
      this.liveDistance = Math.max(0, Math.min(10, newDist))
      this.state.distance = Math.round(this.liveDistance * 10) / 10
      this.updateDisplay()
      this.updateVisuals()
      this.notifyStateChange()
    }
  }

  private onPointerUp(): void {
    if (this.isOrbitDragging) {
      this.isOrbitDragging = false
      this.renderer.domElement.style.cursor = this.useCameraView ? 'grab' : 'default'
      return
    }

    if (this.isDragging) {
      const handles = [
        { mesh: this.azimuthHandle, glow: this.azGlow },
        { mesh: this.elevationHandle, glow: this.elGlow },
        { mesh: this.distanceHandle, glow: this.distGlow }
      ]
      handles.forEach(h => this.setHandleScale(h.mesh, h.glow, 1.0))
    }

    this.isDragging = false
    this.dragTarget = null
    this.renderer.domElement.style.cursor = 'default'
  }

  private onWheel(event: WheelEvent): void {
    if (!this.useCameraView) return

    event.preventDefault()

    const sensitivity = 0.01

    let newDistance = this.liveDistance - event.deltaY * sensitivity

    newDistance = Math.max(0, Math.min(10, newDistance))
    this.liveDistance = newDistance
    this.state.distance = Math.round(this.liveDistance * 10) / 10

    this.updateVisuals()
    this.updateDisplay()
    this.notifyStateChange()
  }

  private onResize(): void {
    const w = this.canvasContainer.clientWidth
    const h = this.canvasContainer.clientHeight
    if (w === 0 || h === 0) return

    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.previewCamera.aspect = w / h
    this.previewCamera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate())

    this.time += 0.01
    const pulse = 1 + Math.sin(this.time * 2) * 0.03
    this.camGlow.scale.setScalar(pulse)
    this.glowRing.rotation.z += 0.003

    this.renderer.render(this.scene, this.activeCamera)
  }

  private generatePrompt(): string {
    const hAngle = this.state.azimuth % 360

    // Azimuth
    let hDirection: string
    if (hAngle < 22.5 || hAngle >= 337.5) {
      hDirection = "front view"
    } else if (hAngle < 67.5) {
      hDirection = "front-right quarter view"
    } else if (hAngle < 112.5) {
      hDirection = "right side view"
    } else if (hAngle < 157.5) {
      hDirection = "back-right quarter view"
    } else if (hAngle < 202.5) {
      hDirection = "back view"
    } else if (hAngle < 247.5) {
      hDirection = "back-left quarter view"
    } else if (hAngle < 292.5) {
      hDirection = "left side view"
    } else {
      hDirection = "front-left quarter view"
    }

    // Elevation
    let vDirection: string
    if (this.state.elevation < -15) {
      vDirection = "low-angle shot"
    } else if (this.state.elevation < 15) {
      vDirection = "eye-level shot"
    } else if (this.state.elevation < 45) {
      vDirection = "elevated shot"
    } else {
      vDirection = "high-angle shot"
    }

    // Distance
    let distance: string
    if (this.state.distance < 2) {
      distance = "wide shot"
    } else if (this.state.distance < 6) {
      distance = "medium shot"
    } else {
      distance = "close-up"
    }

    return `<sks> ${hDirection} ${vDirection} ${distance}`
  }

  private updateDisplay(): void {
    this.hValueEl.textContent = `${Math.round(this.state.azimuth)}°`
    this.vValueEl.textContent = `${Math.round(this.state.elevation)}°`
    this.zValueEl.textContent = this.state.distance.toFixed(1)
    this.promptEl.textContent = this.generatePrompt()
    this.syncDropdowns()
  }

  private syncDropdowns(): void {
    // Find closest azimuth option
    const azimuthValue = this.findClosestOption(this.state.azimuth, this.AZIMUTH_OPTIONS, true)
    this.azimuthSelect.value = azimuthValue.toString()

    // Find closest elevation option
    const elevationValue = this.findClosestOption(this.state.elevation, this.ELEVATION_OPTIONS, false)
    this.elevationSelect.value = elevationValue.toString()

    // Find closest distance option
    const distanceValue = this.findClosestDistanceOption(this.state.distance)
    this.distanceSelect.value = distanceValue.toString()
  }

  private findClosestOption(value: number, options: Array<{ value: number }>, isAzimuth = false): number {
    let closest = options[0].value
    let minDiff = Math.abs(value - options[0].value)

    for (const opt of options) {
      // Handle azimuth wrap-around (360 degrees)
      let diff = Math.abs(value - opt.value)
      if (isAzimuth) {
        // Check wrap-around distance
        const wrapDiff = Math.abs(value - opt.value - 360)
        const wrapDiff2 = Math.abs(value - opt.value + 360)
        diff = Math.min(diff, wrapDiff, wrapDiff2)
      }

      if (diff < minDiff) {
        minDiff = diff
        closest = opt.value
      }
    }

    return closest
  }

  private findClosestDistanceOption(distance: number): number {
    // Map distance ranges to options based on prompt thresholds
    // < 2 → wide shot (value 1)
    // 2-6 → medium shot (value 4)
    // >= 6 → close-up (value 8)
    if (distance < 2) {
      return 1
    } else if (distance < 6) {
      return 4
    } else {
      return 8
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state })
    }
  }

  private resetToDefaults(): void {
    this.state.azimuth = 0
    this.state.elevation = 0
    this.state.distance = 5.0
    this.liveAzimuth = 0
    this.liveElevation = 0
    this.liveDistance = 5.0
    this.updateVisuals()
    this.updateDisplay()
    this.notifyStateChange()
    console.log("resetToDefaults")
  }

  // Public API
  public setState(newState: Partial<CameraState>): void {
    if (newState.azimuth !== undefined) {
      this.state.azimuth = newState.azimuth
      this.liveAzimuth = newState.azimuth
    }
    if (newState.elevation !== undefined) {
      this.state.elevation = newState.elevation
      this.liveElevation = newState.elevation
    }
    if (newState.distance !== undefined) {
      this.state.distance = newState.distance
      this.liveDistance = newState.distance
    }
    if (newState.imageUrl !== undefined) {
      this.state.imageUrl = newState.imageUrl
      this.updateImage(newState.imageUrl)
    }
    this.updateVisuals()
    this.updateDisplay()
  }

  public getState(): CameraState {
    return { ...this.state }
  }

  public getPrompt(): string {
    return this.generatePrompt()
  }

  public setCameraView(enabled: boolean): void {
    this.useCameraView = enabled
    this.isOrbitDragging = false

    if (this.useCameraView) {
      this.activeCamera = this.previewCamera
      this.azimuthRing.visible = false
      this.azimuthHandle.visible = false
      this.azGlow.visible = false
      this.elevationArc.visible = false
      this.elevationHandle.visible = false
      this.elGlow.visible = false
      this.distanceHandle.visible = false
      this.distGlow.visible = false
      if (this.distanceTube) this.distanceTube.visible = false
      this.cameraIndicator.visible = false
      this.camGlow.visible = false
      this.glowRing.visible = false
      this.gridHelper.visible = false
      this.imageFrame.visible = false
      this.renderer.domElement.style.cursor = 'grab'
    } else {
      this.activeCamera = this.camera
      this.azimuthRing.visible = true
      this.azimuthHandle.visible = true
      this.azGlow.visible = true
      this.elevationArc.visible = true
      this.elevationHandle.visible = true
      this.elGlow.visible = true
      this.distanceHandle.visible = true
      this.distGlow.visible = true
      if (this.distanceTube) this.distanceTube.visible = true
      this.cameraIndicator.visible = true
      this.camGlow.visible = true
      this.glowRing.visible = true
      this.gridHelper.visible = true
      this.imageFrame.visible = true
      // Reset cursor
      this.renderer.domElement.style.cursor = 'default'
    }
  }

  public updateImage(url: string | null): void {
    if (url) {
      const img = new Image()
      if (!url.startsWith('data:')) {
        img.crossOrigin = 'anonymous'
      }

      img.onload = () => {
        const tex = new THREE.Texture(img)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.needsUpdate = true
        this.planeMat.map = tex
        this.planeMat.color.set(0xffffff)
        this.planeMat.needsUpdate = true

        const ar = img.width / img.height
        const maxSize = 1.5
        let scaleX: number, scaleY: number
        if (ar > 1) {
          scaleX = maxSize
          scaleY = maxSize / ar
        } else {
          scaleY = maxSize
          scaleX = maxSize * ar
        }
        this.imagePlane.scale.set(scaleX, scaleY, 1)
        this.imageFrame.scale.set(scaleX, scaleY, 1)
      }

      img.onerror = () => {
        this.planeMat.map = null
        this.planeMat.color.set(0xE93D82)
        this.planeMat.needsUpdate = true
      }

      img.src = url
    } else {
      this.planeMat.map = null
      this.planeMat.color.set(0x3a3a4a)
      this.planeMat.needsUpdate = true
      this.imagePlane.scale.set(1, 1, 1)
      this.imageFrame.scale.set(1, 1, 1)
    }
  }

  public dispose(): void {
    if (this.animationId !== null) {
      try {
        window.cancelAnimationFrame(this.animationId)
      } catch {
        // Ignore errors
      }
      this.animationId = null
    }

    // Wrap in try-catch to handle Firefox compatibility issues with cancelAnimationFrame
    try {
      this.renderer.dispose()
    } catch {
      // Ignore errors - Firefox may throw on context.cancelAnimationFrame
    }

    try {
      this.scene.clear()
    } catch {
      // Ignore errors
    }
  }
}
