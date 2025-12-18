export class SlotsRenderer {
    constructor(container) {
        this.container = container;
        this.reels = [];
    }

    init(symbols, specialSymbols) {
        this.symbols = symbols;
        this.specialSymbols = specialSymbols;
        this.renderLayout();
    }

    createSymbolElement(symbolKey) {
        const el = document.createElement('div');
        el.className = 'symbol';

        const imageMap = {
            'S': 'assets/Sneon.png',
            'A': 'assets/Aneon.png',
            'R': 'assets/Rneon.png',
            'K': 'assets/Kneon.png',
            'O': 'assets/Oneon.png',
            'Mangue': 'assets/mangue.png',
            'Yaourt': 'assets/yaourt.png',
            'Joker': 'assets/joker.png',
            'ltdt': 'assets/ltdt.png',
            'ciottislot': 'assets/ciottislot.png',
            'malette': 'assets/malette.png',
            'cacadafi': 'assets/cacadafi.png'
        };

        if (imageMap[symbolKey]) {
            const img = document.createElement('img');
            img.src = imageMap[symbolKey];
            img.style.width = '80%';
            img.style.height = '80%';
            img.style.objectFit = 'contain';
            // Add neon glow effect
            img.style.filter = 'drop-shadow(0 0 5px #ff0000)';
            el.appendChild(img);
        } else {
            el.textContent = symbolKey;
        }

        return el;
    }

    renderLayout() {
        this.container.innerHTML = '';

        const frame = document.createElement('div');
        frame.className = 'machine-frame';

        const reelsContainer = document.createElement('div');
        reelsContainer.className = 'reels-container';

        for (let i = 0; i < 5; i++) {
            const reel = document.createElement('div');
            reel.className = 'reel';

            for (let j = 0; j < 3; j++) {
                const symbolKey = this.getRandomSymbol();
                const symbol = this.createSymbolElement(symbolKey);
                reel.appendChild(symbol);
            }

            this.reels.push(reel);
            reelsContainer.appendChild(reel);
        }

        frame.appendChild(reelsContainer);
        this.container.appendChild(frame);
    }

    getRandomSymbol() {
        return this.symbols[Math.floor(Math.random() * this.symbols.length)];
    }

    async spin(finalGrid) {
        this.reels.forEach(reel => reel.classList.add('spinning'));

        // Animation Loop
        const spinInterval = setInterval(() => {
            this.reels.forEach(reel => {
                if (reel.classList.contains('spinning')) {
                    reel.innerHTML = '';
                    for (let k = 0; k < 3; k++) {
                        const sym = this.createSymbolElement(this.getRandomSymbol());
                        reel.appendChild(sym);
                    }
                }
            });
        }, 100);

        // Stop reels one by one
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 500 + (i * 300)));

            const reel = this.reels[i];
            reel.classList.remove('spinning');

            // Set final symbols
            reel.innerHTML = '';
            if (finalGrid && finalGrid.length === 15) {
                reel.appendChild(this.createSymbolElement(finalGrid[i * 3]));
                reel.appendChild(this.createSymbolElement(finalGrid[i * 3 + 1]));
                reel.appendChild(this.createSymbolElement(finalGrid[i * 3 + 2]));
            }

            const symbols = reel.querySelectorAll('.symbol');
            symbols.forEach(sym => {
                sym.animate([
                    { transform: 'translateY(-20px)' },
                    { transform: 'translateY(0)' }
                ], { duration: 200, easing: 'ease-out' });
            });
        }

        clearInterval(spinInterval);
    }

    highlightWin() {
        const frame = this.container.querySelector('.machine-frame');
        if (frame) {
            frame.animate([
                { boxShadow: '0 0 20px #f1c40f' },
                { boxShadow: '0 0 50px #f1c40f' },
                { boxShadow: '0 0 20px #f1c40f' }
            ], { duration: 1000, iterations: 3 });
        }
    }

    drawPayline(indices, color) {
        // Create SVG overlay if it doesn't exist
        let svg = this.container.querySelector('.payline-overlay');
        if (!svg) {
            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add('payline-overlay');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '100';

            // Append to reels-container so coordinates match
            const reelsContainer = this.container.querySelector('.reels-container');
            reelsContainer.appendChild(svg);
        }

        const reels = this.reels;
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");

        // Calculate points
        const points = indices.map((index, i) => {
            // Index 0-14. 
            // Reel index = Math.floor(index / 3) -> WRONG logic in Slots.js says 0,1,2 is Reel 1? NO
            // Slots.js logic: "Reel 1 gets indices 0,1,2. Middle row is 1,4,7,10,13" matches "1,4,7..." being middle
            // IF valid indices are 0..14 and "Middle" is 1,4,7,10,13
            // Then Reel 0 has indices 0,1,2 vertical? "i % 3 === 1" logic suggests 0,1,2 is a column?
            // Wait, previous SlotsRenderer rendered 0,1,2 into ONE reel.

            // So: 
            // Index 0 = Reel 0, Row 0
            // Index 1 = Reel 0, Row 1 (Middle)
            // Index 2 = Reel 0, Row 2

            const reelIdx = Math.floor(index / 3);
            const rowIdx = index % 3;

            const reel = reels[reelIdx];
            const symbol = reel.children[rowIdx];

            if (!symbol) return '0,0';

            // Get center relative to container
            const reelRect = reel.getBoundingClientRect();
            const symbolRect = symbol.getBoundingClientRect();
            const containerRect = this.container.querySelector('.reels-container').getBoundingClientRect();

            const x = symbolRect.left + symbolRect.width / 2 - containerRect.left;
            const y = symbolRect.top + symbolRect.height / 2 - containerRect.top;

            return `${x},${y}`;
        }).join(' ');

        polyline.setAttribute('points', points);
        polyline.setAttribute('stroke', color);
        polyline.setAttribute('stroke-width', '10');
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        // Glow effect
        polyline.style.filter = `drop-shadow(0 0 5px ${color})`;

        // Animate stroke
        const length = 1000; // Approx
        polyline.style.strokeDasharray = length;
        polyline.style.strokeDashoffset = length;
        polyline.animate([
            { strokeDashoffset: length },
            { strokeDashoffset: 0 }
        ], { duration: 500, fill: 'forwards' });

        svg.appendChild(polyline);
    }

    clearPaylines() {
        const svg = this.container.querySelector('.payline-overlay');
        if (svg) svg.innerHTML = '';

        // Also clear symbol highlights
        const highlighted = this.container.querySelectorAll('.symbol.highlighted');
        highlighted.forEach(el => {
            el.classList.remove('highlighted');
            el.style.filter = '';
            el.animate([], { duration: 0 }); // Stop animation
        });
    }

    highlightSymbols(indices, color = '#f1c40f') {
        const reels = this.reels;
        indices.forEach(index => {
            const reelIdx = Math.floor(index / 3);
            const rowIdx = index % 3;

            const reel = reels[reelIdx];
            if (!reel) return;
            const symbol = reel.children[rowIdx];
            if (!symbol) return;

            symbol.classList.add('highlighted');

            // Pulse animation
            symbol.animate([
                { transform: 'scale(1)', filter: `drop-shadow(0 0 0px ${color})` },
                { transform: 'scale(1.1)', filter: `drop-shadow(0 0 10px ${color})` },
                { transform: 'scale(1)', filter: `drop-shadow(0 0 0px ${color})` }
            ], { duration: 800, iterations: Infinity });
        });
    }
}
