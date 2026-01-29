/**
 * Component - Base class for all circuit components
 */
class Component {
    constructor(type, x, y) {
        this.id = 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 60;
        this.rotation = 0; // Rotation in degrees
        this.selected = false;
        this.hovered = false;

        // Connection points (terminals)
        this.terminals = [];

        // Electrical properties
        this.voltage = 0;
        this.current = 0;
        this.resistance = 0;

        // Visual properties
        this.color = '#667eea';
        this.damaged = false;
        this.temperature = 0; // For visual effects
    }

    /**
     * Update component state
     */
    update(deltaTime) {
        // Override in subclasses
        // Cool down temperature
        if (this.temperature > 0) {
            this.temperature -= deltaTime * 0.5;
            if (this.temperature < 0) this.temperature = 0;
        }
    }

    /**
     * Draw the component on canvas
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Selection highlight
        if (this.selected) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.strokeRect(-this.width/2 - 5, -this.height/2 - 5, this.width + 10, this.height + 10);
        }

        // Hover highlight
        if (this.hovered && !this.selected) {
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.width/2 - 3, -this.height/2 - 3, this.width + 6, this.height + 6);
        }

        // Damage indicator
        if (this.damaged) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        }

        // Temperature glow
        if (this.temperature > 0) {
            const intensity = Math.min(this.temperature / 100, 1);
            ctx.shadowColor = `rgba(239, 68, 68, ${intensity})`;
            ctx.shadowBlur = 20 * intensity;
        }

        ctx.restore();
    }

    /**
     * Check if point is inside component bounds
     */
    containsPoint(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.abs(dx) < this.width/2 && Math.abs(dy) < this.height/2;
    }

    /**
     * Get terminal position in world coordinates
     */
    getTerminalPosition(terminalId) {
        const terminal = this.terminals.find(t => t.id === terminalId);
        if (!terminal) return null;

        // Rotate terminal position
        const angle = (this.rotation * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const rotatedX = terminal.x * cos - terminal.y * sin;
        const rotatedY = terminal.x * sin + terminal.y * cos;

        return {
            x: this.x + rotatedX,
            y: this.y + rotatedY
        };
    }

    /**
     * Get closest terminal to a point
     */
    getClosestTerminal(x, y, maxDistance = 20) {
        let closest = null;
        let minDist = maxDistance;

        for (const terminal of this.terminals) {
            const pos = this.getTerminalPosition(terminal.id);
            const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);

            if (dist < minDist) {
                minDist = dist;
                closest = terminal;
            }
        }

        return closest;
    }

    /**
     * Serialize component to JSON
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            rotation: this.rotation
        };
    }

    /**
     * Restore component from JSON
     */
    fromJSON(data) {
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation || 0;
    }

    /**
     * Get component properties for display
     */
    getProperties() {
        return {
            'Type': this.type,
            'Voltage': this.voltage.toFixed(2) + 'V',
            'Current': (this.current * 1000).toFixed(1) + 'mA'
        };
    }

    /**
     * Clone the component
     */
    clone() {
        const clone = new this.constructor();
        clone.x = this.x + 20;
        clone.y = this.y + 20;
        clone.rotation = this.rotation;
        return clone;
    }

    /**
     * Reset electrical state
     */
    reset() {
        this.voltage = 0;
        this.current = 0;
        this.damaged = false;
        this.temperature = 0;
    }
}
