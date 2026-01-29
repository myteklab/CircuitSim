/**
 * CircuitSimulator - Calculates voltages, currents, and simulates circuit behavior
 */
class CircuitSimulator {
    constructor(components, wires) {
        this.components = components;
        this.wires = wires;
        this.pathFinder = new PathFinder(components, wires);
        this.running = false;
    }

    /**
     * Update components and wires references
     */
    update(components, wires) {
        this.components = components;
        this.wires = wires;
        this.pathFinder = new PathFinder(components, wires);
    }

    /**
     * Start simulation
     */
    start() {
        this.running = true;
    }

    /**
     * Stop simulation
     */
    stop() {
        this.running = false;
        this.resetAllComponents();
    }

    /**
     * Toggle simulation
     */
    toggle() {
        if (this.running) {
            this.stop();
        } else {
            this.start();
        }
        return this.running;
    }

    /**
     * Reset all components to default electrical state
     * (but preserve damage state - damaged components stay damaged)
     */
    resetAllComponents() {
        for (const component of this.components) {
            const wasDamaged = component.damaged;
            component.reset();
            // Preserve damage state
            if (wasDamaged) {
                component.damaged = true;
            }
        }
        for (const wire of this.wires) {
            wire.current = 0;
        }
    }

    /**
     * Run simulation step
     */
    simulate() {
        if (!this.running) {
            this.resetAllComponents();
            return;
        }

        // Reset all electrical values
        this.resetAllComponents();

        // Find all complete paths from batteries to ground
        const paths = this.pathFinder.findAllPaths();

        if (paths.length === 0) {
            // No complete circuit
            return;
        }

        // Simulate each path
        for (const path of paths) {
            this.simulatePath(path);
        }
    }

    /**
     * Simulate a single path through the circuit
     */
    simulatePath(path) {
        const components = path.components;
        const wires = path.wires;

        // Find battery in this path
        const battery = components.find(c => c.type === 'battery');
        if (!battery) return;

        // Calculate total resistance in series path
        let totalResistance = 0;

        for (const component of components) {
            if (component.type === 'battery' || component.type === 'ground') {
                continue; // Skip battery and ground
            }

            if (component.type === 'led') {
                // LED has forward voltage drop - treat as resistance equivalent
                // Simplified model: LED acts like resistor
                totalResistance += component.forwardVoltage / 0.020; // Assume 20mA nominal
            } else if (component.type === 'diode') {
                // Diode: Use forward voltage drop like LED when conducting
                // Check if diode should conduct (simplified: assume forward bias if in path)
                totalResistance += component.forwardVoltage / 0.050; // Assume 50mA nominal for diode
            } else if (component.resistance !== undefined) {
                totalResistance += component.resistance;
            }
        }

        // Add wire resistance
        for (const wire of wires) {
            totalResistance += wire.resistance;
        }

        // Prevent division by zero
        if (totalResistance < 0.01) {
            totalResistance = 0.01; // Minimum resistance (short circuit)
        }

        // Calculate current using Ohm's law: I = V / R
        const current = battery.voltage / totalResistance;

        // Update current for all components and wires in path
        for (const component of components) {
            component.current = current;
        }

        for (const wire of wires) {
            wire.current = current;
        }

        // Store path data for Ohm's Law display
        this.lastPathData = {
            voltage: battery.voltage,
            current: current,
            resistance: totalResistance,
            power: battery.voltage * current
        };

        // Calculate voltage drops
        let remainingVoltage = battery.voltage;

        for (let i = 1; i < components.length; i++) {
            const component = components[i];

            // Skip battery - it's a voltage source, not a voltage drop
            if (component.type === 'battery') {
                continue;
            }

            if (component.type === 'ground') {
                component.voltage = 0; // Ground is reference
                continue;
            }

            // Calculate voltage drop: V = I * R
            let voltageDrop = 0;

            if (component.type === 'led') {
                // LED has fixed forward voltage when conducting
                voltageDrop = component.forwardVoltage;
            } else if (component.type === 'diode') {
                // Diode has fixed forward voltage when conducting
                voltageDrop = component.forwardVoltage;
            } else if (component.resistance !== undefined) {
                voltageDrop = current * component.resistance;
            }

            component.voltage = voltageDrop;
            remainingVoltage -= voltageDrop;
        }

        // Update battery current output
        battery.current = current;

        // Check component limits and damage
        this.checkComponentLimits(components);
    }

    /**
     * Check if any components exceed their limits
     */
    checkComponentLimits(components) {
        for (const component of components) {
            // Check LED current limits
            if (component.type === 'led') {
                if (component.current > component.burnoutCurrent && !component.damaged) {
                    // Trigger visual effects
                    if (window.circuitCanvas && window.circuitCanvas.visualEffects) {
                        window.circuitCanvas.visualEffects.createExplosion(component.x, component.y);
                        window.circuitCanvas.visualEffects.createSparks(component.x, component.y, 20);
                        window.circuitCanvas.visualEffects.createSmoke(component.x, component.y, '#555');
                    }

                    component.damaged = true;
                    component.isOn = false;
                }
            }

            // Check diode current limits
            if (component.type === 'diode') {
                if (component.current > component.burnoutCurrent && !component.damaged) {
                    // Trigger visual effects
                    if (window.circuitCanvas && window.circuitCanvas.visualEffects) {
                        window.circuitCanvas.visualEffects.createExplosion(component.x, component.y);
                        window.circuitCanvas.visualEffects.createSparks(component.x, component.y, 15);
                        window.circuitCanvas.visualEffects.createSmoke(component.x, component.y, '#666');
                    }

                    component.damaged = true;
                }
            }

            // Check resistor power limits
            if (component.type === 'resistor') {
                const power = component.current * component.current * component.resistance;
                if (power > component.burnoutPower && !component.damaged) {
                    // Trigger visual effects
                    if (window.circuitCanvas && window.circuitCanvas.visualEffects) {
                        window.circuitCanvas.visualEffects.createSmoke(component.x, component.y, '#888');
                        window.circuitCanvas.visualEffects.createSparks(component.x, component.y, 10);
                    }

                    component.damaged = true;
                }
            }
        }
    }

    /**
     * Get simulation statistics
     */
    getStats() {
        const paths = this.pathFinder.findAllPaths();
        const activeComponents = this.pathFinder.getActiveComponents();
        const batteries = this.pathFinder.findBatteries();

        let totalPower = 0;
        for (const battery of batteries) {
            totalPower += battery.voltage * battery.current;
        }

        return {
            isComplete: paths.length > 0,
            pathCount: paths.length,
            activeComponents: activeComponents.length,
            totalComponents: this.components.length,
            totalPower: totalPower.toFixed(3) + 'W',
            running: this.running
        };
    }

    /**
     * Detect potential problems
     */
    detectProblems() {
        const problems = [];

        // Check for short circuits (very high current)
        const batteries = this.pathFinder.findBatteries();
        for (const battery of batteries) {
            if (battery.current > 1.0) { // More than 1A
                problems.push({
                    type: 'warning',
                    message: 'High current detected! Battery may overheat.',
                    component: battery
                });
            }
        }

        // Check for damaged components
        for (const component of this.components) {
            if (component.damaged) {
                problems.push({
                    type: 'error',
                    message: `${component.type} is damaged and not functioning.`,
                    component: component
                });
            }
        }

        // Check for incomplete circuits
        const paths = this.pathFinder.findAllPaths();
        if (paths.length === 0 && this.pathFinder.findBatteries().length > 0) {
            problems.push({
                type: 'info',
                message: 'Circuit is not complete. Connect battery to ground.',
                component: null
            });
        }

        return problems;
    }

    /**
     * Get circuit analysis report
     */
    analyzeCircuit() {
        const stats = this.getStats();
        const problems = this.detectProblems();
        const paths = this.pathFinder.findAllPaths();

        return {
            stats,
            problems,
            pathCount: paths.length,
            paths: paths.map((path, index) => ({
                id: index,
                componentCount: path.components.length,
                components: path.components.map(c => c.type),
                totalResistance: this.calculatePathResistance(path)
            }))
        };
    }

    /**
     * Calculate total resistance in a path
     */
    calculatePathResistance(path) {
        let total = 0;
        for (const component of path.components) {
            if (component.resistance) {
                total += component.resistance;
            }
        }
        return total.toFixed(2) + 'Ω';
    }
}
