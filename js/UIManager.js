/**
 * UIManager - Handles UI interactions and status messages
 */
class UIManager {
    constructor(canvas, simulator, saveLoadManager) {
        this.canvas = canvas;
        this.simulator = simulator;
        this.saveLoadManager = saveLoadManager;

        this.setupEventListeners();

        // Initialize insights panel immediately
        this.updateCircuitInsights();
    }

    /**
     * Setup button event listeners
     */
    setupEventListeners() {
        // New circuit
        document.getElementById('btn-new').addEventListener('click', () => {
            if (confirm('Create new circuit? Unsaved changes will be lost.')) {
                this.canvas.clear();
                this.simulator.stop();
                this.showStatus('New circuit created', 'info');
            }
        });

        // Save
        document.getElementById('btn-save').addEventListener('click', () => {
            this.handleSave();
        });

        // Clear
        document.getElementById('btn-clear').addEventListener('click', () => {
            if (confirm('Clear all components? This cannot be undone.')) {
                this.canvas.clear();
                this.simulator.stop();
                this.showStatus('Circuit cleared', 'info');
            }
        });

        // Simulate toggle
        document.getElementById('btn-simulate').addEventListener('click', () => {
            this.toggleSimulation();
        });

        // Help
        document.getElementById('btn-help').addEventListener('click', () => {
            this.showHelp();
        });

        // Undo
        document.getElementById('btn-undo').addEventListener('click', () => {
            if (window.historyManager) {
                window.historyManager.undo();
            }
        });

        // Redo
        document.getElementById('btn-redo').addEventListener('click', () => {
            if (window.historyManager) {
                window.historyManager.redo();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.handleSave();
            }

            // Ctrl+Z to undo
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                if (window.historyManager) {
                    window.historyManager.undo();
                }
            }

            // Ctrl+Shift+Z or Ctrl+Y to redo
            if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') ||
                ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
                e.preventDefault();
                if (window.historyManager) {
                    window.historyManager.redo();
                }
            }

            // Space to toggle simulation
            if (e.key === ' ' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.toggleSimulation();
            }
        });
    }

    /**
     * Handle save action
     */
    async handleSave() {
        this.showStatus('Saving...', 'info', 0);

        const result = await this.saveLoadManager.save();

        if (result.success) {
            this.showStatus('✓ Saved successfully!', 'success', 2000);
        } else {
            this.showStatus('✗ Save failed: ' + result.error, 'error', 3000);
        }
    }

    /**
     * Toggle simulation on/off
     */
    toggleSimulation() {
        const btn = document.getElementById('btn-simulate');
        const ohmsPanel = document.getElementById('ohms-law-panel');

        if (!this.simulator.running) {
            // Starting simulation - clear all damage and reset components
            for (const component of this.canvas.components) {
                component.damaged = false;
            }

            this.simulator.start();
            btn.innerHTML = '⏹️ Stop';
            btn.style.background = 'rgba(239, 68, 68, 0.3)'; // Red background for stop
            this.showStatus('Simulation started', 'success', 1500);
            if (ohmsPanel) ohmsPanel.classList.remove('simulation-off');

            // Update insights immediately when starting
            this.updateCircuitInsights();
        } else {
            // Stopping simulation - reset all components and clear damage
            this.simulator.stop();

            // Clear all component damage when stopping
            for (const component of this.canvas.components) {
                component.damaged = false;
            }

            btn.innerHTML = '▶️ Simulate';
            btn.style.background = 'rgba(255, 255, 255, 0.2)';
            this.showStatus('Simulation stopped & reset', 'info', 1500);
            if (ohmsPanel) ohmsPanel.classList.add('simulation-off');
            this.clearOhmsLawDisplay();

            // Update insights immediately when stopping
            this.updateCircuitInsights();

            // Update properties panel to show reset state
            if (this.canvas.selectedComponent) {
                this.canvas.updatePropertiesPanel();
            }
        }
    }

    /**
     * Show help dialog
     */
    showHelp() {
        const helpText = `
            <div style="text-align: left; line-height: 1.8;">
                <h3 style="margin-top: 0; color: #667eea;">CircuitSim Help</h3>

                <h4 style="color: #667eea; margin-bottom: 10px;">Getting Started:</h4>
                <ul style="margin: 0 0 15px 20px;">
                    <li>Drag components from the left panel onto the canvas</li>
                    <li>Click on component terminals (yellow dots) to draw wires</li>
                    <li>Click another terminal to complete the wire connection</li>
                    <li>Click the <strong>Simulate</strong> button to power up your circuit</li>
                    <li>Click <strong>Stop</strong> to halt simulation and reset all damage</li>
                </ul>

                <h4 style="color: #667eea; margin-bottom: 10px;">Component Interactions:</h4>
                <ul style="margin: 0 0 15px 20px;">
                    <li><strong>Click</strong> a component to select it and view properties</li>
                    <li><strong>Properties Panel:</strong> Use dropdown menus and buttons to change component values</li>
                    <li><strong>Battery:</strong> Select voltage (3V, 6V, 9V)</li>
                    <li><strong>Resistor:</strong> Select resistance (10Ω to 100kΩ - 12 common values)</li>
                    <li><strong>LED:</strong> Select color (red, green, blue, yellow, white)</li>
                    <li><strong>Switch:</strong> Click button to toggle open/closed</li>
                    <li><strong>Double-click</strong> components also works to cycle through options</li>
                </ul>

                <h4 style="color: #667eea; margin-bottom: 10px;">Keyboard Shortcuts:</h4>
                <ul style="margin: 0 0 15px 20px;">
                    <li><strong>Ctrl+Z:</strong> Undo last action</li>
                    <li><strong>Ctrl+Shift+Z or Ctrl+Y:</strong> Redo</li>
                    <li><strong>Ctrl+S:</strong> Save circuit</li>
                    <li><strong>Space:</strong> Start/stop simulation (resets damage)</li>
                    <li><strong>Delete:</strong> Remove selected component</li>
                    <li><strong>R:</strong> Rotate selected component by 45° (8 orientations total)</li>
                    <li><strong>G:</strong> Toggle grid snap</li>
                    <li><strong>+/-:</strong> Zoom in/out</li>
                    <li><strong>0:</strong> Reset zoom and pan</li>
                    <li><strong>Mouse Wheel:</strong> Zoom in/out</li>
                    <li><strong>Space + Drag:</strong> Pan the canvas</li>
                    <li><strong>Middle Mouse + Drag:</strong> Pan the canvas</li>
                </ul>

                <h4 style="color: #667eea; margin-bottom: 10px;">Tips:</h4>
                <ul style="margin: 0 0 15px 20px;">
                    <li>Every circuit needs a battery (+) and ground (−) to work</li>
                    <li>LEDs will burn out if given too much current - use resistors!</li>
                    <li>If a component burns out, click <strong>Stop</strong> to reset and try again</li>
                    <li>Watch the <strong>Ohm's Law panel</strong> to see real-time voltage, current, resistance, and power calculations</li>
                    <li>The equation updates to show actual values when simulation is running</li>
                    <li>When LEDs are present, resistance shows as "Ω*" (equivalent resistance) since LEDs are non-ohmic</li>
                    <li>Resistors glow red when they get hot</li>
                    <li>Animated dots show current flowing through wires</li>
                </ul>

                <h4 style="color: #667eea; margin-bottom: 10px;">Example Circuits:</h4>
                <ul style="margin: 0 0 0 20px;">
                    <li><strong>Basic LED:</strong> 9V Battery → 330Ω Resistor → LED → Ground (safe 20mA current)</li>
                    <li><strong>Switchable LED:</strong> Battery → Switch → 330Ω Resistor → LED → Ground</li>
                    <li><strong>Two LEDs (Series):</strong> 9V Battery → LED → LED → 220Ω Resistor → Ground</li>
                    <li><strong>Experiment:</strong> Try LED without resistor to see why current limiting is important!</li>
                </ul>
            </div>
        `;

        this.showDialog('Help', helpText);
    }

    /**
     * Show status indicator
     */
    showStatus(message, type = 'info', duration = 2000) {
        // Remove existing status
        const existing = document.querySelector('.status-indicator');
        if (existing) {
            existing.remove();
        }

        // Create new status indicator
        const indicator = document.createElement('div');
        indicator.className = `status-indicator ${type}`;
        indicator.textContent = message;

        document.body.appendChild(indicator);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                indicator.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => indicator.remove(), 300);
            }, duration);
        }
    }

    /**
     * Show dialog
     */
    showDialog(title, content) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #16213e;
            border: 2px solid #667eea;
            border-radius: 10px;
            padding: 25px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            color: #eee;
        `;

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #667eea;">${title}</h2>
                <button id="close-dialog" style="
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 5px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 18px;
                ">✕</button>
            </div>
            <div>${content}</div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Close handlers
        const closeDialog = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        };

        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.opacity = '1', 10);
        overlay.style.transition = 'opacity 0.2s';

        document.getElementById('close-dialog').addEventListener('click', closeDialog);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog();
        });

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    /**
     * Update Robot Wiring panel
     */
    updateRobotWiringPanel() {
        const validator = window.robotWiringValidator;
        if (!validator) return;

        const panel = document.getElementById('robot-wiring-panel');
        if (!panel) return;

        // Show/hide panel based on robotics components
        if (!validator.hasRoboticsComponents()) {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = 'block';

        // Run validation
        validator.validate();

        const total = validator.getTotal();
        const progress = validator.getProgress();
        const checklist = validator.getChecklist();

        // Update progress bar
        const countEl = document.getElementById('robot-wiring-count');
        const barEl = document.getElementById('robot-wiring-bar');
        if (countEl) countEl.textContent = progress + '/' + total;
        if (barEl) barEl.style.width = (total > 0 ? (progress / total * 100) : 0) + '%';

        // Update checklist
        const checklistEl = document.getElementById('robot-wiring-checklist');
        if (checklistEl) {
            let html = '';
            for (const item of checklist) {
                const icon = item.connected ? '<span style="color:#2ecc71;">&#10003;</span>' : '<span style="color:#555;">&#9675;</span>';
                const style = item.connected ? 'color:#ccc;' : 'color:#777;';
                html += '<div style="' + style + '">' + icon + ' ' + item.label + '</div>';
            }
            checklistEl.innerHTML = html;
        }

        // Show/hide complete message
        const completeEl = document.getElementById('robot-wiring-complete');
        if (completeEl) {
            completeEl.style.display = (total > 0 && progress === total) ? 'block' : 'none';
        }
    }

    /**
     * Update simulation display
     */
    updateSimulationDisplay() {
        // Always update insights (they work when simulation is on OR off)
        this.updateCircuitInsights();

        // Update robot wiring panel
        this.updateRobotWiringPanel();

        // Only update Ohm's law and show errors when running
        if (this.simulator.running) {
            const analysis = this.simulator.analyzeCircuit();
            const problems = analysis.problems;

            // Show warnings/errors
            for (const problem of problems) {
                if (problem.type === 'error') {
                    // Only show error once per component
                    if (!problem.component._errorShown) {
                        this.showStatus(problem.message, 'error', 3000);
                        problem.component._errorShown = true;
                    }
                }
            }

            // Update Ohm's Law display
            this.updateOhmsLawDisplay();
        } else {
            // Clear Ohm's law when not running
            this.clearOhmsLawDisplay();
        }
    }

    /**
     * Update Ohm's Law display with current circuit data
     */
    updateOhmsLawDisplay() {
        if (!this.simulator.running || !this.simulator.lastPathData) {
            this.clearOhmsLawDisplay();
            return;
        }

        const data = this.simulator.lastPathData;

        // Check if circuit contains LEDs (non-ohmic components)
        const hasLED = this.canvas.components.some(c => c.type === 'led');

        // Format values with appropriate precision
        const voltage = data.voltage.toFixed(2) + ' V';
        const current = (data.current * 1000).toFixed(2) + ' mA'; // Convert to mA
        const resistance = data.resistance.toFixed(2) + (hasLED ? ' Ω*' : ' Ω');
        const power = (data.power * 1000).toFixed(2) + ' mW'; // Convert to mW

        // Update display elements
        const voltageEl = document.getElementById('ohms-voltage');
        const currentEl = document.getElementById('ohms-current');
        const resistanceEl = document.getElementById('ohms-resistance');
        const powerEl = document.getElementById('ohms-power');
        const equationEl = document.getElementById('ohms-equation');

        if (voltageEl) voltageEl.textContent = voltage;
        if (currentEl) currentEl.textContent = current;
        if (resistanceEl) resistanceEl.textContent = resistance;
        if (powerEl) powerEl.textContent = power;

        // Update equation to show actual values
        if (equationEl) {
            if (hasLED) {
                // Show that this is equivalent resistance for non-ohmic components
                equationEl.textContent = `${data.voltage.toFixed(1)}V = ${(data.current * 1000).toFixed(1)}mA × ${data.resistance.toFixed(1)}Ω (equiv)`;
            } else {
                equationEl.textContent = `${data.voltage.toFixed(1)}V = ${(data.current * 1000).toFixed(1)}mA × ${data.resistance.toFixed(1)}Ω`;
            }
        }
    }

    /**
     * Clear Ohm's Law display
     */
    clearOhmsLawDisplay() {
        const voltageEl = document.getElementById('ohms-voltage');
        const currentEl = document.getElementById('ohms-current');
        const resistanceEl = document.getElementById('ohms-resistance');
        const powerEl = document.getElementById('ohms-power');
        const equationEl = document.getElementById('ohms-equation');

        if (voltageEl) voltageEl.textContent = '-';
        if (currentEl) currentEl.textContent = '-';
        if (resistanceEl) resistanceEl.textContent = '-';
        if (powerEl) powerEl.textContent = '-';
        if (equationEl) equationEl.textContent = 'V = I × R (Not Running)';
    }

    /**
     * Update Circuit Insights with educational feedback
     */
    updateCircuitInsights() {
        const container = document.getElementById('insights-content');
        if (!container) return;

        const insights = [];
        const components = this.canvas.components;
        const isRunning = this.simulator.running;

        // Find component types
        const batteries = components.filter(c => c.type === 'battery');
        const leds = components.filter(c => c.type === 'led');
        const resistors = components.filter(c => c.type === 'resistor');
        const switches = components.filter(c => c.type === 'switch');
        const grounds = components.filter(c => c.type === 'ground');

        // Robotics components
        const hasRobotics = components.some(c =>
            c.type === 'batteryPackAA' || c.type === 'raspberryPi' ||
            c.type === 'motorController' || c.type === 'dcMotor'
        );

        // Robotics-specific insights
        if (hasRobotics) {
            const validator = window.robotWiringValidator;
            if (validator) {
                const total = validator.getTotal();
                const progress = validator.getProgress();
                const { battery, pi, controller, motors } = validator.findComponents();

                if (total > 0 && progress === total) {
                    insights.push({
                        type: 'success',
                        icon: '🤖',
                        text: '<strong>Robot Circuit Complete!</strong> All components are properly wired. Your robot is ready to go!'
                    });
                } else if (!battery) {
                    insights.push({
                        type: 'info',
                        icon: '🔌',
                        text: 'Add a <strong>4xAA Battery Pack</strong> to power your robot circuit.'
                    });
                } else if (!pi) {
                    insights.push({
                        type: 'info',
                        icon: '💻',
                        text: 'Add a <strong>Raspberry Pi</strong> to control your motors.'
                    });
                } else if (!controller) {
                    insights.push({
                        type: 'info',
                        icon: '🎛️',
                        text: 'Add a <strong>Motor Driver</strong> to connect between the Pi and motors.'
                    });
                } else if (motors.length === 0) {
                    insights.push({
                        type: 'info',
                        icon: '⚙️',
                        text: 'Add <strong>DC Motors</strong> (1 or 2) to complete your robot.'
                    });
                } else {
                    insights.push({
                        type: 'info',
                        icon: '🔧',
                        text: '<strong>Wire your robot!</strong> Connect terminals (yellow dots) to complete the circuit. Check the Robot Wiring panel for guidance.'
                    });
                }
            }

            // Render and return early for robotics mode
            let html = '';
            for (const insight of insights) {
                html += '<div class="insight-item ' + insight.type + '"><span class="insight-icon">' + insight.icon + '</span><span class="insight-text">' + insight.text + '</span></div>';
            }
            container.innerHTML = html;
            return;
        }

        // No components yet
        if (components.length === 0) {
            insights.push({
                type: 'info',
                icon: 'ℹ️',
                text: 'Build a circuit to see real-time analysis and learning tips!'
            });
        }
        // Missing battery
        else if (batteries.length === 0) {
            insights.push({
                type: 'info',
                icon: '🔋',
                text: 'Add a <strong>Battery</strong> to provide power to your circuit.'
            });
        }
        // Has battery - check if there's a complete path (loop OR to ground)
        else {
            // Check for reverse-biased diodes FIRST (before path finding)
            const diodes = components.filter(c => c.type === 'diode');
            const hasReverseBiasedDiode = this.detectReverseBiasedDiode(diodes, this.canvas.wires);

            // Check if there's a complete path (to ground OR back to battery)
            const pathFinder = new PathFinder(components, this.canvas.wires);
            const isComplete = pathFinder.isCircuitComplete();
            const paths = pathFinder.findAllPaths();

            // Check for dangerous parallel paths (resistor bypass)
            const hasBypassIssue = this.detectResistorBypass(paths, leds, resistors);

            // Path information available for debugging if needed

            // HIGHEST PRIORITY: Show reversed diode warning (whether running or not!)
            if (hasReverseBiasedDiode) {
                if (isRunning) {
                    insights.push({
                        type: 'danger',
                        icon: '🔺',
                        text: '<strong>Simulation Running - No Current Flow!</strong> Your diode is reverse-biased, blocking all current. The circuit cannot operate.'
                    });
                } else {
                    insights.push({
                        type: 'danger',
                        icon: '🔺',
                        text: '<strong>Reverse-Biased Diode Detected!</strong> Your diode is connected backwards. Current cannot flow through a reverse-biased diode - the circuit is blocked!'
                    });
                }
                insights.push({
                    type: 'info',
                    icon: '💡',
                    text: 'Diodes only allow current to flow in ONE direction: from <strong>anode (+)</strong> to <strong>cathode (−)</strong>. Reconnect your wires so current enters through the anode.'
                });
            }
            // Circuit not connected yet - needs wires
            else if (!isComplete && !isRunning) {
                insights.push({
                    type: 'info',
                    icon: '🔌',
                    text: '<strong>Connect your components!</strong> Click component terminals (yellow dots) to draw wires. Complete the circuit by connecting back to the battery or to a ground.'
                });
                if (leds.length > 0 && resistors.length === 0) {
                    const battery = batteries[0];
                    const batteryV = battery ? battery.voltage : 9;
                    const ledV = 2;
                    const targetI = 0.02;
                    const suggestedR = Math.round((batteryV - ledV) / targetI);
                    insights.push({
                        type: 'warning',
                        icon: '💡',
                        text: `<strong>LED Protection:</strong> Your circuit has an LED but no resistor. LEDs need current limiting! Add a ${suggestedR}Ω resistor to protect your LED.`
                    });
                }
            }
            // Circuit is connected - analyze based on simulation state
            else if (isComplete) {
                // Circuit complete but NOT running - show warnings and ready message
                if (!isRunning) {
                    // PRIORITY: Warn about resistor bypass (parallel path danger)
                    if (hasBypassIssue && leds.length > 0) {
                        insights.push({
                            type: 'danger',
                            icon: '⚠️',
                            text: '<strong>Dangerous Bypass Detected!</strong> You have a wire that bypasses the resistor, creating a parallel path. The LED will draw excessive current through the bypass wire and burn out!'
                        });
                        insights.push({
                            type: 'info',
                            icon: '💡',
                            text: 'Remove the bypass wire or ensure ALL paths to the LED go through a resistor. In parallel circuits, current takes the path of least resistance.'
                        });
                    }
                    // Warn about LED without resistor BEFORE they simulate
                    else if (leds.length > 0 && resistors.length === 0) {
                        const battery = batteries[0];
                        const batteryV = battery ? battery.voltage : 9;
                        const ledV = 2;
                        const targetI = 0.02;
                        const suggestedR = Math.round((batteryV - ledV) / targetI);
                        insights.push({
                            type: 'danger',
                            icon: '⚠️',
                            text: `<strong>Warning!</strong> Your LED has no current-limiting resistor. It will burn out immediately when you simulate!`
                        });
                        insights.push({
                            type: 'info',
                            icon: '💡',
                            text: `Add a ${suggestedR}Ω resistor in series with your LED. Formula: <span class="insight-formula">R = (${batteryV}V - ${ledV}V) / 0.02A = ${suggestedR}Ω</span>`
                        });
                    } else if (leds.length > 0 && resistors.length > 0) {
                        insights.push({
                            type: 'success',
                            icon: '✅',
                            text: '<strong>Circuit Ready!</strong> Your LED has a current-limiting resistor. Click <strong>Simulate</strong> to see it light up safely!'
                        });
                    } else {
                        insights.push({
                            type: 'success',
                            icon: '▶️',
                            text: '<strong>Circuit Ready!</strong> Click the <strong>Simulate</strong> button to see how your circuit behaves.'
                        });
                    }
                }
                // Simulation IS running - show real-time data
                else if (this.simulator.running) {
                    // Check if there's actually current flowing
                    if (!this.simulator.lastPathData) {
                        insights.push({
                            type: 'info',
                            icon: 'ℹ️',
                            text: '<strong>Simulation Running - No Current Flow.</strong> Check that your circuit is complete and all components are properly connected.'
                        });
                    } else if (this.simulator.lastPathData) {
                        const data = this.simulator.lastPathData;
                        const currentMA = data.current * 1000;

                        // LED-specific insights
                        if (leds.length > 0) {
                            const led = leds[0];
                            const hasResistor = resistors.length > 0;

                            if (led.damaged) {
                                insights.push({
                                    type: 'danger',
                                    icon: '💥',
                                    text: `<strong>LED Burned Out!</strong> Current exceeded 30mA limit. ${hasResistor ? 'Try a higher resistance resistor.' : 'Add a resistor to limit current.'}`
                                });
                                insights.push({
                                    type: 'info',
                                    icon: '📚',
                                    text: 'LEDs need current-limiting resistors because they have very low resistance and will draw excessive current without protection.'
                                });
                            } else if (!hasResistor && currentMA > 0) {
                                insights.push({
                                    type: 'danger',
                                    icon: '⚠️',
                                    text: `<strong>Danger!</strong> LED has no resistor! Current: ${currentMA.toFixed(1)}mA. LEDs burn out at 30mA.`
                                });
                                const battery = batteries[0];
                                const batteryV = battery ? battery.voltage : 9;
                                const ledV = 2;
                                const targetI = 0.02;
                                const suggestedR = Math.round((batteryV - ledV) / targetI);
                                insights.push({
                                    type: 'info',
                                    icon: '💡',
                                    text: `Use this formula to calculate resistor: <span class="insight-formula">R = (V_battery - V_led) / I_target</span>. For ${batteryV}V and 20mA: <span class="insight-formula">R = (${batteryV}V - ${ledV}V) / 0.02A = ${suggestedR}Ω</span>`
                                });
                            } else if (currentMA >= 25) {
                                insights.push({
                                    type: 'warning',
                                    icon: '⚠️',
                                    text: `<strong>High Current:</strong> ${currentMA.toFixed(1)}mA. LED is near its 30mA limit. Consider a larger resistor to be safe.`
                                });
                            } else if (currentMA >= 18 && currentMA < 25) {
                                insights.push({
                                    type: 'success',
                                    icon: '✅',
                                    text: `<strong>Perfect!</strong> Current: ${currentMA.toFixed(1)}mA. This is ideal for LED brightness (18-22mA) while staying safe.`
                                });
                                if (resistors.length > 0 && resistors[0].voltage !== undefined && led.voltage !== undefined) {
                                    insights.push({
                                        type: 'info',
                                        icon: '📚',
                                        text: `The resistor drops excess voltage, limiting current. Voltage across resistor: <span class="insight-formula">${resistors[0].voltage.toFixed(2)}V</span>, across LED: <span class="insight-formula">${led.voltage.toFixed(2)}V</span>`
                                    });
                                }
                            } else if (currentMA >= 10) {
                                insights.push({
                                    type: 'success',
                                    icon: '✅',
                                    text: `<strong>Safe:</strong> Current: ${currentMA.toFixed(1)}mA. LED is safe but will be dimmer than maximum brightness.`
                                });
                            } else {
                                insights.push({
                                    type: 'warning',
                                    icon: '💡',
                                    text: `<strong>Low Brightness:</strong> Current: ${currentMA.toFixed(1)}mA. LED is safe but very dim. Try a smaller resistor for more brightness.`
                                });
                            }

                            // Series resistance explanation
                            if (resistors.length > 0) {
                                const totalR = data.resistance;
                                const resistorR = resistors[0].resistance;
                                insights.push({
                                    type: 'info',
                                    icon: '🔬',
                                    text: `<strong>Series Circuit:</strong> Total resistance = Resistor (${resistorR}Ω) + LED (~100Ω equiv) = ${totalR.toFixed(0)}Ω. Current is same through all components.`
                                });
                            }
                    }
                        // Resistor without LED
                        else if (resistors.length > 0 && leds.length === 0) {
                            const resistor = resistors[0];
                            const power = resistor.current * resistor.current * resistor.resistance;
                            const powerPercent = (power / resistor.maxPower * 100);

                            if (resistor.damaged) {
                                insights.push({
                                    type: 'danger',
                                    icon: '🔥',
                                    text: `<strong>Resistor Burned Out!</strong> Power exceeded 0.5W limit. Power = I² × R = <span class="insight-formula">(${currentMA.toFixed(1)}mA)² × ${resistor.resistance}Ω = ${power.toFixed(2)}W</span>`
                                });
                            } else if (powerPercent > 80) {
                                insights.push({
                                    type: 'warning',
                                    icon: '🌡️',
                                    text: `<strong>Resistor Hot!</strong> Using ${powerPercent.toFixed(0)}% of power rating (${power.toFixed(3)}W / 0.25W). May burn out soon.`
                                });
                                insights.push({
                                    type: 'info',
                                    icon: '📚',
                                    text: 'Power dissipation: <span class="insight-formula">P = I² × R</span> or <span class="insight-formula">P = V² / R</span>. Higher current or lower resistance = more heat!'
                                });
                            } else {
                                insights.push({
                                    type: 'success',
                                    icon: '✅',
                                    text: `<strong>Resistor Safe:</strong> Power: ${power.toFixed(3)}W (${powerPercent.toFixed(0)}% of 0.25W rating). Good operating condition.`
                                });
                            }
                        }

                        // Switch insights
                        if (switches.length > 0) {
                            const sw = switches[0];
                            if (sw.closed) {
                                insights.push({
                                    type: 'info',
                                    icon: '🔘',
                                    text: '<strong>Switch Closed:</strong> Circuit is complete, current flows. Switches act like wires when closed (very low resistance).'
                                });
                            } else {
                                insights.push({
                                    type: 'info',
                                    icon: '🔘',
                                    text: '<strong>Switch Open:</strong> Circuit is broken, no current flows. Open switches have extremely high resistance (~1GΩ).'
                                });
                            }
                    }

                        // General Ohm's Law teaching
                        if (insights.length < 2) {
                            insights.push({
                                type: 'info',
                                icon: '📚',
                                text: `<strong>Ohm\'s Law in action:</strong> <span class="insight-formula">V = I × R</span> → <span class="insight-formula">${data.voltage.toFixed(1)}V = ${currentMA.toFixed(1)}mA × ${data.resistance.toFixed(0)}Ω</span>`
                            });
                        }
                    }
                }
            }
        }

        // Render insights
        let html = '';
        for (const insight of insights) {
            html += `
                <div class="insight-item ${insight.type}">
                    <span class="insight-icon">${insight.icon}</span>
                    <span class="insight-text">${insight.text}</span>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    /**
     * Detect if there's a resistor bypass (parallel path without resistor)
     * Returns true if there's an LED with multiple paths where at least one bypasses the resistor
     */
    detectResistorBypass(paths, leds, resistors) {
        // Need at least 2 paths for a bypass
        if (paths.length < 2 || leds.length === 0 || resistors.length === 0) {
            return false;
        }

        // Check if any LED has multiple paths reaching it
        for (const led of leds) {
            // Find all paths that include this LED
            const pathsWithLED = paths.filter(path =>
                path.components.some(comp => comp === led)
            );

            // If LED has multiple paths, check if at least one bypasses the resistor
            if (pathsWithLED.length >= 2) {
                // Check if any path has the LED but no resistor
                const hasPathWithoutResistor = pathsWithLED.some(path => {
                    const hasLED = path.components.includes(led);
                    const hasResistor = path.components.some(comp => comp.type === 'resistor');
                    return hasLED && !hasResistor;
                });

                if (hasPathWithoutResistor) {
                    return true; // Bypass detected!
                }
            }
        }

        // Alternative check: If there are multiple paths and one has resistor and one doesn't
        const pathsWithResistor = paths.filter(path =>
            path.components.some(comp => comp.type === 'resistor')
        );
        const pathsWithoutResistor = paths.filter(path =>
            !path.components.some(comp => comp.type === 'resistor')
        );

        // If we have both types of paths and they share an LED, it's a bypass
        if (pathsWithResistor.length > 0 && pathsWithoutResistor.length > 0) {
            for (const led of leds) {
                const inPathWithResistor = pathsWithResistor.some(path => path.components.includes(led));
                const inPathWithoutResistor = pathsWithoutResistor.some(path => path.components.includes(led));

                if (inPathWithResistor && inPathWithoutResistor) {
                    return true; // Same LED in both types of paths = bypass
                }
            }
        }

        return false;
    }

    /**
     * Detect if any diodes are reverse-biased (blocking current flow)
     * A diode is reverse-biased if it's in the circuit but not in any complete path
     */
    detectReverseBiasedDiode(diodes, wires) {
        if (diodes.length === 0) {
            return false;
        }

        // Check if any diode has wires connected but isn't allowing current flow
        for (const diode of diodes) {
            const connectedWires = wires.filter(wire =>
                wire.fromComponent === diode || wire.toComponent === diode
            );

            // If diode has connections, check if it would block current
            if (connectedWires.length >= 2) {
                // Find which terminals are connected
                let hasAnodeConnection = false;
                let hasCathodeConnection = false;
                let currentEnteringCathode = false;

                for (const wire of connectedWires) {
                    if (wire.fromComponent === diode) {
                        // Current exits diode through this terminal
                        if (wire.fromTerminal === 'cathode') {
                            hasCathodeConnection = true;
                        } else if (wire.fromTerminal === 'anode') {
                            hasAnodeConnection = true;
                            // This would be wrong - current trying to exit through anode
                        }
                    } else if (wire.toComponent === diode) {
                        // Current enters diode through this terminal
                        if (wire.toTerminal === 'anode') {
                            hasAnodeConnection = true;
                        } else if (wire.toTerminal === 'cathode') {
                            hasCathodeConnection = true;
                            currentEnteringCathode = true; // REVERSE BIAS!
                        }
                    }
                }

                // If current is trying to enter through cathode, diode is reverse-biased
                if (currentEnteringCathode) {
                    return true;
                }
            }
        }

        return false;
    }
}
