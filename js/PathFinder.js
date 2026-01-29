/**
 * PathFinder - Analyzes circuit topology and finds electrical paths
 */
class PathFinder {
    constructor(components, wires) {
        this.components = components;
        this.wires = wires;
        this.lastLoggedPathCount = -1; // For console spam prevention
    }

    /**
     * Find all batteries in the circuit
     */
    findBatteries() {
        return this.components.filter(c => c.type === 'battery');
    }

    /**
     * Find all grounds in the circuit
     */
    findGrounds() {
        return this.components.filter(c => c.type === 'ground');
    }

    /**
     * Get all wires connected to a component
     */
    getConnectedWires(component) {
        return this.wires.filter(wire => wire.connectsTo(component));
    }

    /**
     * Get adjacent components (directly connected via wires)
     */
    getAdjacentComponents(component) {
        const adjacent = [];
        const connectedWires = this.getConnectedWires(component);

        for (const wire of connectedWires) {
            const other = wire.getOtherComponent(component);
            if (other) {
                adjacent.push({ component: other, wire });
            }
        }

        return adjacent;
    }

    /**
     * Find all complete paths from batteries to ground using DFS
     */
    findAllPaths() {
        const batteries = this.findBatteries();
        const grounds = this.findGrounds();
        const allPaths = [];

        // For each battery
        for (const battery of batteries) {
            // Find paths from battery positive terminal to ground OR back to battery negative terminal
            const validEndpoints = [...grounds, battery]; // Include battery itself as endpoint (loop circuit)
            const paths = this.findPathsDFS(battery, validEndpoints, new Set());
            allPaths.push(...paths);
        }

        return allPaths;
    }

    /**
     * Depth-first search to find paths from start to any end component
     */
    findPathsDFS(start, endComponents, visited) {
        const paths = [];
        const stack = [{ component: start, path: [start], wires: [] }];

        while (stack.length > 0) {
            const { component, path, wires } = stack.pop();

            // Check if we reached an endpoint (ground OR completed loop back to battery)
            if (endComponents.includes(component) && path.length > 1) {
                // Valid path found - but check if any diodes are reverse-biased in this path
                const hasReverseDiode = this.checkDiodeDirectionInPath(path, wires);

                if (hasReverseDiode) {
                    continue; // Skip this path - diode is reversed
                }

                paths.push({ components: [...path], wires: [...wires] });
                continue;
            }

            // Mark as visited
            visited.add(component);

            // Explore adjacent components
            const adjacent = this.getAdjacentComponents(component);

            for (const { component: nextComp, wire } of adjacent) {
                // Skip if wire already used in this path (prevents traversing same wire twice)
                if (wires.includes(wire)) continue;

                // Special case: Allow returning to battery to complete the loop
                const isCompletingLoop = (nextComp === start && path.length > 1);

                // Skip if already in current path (avoid cycles), UNLESS completing a loop to battery
                if (path.includes(nextComp) && !isCompletingLoop) continue;

                // Skip if switch is open
                if (nextComp.type === 'switch' && !nextComp.closed) continue;

                // Skip if component is damaged (breaks the circuit)
                if (nextComp.damaged) continue;

                // Also skip the current component if it just got damaged
                if (component.damaged) continue;

                // NOTE: Diode polarity checking removed from here
                // Now handled by checkDiodeDirectionInPath() when path is complete
                // This is because terminal connections don't change when components rotate

                // Add to stack for exploration
                stack.push({
                    component: nextComp,
                    path: [...path, nextComp],
                    wires: [...wires, wire]
                });
            }
        }

        return paths;
    }

    /**
     * Detect if components are in series or parallel
     * Series: Same current flows through all
     * Parallel: Same voltage across all
     */
    analyzeCircuitTopology(path) {
        // Simple analysis: if there's only one path between two points, it's series
        // If there are multiple paths, components are in parallel

        const pathInfo = {
            type: 'series', // Default to series
            components: path.components,
            wires: path.wires
        };

        // Calculate total resistance
        let totalResistance = 0;
        for (const component of path.components) {
            if (component.resistance) {
                totalResistance += component.resistance;
            }
        }

        pathInfo.totalResistance = totalResistance;
        return pathInfo;
    }

    /**
     * Check if circuit is complete (has at least one path from battery to ground)
     */
    isCircuitComplete() {
        const paths = this.findAllPaths();
        return paths.length > 0;
    }

    /**
     * Get all components in active circuits
     */
    getActiveComponents() {
        const paths = this.findAllPaths();
        const activeComponents = new Set();

        for (const path of paths) {
            for (const component of path.components) {
                activeComponents.add(component);
            }
        }

        return Array.from(activeComponents);
    }

    /**
     * Get all wires in active circuits
     */
    getActiveWires() {
        const paths = this.findAllPaths();
        const activeWires = new Set();

        for (const path of paths) {
            for (const wire of path.wires) {
                activeWires.add(wire);
            }
        }

        return Array.from(activeWires);
    }

    /**
     * Build a graph representation of the circuit
     */
    buildGraph() {
        const graph = new Map();

        // Initialize vertices
        for (const component of this.components) {
            graph.set(component, []);
        }

        // Add edges (wires)
        for (const wire of this.wires) {
            const from = wire.fromComponent;
            const to = wire.toComponent;

            graph.get(from).push({ component: to, wire });
            graph.get(to).push({ component: from, wire });
        }

        return graph;
    }

    /**
     * Check if any diodes in the path are reverse-biased
     * Uses the SAME logic as circuit insights detection
     */
    checkDiodeDirectionInPath(path, wires) {
        // For each diode in the path, check actual wire connections
        for (const component of path) {
            if (component.type !== 'diode') continue;

            // Check all wires connected to this diode
            const connectedWires = wires.filter(w =>
                w.fromComponent === component || w.toComponent === component
            );

            // Look for ANY wire that connects to the cathode from outside
            // This means current is trying to ENTER through cathode = reverse bias
            for (const wire of connectedWires) {
                let currentEnteringCathode = false;

                if (wire.toComponent === component && wire.toTerminal === 'cathode') {
                    // Wire goes TO diode's cathode - current tries to enter cathode
                    currentEnteringCathode = true;
                } else if (wire.fromComponent === component && wire.fromTerminal === 'cathode') {
                    // Wire FROM diode's cathode (but in path context, might be backwards)
                    // Skip - this is EXIT from cathode which is correct
                }

                if (currentEnteringCathode) {
                    return true; // Reverse-biased - current entering cathode!
                }
            }
        }

        return false; // All diodes correctly oriented
    }
}
