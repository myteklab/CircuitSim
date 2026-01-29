/**
 * BatteryPackAA - 4xAA Battery Pack (6V fixed)
 * Robotics component for powering Pi and motor controller
 */
class BatteryPackAA extends Component {
    constructor(x = 0, y = 0) {
        super('batteryPackAA', x, y);
        this.width = 90;
        this.height = 50;

        // Fixed 6V output (4 x 1.5V AA batteries)
        this.voltage = 6;

        // Terminals
        this.terminals = [
            { id: 'positive', x: 45, y: 0, polarity: '+' },
            { id: 'negative', x: -45, y: 0, polarity: '-' }
        ];
    }

    /**
     * Draw the battery pack
     */
    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Battery pack body (dark gray casing)
        ctx.fillStyle = '#2d2d2d';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-40, -22, 80, 44, 4);
        ctx.fill();
        ctx.stroke();

        // Draw 4 AA cells inside
        const cellWidth = 16;
        const cellGap = 2;
        const startX = -35;
        for (let i = 0; i < 4; i++) {
            const cx = startX + i * (cellWidth + cellGap);

            // Cell body
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(cx, -14, cellWidth, 28);

            // Cell positive nub (top)
            ctx.fillStyle = '#888';
            ctx.fillRect(cx + 6, -16, 4, 3);

            // Cell label
            ctx.fillStyle = '#666';
            ctx.font = '7px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('AA', cx + cellWidth / 2, 0);
        }

        // Red wire stub (positive side)
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(38, 0);
        ctx.lineTo(45, 0);
        ctx.stroke();

        // Black wire stub (negative side)
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-38, 0);
        ctx.lineTo(-45, 0);
        ctx.stroke();

        // Voltage label
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('6V', 0, -22);

        // Terminal connection points
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(45, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-45, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // Polarity labels
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('+', 45, -10);
        ctx.fillStyle = '#3498db';
        ctx.fillText('-', -45, -10);

        ctx.restore();
    }

    /**
     * Get properties for display
     */
    getProperties() {
        return {
            'Type': '4xAA Battery Pack',
            'Voltage': '6V (4 x 1.5V)',
            'Rotation': this.rotation + '\u00B0'
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.current = 0;
        this.damaged = false;
        this.temperature = 0;
    }

    /**
     * Serialize
     */
    toJSON() {
        return super.toJSON();
    }

    /**
     * Deserialize
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.voltage = 6;
    }
}
