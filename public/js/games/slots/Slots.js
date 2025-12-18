import { SlotsRenderer } from './SlotsRenderer.js';

export class Slots {
    constructor(container, casinoManager) {
        this.container = container;
        this.container.classList.add('slots-game-container'); // Add class for CSS styling
        this.casinoManager = casinoManager;
        this.renderer = new SlotsRenderer(container);

        // Game State
        this.betAmount = 10;
        this.isSpinning = false;
        this.inFeature = false; // 'hold_spin' or 'free_games' or false
        this.featureSpinsLeft = 0;
        this.heldSymbols = Array(15).fill(null); // For Hold & Spin

        // Symbols (SARKO Theme)
        // Letters: S, A, R, K, O (Neon)
        // High: Bowl, Flower, Tiger, Boat, Buddha
        // Special: Wild, Scatter, Fireball
        this.symbols = ['S', 'A', 'R', 'K', 'O', 'Mangue', 'malette', '🐯', 'ciottislot', 'cacadafi'];
        this.specialSymbols = {
            WILD: 'Joker',
            SCATTER: 'ltdt',
            FIREBALL: 'Yaourt'
        };

        // Paytable
        this.paytable = {
            'S': 2, 'A': 2, 'R': 2, 'K': 2, 'O': 2,
            'Mangue': 5, 'malette': 8, '🐯': 15, 'ciottislot': 25, 'cacadafi': 50,
            'Joker': 0,
            'ltdt': 100, // Scatter payout
            'Yaourt': 0
        };

        this.jackpots = {
            MINI: 50,
            MINOR: 500,
            MAJOR: 1000,
            GRAND: 500000 // SARKO Jackpot
        };

        this.debugMode = true;
    }

    init() {
        this.renderer.init(this.symbols, this.specialSymbols);
        this.setupControls();
        if (this.debugMode) this.createDebugPanel();
    }

    setupControls() {
        const controls = document.createElement('div');
        controls.className = 'slots-controls';
        controls.innerHTML = `
            <div class="controls-left" style="display:flex; flex-direction:column; align-items:flex-start; gap:5px;">
                <div class="bet-display">Bet: $${this.betAmount}</div>
                <button id="back-btn" class="back-btn" style="
                    padding: 4px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    transition: all 0.3s;
                ">← Menu</button>
            </div>
            <button id="spin-btn" class="spin-btn">SPIN</button>
            <div class="message-display" id="slot-message">Good Luck!</div>
        `;
        this.container.appendChild(controls);

        this.spinBtn = controls.querySelector('#spin-btn');
        this.messageEl = controls.querySelector('#slot-message');
        this.backBtn = controls.querySelector('#back-btn');

        // Add hover effect via JS since inline styles are used
        this.backBtn.addEventListener('mouseenter', () => {
            this.backBtn.style.background = 'rgba(231, 76, 60, 1)';
            this.backBtn.style.color = '#fff';
            this.backBtn.style.borderColor = '#e74c3c';
        });
        this.backBtn.addEventListener('mouseleave', () => {
            this.backBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            this.backBtn.style.color = 'rgba(255, 255, 255, 0.6)';
            this.backBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });

        this.spinBtn.addEventListener('click', () => this.spin());
        this.backBtn.addEventListener('click', () => {
            // Prevent if spinning? Maybe allowing exit is fine.
            if (!this.isSpinning) this.casinoManager.returnToLobby();
        });

        // Spacebar to Spin
        this.handleKeyPress = (e) => {
            if (e.code === 'Space' && !this.isSpinning && !this.spinBtn.disabled) {
                e.preventDefault(); // Prevent scrolling
                this.spin();
            }
        };
        document.addEventListener('keydown', this.handleKeyPress);
    }

    destroy() {
        if (this.handleKeyPress) {
            document.removeEventListener('keydown', this.handleKeyPress);
        }
        this.container.innerHTML = '';
    }

    createDebugPanel() {
        const panel = document.createElement('div');
        panel.className = 'debug-panel';
        panel.style.position = 'absolute';
        panel.style.right = '10px';
        panel.style.top = '50%';
        panel.style.transform = 'translateY(-50%)';
        panel.style.background = 'rgba(0,0,0,0.8)';
        panel.style.padding = '10px';
        panel.style.borderRadius = '8px';
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.gap = '5px';
        panel.style.zIndex = '1000';

        panel.innerHTML = `
            <h4 style="color:white; margin:0 0 5px 0;">Debug Tools</h4>
            <button id="force-win">Force Win (5x Buddha)</button>
            <button id="force-sarko">Force SARKO Jackpot</button>
            <button id="force-mango">Force Mango (5k)</button>
            <button id="force-malette">Force Malette (10k)</button>
            <button id="force-tiger">Force Tiger (25k)</button>
            <button id="force-ciotti">Force Ciotti (75k)</button>
            <button id="force-hold">Force Hold & Spin</button>
            <button id="force-free">Force Free Games</button>
        `;
        this.container.appendChild(panel);

        panel.querySelector('#force-win').addEventListener('click', () => this.spin('win'));
        panel.querySelector('#force-sarko').addEventListener('click', () => this.spin('sarko'));
        panel.querySelector('#force-mango').addEventListener('click', () => this.spin('mangue'));
        panel.querySelector('#force-malette').addEventListener('click', () => this.spin('malette'));
        panel.querySelector('#force-tiger').addEventListener('click', () => this.spin('tiger'));
        panel.querySelector('#force-ciotti').addEventListener('click', () => this.spin('ciotti'));
        panel.querySelector('#force-hold').addEventListener('click', () => this.spin('hold'));
        panel.querySelector('#force-free').addEventListener('click', () => this.spin('free'));
    }

    async spin(debugType = null) {
        if (this.isSpinning) return;

        if (this.casinoManager.balance < this.betAmount && !this.inFeature) {
            this.showMessage("Insufficient Funds!", "red");
            return;
        }

        this.isSpinning = true;
        this.toggleControls(false);
        this.renderer.clearPaylines(); // Clear previous lines immediately
        this.showMessage("Spinning...", "#f1c40f");

        if (!this.inFeature) {
            this.casinoManager.updateBalance(-this.betAmount);
        }

        // Generate Results
        let grid = this.generateGrid(debugType);

        // Spin Animation
        await this.renderer.spin(grid);

        // Check Features & Wins
        await this.evaluateRound(grid);

        this.isSpinning = false;
        if (!this.inFeature) this.toggleControls(true);
    }

    generateGrid(debugType) {
        const grid = [];
        // Grid is 15 items. 0-2 (Reel 1), 3-5 (Reel 2)... 
        // Wait, SlotsRenderer logic assumed 0,1,2 is Reel 1? 
        // Let's verify SlotsRenderer logic. 
        // "symbols[0].textContent = finalGrid[i * 3];" -> Yes, Reel i gets indices i*3, i*3+1, i*3+2.
        // So Reel 1 is 0,1,2. Reel 2 is 3,4,5.
        // Middle row is index 1, 4, 7, 10, 13.

        if (debugType === 'sarko') { // S-A-R-K-O middle
            const middle = [1, 4, 7, 10, 13];
            ['S', 'A', 'R', 'K', 'O'].forEach((s, idx) => grid[middle[idx]] = s);
        } else if (debugType === 'mangue') {
            [1, 4, 7, 10, 13].forEach(i => grid[i] = 'Mangue');
        } else if (debugType === 'malette') {
            [1, 4, 7, 10, 13].forEach(i => grid[i] = 'malette');
        } else if (debugType === 'tiger') {
            [1, 4, 7, 10, 13].forEach(i => grid[i] = '🐯');
        } else if (debugType === 'ciotti') {
            [1, 4, 7, 10, 13].forEach(i => grid[i] = 'ciottislot');
        } else if (debugType === 'win') { // 5x Cacadafi middle
            [1, 4, 7, 10, 13].forEach(i => grid[i] = 'cacadafi');
        }

        // Fill rest random
        for (let i = 0; i < 15; i++) {
            if (!grid[i]) { // Only fill empty spots
                const colIndex = Math.floor(i / 3); // Approx
                if (debugType === 'hold' && i < 6) {
                    grid[i] = this.specialSymbols.FIREBALL;
                } else if (debugType === 'free' && i < 3) {
                    grid[i] = this.specialSymbols.SCATTER;
                } else {
                    grid[i] = this.getRandomSymbol(colIndex);
                }
            }
        }
        return grid;
    }

    getRandomSymbol(colIndex = -1) {
        const rand = Math.random();

        // Adjusted Probabilities per user request:
        // Scatter: 7%
        // Fireball: 18%
        // Wild: 10% (on reels 2-5)
        if (rand < 0.07) return this.specialSymbols.SCATTER;  // 7% Scatter
        if (rand < 0.22) return this.specialSymbols.FIREBALL; // 15% Fireball (0.07 to 0.22)

        // WILD Logic: Ban on Reel 1 (colIndex 0)
        // Cumulative threshold: 0.25 + 0.10 = 0.35
        const wildThreshold = colIndex === 0 ? 0 : 0.35;

        if (rand < wildThreshold) return this.specialSymbols.WILD;

        return this.symbols[Math.floor(Math.random() * this.symbols.length)];
    }

    async evaluateRound(grid) {
        // Check 5x Cacadafi (Middle Row: 1, 4, 7, 10, 13)
        // Adjust indices logic if line definition is different in Paylines
        const middleRowIndices = [1, 4, 7, 10, 13];
        const middleRowSymbols = middleRowIndices.map(i => grid[i]);
        const isFiveCacadafi = middleRowSymbols.every(s => s === 'cacadafi');

        if (isFiveCacadafi) {
            // Ensure CSS is loaded
            if (!document.getElementById('oasis-css')) {
                const link = document.createElement('link');
                link.id = 'oasis-css';
                link.rel = 'stylesheet';
                link.href = 'css/slots/oasis-animations.css';
                document.head.appendChild(link);
                // Give it a moment to load
                await new Promise(r => setTimeout(r, 100));
            }

            const winAmount = this.betAmount * 10 * 5; // Example calc: Symbol val * 5 matches
            // Actually paytable says 10 for Cacadafi. If line logic gives multiplier*matches...
            // Standard line logic: base pay * (matches-2). So 10 * 3 = 30x? 
            // Let's just give a HUGE custom win for this special event.
            const jackpotWin = 100000;

            this.casinoManager.updateBalance(jackpotWin);
            await this.playOasisAnimation(jackpotWin);

            this.showMessage("OASIS JACKPOT!!!", "#ffd700");
            return;
        }

        // Check SARKO Jackpot (Middle Row: 1, 4, 7, 10, 13)
        if (grid[1] === 'S' && grid[4] === 'A' && grid[7] === 'R' && grid[10] === 'K' && grid[13] === 'O') {
            // Ensure CSS is loaded
            if (!document.getElementById('sarko-css')) {
                const link = document.createElement('link');
                link.id = 'sarko-css';
                link.rel = 'stylesheet';
                link.href = 'css/slots/sarko-jackpot.css';
                document.head.appendChild(link);
                // Give it a moment to load
                await new Promise(r => setTimeout(r, 100));
            }

            const winAmount = this.jackpots.GRAND; // 100,000
            this.casinoManager.updateBalance(winAmount);

            await this.playSarkoJailbreak(winAmount);

            this.showMessage("SARKO FREED!!!", "#e74c3c");
            return;
        }



        // --- NEW SPECIAL JACKPOTS (5x on Middle Row) ---
        // 1. MANGO (Exotic)
        if (middleRowSymbols.every(s => s === 'Mangue')) {
            const winAmount = 5000;
            this.casinoManager.updateBalance(winAmount);
            await this.playSpecialJackpot('theme-mango', 'LOUIS SARKOZY AIME LA MANGUE', winAmount);
            return;
        }
        // 2. MALETTE (Business)
        if (middleRowSymbols.every(s => s === 'malette')) {
            const winAmount = 10000;
            this.casinoManager.updateBalance(winAmount);
            await this.playSpecialJackpot('theme-malette', 'DON DE KADHAFI', winAmount);
            return;
        }
        // 3. TIGER (Beast)
        if (middleRowSymbols.every(s => s === '🐯')) {
            const winAmount = 25000;
            this.casinoManager.updateBalance(winAmount);
            await this.playSpecialJackpot('theme-tiger', 'TIÉ UN TIGRE', winAmount);
            return;
        }
        // 4. CIOTTI (Security)
        if (middleRowSymbols.every(s => s === 'ciottislot')) {
            const winAmount = 75000;
            this.casinoManager.updateBalance(winAmount);
            await this.playSpecialJackpot('theme-ciotti', 'CIOTTI RETABLI L ORDRE', winAmount);
            return;
        }

        // Count Special Symbols
        const fireballs = grid.filter(s => s === this.specialSymbols.FIREBALL).length;
        const scatters = grid.filter(s => s === this.specialSymbols.SCATTER).length;

        // Process Standard Line Wins FIRST (so they accumulate with features)
        this.checkLineWins(grid);

        // Check Hold & Spin
        if (fireballs >= 6) {
            const fireballIndices = grid.map((s, i) => s === this.specialSymbols.FIREBALL ? i : -1).filter(i => i !== -1);
            this.renderer.highlightSymbols(fireballIndices, '#e67e22'); // Orange
            this.showMessage("HOLD & SPIN TRIGGERED!", "#e67e22");
            await this.triggerHoldAndSpin(grid);
            // No return, allow other features (unlikely but possible) or just end
        }

        // Check Free Games
        if (scatters >= 3) {
            const scatterIndices = grid.map((s, i) => s === this.specialSymbols.SCATTER ? i : -1).filter(i => i !== -1);
            this.renderer.highlightSymbols(scatterIndices, '#3498db'); // Blue
            this.showMessage("FREE GAMES TRIGGERED!", "#3498db");
            await this.triggerFreeGames();
        }
    }

    async playSpecialJackpot(theme, title, amount) {
        return new Promise(resolve => {
            // Load Shared CSS
            if (!document.getElementById('special-jackpots-css')) {
                const link = document.createElement('link');
                link.id = 'special-jackpots-css';
                link.rel = 'stylesheet';
                link.href = 'css/slots/special-jackpots.css';
                document.head.appendChild(link);
            }

            const overlay = document.createElement('div');
            overlay.className = `special-jackpot-overlay ${theme}`;

            // Theme Specific Extras
            let extras = '';
            if (theme === 'theme-mango') {
                extras = `
                    <div class="sunburst"></div>
                    <img src="assets/LouisSarkozy.jpg" class="louis-surprise" alt="Louis">
                `;
            }
            if (theme === 'theme-malette') {
                extras = `
                    <img src="assets/cacadafi.png" class="business-host left" alt="Cacadafi">
                    <img src="assets/cacadafi.png" class="business-host right" alt="Cacadafi">
                `;
            }
            if (theme === 'theme-tiger') {
                extras = '<img src="assets/Sarkotigre.jpg" class="sarkotigre-img" alt="Sarko Tigre">';
            }
            if (theme === 'theme-ciotti') {
                extras = '<img src="assets/Ciotti.png" class="ciotti-face" alt="Ciotti">';
            }

            overlay.innerHTML = `
                ${extras}
                <div class="jackpot-content">
                    <h1 class="jackpot-title">${title}</h1>
                    <span class="jackpot-amount">$${amount}</span>
                </div>
            `;
            document.body.appendChild(overlay);

            // Special JS Animations
            if (theme === 'theme-malette') {
                // Spawn Falling Bills
                const interval = setInterval(() => {
                    const bill = document.createElement('div');
                    bill.className = 'falling-bill';
                    bill.style.left = Math.random() * 100 + 'vw';
                    bill.style.animation = `fall ${1 + Math.random()}s linear forwards`;
                    // Define keyframes in JS if needed, or assume global css handles simple top->down
                    // Using inline for simple fall
                    bill.animate([
                        { transform: 'translateY(-100px) rotate(0deg)' },
                        { transform: 'translateY(110vh) rotate(' + (Math.random() * 360) + 'deg)' }
                    ], {
                        duration: 1500 + Math.random() * 1000,
                        easing: 'linear'
                    });
                    overlay.appendChild(bill);
                    setTimeout(() => bill.remove(), 3000);
                }, 100);
                setTimeout(() => clearInterval(interval), 4500);
            }

            if (theme === 'theme-tiger') {
                // Slash effects
                const interval = setInterval(() => {
                    const claw = document.createElement('div');
                    claw.className = 'claw-mark';
                    // Random rotate
                    claw.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`;
                    overlay.appendChild(claw);
                    setTimeout(() => claw.remove(), 600);
                }, 800);
                setTimeout(() => clearInterval(interval), 4500);
            }

            // CIOTTI INTRO SEQUENCE
            if (theme === 'theme-ciotti') {
                // Hide main content initially
                overlay.classList.add('delayed-start');

                // Create Intro Layer
                const introLayer = document.createElement('div');
                introLayer.className = 'ciotti-intro-layer';
                introLayer.innerHTML = `
                    <div class="intro-flash"></div>
                `;
                document.body.appendChild(introLayer);

                // Sequence
                // 1. Black Screen (Immediate)

                // 2. Left Crack (0.5s)
                setTimeout(() => {
                    const crackL = document.createElement('img');
                    crackL.src = 'assets/crack_side.png';
                    crackL.className = 'impact-crack left';
                    introLayer.appendChild(crackL);
                }, 500);

                // 3. Right Crack (1.0s)
                setTimeout(() => {
                    const crackR = document.createElement('img');
                    crackR.src = 'assets/crack_corner.png';
                    crackR.className = 'impact-crack right';
                    introLayer.appendChild(crackR);
                }, 1000);

                // 4. FLASH & REVEAL (1.5s)
                setTimeout(() => {
                    const flash = introLayer.querySelector('.intro-flash');
                    if (flash) flash.classList.add('active');

                    // Show Main Overlay stuff behind flash
                    overlay.classList.remove('delayed-start');
                    overlay.querySelectorAll('*').forEach(el => {
                        el.style.animationPlayState = 'running';
                        el.style.opacity = '1';
                    });

                    // Remove intro layer shortly after
                    setTimeout(() => introLayer.remove(), 500);
                }, 1500);
            }

            // Cleanup after duration (Extended for Ciotti)
            const duration = theme === 'theme-ciotti' ? 7000 : 5000;

            setTimeout(() => {
                overlay.style.transition = 'opacity 0.5s';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 500);
            }, duration);
        });
    }

    async playOasisAnimation(amount) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'oasis-overlay';

            overlay.innerHTML = `
                <div class="sand-wave"></div>
                <div class="oasis-scene"></div>
                <div class="oasis-fireworks"></div>
                <img src="assets/camel.png" class="camel left" alt="Camel">
                <img src="assets/camel.png" class="camel right" alt="Camel">
                <img src="assets/cacadafi.png" class="cacadafi-host" alt="Cacadafi">
                <div class="oasis-win-text-container">
                    <div class="oasis-win-text">
                        KADHAFI VOUS INVITE A L OASIS<br>
                        <span class="oasis-win-amount">$${amount}</span>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Spawn particles/fireworks manually if CSS isn't enough
            // Reusing existing firework logic but inside the overlay 
            // (Need to adapt spawnFireworks to accept container or just put them on top)
            const fwInterval = setInterval(() => {
                const fwContainer = overlay.querySelector('.oasis-fireworks');
                if (fwContainer) this.spawnMiniFirework(fwContainer);
            }, 500);

            // Duration 7s minimum
            setTimeout(() => {
                clearInterval(fwInterval);
                overlay.style.transition = 'opacity 1s';
                overlay.style.opacity = '0';

                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 1000);
            }, 8000); // 8 seconds total
        });
    }

    async playSarkoJailbreak(amount) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'sarko-overlay';

            // HTML Structure: More chaotic
            overlay.innerHTML = `
                <div class="jail-scene">
                    <img src="assets/sarko.png" class="sarko-prisoner" alt="Sarko Prisoner">
                    <div class="jail-bars"></div>
                </div>
                
                <!-- Cracks Container -->
                <div id="crack-container" style="position:fixed; width:100%; height:100%; pointer-events:none; z-index:12008;"></div>

                <!-- Explosion -->
                <div class="shockwave"></div>
                <div class="super-flash"></div>

                <!-- Freed Scene (Echoes) -->
                <div class="sarko-freed-wrapper">
                    <div class="god-rays"></div>
                    <img src="assets/sarko.png" class="sarko-echo" style="animation-duration:1.5s;">
                    <img src="assets/sarko.png" class="sarko-echo" style="animation-duration:1.8s;">
                    <img src="assets/sarko.png" class="sarko-echo" style="animation-duration:2.1s;">
                    <img src="assets/sarko.png" class="sarko-freed" alt="Sarko Free">
                </div>
                
                <!-- Particle Container -->
                <div id="rain-container" style="position:fixed; width:100%; height:100%; top:0; left:0; pointer-events:none; z-index:12017;"></div>

                <div class="sarko-win-text">
                    <h1>SARKO<br>LIBÉRÉ</h1>
                    <span class="amount" style="font-size: 5rem; color: white; display: block; text-shadow: 0 0 30px gold;">$${amount}</span>
                </div>
            `;

            document.body.appendChild(overlay);

            // Timeline:
            // 4s: Power Up (Violent Shake)
            setTimeout(() => {
                const prisoner = overlay.querySelector('.sarko-prisoner');
                if (prisoner) prisoner.classList.add('power-up');

                // Add shake to scene
                const scene = overlay.querySelector('.jail-scene');
                if (scene) scene.classList.add('shaking');
            }, 4000);

            // 5s - 8s: CHAOS CRACKS (Spawn 15 cracks randomly)
            const spawnCrack = () => {
                const container = overlay.querySelector('#crack-container');
                if (!container) return;

                const crack = document.createElement('div');
                crack.className = Math.random() > 0.5 ? 'screen-crack crack-type-1' : 'screen-crack crack-type-2';
                // Random Pos
                crack.style.left = (Math.random() * 80) + '%';
                crack.style.top = (Math.random() * 80) + '%';
                crack.style.width = (300 + Math.random() * 300) + 'px';
                crack.style.height = (300 + Math.random() * 300) + 'px';
                crack.style.transform = `rotate(${Math.random() * 360}deg) scale(0.5)`;
                crack.style.setProperty('--rotation', `${Math.random() * 360}deg`);

                container.appendChild(crack);
                // Trigger animate
                setTimeout(() => crack.classList.add('active'), 50);
            };

            for (let i = 0; i < 15; i++) {
                setTimeout(spawnCrack, 5000 + (Math.random() * 3000));
            }

            // Bars start breaking with heat
            setTimeout(() => {
                const bars = overlay.querySelector('.jail-bars');
                if (bars) bars.classList.add('breaking');
            }, 5000);


            // 9s: NUKE
            setTimeout(() => {
                const flash = overlay.querySelector('.super-flash');
                const shockwave = overlay.querySelector('.shockwave');
                const scene = overlay.querySelector('.jail-scene');
                const freedWrapper = overlay.querySelector('.sarko-freed-wrapper');
                const text = overlay.querySelector('.sarko-win-text');

                if (flash) flash.classList.add('active');
                if (shockwave) shockwave.classList.add('active');

                if (scene) scene.style.display = 'none';
                overlay.querySelectorAll('.screen-crack').forEach(el => el.style.display = 'none');

                if (freedWrapper) freedWrapper.classList.add('active');
                if (text) text.classList.add('active');

                // Start Particle Rain
                const rainContainer = overlay.querySelector('#rain-container');
                // Spawn 100 particles over 5 seconds
                for (let i = 0; i < 100; i++) {
                    setTimeout(() => {
                        if (!rainContainer) return;
                        const p = document.createElement('div');
                        p.className = 'particle';
                        p.style.left = (Math.random() * 100) + 'vw';
                        p.style.top = '-50px';
                        p.style.background = Math.random() > 0.5 ? 'gold' : '#fff'; // Gold and Bills color
                        p.style.animationDuration = (1 + Math.random() * 2) + 's';
                        rainContainer.appendChild(p);
                    }, i * 50);
                }

            }, 9000);

            // 30s: End
            setTimeout(() => {
                overlay.style.transition = 'opacity 2s';
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.remove(); resolve(); }, 2000);
            }, 15000);
        });
    }

    spawnMiniFirework(container) {
        const x = Math.random() * 100;
        const y = Math.random() * 50;
        const color = `hsl(${Math.random() * 360}, 100%, 50%)`;

        const burst = document.createElement('div');
        burst.style.position = 'absolute';
        burst.style.left = `${x}%`;
        burst.style.top = `${y}%`;
        burst.style.width = '10px';
        burst.style.height = '10px';
        burst.style.background = color;
        burst.style.borderRadius = '50%';
        burst.style.boxShadow = `0 0 20px ${color}`;
        burst.style.transform = 'scale(0)';
        burst.style.animation = 'firework-pop 1s ease-out forwards';

        // Inline keyframes for simplicity or we should add to CSS
        // Let's rely on standard animation or just simple JS
        // Actually, let's keep it simple. The user asked for "Fireworks in background".
        // The CSS assumes a class exists or I should add it.
        // Let's just create 10-20 dots that expand.

        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            p.style.position = 'absolute';
            p.style.width = '6px';
            p.style.height = '6px';
            p.style.background = color;
            p.style.borderRadius = '50%';
            p.style.left = `${x}%`;
            p.style.top = `${y}%`;

            const angle = (Math.PI * 2 * i) / 8;
            const velocity = 100;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;

            p.animate([
                { transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], {
                duration: 1000,
                easing: 'ease-out'
            });

            container.appendChild(p);
            setTimeout(() => p.remove(), 1000);
        }
    }

    async triggerHoldAndSpin(initialGrid) {
        this.inFeature = 'hold_spin';
        this.featureSpinsLeft = 3;

        // Play visual animation
        await this.playYogurtAnimation();

        // Calculate a random bonus for the demo
        const bonus = this.betAmount * 100; // PREMIUM Win (Rare)
        this.casinoManager.updateBalance(bonus);
        this.showMessage(`HOLD & SPIN BONUS: $${bonus}`, "#e67e22");

        this.inFeature = false;
    }

    async playYogurtAnimation() {
        return new Promise(resolve => {
            // Load CSS
            if (!document.getElementById('yogurt-css')) {
                const link = document.createElement('link');
                link.id = 'yogurt-css';
                link.rel = 'stylesheet';
                link.href = 'css/slots/yogurt-animation.css';
                document.head.appendChild(link);
            }

            const overlay = document.createElement('div');
            overlay.className = 'yogurt-overlay';

            // Build Galaxy
            let starsHtml = '';
            for (let i = 0; i < 100; i++) {
                const left = Math.random() * 100;
                const top = Math.random() * 100;
                const delay = Math.random() * 2;
                starsHtml += `<div class="star" style="left:${left}%; top:${top}%; animation-delay:${delay}s"></div>`;
            }

            overlay.innerHTML = `
                <div class="galaxy-bg">
                    ${starsHtml}
                </div>
                
                <div class="rocket-container">
                    <img src="assets/yaourt.png" class="rocket-yogurt" alt="Rocket Yogurt">
                    <div class="rocket-flame"></div>
                </div>

                <div class="hold-spin-text">HOLD & SPIN<br>LAUNCHED</div>
            `;
            document.body.appendChild(overlay);

            // Audio (Optional Placeholder)
            // this.playSound('rocket_launch'); 

            // SEQUENCE MANAGER
            const rocket = overlay.querySelector('.rocket-container');

            // Phase 1: Travel (0s - 3s)
            // Default CSS handles shaking

            // Phase 2: Figure 8 (3s)
            setTimeout(() => {
                if (rocket) rocket.classList.add('figure8');
            }, 3000);

            // Phase 3: Launch (5.5s) - allow time for Figure 8 to finish
            setTimeout(() => {
                if (rocket) {
                    rocket.classList.remove('figure8'); // Clean class to rely on cascade or specificity
                    rocket.classList.add('launching');
                }
            }, 5500);

            // Cleanup (7s)
            setTimeout(() => {
                overlay.style.transition = 'opacity 1s';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 1000);
            }, 7000); // 7s total duration before fade out
        });
    }

    async triggerFreeGames() {
        this.inFeature = 'free_games';
        this.featureSpinsLeft = 6;

        // Ensure CSS is loaded
        if (!document.getElementById('manga-css')) {
            const link = document.createElement('link');
            link.id = 'manga-css';
            link.rel = 'stylesheet';
            link.href = 'css/slots/manga-animations.css';
            document.head.appendChild(link);
            // Give it a moment to load
            await new Promise(r => setTimeout(r, 100));
        }

        const bonus = this.betAmount * 25; // Good win (Common)

        // Manga Animation Sequence
        await this.playMangaAnimation(bonus);

        this.casinoManager.updateBalance(bonus);
        this.showMessage(`FREE GAMES BONUS: $${bonus}`, "#3498db");

        this.inFeature = false;
    }

    async playMangaAnimation(amount) {
        return new Promise(resolve => {
            // 1. Create Overlay
            const overlay = document.createElement('div');
            overlay.className = 'manga-overlay';

            // 2. Add Elements
            overlay.innerHTML = `
                <div class="manga-flash"></div>
                <div class="speed-lines"></div>
                <div class="manga-cut-line"></div>
                <!-- Sarko Villain -->
                <img src="assets/sarko.png" class="sarko-villain" alt="Sarko Villain">
                <!-- Text -->
                <div class="manga-text">BANGER<br>+ $${amount}</div>
            `;

            document.body.appendChild(overlay);

            // 3. Screen Shake Effect
            document.body.classList.add('shake-screen');

            // 4. Clean up after animation
            setTimeout(() => {
                overlay.style.transition = 'opacity 0.5s';
                overlay.style.opacity = '0';

                // Remove shake early
                document.body.classList.remove('shake-screen');

                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 500);
            }, 3000); // 3 seconds total duration
        });
    }

    checkLineWins(grid) {
        // Paylines Definition (Indices based on Column-Major grid: 0-2 Reel1, 3-5 Reel2...)
        // Top: 0,3,6,9,12 | Mid: 1,4,7,10,13 | Bot: 2,5,8,11,14
        const paylines = [
            { name: "Top Line", indices: [0, 3, 6, 9, 12], color: '#e74c3c' },
            { name: "Middle Line", indices: [1, 4, 7, 10, 13], color: '#e74c3c' },
            { name: "Bottom Line", indices: [2, 5, 8, 11, 14], color: '#e74c3c' },
            { name: "Descent", indices: [0, 4, 7, 10, 14], color: '#3498db' },
            { name: "Ascent", indices: [2, 4, 7, 10, 12], color: '#2ecc71' },
            { name: "Mountain", indices: [2, 4, 6, 10, 14], color: '#f1c40f' },
            { name: "The V", indices: [0, 4, 8, 10, 12], color: '#9b59b6' },
            { name: "The Bowl", indices: [0, 4, 7, 10, 12], color: '#e67e22' },
            { name: "The Hump", indices: [2, 4, 7, 10, 14], color: '#1abc9c' }
        ];

        let totalWin = 0;
        let winDetails = [];
        this.renderer.clearPaylines(); // Clear previous lines

        paylines.forEach(line => {
            const symbols = line.indices.map(i => grid[i]);
            // Find first non-wild symbol to determine what the line is matching
            let firstSym = symbols[0];
            let effectiveSym = firstSym;

            // If first is WAILD, look ahead
            if (firstSym === this.specialSymbols.WILD) {
                const firstNonWild = symbols.find(s => s !== this.specialSymbols.WILD);
                if (firstNonWild) {
                    effectiveSym = firstNonWild;
                } else {
                    // All Wilds! (Rare Jackpot potential)
                    // Treat as highest paying normal symbol (e.g., cacadafi)
                    effectiveSym = 'cacadafi';
                }
            }

            // Skip if effective symbol is not in paytable (e.g. Scatter/Bonus handled elsewhere)
            if (!this.paytable[effectiveSym]) return;

            // Count consecutive matches
            let matchCount = 0;
            for (let i = 0; i < symbols.length; i++) {
                if (symbols[i] === effectiveSym || symbols[i] === this.specialSymbols.WILD) {
                    matchCount++;
                } else {
                    break;
                }
            }

            if (matchCount >= 3) {
                const multiplier = this.paytable[effectiveSym];
                let win = this.betAmount * multiplier * (matchCount - 2);

                // Bonus for full line
                if (matchCount === 5) win *= 2;

                if (win > 0) {
                    totalWin += win;
                    if (win > this.betAmount) winDetails.push(`${matchCount}x ${effectiveSym}`);

                    // Draw the winning line
                    this.renderer.drawPayline(line.indices, line.color);
                }
            }
        });

        if (totalWin > 0) {
            this.casinoManager.updateBalance(totalWin);
            const detailText = winDetails.length > 0 ? `(${winDetails.join(', ')})` : '';
            this.showMessage(`WIN: $${totalWin} ${detailText}`, "#2ecc71");
            this.renderer.highlightWin();

            // Standard Win Animation
            this.triggerWinEffect(totalWin);
        } else {
            this.showMessage("Try Again!", "#95a5a6");
        }
    }

    triggerWinEffect(amount) {
        // Ensure CSS
        if (!document.getElementById('win-anim-css')) {
            const link = document.createElement('link');
            link.id = 'win-anim-css';
            link.rel = 'stylesheet';
            link.href = 'css/slots/win-animations.css';
            document.head.appendChild(link);
        }

        // Floating Text
        const text = document.createElement('div');
        text.className = 'win-float-text';
        text.textContent = `+$${amount}`;
        document.body.appendChild(text);
        setTimeout(() => text.remove(), 2000);

        // Flash (only for decent wins > 2x bet maybe? or just all for "simple effective")
        // User said "simple but effective", so let's do it for all.
        const flash = document.createElement('div');
        flash.className = 'win-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);

        // Coin Burst
        const particleCount = Math.min(50, 10 + amount / 10); // Scale with amount, max 50
        for (let i = 0; i < particleCount; i++) {
            const coin = document.createElement('div');
            coin.className = 'coin-particle';

            // Random start position near center (or can be near grid)
            const sx = window.innerWidth / 2 + (Math.random() - 0.5) * 100;
            const sy = window.innerHeight / 2 + (Math.random() - 0.5) * 100;
            coin.style.left = `${sx}px`;
            coin.style.top = `${sy}px`;

            // Random angle and distance
            const angle = Math.random() * Math.PI * 2;
            const velocity = 200 + Math.random() * 300; // Distance to fly
            const tx = Math.cos(angle) * velocity + 'px';
            const ty = Math.sin(angle) * velocity + 'px';
            const rot = Math.random() * 720 + 'deg';

            coin.style.setProperty('--tx', tx);
            coin.style.setProperty('--ty', ty);
            coin.style.setProperty('--rot', rot);
            coin.style.animation = `coin-fly ${0.5 + Math.random()}s ease-out forwards`;

            document.body.appendChild(coin);
            setTimeout(() => coin.remove(), 1500);
        }
    }

    toggleControls(enabled) {
        this.spinBtn.disabled = !enabled;
        this.spinBtn.style.opacity = enabled ? '1' : '0.5';
    }

    showMessage(text, color) {
        this.messageEl.textContent = text;
        this.messageEl.style.color = color;
        this.messageEl.style.textShadow = `0 0 10px ${color}`;
    }
}
