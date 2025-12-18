export class BlackjackRenderer {
    constructor(container) {
        this.container = container;
        this.container.classList.add('blackjack-game-container');
    }

    renderTable(initialUserBalance) {
        this.container.innerHTML = `
            <div class="blackjack-table">
                <button id="back-btn" class="back-btn" title="Back to Menu">ESC</button>

                <div class="dealer-area">
                    <h2>Dealer</h2>
                    <div id="dealer-hand" class="cards-container"></div>
                    <div id="dealer-score" class="score-display"></div>
                </div>
                
                <div class="message-area" id="game-message">Place your bet</div>

                <div class="player-area">
                    <h2>Player</h2>
                    <div id="player-hand" class="cards-container"></div>
                    <div id="player-score" class="score-display"></div>
                </div>

                <div class="controls-area">
                    <div class="betting-controls" id="betting-controls">
                        <button class="chip-btn" data-val="100">$100</button>
                        <button class="chip-btn" data-val="200">$200</button>
                        <button class="chip-btn" data-val="500">$500</button>
                        <button class="chip-btn" data-val="all">ALL IN</button>
                        <div class="current-bet-display">Bet: $<span id="current-bet-val">0</span></div>
                        <button id="deal-btn" class="action-btn primary" disabled>DEAL</button>
                    </div>
                    
                    <div class="game-actions" id="game-actions" style="display:none;">
                        <button id="hit-btn" class="action-btn">Hit</button>
                        <button id="stand-btn" class="action-btn">Stand</button>
                        <button id="double-btn" class="action-btn">Double</button>
                        <button id="split-btn" class="action-btn" disabled>Split</button>
                         <button id="insurance-btn" class="action-btn" disabled style="display:none;">Insurance</button>
                    </div>
                </div>
            </div>
        `;

        // Inline style for back button to match Roulette style (bottom, dark)
        const backBtn = this.container.querySelector('#back-btn');
        if (backBtn) {
            backBtn.textContent = 'Back'; // Change text from ESC to Back
            Object.assign(backBtn.style, {
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                top: 'auto', // Reset top
                background: '#2c3e50', // Dark blue-grey like sidebar
                color: '#bdc3c7',
                border: '1px solid #34495e',
                borderRadius: '5px',
                padding: '10px 30px',
                cursor: 'pointer',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '1rem',
                zIndex: '1000',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.3s ease'
            });

            backBtn.onmouseenter = () => {
                backBtn.style.background = '#34495e';
                backBtn.style.color = '#ecf0f1';
                backBtn.style.borderColor = '#7f8c8d';
            };
            backBtn.onmouseleave = () => {
                backBtn.style.background = '#2c3e50';
                backBtn.style.color = '#bdc3c7';
                backBtn.style.borderColor = '#34495e';
            };
        }
    }

    bindEvents(callbacks) {
        const { onDeal, onHit, onStand, onDouble, onSplit, onInsurance, onUpdates, onExit, onInput } = callbacks;

        // Betting & Deal
        this.container.querySelector('#deal-btn').addEventListener('click', onDeal);

        // Back Button
        const backBtn = this.container.querySelector('#back-btn');
        if (backBtn) backBtn.addEventListener('click', onExit);

        // Keyboard Shortcuts
        this.container.ownerDocument.addEventListener('keydown', (e) => {
            // Only handle if game container is in DOM
            if (!this.container.isConnected) return;

            if (e.code === 'Space') {
                e.preventDefault();
                onInput('space');
            } else if (e.code === 'NumpadEnter' || e.code === 'Enter') { // Supporting both Enter just in case, or strictly NumpadEnter as asked
                if (e.code === 'NumpadEnter') {
                    onInput('enter');
                }
            } else if (e.code === 'Escape') {
                onExit();
            }
        });

        this.container.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const datasetVal = e.target.dataset.val;
                const val = datasetVal === 'all' ? 'all' : parseInt(datasetVal);
                onUpdates.placeBet(val);
            });
        });

        // Game Actions
        this.container.querySelector('#hit-btn').addEventListener('click', onHit);
        this.container.querySelector('#stand-btn').addEventListener('click', onStand);
        this.container.querySelector('#double-btn').addEventListener('click', onDouble);
        this.container.querySelector('#split-btn').addEventListener('click', onSplit);
        // Note: Insurance button needs to be added to HTML if we want it visible, 
        // or just handled via prompt/existing logic. Added it to HTML above for completeness.
        const insBtn = this.container.querySelector('#insurance-btn');
        if (insBtn) insBtn.addEventListener('click', onInsurance);
    }

    updateUI(state) {
        const { playerHands, dealerHand, currentBet, isPlaying, currentHandIndex, playerScore, dealerScore, canDouble, canSplit } = state;

        // Update Bet
        const betValEl = this.container.querySelector('#current-bet-val');
        if (betValEl) betValEl.textContent = currentBet;

        // Update Controls Visibility
        this.updateControls(isPlaying, currentBet, canDouble, canSplit);

        // Update Hands
        this.renderPlayerHands(playerHands, currentHandIndex, isPlaying, playerScore);
        this.renderDealerHand(dealerHand, isPlaying, dealerScore);
    }

    updateControls(isPlaying, currentBet, canDouble, canSplit) {
        const bettingControls = this.container.querySelector('#betting-controls');
        const gameActions = this.container.querySelector('#game-actions');
        const insBtn = this.container.querySelector('#insurance-btn');
        const dealBtn = this.container.querySelector('#deal-btn');

        const doubleBtn = this.container.querySelector('#double-btn');
        const splitBtn = this.container.querySelector('#split-btn');

        if (isPlaying === true) {
            bettingControls.style.display = 'none';
            gameActions.style.display = 'flex';
            if (insBtn) insBtn.style.display = 'none';

            // Conditional Visibility for Special Actions
            if (doubleBtn) {
                doubleBtn.style.display = canDouble ? 'inline-flex' : 'none'; // Use inline-flex for round centered alignment
            }
            if (splitBtn) {
                splitBtn.style.display = canSplit ? 'inline-flex' : 'none';
            }

        } else if (isPlaying === 'dealer_turn') {
            bettingControls.style.display = 'none';
            gameActions.style.display = 'none';
        } else {
            bettingControls.style.display = 'flex';
            gameActions.style.display = 'none';

            // Enable Deal button if bet > 0
            if (dealBtn) {
                dealBtn.disabled = (currentBet <= 0);
            }
        }
    }

    showInsuranceParam(show) {
        const insBtn = this.container.querySelector('#insurance-btn');
        if (insBtn) {
            insBtn.style.display = show ? 'inline-block' : 'none';
            insBtn.disabled = !show;
        }
    }

    renderPlayerHands(hands, currentIndex, isPlaying, score) {
        const wrapper = this.container.querySelector('#player-hand');
        wrapper.innerHTML = '';
        const scoreEl = this.container.querySelector('#player-score');

        if (!hands || hands.length === 0) {
            scoreEl.textContent = '';
            return;
        }

        hands.forEach((hand, index) => {
            const handDiv = document.createElement('div');
            handDiv.className = 'hand-container';

            // Highlight active hand
            if (index === currentIndex && isPlaying && isPlaying !== 'dealer_turn') {
                handDiv.classList.add('active-hand');
            }
            handDiv.style.margin = '0 10px';

            hand.cards.forEach(card => {
                handDiv.appendChild(this.createCardElement(card));
            });

            wrapper.appendChild(handDiv);
        });

        // Show score of active hand
        scoreEl.textContent = (score !== undefined) ? score : '';
    }

    renderDealerHand(hand, isPlaying, score) {
        const wrapper = this.container.querySelector('#dealer-hand');
        wrapper.innerHTML = '';
        const scoreEl = this.container.querySelector('#dealer-score');

        if (!hand || hand.length === 0) {
            scoreEl.textContent = '';
            return;
        }

        hand.forEach((card, index) => {
            // Hide second card if playing and index is 1
            const isHidden = (isPlaying && index === 1);

            let cardEl;
            if (isHidden) {
                cardEl = document.createElement('div');
                cardEl.className = 'card back';
                cardEl.style.animation = 'deal-card 0.3s ease-out';
            } else {
                cardEl = this.createCardElement(card);
            }
            wrapper.appendChild(cardEl);
        });

        scoreEl.textContent = (score !== undefined) ? score : '';
    }

    createCardElement(card) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.style.animation = 'deal-card 0.3s ease-out';
        cardEl.textContent = `${card.value}${card.suit}`;
        if (card.suit === '♥' || card.suit === '♦') {
            cardEl.style.color = 'red';
        }
        return cardEl;
    }

    showMessage(msg) {
        const msgEl = this.container.querySelector('#game-message');
        if (msgEl) msgEl.textContent = msg;
    }

    updateScoreDisplay(playerScore, dealerScore) {
        const pScoreEl = this.container.querySelector('#player-score');
        const dScoreEl = this.container.querySelector('#dealer-score');
        if (pScoreEl) pScoreEl.textContent = playerScore;
        if (dScoreEl) dScoreEl.textContent = dealerScore;
    }
}
