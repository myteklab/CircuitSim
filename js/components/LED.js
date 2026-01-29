/**
 * LED - Light Emitting Diode
 */
class LED extends Component {
    constructor(x = 0, y = 0) {
        super('led', x, y);
        this.width = 50;
        this.height = 50;

        // LED colors
        this.colorOptions = ['red', 'green', 'blue', 'yellow', 'white'];
        this.colorIndex = 0; // Default to red
        this.ledColor = this.colorOptions[this.colorIndex];

        // LED electrical properties
        this.forwardVoltage = 2.0; // Voltage drop when conducting
        this.maxCurrent = 0.020; // 20mA max safe current
        this.burnoutCurrent = 0.030; // 30mA = damage

        // Visual properties
        this.brightness = 0; // 0-1
        this.isOn = false;

        // Terminals: anode (+) and cathode (-)
        // Anode has longer lead (-25) to indicate positive terminal
        this.terminals = [
            { id: 'anode', x: -25, y: 0, polarity: '+' },
            { id: 'cathode', x: 20, y: 0, polarity: '-' }
        ];
    }

    /**
     * Cycle through color options
     */
    cycleColor() {
        this.colorIndex = (this.colorIndex + 1) % this.colorOptions.length;
        this.ledColor = this.colorOptions[this.colorIndex];
    }

    /**
     * Get LED color in RGB format
     */
    getLEDColor() {
        const colors = {
            'red': { r: 239, g: 68, b: 68 },
            'green': { r: 34, g: 197, b: 94 },
            'blue': { r: 59, g: 130, b: 246 },
            'yellow': { r: 250, g: 204, b: 21 },
            'white': { r: 255, g: 255, b: 255 }
        };
        return colors[this.ledColor] || colors['red'];
    }

    /**
     * Update LED state
     */
    update(deltaTime) {
        super.update(deltaTime);

        // Check if LED should be on (sufficient current)
        if (this.current > 0.001 && !this.damaged) {
            this.isOn = true;
            // Brightness proportional to current (up to max safe current)
            this.brightness = Math.min(this.current / this.maxCurrent, 1);
        } else {
            this.isOn = false;
            this.brightness = 0;
        }
    }

    /**
     * Draw the LED
     */
    draw(ctx) {
        // Draw base highlighting first
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // LED body (circle)
        ctx.fillStyle = this.damaged ? '#7f1d1d' : '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // LED glow effect when on
        if (this.isOn && this.brightness > 0) {
            const color = this.getLEDColor();
            // Use squared brightness to exaggerate differences and boost glow
            // Low brightness (0.2) → 0.04 boosted to 0.25
            // Medium (0.5) → 0.25 boosted to 0.55
            // High (0.8) → 0.64 boosted to 0.82
            const visualBrightness = Math.min(1.0, Math.pow(this.brightness, 1.5) + 0.2);

            // Large outer glow with shadow blur
            ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${visualBrightness})`;
            ctx.shadowBlur = 30 * visualBrightness;

            // Outer glow gradient (bigger radius for more glow)
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 35);
            gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${visualBrightness})`);
            gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${visualBrightness * 0.7})`);
            gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${visualBrightness * 0.3})`);
            gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright core - very bright
            ctx.shadowBlur = 15;
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1.0)`;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();

            // Bright white center spot
            ctx.shadowBlur = 10;
            ctx.fillStyle = `rgba(255, 255, 255, ${visualBrightness * 0.9})`;
            ctx.beginPath();
            ctx.arc(-3, -3, 8, 0, Math.PI * 2);
            ctx.fill();

            // Reset shadow
            ctx.shadowBlur = 0;
        } else {
            // LED off - show color hint
            const color = this.getLEDColor();
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Wire leads - Anode (left) longer than Cathode (right)
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Anode (+) - LONGER lead (25px from body)
        ctx.moveTo(-25, 0);
        ctx.lineTo(-18, 0);
        // Cathode (-) - shorter lead (20px from body)
        ctx.moveTo(20, 0);
        ctx.lineTo(18, 0);
        ctx.stroke();

        // Terminal connection points
        ctx.fillStyle = '#fbbf24';
        // Anode terminal at -25
        ctx.beginPath();
        ctx.arc(-25, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        // Cathode terminal at 20
        ctx.beginPath();
        ctx.arc(20, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Polarity indicators on the body
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 2;
        // Anode (+) - longer line on body
        ctx.beginPath();
        ctx.moveTo(-18, -5);
        ctx.lineTo(-18, 5);
        ctx.stroke();
        // Cathode (-) - shorter line with bar on body
        ctx.beginPath();
        ctx.moveTo(18, -3);
        ctx.lineTo(18, 3);
        ctx.stroke();
        ctx.fillRect(16, -5, 4, 10);

        // Damage indicator
        if (this.damaged) {
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#e74c3c';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✗', 0, 0);
        }

        ctx.restore();
    }

    /**
     * Get properties for display
     */
    getProperties() {
        const percentCurrent = (this.current / this.maxCurrent * 100).toFixed(0);

        return {
            'Type': 'LED',
            'Color': this.ledColor.charAt(0).toUpperCase() + this.ledColor.slice(1),
            'Rotation': this.rotation + '°',
            'Forward Voltage': this.forwardVoltage + 'V',
            'Current': (this.current * 1000).toFixed(1) + 'mA',
            'Max Current': (this.maxCurrent * 1000) + 'mA',
            'Load': percentCurrent + '%',
            'Brightness': (this.brightness * 100).toFixed(0) + '%',
            'Status': this.damaged ? '❌ Burned Out' :
                     this.isOn ? '✅ Lit' :
                     '⚪ Off'
        };
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        const data = super.toJSON();
        data.colorIndex = this.colorIndex;
        data.ledColor = this.ledColor;
        return data;
    }

    /**
     * Restore from JSON
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.colorIndex = data.colorIndex || 0;
        this.ledColor = data.ledColor || 'red';
    }
}
