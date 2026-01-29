/**
 * MotorController - L298N-style motor driver
 * Robotics component that drives DC motors based on control signals
 */
class MotorController extends Component {
    constructor(x = 0, y = 0) {
        super('motorController', x, y);
        this.width = 120;
        this.height = 80;

        // Controller state
        this.powered = false;
        this.signalA = false;
        this.signalB = false;

        // Terminals
        this.terminals = [
            { id: 'VCC', x: -40, y: -40, polarity: '+' },
            { id: 'GND', x: 40, y: -40, polarity: '-' },
            { id: 'IN_A', x: -60, y: -15 },
            { id: 'IN_B', x: -60, y: 15 },
            { id: 'OUT_A1', x: 60, y: -30 },
            { id: 'OUT_A2', x: 60, y: -10 },
            { id: 'OUT_B1', x: 60, y: 10 },
            { id: 'OUT_B2', x: 60, y: 30 }
        ];
    }

    /**
     * Draw the motor controller
     */
    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // PCB body (blue)
        ctx.fillStyle = '#1a3a5c';
        ctx.strokeStyle = '#2a6a9e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-55, -35, 110, 70, 3);
        ctx.fill();
        ctx.stroke();

        // Heat sink ridges (center)
        ctx.fillStyle = '#2c2c2c';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(-15 + i * 7, -20, 5, 40);
        }
        // Heat sink border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(-17, -22, 37, 44);

        // Input terminal block (left side)
        ctx.fillStyle = '#1a8a1a';
        ctx.fillRect(-52, -22, 12, 10);
        ctx.fillRect(-52, 8, 12, 10);

        // Output terminal blocks (right side)
        ctx.fillStyle = '#1a8a1a';
        ctx.fillRect(40, -35, 12, 14);
        ctx.fillRect(40, -16, 12, 14);
        ctx.fillRect(40, 3, 12, 14);
        ctx.fillRect(40, 22, 12, 14);

        // Power terminal block (top)
        ctx.fillStyle = '#1a8a1a';
        ctx.fillRect(-46, -33, 12, 10);
        ctx.fillRect(34, -33, 12, 10);

        // Power LED
        const ledX = -35;
        const ledY = 25;
        if (this.powered) {
            const gradient = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, 6);
            gradient.addColorStop(0, 'rgba(39, 174, 96, 0.8)');
            gradient.addColorStop(1, 'rgba(39, 174, 96, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(ledX, ledY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2ecc71';
        } else {
            ctx.fillStyle = '#c0392b';
        }
        ctx.beginPath();
        ctx.arc(ledX, ledY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Signal A indicator
        const sigAX = -25;
        const sigAY = 25;
        ctx.fillStyle = this.signalA ? '#f39c12' : '#444';
        ctx.beginPath();
        ctx.arc(sigAX, sigAY, 2, 0, Math.PI * 2);
        ctx.fill();

        // Signal B indicator
        const sigBX = -15;
        const sigBY = 25;
        ctx.fillStyle = this.signalB ? '#f39c12' : '#444';
        ctx.beginPath();
        ctx.arc(sigBX, sigBY, 2, 0, Math.PI * 2);
        ctx.fill();

        // Labels
        ctx.fillStyle = '#aaa';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Power labels (above terminal dots)
        ctx.fillText('VCC', -40, -50);
        ctx.fillText('GND', 40, -50);

        // Input labels (left)
        ctx.textAlign = 'right';
        ctx.fillText('IN_A', -44, -15);
        ctx.fillText('IN_B', -44, 15);

        // Output labels (right)
        ctx.textAlign = 'left';
        ctx.fillText('A1', 44, -30);
        ctx.fillText('A2', 44, -10);
        ctx.fillText('B1', 44, 10);
        ctx.fillText('B2', 44, 30);

        // Component name
        ctx.fillStyle = this.powered ? '#4ade80' : '#666';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('L298N', 0, -28);

        // Terminal connection points
        ctx.fillStyle = '#fbbf24';
        for (const terminal of this.terminals) {
            ctx.beginPath();
            ctx.arc(terminal.x, terminal.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Get properties for display
     */
    getProperties() {
        return {
            'Type': 'Motor Controller (L298N)',
            'Power': this.powered ? 'ON' : 'OFF',
            'Signal A': this.signalA ? 'Active' : 'Inactive',
            'Signal B': this.signalB ? 'Active' : 'Inactive',
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
        // powered, signalA, signalB are managed by RobotWiringValidator, not reset here
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
        this.powered = false;
        this.signalA = false;
        this.signalB = false;
    }
}
