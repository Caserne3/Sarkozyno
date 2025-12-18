export class CasinoManager {
    constructor() {
        this.balance = 1000.00; // Starting balance
        this.currentGame = null;

        // DOM Elements
        this.balanceEl = document.getElementById('user-balance');
        this.gameStageEl = document.getElementById('game-stage');
        this.lobbyViewEl = document.getElementById('lobby-view');
    }

    init() {
        console.log('Casino Initialized');
        this.updateBalanceDisplay();
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Delegate clicks for game cards
        document.querySelectorAll('.game-card[data-game]').forEach(card => {
            card.addEventListener('click', (e) => {
                console.log('Card clicked:', card.dataset.game);
                const gameId = card.dataset.game;
                this.loadGame(gameId);
            });

            // Explicitly handle button click if needed (though bubbling should work)
            const btn = card.querySelector('.play-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent double firing if card also fires
                    console.log('Play button clicked');
                    const gameId = card.dataset.game;
                    this.loadGame(gameId);
                });
            }
        });

        // Add a "Home" button listener
        const logo = document.querySelector('.casino-logo');
        if (logo) {
            logo.style.cursor = 'pointer';
            logo.addEventListener('click', () => {
                console.log('Logo clicked, returning to lobby');
                this.returnToLobby();
            });
        }
    }

    updateBalanceDisplay() {
        this.balanceEl.textContent = `$${this.balance.toFixed(2)}`;
    }

    updateBalance(amount) {
        this.balance += amount;
        this.updateBalanceDisplay();

        // Visual feedback for balance change could go here
        if (amount > 0) {
            this.balanceEl.classList.add('win-flash');
            setTimeout(() => this.balanceEl.classList.remove('win-flash'), 500);
        }
    }

    async loadGame(gameId) {
        console.log(`Loading game: ${gameId}`);

        if (gameId === 'roulette') {
            // Hide Lobby
            this.lobbyViewEl.style.display = 'none';

            // Create Game Container
            const gameContainer = document.createElement('div');
            gameContainer.id = 'active-game-container';
            gameContainer.className = 'game-container fade-in';
            this.gameStageEl.appendChild(gameContainer);

            // Dynamic Import
            try {
                const { Roulette } = await import('./games/roulette/Roulette.js');
                this.currentGame = new Roulette(gameContainer, this);
                this.currentGame.init();
            } catch (error) {
                console.error('Failed to load game:', error);
                alert(`Error loading game: ${error.message}\nEnsure you are running on a local server.`);
                this.returnToLobby();
            }
        } else if (gameId === 'slots') {
            // Hide Lobby
            this.lobbyViewEl.style.display = 'none';

            // Create Game Container
            const gameContainer = document.createElement('div');
            gameContainer.id = 'active-game-container';
            gameContainer.className = 'game-container fade-in';
            this.gameStageEl.appendChild(gameContainer);

            try {
                const { Slots } = await import('./games/slots/Slots.js');
                this.currentGame = new Slots(gameContainer, this);
                this.currentGame.init();
            } catch (error) {
                console.error('Failed to load slots:', error);
                alert(`Error loading slots: ${error.message}`);
                this.returnToLobby();
            }
        } else if (gameId === 'blackjack') {
            // Hide Lobby
            this.lobbyViewEl.style.display = 'none';

            // Create Game Container
            const gameContainer = document.createElement('div');
            gameContainer.id = 'active-game-container';
            gameContainer.className = 'game-container fade-in';
            this.gameStageEl.appendChild(gameContainer);

            try {
                // Load CSS dynamically if not present
                if (!document.getElementById('blackjack-css')) {
                    const link = document.createElement('link');
                    link.id = 'blackjack-css';
                    link.rel = 'stylesheet';
                    link.href = 'css/blackjack/blackjack.css';
                    document.head.appendChild(link);
                }

                const { Blackjack } = await import('./games/Blackjack/Blackjack.js');
                this.currentGame = new Blackjack(gameContainer, this);
                this.currentGame.init();
            } catch (error) {
                console.error('Failed to load blackjack:', error);
                alert(`Error loading blackjack: ${error.message}`);
                this.returnToLobby();
            }
        }
    }

    returnToLobby() {
        if (this.currentGame) {
            this.currentGame.destroy(); // Cleanup
            this.currentGame = null;
        }

        const gameContainer = document.getElementById('active-game-container');
        if (gameContainer) {
            gameContainer.remove();
        }

        this.lobbyViewEl.style.display = 'block';
    }
}
