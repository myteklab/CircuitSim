/**
 * Diode - One-way current flow semiconductor device
 */
class Diode extends Component {
    constructor(x = 0, y = 0) {
        super('diode', x, y);
        this.width = 50;
        this.height = 50;

        // Diode electrical properties
        this.forwardVoltage = 0.7; // Silicon diode forward voltage drop
        this.forwardResistance = 1; // Very low resistance when conducting (1Ω)
        this.reverseResistance = 1e9; // Very high resistance when blocking (1GΩ)
        this.maxCurrent = 0.100; // 100mA max safe current
        this.burnoutCurrent = 0.150; // 150mA = damage

        // State
        this.isConducting = false; // Is the diode forward-biased and conducting?
        this.voltageDrop = 0; // Actual voltage drop across diode

        // Set initial resistance (will be updated during simulation)
        this.resistance = this.reverseResistance;

        // Terminals: anode (+) and cathode (-)
        this.terminals = [
            { id: 'anode', x: -25, y: 0, polarity: '+' },
            { id: 'cathode', x: 20, y: 0, polarity: '-' }
        ];
    }

    /**
     * Update diode state based on voltage and current
     */
    update(deltaTime) {
        super.update(deltaTime);

        // Determine if conducting based on voltage drop
        // Voltage drop is positive when anode voltage > cathode voltage
        this.voltageDrop = this.voltage;

        // Diode conducts if forward voltage is met
        if (this.voltageDrop >= this.forwardVoltage && !this.damaged) {
            this.isConducting = true;
            this.resistance = this.forwardResistance;
        } else {
            this.isConducting = false;
            this.resistance = this.reverseResistance;
        }
    }

    /**
     * Draw the diode with IEEE standard symbol
     */
    draw(ctx) {
        // Draw base highlighting first
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Diode body background
        ctx.fillStyle = this.damaged ? '#7f1d1d' : '#1e293b';
        ctx.fillRect(-20, -15, 40, 30);
        ctx.strokeStyle = this.damaged ? '#991b1b' : '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(-20, -15, 40, 30);

        // Draw diode symbol (triangle + bar)
        if (this.isConducting && !this.damaged) {
            // Conducting - blue glow
            ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
            ctx.shadowBlur = 15;

            // Triangle (anode side) - filled blue
            ctx.fillStyle = '#3b82f6';
            ctx.strokeStyle = '#60a5fa';
        } else {
            // Not conducting - gray
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#64748b';
            ctx.strokeStyle = '#94a3b8';
        }

        ctx.lineWidth = 2.5;

        // Draw triangle pointing right (toward cathode)
        ctx.beginPath();
        ctx.moveTo(-10, -10); // Top left
        ctx.lineTo(-10, 10);  // Bottom left
        ctx.lineTo(5, 0);     // Right point
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw cathode bar (vertical line on right)
        ctx.beginPath();
        ctx.moveTo(5, -12);
        ctx.lineTo(5, 12);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Wire leads
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Anode (+) lead
        ctx.moveTo(-25, 0);
        ctx.lineTo(-20, 0);
        // Cathode (-) lead
        ctx.moveTo(20, 0);
        ctx.lineTo(5, 0);
        ctx.stroke();

        // Terminal connection points
        ctx.fillStyle = '#fbbf24';
        // Anode terminal
        ctx.beginPath();
        ctx.arc(-25, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        // Cathode terminal
        ctx.beginPath();
        ctx.arc(20, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Polarity labels
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // + sign on anode side
        ctx.fillText('+', -10, -25);
        // - sign on cathode side
        ctx.fillText('−', 5, -25);

        // Damage indicator
        if (this.damaged) {
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#e74c3c';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✗', 0, 0);
        }

        // Conducting indicator (small arrow showing current flow)
        if (this.isConducting && !this.damaged && this.current > 0.001) {
            ctx.fillStyle = '#60a5fa';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('→', 0, 25);
        }

        ctx.restore();
    }

    /**
     * Get properties for display
     */
    getProperties() {
        const percentCurrent = (this.current / this.maxCurrent * 100).toFixed(0);

        return {
            'Type': 'Diode (Silicon)',
            'Rotation': this.rotation + '°',
            'Forward Voltage': this.forwardVoltage + 'V',
            'Voltage Drop': this.voltageDrop.toFixed(2) + 'V',
            'Current': (this.current * 1000).toFixed(1) + 'mA',
            'Max Current': (this.maxCurrent * 1000) + 'mA',
            'Load': percentCurrent + '%',
            'State': this.damaged ? '❌ Burned Out' :
                    this.isConducting ? '✅ Conducting (Forward Bias)' :
                    '⛔ Blocking (Reverse Bias)',
            'Resistance': this.isConducting ?
                        this.forwardResistance + 'Ω (low)' :
                        '∞Ω (very high)'
        };
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return super.toJSON();
    }

    /**
     * Restore from JSON
     */
    fromJSON(data) {
        super.fromJSON(data);
        // Reset state on load
        this.isConducting = false;
        this.resistance = this.reverseResistance;
    }
}
