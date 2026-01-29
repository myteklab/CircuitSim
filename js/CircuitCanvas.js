/**
 * CircuitCanvas - Handles canvas rendering and user interactions
 */
class CircuitCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Components and wires
        this.components = [];
        this.wires = [];

        // Grid settings
        this.gridSize = 50;
        this.snapToGrid = true;

        // Interaction state
        this.selectedComponent = null;
        this.hoveredComponent = null;
        this.draggingComponent = null;
        this.dragOffset = { x: 0, y: 0 };

        // Wire drawing state
        this.drawingWire = false;
        this.wireStart = null; // { component, terminal }
        this.wireWaypoints = []; // Intermediate points for wire routing
        this.wirePreviewEnd = { x: 0, y: 0 };

        // Pan and zoom
        this.panOffset = { x: 0, y: 0 };
        this.scale = 1;
        this.minScale = 0.25;
        this.maxScale = 3;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        // Animation
        this.lastTime = 0;
        this.animationId = null;

        // Visual effects system
        this.visualEffects = new VisualEffects(this.canvas);

        this.setupCanvas();
        this.setupEventListeners();
        this.startAnimation();
    }

    /**
     * Setup canvas size
     */
    setupCanvas() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Resize canvas to fill container
     */
    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.render();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e) => this.onMouseWheel(e), { passive: false });

        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Drag and drop from palette
        document.querySelectorAll('.component-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('componentType', item.dataset.component);
            });
        });

        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const componentType = e.dataTransfer.getData('componentType');
            if (componentType) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.addComponent(componentType, x, y);
            }
        });
    }

    /**
     * Get mouse position relative to canvas
     */
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /**
     * Convert screen coordinates to world coordinates (accounting for pan and zoom)
     */
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.panOffset.x) / this.scale,
            y: (screenY - this.panOffset.y) / this.scale
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.scale + this.panOffset.x,
            y: worldY * this.scale + this.panOffset.y
        };
    }

    /**
     * Snap position to grid
     */
    snapToGridPos(x, y) {
        if (!this.snapToGrid) return { x, y };
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }

    /**
     * Mouse down handler
     */
    onMouseDown(e) {
        const screenPos = this.getMousePos(e);

        // Middle mouse button or Space+Left mouse = pan
        if (e.button === 1 || (e.button === 0 && this.spacePressed)) {
            this.isPanning = true;
            this.panStart = { x: screenPos.x - this.panOffset.x, y: screenPos.y - this.panOffset.y };
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }

        // Convert to world coordinates
        const pos = this.screenToWorld(screenPos.x, screenPos.y);

        // If currently drawing a wire, check for terminal or add waypoint
        if (this.drawingWire) {
            // Check if clicking on a terminal to finish wire
            for (const component of this.components) {
                if (component === this.wireStart.component) continue; // Can't connect to self

                const terminal = component.getClosestTerminal(pos.x, pos.y, 15);
                if (terminal) {
                    this.finishWireDrawing(component, terminal.id);
                    return;
                }
            }

            // Not on a terminal - add waypoint on empty canvas
            this.wireWaypoints.push({ x: pos.x, y: pos.y });
            return;
        }

        // Check if clicking on a terminal to start wire drawing
        for (const component of this.components) {
            const terminal = component.getClosestTerminal(pos.x, pos.y, 15);
            if (terminal) {
                this.startWireDrawing(component, terminal.id);
                return;
            }
        }

        // Check if clicking on a component
        let clickedComponent = null;
        for (let i = this.components.length - 1; i >= 0; i--) {
            if (this.components[i].containsPoint(pos.x, pos.y)) {
                clickedComponent = this.components[i];
                break;
            }
        }

        if (clickedComponent) {
            this.selectComponent(clickedComponent);
            this.draggingComponent = clickedComponent;
            this.dragOffset = {
                x: pos.x - clickedComponent.x,
                y: pos.y - clickedComponent.y
            };
            return;
        }

        // Check if clicking on a wire
        for (const wire of this.wires) {
            if (wire.containsPoint(pos.x, pos.y)) {
                this.selectWire(wire);
                return;
            }
        }

        // Clicking on empty space - deselect
        this.selectComponent(null);
    }

    /**
     * Mouse move handler
     */
    onMouseMove(e) {
        const screenPos = this.getMousePos(e);

        // Handle panning
        if (this.isPanning) {
            this.panOffset.x = screenPos.x - this.panStart.x;
            this.panOffset.y = screenPos.y - this.panStart.y;
            return;
        }

        // Convert to world coordinates
        const pos = this.screenToWorld(screenPos.x, screenPos.y);

        // Update wire preview if drawing
        if (this.drawingWire) {
            this.wirePreviewEnd = pos;
            return;
        }

        // Drag component
        if (this.draggingComponent) {
            const snapped = this.snapToGridPos(
                pos.x - this.dragOffset.x,
                pos.y - this.dragOffset.y
            );
            this.draggingComponent.x = snapped.x;
            this.draggingComponent.y = snapped.y;
            return;
        }

        // Update hover state
        let hoveredComponent = null;
        for (let i = this.components.length - 1; i >= 0; i--) {
            if (this.components[i].containsPoint(pos.x, pos.y)) {
                hoveredComponent = this.components[i];
                break;
            }
        }

        // Update hover state for all components
        for (const component of this.components) {
            component.hovered = (component === hoveredComponent);
        }
        this.hoveredComponent = hoveredComponent;
    }

    /**
     * Mouse up handler
     */
    onMouseUp(e) {
        // Stop panning
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = this.spacePressed ? 'grab' : 'crosshair';
        }

        // Stop dragging and capture state if component was moved
        if (this.draggingComponent) {
            this.markDirty(); // Capture position change for undo/redo
            this.draggingComponent = null;
        }
    }

    /**
     * Mouse wheel handler for zoom
     */
    onMouseWheel(e) {
        e.preventDefault();

        const screenPos = this.getMousePos(e);
        const worldPosBefore = this.screenToWorld(screenPos.x, screenPos.y);

        // Zoom in/out
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = this.scale * zoomFactor;

        // Clamp scale
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));

        // Adjust pan to zoom towards mouse cursor
        const worldPosAfter = this.screenToWorld(screenPos.x, screenPos.y);
        this.panOffset.x += (worldPosAfter.x - worldPosBefore.x) * this.scale;
        this.panOffset.y += (worldPosAfter.y - worldPosBefore.y) * this.scale;
    }

    /**
     * Double click handler
     */
    onDoubleClick(e) {
        const screenPos = this.getMousePos(e);
        const pos = this.screenToWorld(screenPos.x, screenPos.y);

        // Check what was double-clicked
        for (const component of this.components) {
            if (component.containsPoint(pos.x, pos.y)) {
                this.onComponentDoubleClick(component);
                return;
            }
        }
    }

    /**
     * Handle component double-click (cycle properties)
     */
    onComponentDoubleClick(component) {
        if (component.type === 'battery') {
            component.cycleVoltage();
        } else if (component.type === 'resistor') {
            component.cycleResistance();
        } else if (component.type === 'led') {
            component.cycleColor();
        } else if (component.type === 'switch') {
            component.toggle();
        }
        this.updatePropertiesPanel();
        this.markDirty();
    }

    /**
     * Key down handler
     */
    onKeyDown(e) {
        // Space key - enable pan mode
        if (e.key === ' ' && !this.spacePressed && e.target === document.body) {
            this.spacePressed = true;
            if (!this.isPanning) {
                this.canvas.style.cursor = 'grab';
            }
            e.preventDefault();
            return;
        }

        // Escape key - cancel wire drawing
        if (e.key === 'Escape') {
            if (this.drawingWire) {
                this.cancelWireDrawing();
                e.preventDefault();
                return;
            }
        }

        // Reset zoom with '0' key
        if (e.key === '0') {
            this.scale = 1;
            this.panOffset = { x: 0, y: 0 };
            e.preventDefault();
            return;
        }

        // Zoom in with '+'
        if (e.key === '+' || e.key === '=') {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const worldPosBefore = this.screenToWorld(centerX, centerY);
            this.scale = Math.min(this.maxScale, this.scale * 1.2);
            const worldPosAfter = this.screenToWorld(centerX, centerY);
            this.panOffset.x += (worldPosAfter.x - worldPosBefore.x) * this.scale;
            this.panOffset.y += (worldPosAfter.y - worldPosBefore.y) * this.scale;
            e.preventDefault();
            return;
        }

        // Zoom out with '-'
        if (e.key === '-' || e.key === '_') {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const worldPosBefore = this.screenToWorld(centerX, centerY);
            this.scale = Math.max(this.minScale, this.scale / 1.2);
            const worldPosAfter = this.screenToWorld(centerX, centerY);
            this.panOffset.x += (worldPosAfter.x - worldPosBefore.x) * this.scale;
            this.panOffset.y += (worldPosAfter.y - worldPosBefore.y) * this.scale;
            e.preventDefault();
            return;
        }

        // Delete selected component or wire
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.selectedComponent) {
                this.deleteComponent(this.selectedComponent);
                e.preventDefault();
            } else {
                // Check if any wire is selected
                const selectedWire = this.wires.find(w => w.selected);
                if (selectedWire) {
                    this.deleteWire(selectedWire);
                    e.preventDefault();
                }
            }
        }

        // Rotate selected component
        if (e.key === 'r' || e.key === 'R') {
            if (this.selectedComponent) {
                // Rotate by 45 degrees for finer control
                this.selectedComponent.rotation = (this.selectedComponent.rotation + 45) % 360;

                // Show rotation indicator
                this.showRotationIndicator(this.selectedComponent);

                // Mark as dirty for undo/redo
                this.markDirty();

                e.preventDefault();
            }
        }

        // Toggle grid snap
        if (e.key === 'g' || e.key === 'G') {
            this.snapToGrid = !this.snapToGrid;
            e.preventDefault();
        }
    }

    /**
     * Key up handler
     */
    onKeyUp(e) {
        // Space key released - disable pan mode
        if (e.key === ' ') {
            this.spacePressed = false;
            if (!this.isPanning) {
                this.canvas.style.cursor = 'crosshair';
            }
        }
    }

    /**
     * Start drawing a wire
     */
    startWireDrawing(component, terminalId) {
        this.drawingWire = true;
        this.wireStart = { component, terminal: terminalId };
        this.wireWaypoints = [];
        const pos = component.getTerminalPosition(terminalId);
        this.wirePreviewEnd = pos;
    }

    /**
     * Finish drawing a wire
     */
    finishWireDrawing(toComponent, toTerminalId) {
        const wire = new Wire(
            this.wireStart.component,
            this.wireStart.terminal,
            toComponent,
            toTerminalId,
            this.wireWaypoints
        );
        this.wires.push(wire);
        this.cancelWireDrawing();
        this.markDirty();

        // Update insights immediately when wire is added
        if (window.uiManager) {
            window.uiManager.updateCircuitInsights();
        }
    }

    /**
     * Cancel wire drawing
     */
    cancelWireDrawing() {
        this.drawingWire = false;
        this.wireStart = null;
        this.wireWaypoints = [];
    }

    /**
     * Add a component
     */
    addComponent(type, x, y) {
        const snapped = this.snapToGridPos(x, y);
        let component;

        switch (type) {
            case 'battery':
                component = new Battery(snapped.x, snapped.y);
                break;
            case 'resistor':
                component = new Resistor(snapped.x, snapped.y);
                break;
            case 'led':
                component = new LED(snapped.x, snapped.y);
                break;
            case 'diode':
                component = new Diode(snapped.x, snapped.y);
                break;
            case 'switch':
                component = new Switch(snapped.x, snapped.y);
                break;
            case 'ground':
                component = new Ground(snapped.x, snapped.y);
                break;
            case 'batteryPackAA':
                component = new BatteryPackAA(snapped.x, snapped.y);
                break;
            case 'raspberryPi':
                component = new RaspberryPi(snapped.x, snapped.y);
                break;
            case 'motorController':
                component = new MotorController(snapped.x, snapped.y);
                break;
            case 'dcMotor':
                component = new DCMotor(snapped.x, snapped.y);
                break;
            default:
                return;
        }

        this.components.push(component);
        this.selectComponent(component);

        // Mark as dirty (unsaved changes)
        this.markDirty();

        // Update insights immediately
        if (window.uiManager) {
            window.uiManager.updateCircuitInsights();
        }

        // Hide empty state
        const emptyState = document.getElementById('empty-state');
        if (emptyState && this.components.length > 0) {
            emptyState.style.display = 'none';
        }
    }

    /**
     * Mark circuit as having unsaved changes
     */
    markDirty() {
        if (window.saveLoadManager) {
            window.saveLoadManager.markDirty();
        }

        // Capture state for undo/redo
        if (window.historyManager) {
            window.historyManager.pushState();
        }
    }

    /**
     * Delete a component and connected wires
     */
    deleteComponent(component) {
        // Remove wires connected to this component
        this.wires = this.wires.filter(wire => !wire.connectsTo(component));

        // Remove component
        this.components = this.components.filter(c => c !== component);

        this.selectComponent(null);
        this.markDirty();

        // Update insights immediately
        if (window.uiManager) {
            window.uiManager.updateCircuitInsights();
        }

        // Show empty state if no components
        if (this.components.length === 0) {
            const emptyState = document.getElementById('empty-state');
            if (emptyState) {
                emptyState.style.display = 'block';
            }
        }
    }

    /**
     * Delete a wire
     */
    deleteWire(wire) {
        // Remove wire from array
        this.wires = this.wires.filter(w => w !== wire);

        // Deselect
        this.updatePropertiesPanel(null);
        this.markDirty();

        // Update insights immediately when wire is deleted
        if (window.uiManager) {
            window.uiManager.updateCircuitInsights();
        }
    }

    /**
     * Select a component
     */
    selectComponent(component) {
        // Deselect all
        this.components.forEach(c => c.selected = false);
        this.wires.forEach(w => w.selected = false);

        if (component) {
            component.selected = true;
        }

        this.selectedComponent = component;
        this.updatePropertiesPanel();
    }

    /**
     * Select a wire
     */
    selectWire(wire) {
        // Deselect all
        this.components.forEach(c => c.selected = false);
        this.wires.forEach(w => w.selected = false);

        wire.selected = true;
        this.selectedComponent = null;
        this.updatePropertiesPanel(wire);
    }

    /**
     * Update properties panel
     */
    updatePropertiesPanel(item = null) {
        const target = item || this.selectedComponent;
        const container = document.getElementById('properties-content');

        if (!target) {
            container.innerHTML = `
                <div class="property-group">
                    <div class="property-label">Status</div>
                    <div class="property-value">No component selected</div>
                </div>
            `;
            return;
        }

        // Build interactive properties based on component type
        let html = this.buildInteractiveProperties(target);

        container.innerHTML = html;

        // Attach event listeners for interactive controls
        this.attachPropertyEventListeners(target);
    }

    /**
     * Build interactive property controls based on component type
     */
    buildInteractiveProperties(component) {
        let html = '';

        // Add editable properties based on component type
        if (component.type === 'battery') {
            html += this.buildBatteryProperties(component);
        } else if (component.type === 'resistor') {
            html += this.buildResistorProperties(component);
        } else if (component.type === 'led') {
            html += this.buildLEDProperties(component);
        } else if (component.type === 'switch') {
            html += this.buildSwitchProperties(component);
        } else if (component.type === 'wire') {
            html += this.buildWireProperties(component);
        } else if (component.type === 'raspberryPi') {
            html += this.buildRaspberryPiProperties(component);
        } else {
            // Generic properties for other components
            const properties = component.getProperties();
            for (const [key, value] of Object.entries(properties)) {
                html += `
                    <div class="property-group">
                        <div class="property-label">${key}</div>
                        <div class="property-value">${value}</div>
                    </div>
                `;
            }
        }

        return html;
    }

    /**
     * Build battery properties with voltage selector
     */
    buildBatteryProperties(battery) {
        const voltageOptions = battery.voltageOptions.map((v, i) =>
            `<option value="${i}" ${i === battery.voltageIndex ? 'selected' : ''}>${v}V</option>`
        ).join('');

        return `
            <div class="property-group">
                <div class="property-label">Type</div>
                <div class="property-value">Battery</div>
            </div>
            <div class="property-group editable">
                <div class="property-label">Voltage</div>
                <select class="property-select" id="prop-voltage" data-property="voltage">
                    ${voltageOptions}
                </select>
            </div>
            <div class="property-group">
                <div class="property-label">Current Output</div>
                <div class="property-value">${(battery.current * 1000).toFixed(1)} mA</div>
            </div>
            <div class="property-group">
                <div class="property-label">Power</div>
                <div class="property-value">${(battery.voltage * battery.current).toFixed(2)} W</div>
            </div>
        `;
    }

    /**
     * Build resistor properties with resistance selector
     */
    buildResistorProperties(resistor) {
        const resistanceOptions = resistor.resistanceOptions.map((r, i) => {
            // Smart formatting for resistance labels
            let label;
            if (r >= 1000) {
                const kValue = r / 1000;
                label = (kValue % 1 === 0) ? kValue + 'kΩ' : kValue.toFixed(1) + 'kΩ';
            } else {
                label = r + 'Ω';
            }
            return `<option value="${i}" ${i === resistor.resistanceIndex ? 'selected' : ''}>${label}</option>`;
        }).join('');

        const power = resistor.current * resistor.current * resistor.resistance;
        const percentPower = (power / resistor.maxPower * 100).toFixed(0);

        return `
            <div class="property-group">
                <div class="property-label">Type</div>
                <div class="property-value">Resistor</div>
            </div>
            <div class="property-group editable">
                <div class="property-label">Resistance</div>
                <select class="property-select" id="prop-resistance" data-property="resistance">
                    ${resistanceOptions}
                </select>
            </div>
            <div class="property-group">
                <div class="property-label">Voltage Drop</div>
                <div class="property-value">${resistor.voltage.toFixed(2)} V</div>
            </div>
            <div class="property-group">
                <div class="property-label">Current</div>
                <div class="property-value">${(resistor.current * 1000).toFixed(1)} mA</div>
            </div>
            <div class="property-group">
                <div class="property-label">Power</div>
                <div class="property-value">${power.toFixed(3)} W</div>
            </div>
            <div class="property-group">
                <div class="property-label">Load</div>
                <div class="property-value">${percentPower}%</div>
            </div>
            <div class="property-group">
                <div class="property-label">Status</div>
                <div class="property-value">${resistor.damaged ? '❌ Burned Out' :
                                             resistor.temperature > 80 ? '⚠️ Hot' :
                                             '✅ Normal'}</div>
            </div>
        `;
    }

    /**
     * Build LED properties with color selector
     */
    buildLEDProperties(led) {
        const colorOptions = led.colorOptions.map((c, i) => {
            const displayName = c.charAt(0).toUpperCase() + c.slice(1);
            return `<option value="${i}" ${i === led.colorIndex ? 'selected' : ''}>${displayName}</option>`;
        }).join('');

        const percentCurrent = (led.current / led.maxCurrent * 100).toFixed(0);

        return `
            <div class="property-group">
                <div class="property-label">Type</div>
                <div class="property-value">LED</div>
            </div>
            <div class="property-group editable">
                <div class="property-label">Color</div>
                <select class="property-select" id="prop-color" data-property="color">
                    ${colorOptions}
                </select>
            </div>
            <div class="property-group">
                <div class="property-label">Forward Voltage</div>
                <div class="property-value">${led.forwardVoltage} V</div>
            </div>
            <div class="property-group">
                <div class="property-label">Current</div>
                <div class="property-value">${(led.current * 1000).toFixed(1)} mA</div>
            </div>
            <div class="property-group">
                <div class="property-label">Max Current</div>
                <div class="property-value">${led.maxCurrent * 1000} mA</div>
            </div>
            <div class="property-group">
                <div class="property-label">Load</div>
                <div class="property-value">${percentCurrent}%</div>
            </div>
            <div class="property-group">
                <div class="property-label">Brightness</div>
                <div class="property-value">${(led.brightness * 100).toFixed(0)}%</div>
            </div>
            <div class="property-group">
                <div class="property-label">Status</div>
                <div class="property-value">${led.damaged ? '❌ Burned Out' :
                                             led.isOn ? '✅ Lit' :
                                             '⚪ Off'}</div>
            </div>
        `;
    }

    /**
     * Build switch properties with toggle button
     */
    buildSwitchProperties(switchComp) {
        return `
            <div class="property-group">
                <div class="property-label">Type</div>
                <div class="property-value">Switch</div>
            </div>
            <div class="property-group editable">
                <div class="property-label">State</div>
                <button class="property-button" id="prop-switch-toggle" data-property="switch">
                    ${switchComp.closed ? '✅ Closed (ON)' : '⭕ Open (OFF)'}
                </button>
            </div>
            <div class="property-group">
                <div class="property-label">Current</div>
                <div class="property-value">${(switchComp.current * 1000).toFixed(1)} mA</div>
            </div>
            <div class="property-group">
                <div class="property-label">Status</div>
                <div class="property-value">${switchComp.closed ? 'Conducting' : 'Open Circuit'}</div>
            </div>
        `;
    }

    /**
     * Build wire properties
     */
    buildWireProperties(wire) {
        return `
            <div class="property-group">
                <div class="property-label">Type</div>
                <div class="property-value">Wire</div>
            </div>
            <div class="property-group">
                <div class="property-label">Current</div>
                <div class="property-value">${(wire.current * 1000).toFixed(1)} mA</div>
            </div>
            <div class="property-group">
                <div class="property-label">Resistance</div>
                <div class="property-value">${wire.resistance.toFixed(3)} Ω</div>
            </div>
        `;
    }

    /**
     * Build Raspberry Pi properties with GPIO toggles
     */
    buildRaspberryPiProperties(pi) {
        const gpioALabel = pi.gpioA ? '🟢 HIGH' : '⚫ LOW';
        const gpioBLabel = pi.gpioB ? '🟢 HIGH' : '⚫ LOW';
        const gpioAStyle = pi.gpioA ? 'background: rgba(46,204,113,0.3); border-color: #2ecc71;' : '';
        const gpioBStyle = pi.gpioB ? 'background: rgba(46,204,113,0.3); border-color: #2ecc71;' : '';
        const disabled = !pi.poweredOn ? 'opacity: 0.5; pointer-events: none;' : '';

        return `
            <div class="property-group">
                <div class="property-label">Type</div>
                <div class="property-value">Raspberry Pi</div>
            </div>
            <div class="property-group">
                <div class="property-label">Power</div>
                <div class="property-value">${pi.poweredOn ? '🟢 ON' : '🔴 OFF'}</div>
            </div>
            <div class="property-group editable" style="${disabled}">
                <div class="property-label">GPIO A</div>
                <button class="property-button" id="prop-gpio-a" style="${gpioAStyle}">
                    ${gpioALabel}
                </button>
            </div>
            <div class="property-group editable" style="${disabled}">
                <div class="property-label">GPIO B</div>
                <button class="property-button" id="prop-gpio-b" style="${gpioBStyle}">
                    ${gpioBLabel}
                </button>
            </div>
            <div class="property-group">
                <div class="property-label" style="font-size: 10px; color: #888; font-style: italic;">Toggle pins to send signals to the motor controller</div>
            </div>
        `;
    }

    /**
     * Attach event listeners to interactive property controls
     */
    attachPropertyEventListeners(component) {
        // Voltage selector for battery
        const voltageSelect = document.getElementById('prop-voltage');
        if (voltageSelect) {
            voltageSelect.addEventListener('change', (e) => {
                component.voltageIndex = parseInt(e.target.value);
                component.voltage = component.voltageOptions[component.voltageIndex];
                this.updatePropertiesPanel();
                this.markDirty();
            });
        }

        // Resistance selector for resistor
        const resistanceSelect = document.getElementById('prop-resistance');
        if (resistanceSelect) {
            resistanceSelect.addEventListener('change', (e) => {
                component.resistanceIndex = parseInt(e.target.value);
                component.resistance = component.resistanceOptions[component.resistanceIndex];
                this.updatePropertiesPanel();
                this.markDirty();
            });
        }

        // Color selector for LED
        const colorSelect = document.getElementById('prop-color');
        if (colorSelect) {
            colorSelect.addEventListener('change', (e) => {
                component.colorIndex = parseInt(e.target.value);
                component.ledColor = component.colorOptions[component.colorIndex];
                this.updatePropertiesPanel();
                this.markDirty();
            });
        }

        // Toggle button for switch
        const switchToggle = document.getElementById('prop-switch-toggle');
        if (switchToggle) {
            switchToggle.addEventListener('click', () => {
                component.toggle();
                this.updatePropertiesPanel();
                this.markDirty();
            });
        }

        // GPIO toggle buttons for Raspberry Pi
        const gpioABtn = document.getElementById('prop-gpio-a');
        if (gpioABtn) {
            gpioABtn.addEventListener('click', () => {
                component.gpioA = !component.gpioA;
                if (window.robotWiringValidator) {
                    window.robotWiringValidator.invalidate();
                }
                this.updatePropertiesPanel();
                this.markDirty();
            });
        }
        const gpioBBtn = document.getElementById('prop-gpio-b');
        if (gpioBBtn) {
            gpioBBtn.addEventListener('click', () => {
                component.gpioB = !component.gpioB;
                if (window.robotWiringValidator) {
                    window.robotWiringValidator.invalidate();
                }
                this.updatePropertiesPanel();
                this.markDirty();
            });
        }
    }

    /**
     * Clear all components and wires
     */
    clear() {
        this.components = [];
        this.wires = [];
        this.selectedComponent = null;
        this.selectComponent(null);

        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
    }

    /**
     * Start animation loop
     */
    startAnimation() {
        this.lastTime = performance.now();
        this.animate();
    }

    /**
     * Animation loop
     */
    animate() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        // Run circuit simulation FIRST (if active)
        if (window.circuitSimulator && window.circuitSimulator.running) {
            window.circuitSimulator.update(this.components, this.wires);
            window.circuitSimulator.simulate();
        }

        // Run robotics validator (sets GPIO-LED currents before component.update reads them)
        if (window.robotWiringValidator) {
            window.robotWiringValidator.validate();
        }

        // THEN update components (so they see the current from simulation)
        for (const component of this.components) {
            component.update(deltaTime);
        }

        // Update wires
        for (const wire of this.wires) {
            wire.update(deltaTime);
        }

        // Update visual effects
        this.visualEffects.update(deltaTime);

        // Render
        this.render();

        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Render the canvas
     */
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0f3460';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context and apply transformations
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.scale, this.scale);

        // Draw grid
        this.drawGrid();

        // Draw wires
        for (const wire of this.wires) {
            wire.draw(this.ctx);
        }

        // Draw wire preview with waypoints
        if (this.drawingWire && this.wireStart) {
            const startPos = this.wireStart.component.getTerminalPosition(this.wireStart.terminal);
            this.ctx.strokeStyle = '#60a5fa';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(startPos.x, startPos.y);

            // Draw through waypoints
            for (const waypoint of this.wireWaypoints) {
                this.ctx.lineTo(waypoint.x, waypoint.y);
            }

            this.ctx.lineTo(this.wirePreviewEnd.x, this.wirePreviewEnd.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Draw waypoint markers
            this.ctx.fillStyle = '#60a5fa';
            for (const waypoint of this.wireWaypoints) {
                this.ctx.beginPath();
                this.ctx.arc(waypoint.x, waypoint.y, 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Draw components
        for (const component of this.components) {
            component.draw(this.ctx);
        }

        // Draw visual effects (on top of everything)
        this.visualEffects.draw(this.ctx);

        // Restore context
        this.ctx.restore();

        // Draw zoom indicator
        this.drawZoomIndicator();
    }

    /**
     * Draw zoom level indicator
     */
    drawZoomIndicator() {
        if (this.scale !== 1) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, 10, 80, 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${(this.scale * 100).toFixed(0)}%`, 50, 25);
            this.ctx.restore();
        }
    }

    /**
     * Draw grid
     */
    drawGrid() {
        if (!this.snapToGrid) return;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1 / this.scale;

        // Calculate visible area in world coordinates
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);

        // Snap to grid
        const startX = Math.floor(topLeft.x / this.gridSize) * this.gridSize;
        const startY = Math.floor(topLeft.y / this.gridSize) * this.gridSize;
        const endX = Math.ceil(bottomRight.x / this.gridSize) * this.gridSize;
        const endY = Math.ceil(bottomRight.y / this.gridSize) * this.gridSize;

        // Vertical lines
        for (let x = startX; x <= endX; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = startY; y <= endY; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }

    /**
     * Serialize circuit to JSON
     */
    toJSON() {
        return {
            version: '1.0',
            components: this.components.map(c => c.toJSON()),
            wires: this.wires.map(w => w.toJSON())
        };
    }

    /**
     * Load circuit from JSON
     */
    fromJSON(data) {
        this.clear();

        if (!data || !data.components) return;

        // Restore components
        const componentMap = new Map();
        for (const compData of data.components) {
            let component;
            switch (compData.type) {
                case 'battery':
                    component = new Battery();
                    break;
                case 'resistor':
                    component = new Resistor();
                    break;
                case 'led':
                    component = new LED();
                    break;
                case 'diode':
                    component = new Diode();
                    break;
                case 'switch':
                    component = new Switch();
                    break;
                case 'ground':
                    component = new Ground();
                    break;
                case 'batteryPackAA':
                    component = new BatteryPackAA();
                    break;
                case 'raspberryPi':
                    component = new RaspberryPi();
                    break;
                case 'motorController':
                    component = new MotorController();
                    break;
                case 'dcMotor':
                    component = new DCMotor();
                    break;
            }

            if (component) {
                component.fromJSON(compData);
                this.components.push(component);
                componentMap.set(compData.id, component);
            }
        }

        // Restore wires
        if (data.wires) {
            for (const wireData of data.wires) {
                const fromComp = componentMap.get(wireData.from.componentId);
                const toComp = componentMap.get(wireData.to.componentId);

                if (fromComp && toComp) {
                    const wire = new Wire(
                        fromComp,
                        wireData.from.terminal,
                        toComp,
                        wireData.to.terminal,
                        wireData.waypoints || [] // Restore waypoints from saved data
                    );
                    wire.id = wireData.id;
                    this.wires.push(wire);
                }
            }
        }

        // Hide empty state if we have components
        const emptyState = document.getElementById('empty-state');
        if (emptyState && this.components.length > 0) {
            emptyState.style.display = 'none';
        }

        // Update insights after loading circuit (slight delay to ensure all components are ready)
        if (window.uiManager) {
            // Use setTimeout to ensure all components are fully initialized
            setTimeout(() => {
                window.uiManager.updateCircuitInsights();
            }, 100);
        }
    }

    /**
     * Show temporary rotation indicator on canvas
     */
    showRotationIndicator(component) {
        // Create or update rotation indicator element
        let indicator = document.getElementById('rotation-indicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'rotation-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(102, 126, 234, 0.95);
                color: white;
                padding: 20px 40px;
                border-radius: 10px;
                font-size: 32px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                z-index: 10000;
                pointer-events: none;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                animation: rotationPulse 0.3s ease-out;
            `;
            document.body.appendChild(indicator);

            // Add animation keyframes if not already present
            if (!document.getElementById('rotation-animation-style')) {
                const style = document.createElement('style');
                style.id = 'rotation-animation-style';
                style.textContent = `
                    @keyframes rotationPulse {
                        0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                        50% { transform: translate(-50%, -50%) scale(1.1); }
                        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        // Update indicator text
        indicator.textContent = `↻ ${component.rotation}°`;

        // Restart animation
        indicator.style.animation = 'none';
        setTimeout(() => {
            indicator.style.animation = 'rotationPulse 0.3s ease-out';
        }, 10);

        // Clear any existing timeout
        if (this.rotationIndicatorTimeout) {
            clearTimeout(this.rotationIndicatorTimeout);
        }

        // Hide after 1.5 seconds
        this.rotationIndicatorTimeout = setTimeout(() => {
            if (indicator) {
                indicator.style.opacity = '0';
                indicator.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.parentNode.removeChild(indicator);
                    }
                }, 300);
            }
        }, 1500);
    }
}
