/**
 * Resistor - Limits current flow
 */
class Resistor extends Component {
    constructor(x = 0, y = 0) {
        super('resistor', x, y);
        this.width = 80;
        this.height = 30;

        // Resistance options: 10Ω, 47Ω, 100Ω, 220Ω, 330Ω, 470Ω, 1kΩ, 2.2kΩ, 4.7kΩ, 10kΩ, 47kΩ, 100kΩ
        // Common E12 series values
        this.resistanceOptions = [10, 47, 100, 220, 330, 470, 1000, 2200, 4700, 10000, 47000, 100000];
        this.resistanceIndex = 4; // Default to 330Ω (good for LED circuits)
        this.resistance = this.resistanceOptions[this.resistanceIndex];

        // Max power dissipation (1/4 watt)
        this.maxPower = 0.25;
        this.burnoutPower = 0.5;

        // Terminals: left and right
        this.terminals = [
            { id: 'left', x: -40, y: 0 },
            { id: 'right', x: 40, y: 0 }
        ];
    }

    /**
     * Cycle through resistance options
     */
    cycleResistance() {
        this.resistanceIndex = (this.resistanceIndex + 1) % this.resistanceOptions.length;
        this.resistance = this.resistanceOptions[this.resistanceIndex];
    }

    /**
     * Update resistor state
     */
    update(deltaTime) {
        super.update(deltaTime);

        // Calculate power dissipation
        const power = this.current * this.current * this.resistance;

        // Update temperature based on power
        if (power > 0) {
            this.temperature = (power / this.maxPower) * 100;
        }

        // Check for burnout
        if (power > this.burnoutPower && !this.damaged) {
            // Trigger visual effects
            if (window.circuitCanvas && window.circuitCanvas.visualEffects) {
                window.circuitCanvas.visualEffects.createSmoke(this.x, this.y, '#888');
                window.circuitCanvas.visualEffects.createSparks(this.x, this.y, 10);
            }

            this.damaged = true;
        }
    }

    /**
     * Draw the resistor
     */
    draw(ctx) {
        // Draw base highlighting first
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Wire leads
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(-20, 0);
        ctx.moveTo(20, 0);
        ctx.lineTo(40, 0);
        ctx.stroke();

        // Resistor body (zigzag)
        const segments = 6;
        const segmentWidth = 40 / segments;
        const amplitude = 8;

        ctx.strokeStyle = this.damaged ? '#e74c3c' : '#e67e22';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-20, 0);

        for (let i = 0; i <= segments; i++) {
            const x = -20 + (i * segmentWidth);
            const y = (i % 2 === 0) ? amplitude : -amplitude;
            ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Temperature glow effect
        if (this.temperature > 50 && !this.damaged) {
            const intensity = (this.temperature - 50) / 50;
            ctx.strokeStyle = `rgba(239, 68, 68, ${intensity})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            for (let i = 0; i <= segments; i++) {
                const x = -20 + (i * segmentWidth);
                const y = (i % 2 === 0) ? amplitude : -amplitude;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Terminal connection points
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(-40, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(40, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Resistance label with smart formatting
        let label;
        if (this.resistance >= 1000) {
            const kValue = this.resistance / 1000;
            // Show decimal only if not a whole number
            label = (kValue % 1 === 0) ? kValue + 'kΩ' : kValue.toFixed(1) + 'kΩ';
        } else {
            label = this.resistance + 'Ω';
        }

        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, 0, 15);

        ctx.restore();
    }

    /**
     * Get properties for display
     */
    getProperties() {
        const power = this.current * this.current * this.resistance;
        const percentPower = (power / this.maxPower * 100).toFixed(0);

        // Smart resistance formatting
        let resistanceLabel;
        if (this.resistance >= 1000) {
            const kValue = this.resistance / 1000;
            resistanceLabel = (kValue % 1 === 0) ? kValue + 'kΩ' : kValue.toFixed(1) + 'kΩ';
        } else {
            resistanceLabel = this.resistance + 'Ω';
        }

        return {
            'Type': 'Resistor',
            'Resistance': resistanceLabel,
            'Rotation': this.rotation + '°',
            'Voltage Drop': this.voltage.toFixed(2) + 'V',
            'Current': (this.current * 1000).toFixed(1) + 'mA',
            'Power': power.toFixed(3) + 'W',
            'Load': percentPower + '%',
            'Status': this.damaged ? '❌ Burned Out' :
                     this.temperature > 80 ? '⚠️ Hot' :
                     '✅ Normal'
        };
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        const data = super.toJSON();
        data.resistanceIndex = this.resistanceIndex;
        data.resistance = this.resistance;
        return data;
    }

    /**
     * Restore from JSON
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.resistanceIndex = data.resistanceIndex || 1;
        this.resistance = data.resistance || 1000;
    }
}
