/**
 * Battery - Power source component
 */
class Battery extends Component {
    constructor(x = 0, y = 0) {
        super('battery', x, y);
        this.width = 80;
        this.height = 50;

        // Voltage options: 3V, 6V, 9V
        this.voltageOptions = [3, 6, 9];
        this.voltageIndex = 1; // Default to 6V
        this.voltage = this.voltageOptions[this.voltageIndex];

        // Terminals: positive and negative
        this.terminals = [
            { id: 'positive', x: 30, y: 0, polarity: '+' },
            { id: 'negative', x: -30, y: 0, polarity: '-' }
        ];
    }

    /**
     * Cycle through voltage options
     */
    cycleVoltage() {
        this.voltageIndex = (this.voltageIndex + 1) % this.voltageOptions.length;
        this.voltage = this.voltageOptions[this.voltageIndex];
    }

    /**
     * Draw the battery
     */
    draw(ctx) {
        // Draw base highlighting first
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Battery body
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-35, -20, 70, 40);

        // Positive terminal (longer line)
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(20, -15, 4, 30);

        // Negative terminal (shorter line)
        ctx.fillStyle = '#3498db';
        ctx.fillRect(-24, -10, 4, 20);

        // Voltage label
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.voltage + 'V', 0, 0);

        // Terminal connection points
        ctx.fillStyle = '#fbbf24';
        // Positive
        ctx.beginPath();
        ctx.arc(30, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        // Negative
        ctx.beginPath();
        ctx.arc(-30, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // Polarity labels
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('+', 30, -15);
        ctx.fillText('−', -30, -15);

        ctx.restore();
    }

    /**
     * Get properties for display
     */
    getProperties() {
        return {
            'Type': 'Battery',
            'Voltage': this.voltage + 'V',
            'Rotation': this.rotation + '°',
            'Current Output': (this.current * 1000).toFixed(1) + 'mA',
            'Power': (this.voltage * this.current).toFixed(2) + 'W'
        };
    }

    /**
     * Reset electrical state (but preserve battery voltage!)
     */
    reset() {
        // Only reset current and damage, NOT voltage
        // Voltage is a property of the battery, not a result of the circuit
        this.current = 0;
        this.damaged = false;
        this.temperature = 0;
        // Restore voltage from voltageIndex (in case parent reset() was called)
        this.voltage = this.voltageOptions[this.voltageIndex];
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        const data = super.toJSON();
        data.voltageIndex = this.voltageIndex;
        data.voltage = this.voltage;
        return data;
    }

    /**
     * Restore from JSON
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.voltageIndex = data.voltageIndex !== undefined ? data.voltageIndex : 1;
        // Always recalculate voltage from index to ensure consistency
        this.voltage = this.voltageOptions[this.voltageIndex];
    }
}
