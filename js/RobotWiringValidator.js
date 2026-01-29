/**
 * RobotWiringValidator - Validates robotics component wiring
 * Checks 10 required connections and updates component visual states
 */
class RobotWiringValidator {
    constructor(canvas) {
        this.canvas = canvas;
        this.connections = new Array(10).fill(false);
        this.lastWireCount = -1;
    }

    /**
     * Check if two terminals are connected by any wire
     */
    isConnected(compA, termA, compB, termB) {
        for (const wire of this.canvas.wires) {
            // Check both directions
            if (wire.fromComponent === compA && wire.fromTerminal === termA &&
                wire.toComponent === compB && wire.toTerminal === termB) {
                return true;
            }
            if (wire.fromComponent === compB && wire.fromTerminal === termB &&
                wire.toComponent === compA && wire.toTerminal === termA) {
                return true;
            }
        }
        return false;
    }

    /**
     * Find all robotics components on canvas
     */
    findComponents() {
        const components = this.canvas.components;
        return {
            battery: components.find(c => c.type === 'batteryPackAA'),
            pi: components.find(c => c.type === 'raspberryPi'),
            controller: components.find(c => c.type === 'motorController'),
            motors: components.filter(c => c.type === 'dcMotor')
        };
    }

    /**
     * Check if any robotics components are on the canvas
     */
    hasRoboticsComponents() {
        const comps = this.findComponents();
        return !!(comps.battery || comps.pi || comps.controller || comps.motors.length > 0);
    }

    /**
     * Run validation and update component states
     * Connection checks cached (only re-run when wire/component count changes)
     * Component states always re-applied each call
     */
    validate() {
        const currentWireCount = this.canvas.wires.length;
        const componentCount = this.canvas.components.length;

        // Re-check connections only when wires or components change
        if (currentWireCount !== this.lastWireCount || componentCount !== this._lastCompCount) {
            this.lastWireCount = currentWireCount;
            this._lastCompCount = componentCount;
            this._recheckConnections();
        }

        // Always apply component states (they may have been reset externally)
        this._applyStates();

        return this.connections;
    }

    /**
     * Re-check which terminals are connected by wires
     */
    _recheckConnections() {
        const { battery, pi, controller, motors } = this.findComponents();

        this.connections = new Array(10).fill(false);

        if (!battery || !pi) return;

        // Pi power connections (always check if battery and pi exist)
        this.connections[0] = this.isConnected(battery, 'positive', pi, '5V_IN');
        this.connections[1] = this.isConnected(battery, 'negative', pi, 'GND');

        if (!controller) return;

        const motorA = motors[0] || null;
        const motorB = motors[1] || null;

        this.connections[2] = this.isConnected(battery, 'positive', controller, 'VCC');
        this.connections[3] = this.isConnected(battery, 'negative', controller, 'GND');
        this.connections[4] = this.isConnected(pi, 'GPIO_A', controller, 'IN_A');
        this.connections[5] = this.isConnected(pi, 'GPIO_B', controller, 'IN_B');

        if (motorA) {
            this.connections[6] = this.isConnected(controller, 'OUT_A1', motorA, 'terminal_1');
            this.connections[7] = this.isConnected(controller, 'OUT_A2', motorA, 'terminal_2');
        }
        if (motorB) {
            this.connections[8] = this.isConnected(controller, 'OUT_B1', motorB, 'terminal_1');
            this.connections[9] = this.isConnected(controller, 'OUT_B2', motorB, 'terminal_2');
        }
    }

    /**
     * Apply visual states to components based on current connections
     * Motor spinning only when simulation is running
     */
    _applyStates() {
        const isRunning = window.circuitSimulator && window.circuitSimulator.running;
        const { pi, controller, motors } = this.findComponents();

        if (!pi) {
            if (controller) {
                controller.powered = false;
                controller.signalA = false;
                controller.signalB = false;
            }
            for (const motor of motors) {
                motor.spinning = false;
            }
            this._checkGPIOCircuits();
            return;
        }

        if (!controller) {
            // Pi can still power LEDs without a motor controller
            pi.poweredOn = this.connections[0] && this.connections[1];
            for (const motor of motors) {
                motor.spinning = false;
            }
            this._checkGPIOCircuits();
            return;
        }

        const motorA = motors[0] || null;
        const motorB = motors[1] || null;

        pi.poweredOn = this.connections[0] && this.connections[1];
        controller.powered = this.connections[2] && this.connections[3];
        controller.signalA = this.connections[4] && pi.poweredOn && pi.gpioA;
        controller.signalB = this.connections[5] && pi.poweredOn && pi.gpioB;

        if (motorA) {
            motorA.spinning = isRunning && this.connections[6] && this.connections[7] &&
                              controller.powered && controller.signalA;
        }
        if (motorB) {
            motorB.spinning = isRunning && this.connections[8] && this.connections[9] &&
                              controller.powered && controller.signalB;
        }

        // Check GPIO-LED circuits
        this._checkGPIOCircuits();
    }

    /**
     * Get progress count (how many of 10 connections are made)
     */
    getProgress() {
        return this.connections.filter(c => c).length;
    }

    /**
     * Get total possible connections based on available components
     */
    getTotal() {
        const { battery, pi, controller, motors } = this.findComponents();
        if (!battery || !pi || !controller) return 0;

        let total = 6; // First 6 connections always needed
        if (motors.length >= 1) total += 2; // Motor A connections
        if (motors.length >= 2) total += 2; // Motor B connections
        return total;
    }

    /**
     * Get checklist data for UI display
     */
    getChecklist() {
        const { battery, pi, controller, motors } = this.findComponents();
        const items = [
            { label: 'Battery (+) \u2192 Pi (5V)', connected: this.connections[0] },
            { label: 'Battery (-) \u2192 Pi (GND)', connected: this.connections[1] },
            { label: 'Battery (+) \u2192 Controller (VCC)', connected: this.connections[2] },
            { label: 'Battery (-) \u2192 Controller (GND)', connected: this.connections[3] },
            { label: 'Pi (GPIO A) \u2192 Controller (IN_A)', connected: this.connections[4] },
            { label: 'Pi (GPIO B) \u2192 Controller (IN_B)', connected: this.connections[5] }
        ];

        if (motors.length >= 1) {
            items.push({ label: 'Controller (A1) \u2192 Motor A (1)', connected: this.connections[6] });
            items.push({ label: 'Controller (A2) \u2192 Motor A (2)', connected: this.connections[7] });
        }
        if (motors.length >= 2) {
            items.push({ label: 'Controller (B1) \u2192 Motor B (1)', connected: this.connections[8] });
            items.push({ label: 'Controller (B2) \u2192 Motor B (2)', connected: this.connections[9] });
        }

        return items;
    }

    /**
     * Check GPIO-LED circuits (GPIO → Resistor → LED → GND or GPIO → LED → Resistor → GND)
     * Sets LED current/brightness directly when a valid path is found
     */
    _checkGPIOCircuits() {
        const { pi } = this.findComponents();
        if (!pi || !pi.poweredOn) return;

        const isRunning = window.circuitSimulator && window.circuitSimulator.running;

        // Find all LEDs on canvas to reset GPIO-driven state
        const leds = this.canvas.components.filter(c => c.type === 'led');

        // Reset LEDs that were previously driven by GPIO (only GPIO-driven ones)
        for (const led of leds) {
            if (led._gpioDriven) {
                led._gpioDriven = false;
                led.current = 0;
                led.isOn = false;
                led.brightness = 0;
            }
        }

        if (!isRunning) return;

        // Check each GPIO
        const gpios = [
            { terminal: 'GPIO_A', active: pi.gpioA },
            { terminal: 'GPIO_B', active: pi.gpioB }
        ];

        for (const gpio of gpios) {
            if (!gpio.active) continue;

            // Trace from GPIO terminal to find Resistor+LED path back to Pi GND
            const firstHop = this._findWireEnd(pi, gpio.terminal);
            if (!firstHop) continue;

            // Path option 1: GPIO → Resistor → LED → GND
            if (firstHop.component.type === 'resistor') {
                const resistor = firstHop.component;
                const otherResTerminal = this._getOtherTerminal(resistor, firstHop.terminal);
                const secondHop = this._findWireEnd(resistor, otherResTerminal);
                if (secondHop && secondHop.component.type === 'led' && secondHop.terminal === 'anode') {
                    const led = secondHop.component;
                    const thirdHop = this._findWireEnd(led, 'cathode');
                    if (thirdHop && thirdHop.component === pi && thirdHop.terminal === 'GND') {
                        this._activateGPIOLED(led, resistor.resistance);
                    }
                }
            }

            // Path option 2: GPIO → LED → Resistor → GND
            if (firstHop.component.type === 'led' && firstHop.terminal === 'anode') {
                const led = firstHop.component;
                const secondHop = this._findWireEnd(led, 'cathode');
                if (secondHop && secondHop.component.type === 'resistor') {
                    const resistor = secondHop.component;
                    const otherResTerminal = this._getOtherTerminal(resistor, secondHop.terminal);
                    const thirdHop = this._findWireEnd(resistor, otherResTerminal);
                    if (thirdHop && thirdHop.component === pi && thirdHop.terminal === 'GND') {
                        this._activateGPIOLED(led, resistor.resistance);
                    }
                }
            }
        }
    }

    /**
     * Activate a GPIO-driven LED with calculated current
     */
    _activateGPIOLED(led, resistance) {
        if (led.damaged) return;

        const gpioVoltage = 3.3; // Pi GPIO output voltage
        const voltageDrop = gpioVoltage - led.forwardVoltage;
        if (voltageDrop <= 0) return;

        const current = voltageDrop / resistance;
        led.current = current;
        led.isOn = true;
        led.brightness = Math.min(current / led.maxCurrent, 1);
        led._gpioDriven = true;

        // Check if LED would burn out
        if (current > led.burnoutCurrent && !led.damaged) {
            led.damaged = true;
            if (window.circuitCanvas && window.circuitCanvas.visualEffects) {
                window.circuitCanvas.visualEffects.createSmoke(led.x, led.y, '#888');
                window.circuitCanvas.visualEffects.createSparks(led.x, led.y, 10);
            }
        }
    }

    /**
     * Find what component/terminal is connected to a given component's terminal via a wire
     */
    _findWireEnd(component, terminal) {
        for (const wire of this.canvas.wires) {
            if (wire.fromComponent === component && wire.fromTerminal === terminal) {
                return { component: wire.toComponent, terminal: wire.toTerminal };
            }
            if (wire.toComponent === component && wire.toTerminal === terminal) {
                return { component: wire.fromComponent, terminal: wire.fromTerminal };
            }
        }
        return null;
    }

    /**
     * Get the other terminal of a 2-terminal component (resistor)
     */
    _getOtherTerminal(component, terminal) {
        if (component.terminals.length !== 2) return null;
        return component.terminals[0].id === terminal
            ? component.terminals[1].id
            : component.terminals[0].id;
    }

    /**
     * Force re-validation on next call
     */
    invalidate() {
        this.lastWireCount = -1;
        this._lastCompCount = -1;
    }
}
