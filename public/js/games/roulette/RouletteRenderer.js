export class RouletteRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Configuration
        this.numbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
        this.colors = {
            0: '#27ae60', // Green
            red: '#c0392b',
            black: '#2c3e50',
            gold: '#f1c40f',
            goldDark: '#b7950b'
        };
        this.redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

        // State
        this.currentRotation = 0;
        this.isSpinning = false;
        this.ballPosition = { radius: 0, angle: 0 };
        this.radius = 0; // Initialize to prevent undefined access

        // Modern Resize Handling with Debounce
        let resizeTimeout;
        this.resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 100);
        });
        this.resizeObserver.observe(this.canvas.parentElement);

        // Start loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;

        const rect = parent.getBoundingClientRect();

        // Prevent drawing if hidden or 0 size
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const newWidth = rect.width * dpr;
        const newHeight = rect.height * dpr;

        // Prevent unnecessary resize/redraw loops
        if (Math.abs(this.canvas.width - newWidth) < 1 && Math.abs(this.canvas.height - newHeight) < 1) return;

        // Set actual size in memory
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;

        // Normalize coordinate system
        // IMPORTANT: Reset transform before scaling to prevent accumulation (infinite zoom)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        this.centerX = rect.width / 2;
        this.centerY = rect.height / 2;

        // Ensure it's a perfect circle that fits
        this.radius = Math.max(0, Math.min(this.centerX, this.centerY) - 15);

        this.draw();
    }

    draw() {
        if (!this.ctx) return;
        // Safety check: radius must be large enough for gradients
        if (!this.radius || this.radius < 25) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(this.currentRotation);

        const sliceAngle = (2 * Math.PI) / 37;

        // 1. Outer Rim (Gold Gradient)
        const outerGradient = ctx.createRadialGradient(0, 0, this.radius - 20, 0, 0, this.radius);
        outerGradient.addColorStop(0, this.colors.goldDark);
        outerGradient.addColorStop(0.5, this.colors.gold);
        outerGradient.addColorStop(1, this.colors.goldDark);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = outerGradient;
        ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 15;
        ctx.stroke();

        // 2. Wood/Dark Background for pockets
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();

        // 3. Draw Wheel Segments
        for (let i = 0; i < 37; i++) {
            const number = this.numbers[i];
            const angle = i * sliceAngle;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, this.radius - 15, angle, angle + sliceAngle);
            ctx.fillStyle = this.getColor(number);
            ctx.fill();
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw Text
            ctx.save();
            ctx.rotate(angle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px "Outfit", Arial';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 2;
            ctx.fillText(number.toString(), this.radius - 25, 5);
            ctx.restore();
        }

        // 4. Inner Ring (Gold)
        const innerGradient = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
        innerGradient.addColorStop(0, '#b7950b');
        innerGradient.addColorStop(0.5, '#f1c40f');
        innerGradient.addColorStop(1, '#b7950b');

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, 2 * Math.PI);
        ctx.fillStyle = innerGradient; // Gold fill
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 5. Center Decoration (Star/Spokes)
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.15, 0, 2 * Math.PI);
        ctx.fillStyle = '#2c3e50';
        ctx.fill();

        // Gold Knob
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();

        ctx.restore();

        // 7. Static Marker (Triangle at top)
        ctx.beginPath();
        ctx.moveTo(this.centerX - 10, 10);
        ctx.lineTo(this.centerX + 10, 10);
        ctx.lineTo(this.centerX, 25);
        ctx.closePath();
        ctx.fillStyle = '#f1c40f';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 5;
        ctx.fill();
    }

    getColor(number) {
        if (number === 0) return this.colors[0];
        return this.redNumbers.includes(number) ? this.colors.red : this.colors.black;
    }

    spin(targetNumber, duration = 4000) {
        return new Promise(resolve => {
            this.isSpinning = true;
            const startRotation = this.currentRotation;
            const targetIndex = this.numbers.indexOf(targetNumber);
            const sliceAngle = (2 * Math.PI) / 37;

            // Target is at the top (angle -PI/2)
            // We need to rotate the wheel so the target number is at -PI/2
            // The number's angle relative to 0 is targetIndex * sliceAngle
            // So we want: currentRotation + targetIndex * sliceAngle + sliceAngle/2 = -PI/2 (mod 2PI)
            // Note: sliceAngle/2 centers the number in the segment

            const targetAngleOnWheel = targetIndex * sliceAngle + sliceAngle / 2;

            // We want the final rotation to be such that:
            // (finalRotation + targetAngleOnWheel) % 2PI = -PI/2
            // finalRotation = -PI/2 - targetAngleOnWheel

            // Add random extra spins (5 to 10)
            const extraSpins = (5 + Math.floor(Math.random() * 5)) * 2 * Math.PI;

            // Calculate delta needed
            let targetRotation = -Math.PI / 2 - targetAngleOnWheel;

            // Adjust targetRotation to be greater than startRotation to ensure forward spin
            while (targetRotation <= startRotation) {
                targetRotation += 2 * Math.PI;
            }

            const finalRotation = targetRotation + extraSpins;

            const startTime = performance.now();

            const animateSpin = (time) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function (easeOutQuint for smoother stop)
                const ease = 1 - Math.pow(1 - progress, 5);

                this.currentRotation = startRotation + (finalRotation - startRotation) * ease;

                // Ball animation
                if (progress < 1) {
                    // Ball spins opposite
                    this.ballPosition.radius = this.radius - 25;
                    this.ballPosition.angle = -this.currentRotation * 1.5 - (time * 0.001);
                } else {
                    // Ball settles
                    this.ballPosition.radius = this.radius - 35; // Drops into pocket
                    // Align ball with the winning number (which is now at -PI/2)
                    this.ballPosition.angle = -Math.PI / 2;
                }

                if (progress < 1) {
                    requestAnimationFrame(animateSpin);
                } else {
                    this.isSpinning = false;
                    resolve();
                }
            };

            requestAnimationFrame(animateSpin);
        });
    }

    animate() {
        if (!this.isSpinning) {
            this.currentRotation += 0.002; // Slow idle spin
        }
        this.draw();
        requestAnimationFrame(this.animate);
    }
}
