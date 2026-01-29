/**
 * Switch - Controls circuit open/closed state
 */
class Switch extends Component {
    constructor(x = 0, y = 0) {
        super('switch', x, y);
        this.width = 60;
        this.height = 40;

        // Switch state
        this.closed = false; // Open by default
        this.resistance = this.closed ? 0.1 : 1e9; // Very low when closed, very high when open

        // Terminals: left and right
        this.terminals = [
            { id: 'left', x: -30, y: 0 },
            { id: 'right', x: 30, y: 0 }
        ];
    }

    /**
     * Toggle switch state
     */
    toggle() {
        this.closed = !this.closed;
        this.resistance = this.closed ? 0.1 : 1e9;
    }

    /**
     * Draw the switch
     */
    draw(ctx) {
        // Draw base highlighting first
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Switch base
        ctx.fillStyle = '#34495e';
        ctx.fillRect(-25, -8, 50, 16);

        // Wire leads
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-25, 0);
        ctx.moveTo(30, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();

        // Terminal connection points
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(-30, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(30, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Switch lever
        ctx.strokeStyle = this.closed ? '#2ecc71' : '#e74c3c';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-15, 0);

        if (this.closed) {
            // Horizontal when closed
            ctx.lineTo(15, 0);
        } else {
            // Angled up when open
            ctx.lineTo(15, -12);
        }
        ctx.stroke();

        // Pivot point
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath();
        ctx.arc(-15, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Status label
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.closed ? 'CLOSED' : 'OPEN', 0, 12);

        // Current indicator when closed and conducting
        if (this.closed && this.current > 0.001) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(15, 0);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Get properties for display
     */
    getProperties() {
        return {
            'Type': 'Switch',
            'State': this.closed ? '🟢 Closed' : '🔴 Open',
            'Rotation': this.rotation + '°',
            'Resistance': this.closed ? '~0Ω' : '∞Ω',
            'Current': this.closed ? (this.current * 1000).toFixed(1) + 'mA' : '0mA',
            'Action': 'Click to ' + (this.closed ? 'open' : 'close')
        };
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        const data = super.toJSON();
        data.closed = this.closed;
        return data;
    }

    /**
     * Restore from JSON
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.closed = data.closed || false;
        this.resistance = this.closed ? 0.1 : 1e9;
    }
}
