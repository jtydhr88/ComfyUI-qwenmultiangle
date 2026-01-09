import { app } from "../../../../scripts/app.js";
import { VIEWER_HTML } from "./viewer_inline.js";

/**
 * ComfyUI Extension for Qwen Multiangle Camera Node
 * Provides a 3D camera angle control widget
 */
app.registerExtension({
    name: "qwen.multiangle.camera",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "QwenMultiangleCameraNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;

                // Create iframe for 3D viewer
                const iframe = document.createElement("iframe");
                iframe.style.width = "100%";
                iframe.style.height = "100%";
                iframe.style.border = "none";
                iframe.style.backgroundColor = "#0a0a0f";
                iframe.style.borderRadius = "8px";
                iframe.style.display = "block";

                // Create blob URL from inline HTML
                const blob = new Blob([VIEWER_HTML], { type: 'text/html' });
                const blobUrl = URL.createObjectURL(blob);
                iframe.src = blobUrl;

                iframe.addEventListener('load', () => {
                    iframe._blobUrl = blobUrl;
                });

                // Add widget
                const widget = this.addDOMWidget("viewer", "CAMERA_3D_VIEW", iframe, {
                    getValue() { return ""; },
                    setValue(v) { }
                });

                widget.computeSize = function (width) {
                    const w = width || 320;
                    return [w, 360];
                };

                widget.element = iframe;
                this._viewerIframe = iframe;
                this._viewerReady = false;

                // Initialize default_prompts from widget
                const defaultPromptsWidget = node.widgets.find(w => w.name === "default_prompts");
                this._useDefaultPrompts = defaultPromptsWidget?.value || false;

                // Message handler
                const onMessage = (event) => {
                    if (event.source !== iframe.contentWindow) return;
                    const data = event.data;

                    if (data.type === 'VIEWER_READY') {
                        this._viewerReady = true;
                        // Send pending image if any
                        if (this._pendingImageSend) {
                            this._pendingImageSend();
                            delete this._pendingImageSend;
                        }
                        // Send initial values
                        const hWidget = node.widgets.find(w => w.name === "horizontal_angle");
                        const vWidget = node.widgets.find(w => w.name === "vertical_angle");
                        const zWidget = node.widgets.find(w => w.name === "zoom");

                        iframe.contentWindow.postMessage({
                            type: "INIT",
                            horizontal: hWidget?.value || 0,
                            vertical: vWidget?.value || 0,
                            zoom: zWidget?.value || 5.0,
                            useDefaultPrompts: this._useDefaultPrompts || false
                        }, "*");
                    } else if (data.type === 'ANGLE_UPDATE') {
                        // Update node widgets from 3D view
                        const hWidget = node.widgets.find(w => w.name === "horizontal_angle");
                        const vWidget = node.widgets.find(w => w.name === "vertical_angle");
                        const zWidget = node.widgets.find(w => w.name === "zoom");
                        const defaultPromptsWidget = node.widgets.find(w => w.name === "default_prompts");

                        if (hWidget) hWidget.value = data.horizontal;
                        if (vWidget) vWidget.value = data.vertical;
                        if (zWidget) zWidget.value = data.zoom;
                        if (defaultPromptsWidget) defaultPromptsWidget.value = data.useDefaultPrompts || false;

                        // Mark graph as changed
                        app.graph.setDirtyCanvas(true, true);
                    }
                };
                window.addEventListener('message', onMessage);

                // Resize handling
                const notifyIframeResize = () => {
                    if (iframe.contentWindow) {
                        const rect = iframe.getBoundingClientRect();
                        iframe.contentWindow.postMessage({
                            type: 'RESIZE',
                            width: rect.width,
                            height: rect.height
                        }, '*');
                    }
                };

                // ResizeObserver for responsive updates
                let resizeTimeout = null;
                let lastSize = { width: 0, height: 0 };
                const resizeObserver = new ResizeObserver((entries) => {
                    const entry = entries[0];
                    const newWidth = entry.contentRect.width;
                    const newHeight = entry.contentRect.height;

                    if (Math.abs(newWidth - lastSize.width) < 1 && Math.abs(newHeight - lastSize.height) < 1) {
                        return;
                    }
                    lastSize = { width: newWidth, height: newHeight };

                    if (resizeTimeout) {
                        clearTimeout(resizeTimeout);
                    }
                    resizeTimeout = setTimeout(() => {
                        notifyIframeResize();
                    }, 50);
                });
                resizeObserver.observe(iframe);

                // Sync slider widgets to 3D view
                const syncTo3DView = () => {
                    if (!this._viewerReady || !iframe.contentWindow) return;

                    const hWidget = node.widgets.find(w => w.name === "horizontal_angle");
                    const vWidget = node.widgets.find(w => w.name === "vertical_angle");
                    const zWidget = node.widgets.find(w => w.name === "zoom");
                    const defaultPromptsWidget = node.widgets.find(w => w.name === "default_prompts");

                    iframe.contentWindow.postMessage({
                        type: "SYNC_ANGLES",
                        horizontal: hWidget?.value || 0,
                        vertical: vWidget?.value || 0,
                        zoom: zWidget?.value || 5.0,
                        useDefaultPrompts: defaultPromptsWidget?.value || false
                    }, "*");
                };

                // Override widget callback to sync
                const origCallback = this.onWidgetChanged;
                this.onWidgetChanged = function (name, value, old_value, widget) {
                    if (origCallback) {
                        origCallback.apply(this, arguments);
                    }
                    if (name === "horizontal_angle" || name === "vertical_angle" || name === "zoom" || name === "default_prompts") {
                        if (name === "default_prompts") {
                            this._useDefaultPrompts = value;
                        }
                        syncTo3DView();
                    }
                };

                // Handle execution - receive image from backend
                const onExecuted = this.onExecuted;
                this.onExecuted = function (message) {
                    onExecuted?.apply(this, arguments);

                    if (message?.image_base64 && message.image_base64[0]) {
                        const imageData = message.image_base64[0];

                        const sendImage = () => {
                            if (iframe.contentWindow) {
                                iframe.contentWindow.postMessage({
                                    type: "UPDATE_IMAGE",
                                    imageUrl: imageData
                                }, "*");
                            }
                        };

                        if (this._viewerReady) {
                            sendImage();
                        } else {
                            this._pendingImageSend = sendImage;
                        }
                    }
                };

                // Clean up on node removal
                const originalOnRemoved = this.onRemoved;
                this.onRemoved = function () {
                    resizeObserver.disconnect();
                    window.removeEventListener('message', onMessage);
                    if (resizeTimeout) {
                        clearTimeout(resizeTimeout);
                    }
                    delete this._pendingImageSend;
                    if (iframe._blobUrl) {
                        URL.revokeObjectURL(iframe._blobUrl);
                    }
                    if (originalOnRemoved) {
                        originalOnRemoved.apply(this, arguments);
                    }
                };

                // Set initial node size
                this.setSize([350, 520]);

                return r;
            };
        }
    }
});
