/**
 * VisualEffects - Handles dramatic visual effects like smoke, sparks, and explosions
 */
class VisualEffects {
    constructor(canvas) {
        this.canvas = canvas;
        this.effects = [];
    }

    /**
     * Create smoke effect when component burns out
     */
    createSmoke(x, y, color = '#666') {
        for (let i = 0; i < 10; i++) {
            this.effects.push({
                type: 'smoke',
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: (Math.random() - 0.5) * 50,
                vy: -50 - Math.random() * 50,
                size: 5 + Math.random() * 10,
                alpha: 0.8,
                color: color,
                life: 1.0,
                createdAt: Date.now()
            });
        }
    }

    /**
     * Create sparks effect when component damages
     */
    createSparks(x, y, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 150;

            this.effects.push({
                type: 'spark',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                alpha: 1.0,
                color: Math.random() > 0.5 ? '#ff6b35' : '#ffd93d',
                life: 1.0,
                createdAt: Date.now()
            });
        }
    }

    /**
     * Create explosion flash effect
     */
    createExplosion(x, y) {
        this.effects.push({
            type: 'explosion',
            x: x,
            y: y,
            size: 10,
            maxSize: 80,
            alpha: 1.0,
            life: 1.0,
            createdAt: Date.now()
        });
    }

    /**
     * Create electrical arc/zap effect
     */
    createArc(x1, y1, x2, y2) {
        this.effects.push({
            type: 'arc',
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            alpha: 1.0,
            life: 1.0,
            segments: this.generateArcSegments(x1, y1, x2, y2),
            createdAt: Date.now()
        });
    }

    /**
     * Generate jagged lightning arc segments
     */
    generateArcSegments(x1, y1, x2, y2) {
        const segments = [];
        const steps = 8;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 30;
            const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 30;
            segments.push({ x, y });
        }

        return segments;
    }

    /**
     * Update all effects
     */
    update(deltaTime) {
        const now = Date.now();

        this.effects = this.effects.filter(effect => {
            const age = (now - effect.createdAt) / 1000; // seconds
            effect.life = Math.max(0, 1 - age);

            if (effect.life <= 0) return false;

            switch (effect.type) {
                case 'smoke':
                    effect.x += effect.vx * deltaTime;
                    effect.y += effect.vy * deltaTime;
                    effect.vy += 30 * deltaTime; // Gravity slows upward movement
                    effect.size += 20 * deltaTime; // Smoke expands
                    effect.alpha = effect.life * 0.6;
                    break;

                case 'spark':
                    effect.x += effect.vx * deltaTime;
                    effect.y += effect.vy * deltaTime;
                    effect.vy += 400 * deltaTime; // Gravity pulls down
                    effect.alpha = effect.life;
                    break;

                case 'explosion':
                    effect.size += (effect.maxSize - effect.size) * deltaTime * 10;
                    effect.alpha = effect.life;
                    break;

                case 'arc':
                    effect.alpha = effect.life;
                    break;
            }

            return true;
        });
    }

    /**
     * Draw all effects
     */
    draw(ctx) {
        ctx.save();

        for (const effect of this.effects) {
            ctx.globalAlpha = effect.alpha;

            switch (effect.type) {
                case 'smoke':
                    const gradient = ctx.createRadialGradient(
                        effect.x, effect.y, 0,
                        effect.x, effect.y, effect.size
                    );
                    gradient.addColorStop(0, effect.color);
                    gradient.addColorStop(1, 'rgba(0,0,0,0)');

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'spark':
                    ctx.fillStyle = effect.color;
                    ctx.shadowColor = effect.color;
                    ctx.shadowBlur = 5;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    break;

                case 'explosion':
                    const expGradient = ctx.createRadialGradient(
                        effect.x, effect.y, 0,
                        effect.x, effect.y, effect.size
                    );
                    expGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                    expGradient.addColorStop(0.3, 'rgba(255, 200, 0, 0.8)');
                    expGradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.4)');
                    expGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

                    ctx.fillStyle = expGradient;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'arc':
                    ctx.strokeStyle = '#6dd5ed';
                    ctx.lineWidth = 3;
                    ctx.shadowColor = '#6dd5ed';
                    ctx.shadowBlur = 10;

                    ctx.beginPath();
                    ctx.moveTo(effect.segments[0].x, effect.segments[0].y);
                    for (let i = 1; i < effect.segments.length; i++) {
                        ctx.lineTo(effect.segments[i].x, effect.segments[i].y);
                    }
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    break;
            }
        }

        ctx.restore();
    }

    /**
     * Clear all effects
     */
    clear() {
        this.effects = [];
    }
}
