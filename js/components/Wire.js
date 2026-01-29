/**
 * Wire - Connects components together with smooth Bezier curves
 */
class Wire {
    constructor(fromComponent, fromTerminal, toComponent, toTerminal, waypoints = []) {
        this.id = 'wire_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Connection endpoints
        this.fromComponent = fromComponent;
        this.fromTerminal = fromTerminal;
        this.toComponent = toComponent;
        this.toTerminal = toTerminal;

        // Wire routing waypoints (array of {x, y} points)
        this.waypoints = waypoints || [];

        // Electrical properties
        this.current = 0;
        this.resistance = 0.01; // Very low resistance

        // Visual properties
        this.color = this.determineColor();
        this.selected = false;
        this.hovered = false;

        // Current flow particles
        this.particles = [];

        // Cached curve points for hit testing and particles
        this._curveCache = null;
        this._curveCacheKey = '';
    }

    /**
     * Determine wire color based on connected terminals
     * Power positive = red, ground = dark, signal = blue, motor = orange
     */
    determineColor() {
        const fromType = this.fromComponent ? this.fromComponent.type : '';
        const toType = this.toComponent ? this.toComponent.type : '';
        const fromTerm = this.fromTerminal || '';
        const toTerm = this.toTerminal || '';

        const roboticsTypes = ['batteryPackAA', 'raspberryPi', 'motorController', 'dcMotor'];
        const isRobotics = roboticsTypes.includes(fromType) || roboticsTypes.includes(toType);

        if (!isRobotics) return '#95a5a6'; // Default gray for normal circuits

        // Power positive: connects to positive, VCC, or 5V_IN
        const positiveTerminals = ['positive', 'VCC', '5V_IN'];
        if (positiveTerminals.includes(fromTerm) || positiveTerminals.includes(toTerm)) {
            return '#e74c3c'; // Red
        }

        // Ground: connects to negative or GND
        const groundTerminals = ['negative', 'GND'];
        if (groundTerminals.includes(fromTerm) || groundTerminals.includes(toTerm)) {
            return '#1abc9c'; // Teal (distinct from power red)
        }

        // Signal: GPIO to IN (control signals)
        const signalTerminals = ['GPIO_A', 'GPIO_B', 'IN_A', 'IN_B'];
        if (signalTerminals.includes(fromTerm) || signalTerminals.includes(toTerm)) {
            return '#3498db'; // Blue
        }

        // Motor: OUT to motor terminals
        const motorTerminals = ['OUT_A1', 'OUT_A2', 'OUT_B1', 'OUT_B2', 'terminal_1', 'terminal_2'];
        if (motorTerminals.includes(fromTerm) || motorTerminals.includes(toTerm)) {
            return '#e67e22'; // Orange
        }

        return '#95a5a6'; // Fallback gray
    }

    /**
     * Get start and end positions
     */
    getPositions() {
        const fromPos = this.fromComponent.getTerminalPosition(this.fromTerminal);
        const toPos = this.toComponent.getTerminalPosition(this.toTerminal);
        return { from: fromPos, to: toPos };
    }

    /**
     * Get the exit direction for a terminal based on its local position on the component
     * Returns a unit vector pointing away from the component
     */
    getTerminalDirection(component, terminalId) {
        const terminal = component.terminals.find(t => t.id === terminalId);
        if (!terminal) return { x: 0, y: -1 };

        const tx = terminal.x;
        const ty = terminal.y;

        // Use the terminal's local position as direction (points away from center)
        const mag = Math.sqrt(tx * tx + ty * ty);
        if (mag < 1) return { x: 0, y: -1 };

        // Normalize
        let dx = tx / mag;
        let dy = ty / mag;

        // Apply component rotation
        const angle = (component.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;

        return { x: rx, y: ry };
    }

    /**
     * Get Bezier control points for smooth wire routing
     */
    getControlPoints() {
        const { from, to } = this.getPositions();
        if (!from || !to) return null;

        const fromDir = this.getTerminalDirection(this.fromComponent, this.fromTerminal);
        const toDir = this.getTerminalDirection(this.toComponent, this.toTerminal);

        // Control point distance scales with wire length
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const controlDist = Math.min(Math.max(dist * 0.4, 40), 150);

        const cp1 = {
            x: from.x + fromDir.x * controlDist,
            y: from.y + fromDir.y * controlDist
        };
        const cp2 = {
            x: to.x + toDir.x * controlDist,
            y: to.y + toDir.y * controlDist
        };

        return { from, to, cp1, cp2 };
    }

    /**
     * Sample points along the Bezier curve for hit testing and particles
     * Uses caching to avoid recalculating every frame
     */
    getCurvePoints(numSamples = 24) {
        const { from, to } = this.getPositions();
        if (!from || !to) return [];

        // Cache key based on endpoint positions
        const key = `${from.x},${from.y},${to.x},${to.y},${this.fromComponent.rotation},${this.toComponent.rotation}`;
        if (this._curveCacheKey === key && this._curveCache) {
            return this._curveCache;
        }

        // If waypoints exist, use straight segments
        if (this.waypoints.length > 0) {
            this._curveCache = [from, ...this.waypoints, to];
            this._curveCacheKey = key;
            return this._curveCache;
        }

        const ctrl = this.getControlPoints();
        if (!ctrl) return [from, to];

        const points = [];
        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            points.push(this._bezierPoint(ctrl.from, ctrl.cp1, ctrl.cp2, ctrl.to, t));
        }

        this._curveCache = points;
        this._curveCacheKey = key;
        return points;
    }

    /**
     * Calculate a point on a cubic Bezier curve
     */
    _bezierPoint(p0, p1, p2, p3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        return {
            x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
            y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
        };
    }

    /**
     * Check if point is near wire
     */
    containsPoint(x, y, threshold = 5) {
        const points = this.getCurvePoints();
        if (points.length < 2) return false;

        for (let i = 0; i < points.length - 1; i++) {
            const segStart = points[i];
            const segEnd = points[i + 1];

            const sdx = segEnd.x - segStart.x;
            const sdy = segEnd.y - segStart.y;
            const lengthSq = sdx * sdx + sdy * sdy;

            if (lengthSq === 0) {
                const dist = Math.sqrt((x - segStart.x) ** 2 + (y - segStart.y) ** 2);
                if (dist <= threshold) return true;
                continue;
            }

            let t = ((x - segStart.x) * sdx + (y - segStart.y) * sdy) / lengthSq;
            t = Math.max(0, Math.min(1, t));

            const projX = segStart.x + t * sdx;
            const projY = segStart.y + t * sdy;

            const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
            if (dist <= threshold) return true;
        }

        return false;
    }

    /**
     * Update wire state and particles
     */
    update(deltaTime) {
        // Invalidate curve cache when components move
        this._curveCacheKey = '';

        if (Math.abs(this.current) > 0.001) {
            const wireLength = this.getWireLength();
            const baseSpeed = Math.abs(this.current) * 50;
            const normalizedSpeed = baseSpeed / Math.max(wireLength / 100, 0.5);

            if (this.particles.length === 0) {
                const particleDensity = 80;
                const particleCount = Math.max(2, Math.ceil(wireLength / particleDensity));

                for (let i = 0; i < particleCount; i++) {
                    this.particles.push({
                        position: (i + 0.5) / particleCount,
                        speed: normalizedSpeed
                    });
                }
            }

            for (const particle of this.particles) {
                particle.position += particle.speed * deltaTime;
                if (particle.position > 1) {
                    particle.position = particle.position % 1;
                }
            }
        } else {
            this.particles = [];
        }
    }

    /**
     * Calculate total wire length (approximated from curve samples)
     */
    getWireLength() {
        const points = this.getCurvePoints();
        if (points.length < 2) return 100;

        let totalLength = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }

        return totalLength;
    }

    /**
     * Draw the wire path (Bezier curve or waypoint segments)
     */
    _drawPath(ctx) {
        const { from, to } = this.getPositions();
        if (!from || !to) return;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);

        if (this.waypoints.length > 0) {
            // Straight segments through waypoints
            for (const waypoint of this.waypoints) {
                ctx.lineTo(waypoint.x, waypoint.y);
            }
            ctx.lineTo(to.x, to.y);
        } else {
            // Smooth Bezier curve
            const ctrl = this.getControlPoints();
            if (ctrl) {
                ctx.bezierCurveTo(ctrl.cp1.x, ctrl.cp1.y, ctrl.cp2.x, ctrl.cp2.y, to.x, to.y);
            } else {
                ctx.lineTo(to.x, to.y);
            }
        }
    }

    /**
     * Draw the wire
     */
    draw(ctx) {
        const { from, to } = this.getPositions();
        if (!from || !to) return;

        ctx.save();

        // Selection highlight
        if (this.selected) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            this._drawPath(ctx);
            ctx.stroke();
        }

        // Hover highlight
        if (this.hovered && !this.selected) {
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            this._drawPath(ctx);
            ctx.stroke();
        }

        // Wire color based on current
        let wireColor = this.color;
        let wireWidth = 3;

        if (Math.abs(this.current) > 0.001) {
            const intensity = Math.min(Math.abs(this.current) / 0.1, 1);
            const r = Math.floor(255 * intensity);
            const g = Math.floor(149 * (1 - intensity * 0.5));
            const b = Math.floor(100 * (1 - intensity));
            wireColor = `rgb(${r}, ${g}, ${b})`;
            wireWidth = 3 + intensity * 2;
        }

        // Draw wire
        ctx.strokeStyle = wireColor;
        ctx.lineWidth = wireWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this._drawPath(ctx);
        ctx.stroke();

        // Draw waypoint handles when selected
        if (this.selected && this.waypoints.length > 0) {
            ctx.fillStyle = '#fbbf24';
            for (const waypoint of this.waypoints) {
                ctx.beginPath();
                ctx.arc(waypoint.x, waypoint.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw current flow particles
        if (this.particles.length > 0) {
            ctx.fillStyle = '#fbbf24';
            const curvePoints = this.getCurvePoints();

            for (const particle of this.particles) {
                const pos = this.getPositionAlongPath(curvePoints, particle.position);
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /**
     * Get position along a multi-segment path
     * @param {Array} points - Array of {x, y} points forming the path
     * @param {number} t - Position along path (0 to 1)
     * @returns {Object} {x, y} position
     */
    getPositionAlongPath(points, t) {
        if (points.length < 2) return points[0] || { x: 0, y: 0 };

        let totalLength = 0;
        const segmentLengths = [];

        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const length = Math.sqrt(dx * dx + dy * dy);
            segmentLengths.push(length);
            totalLength += length;
        }

        const targetDistance = t * totalLength;
        let accumulatedDistance = 0;

        for (let i = 0; i < segmentLengths.length; i++) {
            const segmentLength = segmentLengths[i];

            if (accumulatedDistance + segmentLength >= targetDistance) {
                const segmentT = segmentLength > 0
                    ? (targetDistance - accumulatedDistance) / segmentLength
                    : 0;

                return {
                    x: points[i].x + (points[i + 1].x - points[i].x) * segmentT,
                    y: points[i].y + (points[i + 1].y - points[i].y) * segmentT
                };
            }

            accumulatedDistance += segmentLength;
        }

        return points[points.length - 1];
    }

    /**
     * Get properties for display
     */
    getProperties() {
        return {
            'Type': 'Wire',
            'From': this.fromComponent.type + ' (' + this.fromTerminal + ')',
            'To': this.toComponent.type + ' (' + this.toTerminal + ')',
            'Current': (this.current * 1000).toFixed(1) + 'mA',
            'Resistance': this.resistance + 'Ω'
        };
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            id: this.id,
            from: {
                componentId: this.fromComponent.id,
                terminal: this.fromTerminal
            },
            to: {
                componentId: this.toComponent.id,
                terminal: this.toTerminal
            },
            waypoints: this.waypoints
        };
    }

    /**
     * Get connected components
     */
    getComponents() {
        return [this.fromComponent, this.toComponent];
    }

    /**
     * Get other component connected to this wire
     */
    getOtherComponent(component) {
        if (this.fromComponent === component) {
            return this.toComponent;
        } else if (this.toComponent === component) {
            return this.fromComponent;
        }
        return null;
    }

    /**
     * Check if wire connects to a specific component
     */
    connectsTo(component) {
        return this.fromComponent === component || this.toComponent === component;
    }
}
