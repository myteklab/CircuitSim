/**
 * RaspberryPi - Simplified Raspberry Pi with key pins
 * Robotics component with power input and GPIO outputs
 */
class RaspberryPi extends Component {
    constructor(x = 0, y = 0) {
        super('raspberryPi', x, y);
        this.width = 100;
        this.height = 60;

        // Pi state
        this.poweredOn = false;
        this.gpioA = false;
        this.gpioB = false;

        // Terminals
        this.terminals = [
            { id: '5V_IN', x: -50, y: -15, polarity: '+' },
            { id: 'GND', x: -50, y: 15, polarity: '-' },
            { id: 'GPIO_A', x: 50, y: -15 },
            { id: 'GPIO_B', x: 50, y: 15 }
        ];
    }

    /**
     * Draw the Raspberry Pi
     */
    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // PCB (green rectangle)
        ctx.fillStyle = '#1a5c2a';
        ctx.strokeStyle = '#2d8a4e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-45, -27, 90, 54, 3);
        ctx.fill();
        ctx.stroke();

        // Dark chip in center
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-18, -14, 36, 28);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-18, -14, 36, 28);

        // Chip dot (pin 1 indicator)
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-14, -10, 2, 0, Math.PI * 2);
        ctx.fill();

        // GPIO header dots (right side, 2 rows)
        ctx.fillStyle = '#555';
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 4; col++) {
                ctx.beginPath();
                ctx.arc(22 + col * 5, -8 + row * 16, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Power header dots (left side)
        ctx.fillStyle = '#555';
        for (let col = 0; col < 3; col++) {
            ctx.beginPath();
            ctx.arc(-32 + col * 5, -15, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-32 + col * 5, 15, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Power LED
        const ledX = 30;
        const ledY = -22;
        if (this.poweredOn) {
            // Green glow
            const gradient = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, 8);
            gradient.addColorStop(0, 'rgba(39, 174, 96, 0.8)');
            gradient.addColorStop(1, 'rgba(39, 174, 96, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(ledX, ledY, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#2ecc71';
        } else {
            ctx.fillStyle = '#c0392b';
        }
        ctx.beginPath();
        ctx.arc(ledX, ledY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Labels
        ctx.fillStyle = '#aaa';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Terminal labels
        ctx.textAlign = 'right';
        ctx.fillText('5V', -42, -20);
        ctx.fillText('GND', -38, 10);
        ctx.textAlign = 'left';
        ctx.fillText('GPIO A', 28, -20);
        ctx.fillText('GPIO B', 28, 10);

        // Pi label
        ctx.fillStyle = this.poweredOn ? '#4ade80' : '#666';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Raspberry Pi', 0, 24);

        // Terminal connection points
        for (const terminal of this.terminals) {
            // GPIO terminals change color based on signal state
            if (terminal.id === 'GPIO_A' && this.poweredOn && this.gpioA) {
                ctx.fillStyle = '#2ecc71'; // Green = HIGH
            } else if (terminal.id === 'GPIO_B' && this.poweredOn && this.gpioB) {
                ctx.fillStyle = '#2ecc71'; // Green = HIGH
            } else {
                ctx.fillStyle = '#fbbf24'; // Default yellow
            }
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
            'Type': 'Raspberry Pi',
            'Power': this.poweredOn ? 'ON' : 'OFF',
            'GPIO_A': this.gpioA ? 'HIGH' : 'LOW',
            'GPIO_B': this.gpioB ? 'HIGH' : 'LOW'
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.current = 0;
        this.damaged = false;
        this.temperature = 0;
        // poweredOn is managed by RobotWiringValidator, not reset here
    }

    /**
     * Serialize
     */
    toJSON() {
        const data = super.toJSON();
        data.gpioA = this.gpioA;
        data.gpioB = this.gpioB;
        return data;
    }

    /**
     * Deserialize
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.poweredOn = false;
        this.gpioA = data.gpioA || false;
        this.gpioB = data.gpioB || false;
    }
}
