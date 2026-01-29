/**
 * DCMotor - Simple DC Motor
 * Robotics component that spins when properly wired
 */
class DCMotor extends Component {
    constructor(x = 0, y = 0) {
        super('dcMotor', x, y);
        this.width = 60;
        this.height = 60;

        // Motor state
        this.spinning = false;
        this.spinAngle = 0;

        // Terminals
        this.terminals = [
            { id: 'terminal_1', x: -30, y: 0 },
            { id: 'terminal_2', x: 30, y: 0 }
        ];
    }

    /**
     * Update animation
     */
    update(deltaTime) {
        if (this.spinning) {
            this.spinAngle += deltaTime * 5; // Rotation speed (radians/sec)
            if (this.spinAngle > Math.PI * 2) {
                this.spinAngle -= Math.PI * 2;
            }
        }
    }

    /**
     * Draw the motor
     */
    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Motor body (circle)
        const radius = 25;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.spinning ? '#1a4a2a' : '#2c3e50';
        ctx.fill();
        ctx.strokeStyle = this.spinning ? '#27ae60' : '#555';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Spinning animation (rotating dashed arcs)
        if (this.spinning) {
            ctx.save();
            ctx.rotate(this.spinAngle);
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Glow effect
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(39, 174, 96, 0.4)';
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // "M" label
        ctx.fillStyle = this.spinning ? '#4ade80' : '#95a5a6';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', 0, 0);

        // Shaft line (top)
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(0, -radius - 8);
        ctx.stroke();

        // Shaft cap
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(0, -radius - 8, 3, 0, Math.PI * 2);
        ctx.fill();

        // Terminal connection points
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(-30, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(30, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // Terminal labels
        ctx.fillStyle = '#aaa';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('1', -30, 14);
        ctx.fillText('2', 30, 14);

        ctx.restore();
    }

    /**
     * Get properties for display
     */
    getProperties() {
        return {
            'Type': 'DC Motor',
            'Status': this.spinning ? 'Spinning' : 'Idle'
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.current = 0;
        this.damaged = false;
        this.temperature = 0;
        // spinning and spinAngle are managed by RobotWiringValidator, not reset here
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
        this.spinning = false;
        this.spinAngle = 0;
    }
}
