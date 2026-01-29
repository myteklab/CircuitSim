/**
 * Ground - Reference point for circuits (0V)
 */
class Ground extends Component {
    constructor(x = 0, y = 0) {
        super('ground', x, y);
        this.width = 50;
        this.height = 50;

        // Ground is always at 0V
        this.voltage = 0;

        // Single terminal at top
        this.terminals = [
            { id: 'top', x: 0, y: -20 }
        ];
    }

    /**
     * Draw the ground symbol
     */
    draw(ctx) {
        // Draw base highlighting first
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Wire lead
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // Ground symbol (three horizontal lines, decreasing in length)
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 3;
        ctx.lineCap = 'butt';

        // Top line (longest)
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();

        // Middle line
        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.lineTo(10, 6);
        ctx.stroke();

        // Bottom line (shortest)
        ctx.beginPath();
        ctx.moveTo(-5, 12);
        ctx.lineTo(5, 12);
        ctx.stroke();

        // Terminal connection point
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, -20, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('GND', 0, 18);

        // Current indicator if conducting
        if (this.current > 0.001) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(0, 0);
            ctx.stroke();

            // Animated arrows showing current flow into ground
            const time = Date.now() / 1000;
            for (let i = 0; i < 3; i++) {
                const offset = ((time * 20 + i * 5) % 20) - 20;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.moveTo(0, offset);
                ctx.lineTo(-3, offset - 4);
                ctx.lineTo(3, offset - 4);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /**
     * Get properties for display
     */
    getProperties() {
        return {
            'Type': 'Ground',
            'Voltage': '0V (Reference)',
            'Rotation': this.rotation + '°',
            'Current In': (this.current * 1000).toFixed(1) + 'mA',
            'Function': 'Completes circuit'
        };
    }
}
