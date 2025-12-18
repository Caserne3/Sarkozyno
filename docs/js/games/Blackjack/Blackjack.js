import { BlackjackRenderer } from './BlackjackRenderer.js';

export class Blackjack {
    constructor(container, casinoManager) {
        this.renderer = new BlackjackRenderer(container);
        this.casinoManager = casinoManager;
        this.deck = [];
        this.dealerHand = [];
        this.playerHands = [];
        this.currentHandIndex = 0;
        this.currentBet = 0;
        this.insuranceBet = 0;
        this.isPlaying = false;
    }

    init() {
        console.log('Blackjack Initialized');
        // Render Table (Renderer)
        this.renderer.renderTable(this.casinoManager.balance);

        // Bind Events (Renderer -> Logic)
        this.renderer.bindEvents({
            onDeal: () => this.handleDealClick(),
            onHit: () => this.hit(),
            onStand: () => this.stand(),
            onDouble: () => this.doubleDown(),
            onSplit: () => this.split(),
            onInsurance: () => this.buyInsurance(),
            onExit: () => this.exitGame(),
            onInput: (action) => this.handleInput(action),
            onUpdates: {
                placeBet: (val) => this.placeBet(val)
            }
        });

        this.resetGame();
    }

    // Handle Keyboard Input
    handleInput(action) {
        if (action === 'space') {
            if (!this.isPlaying) {
                // If betting phase, Deal
                this.handleDealClick();
            } else if (this.isPlaying === true) {
                // If playing, Hit
                this.hit();
            }
        } else if (action === 'enter') {
            if (this.isPlaying === true) {
                this.stand();
            }
        }
    }

    // Exit Game
    exitGame() {
        if (this.casinoManager && this.casinoManager.returnToLobby) {
            this.casinoManager.returnToLobby();
        }
    }

    resetGame() {
        if (!this.deck || this.deck.length === 0) {
            this.deck = this.createDeck(6);
            this.shuffleDeck();
            this.insertCutCard();
        }

        this.dealerHand = [];
        this.playerHands = [];
        this.currentHandIndex = 0;
        this.currentBet = 0;
        this.insuranceBet = 0;
        this.isPlaying = false;
        this.updateRenderer();
    }

    insertCutCard() {
        // Insert cut card towards the bottom (last 60-75 cards)
        // We will simulate this by setting a reshuffle threshold index
        // Since we pop from end, the "bottom" is the beginning of array logic-wise?
        // createDeck pushes cards. So index 0 is bottom.
        // Let's effectively say when deck.length < 75ish, we shuffle.
        this.cutCardThreshold = 60 + Math.floor(Math.random() * 15);
    }

    checkReshuffle() {
        if (this.deck.length <= this.cutCardThreshold) {
            this.renderer.showMessage("Reshuffling...");
            this.deck = this.createDeck(6);
            this.shuffleDeck();
            this.insertCutCard();
        }
    }

    handleDealClick() {
        // ... (existing min bet logic) ...
        // Basic bet validation 
        if (this.currentBet === 0) {
            if (this.casinoManager.balance >= 100) {
                this.casinoManager.updateBalance(-100);
                this.currentBet = 100;
            } else if (this.casinoManager.balance > 0) {
                this.renderer.showMessage("Minimum bet is $100");
                return;
            } else {
                this.renderer.showMessage("Insufficient Funds");
                return;
            }
        }
        this.deal();
    }

    // ... placeBet ...
    placeBet(val) {
        if (this.isPlaying) return;

        if (val === 'all') {
            const allInAmount = this.casinoManager.balance;
            if (allInAmount > 0) {
                this.casinoManager.updateBalance(-allInAmount);
                this.currentBet += allInAmount;
                this.updateRenderer();
            }
            return;
        }

        if (this.casinoManager.balance >= val) {
            this.casinoManager.updateBalance(-val);
            this.currentBet += val;
            this.updateRenderer();
        } else {
            this.renderer.showMessage("Insufficient Funds");
        }
    }

    // ...

    deal() {
        if (this.isPlaying) return;
        if (this.currentBet <= 0) {
            this.renderer.showMessage("Place a bet first!");
            return;
        }

        // Check for cut card before dealing
        this.checkReshuffle();

        this.isPlaying = true;
        this.insuranceBet = 0;

        // Deal 2 cards to player, 2 to dealer
        // To be technically accurate to animation: P1, D1, P2, D2(down)
        // But for logic, we can just grab them.
        this.playerHands = [{
            cards: [this.dealCard(), this.dealCard()],
            bet: this.currentBet,
            isDone: false,
            fromSplitAce: false, // Track split aces
            result: null
        }];
        this.currentHandIndex = 0;
        this.dealerHand = [this.dealCard(), this.dealCard()];

        // Check for naturals logic
        const dealerUpCard = this.dealerHand[0];

        // Render initial state
        this.updateRenderer();

        if (dealerUpCard.value === 'A') {
            this.offerInsurance();
        } else if (['10', 'J', 'Q', 'K'].includes(dealerUpCard.value)) {
            // Dealer checks hole card for BJ immediately if 10-card
            const dealerVal = this.getHandValue(this.dealerHand);
            if (dealerVal === 21) {
                // Dealer has BJ
                this.endRound();
            } else {
                // No BJ, continue
            }
        } else {
            // Check player naturals immediately? 
            // If dealer has no 10/Ace, they don't look. 
            // If Player has 21, they win 3:2 immediately unless Dealer has BJ potential?
            // "If dealer has a natural, they immediately collect... If dealer face up is NOT 10/Ace, they do not look"
            // So if Player has BJ and Dealer updates is say 7. Dealer doesn't check. Player wins immediately?
            // Usually we wait for checking naturals until insurance resolved, but here no insurance needed.
            this.checkForNaturalsAndEndIfPlayerBJ();
        }
    }

    checkForNaturals() {
        // Redundant with logic in deal/insurance?
    }

    checkForNaturalsAndEndIfPlayerBJ() {
        const playerHandObj = this.playerHands[0];
        const playerVal = this.getHandValue(playerHandObj.cards);
        // If Player BJ
        if (playerVal === 21 && playerHandObj.cards.length === 2) {
            const dealerVal = this.getHandValue(this.dealerHand);
            if (dealerVal === 21) {
                this.endRound(); // Push
            } else {
                this.endRound(); // Player BJ Win
            }
        }
    }

    // ...

    doubleDown() {
        if (!this.isPlaying || this.isPlaying === 'dealer_turn') return;
        this.renderer.showInsuranceParam(false);

        const hand = this.playerHands[this.currentHandIndex];
        if (hand.cards.length !== 2) return;

        // Verify Total is 9, 10, or 11
        const val = this.getHandValue(hand.cards);
        if (![9, 10, 11].includes(val)) {
            this.renderer.showMessage("Double only on 9, 10, or 11");
            return;
        }

        if (this.casinoManager.balance >= hand.bet) {
            this.casinoManager.updateBalance(-hand.bet);
            hand.bet *= 2;

            // Deal ONE card face down (conceptually), we just deal it.
            hand.cards.push(this.dealCard());
            hand.isDone = true; // Hand is over after double
            this.updateRenderer();

            this.nextHand();
        } else {
            this.renderer.showMessage("Insufficient funds to Double Down");
        }
    }

    split() {
        if (!this.isPlaying || this.isPlaying === 'dealer_turn') return;
        this.renderer.showInsuranceParam(false);

        const hand = this.playerHands[this.currentHandIndex];
        if (hand.cards.length !== 2) return;

        const c1 = hand.cards[0];
        const c2 = hand.cards[1];

        // Strict: Same denomination (e.g. Jack and Jack, 6 and 6). 
        // 10 and Queen are NOT same denomination? 
        // Rules say: "Same denomination, such as two jacks or two sixes"
        // Usually casinos allow 10-value split (10, J, Q, K).
        // Let's implement strict denomination check as per user text "two jacks".
        // BUT user text also says "ten-card" elsewhere. 
        // "Two jacks or two sixes" implies strict rank.
        // Let's check value strictness.
        if (c1.value !== c2.value) {
            this.renderer.showMessage("Split only on same Rank (e.g. J+J)");
            return;
        }

        if (this.casinoManager.balance >= hand.bet) {
            this.casinoManager.updateBalance(-hand.bet);

            const isAceSplit = (c1.value === 'A');

            const splitHand = {
                cards: [hand.cards.pop()],
                bet: hand.bet,
                isDone: false,
                fromSplitAce: isAceSplit,
                result: null
            };

            // Current hand also keeps one
            hand.fromSplitAce = isAceSplit;

            // Deal 1 card to each
            hand.cards.push(this.dealCard());
            splitHand.cards.push(this.dealCard());

            // Check if Ace Split -> Done immediately (cannot draw again)
            if (isAceSplit) {
                hand.isDone = true;
                splitHand.isDone = true;
            }

            this.playerHands.splice(this.currentHandIndex + 1, 0, splitHand);
            this.updateRenderer();

            // If strictly pair of Aces, we just move to next hand (which is also done) -> effectively dealer turn
            if (isAceSplit) {
                // Check if we need to advance index
                // Actually nextHand() handles advancement.
                // We need to verify logic.
                // Current hand is marked Done. We call nextHand() to move to splitHand (which is also done).
                this.nextHand();
            }
        }
    }

    // ... hit/stand ... (minor updates needed for Split Aces check if missed)
    hit() {
        if (!this.isPlaying || this.isPlaying === 'dealer_turn') return;
        this.renderer.showInsuranceParam(false);

        const hand = this.playerHands[this.currentHandIndex];
        if (hand.isDone) return;
        if (hand.fromSplitAce) return;

        hand.cards.push(this.dealCard());
        this.updateRenderer();

        if (this.getHandValue(hand.cards) > 21) {
            this.renderer.showMessage("Bust!");
            hand.isDone = true;
            this.nextHand();
        }
    }

    stand() {
        if (!this.isPlaying || this.isPlaying === 'dealer_turn') return;
        this.renderer.showInsuranceParam(false);
        this.playerHands[this.currentHandIndex].isDone = true;
        this.nextHand();
    }

    nextHand() {
        if (this.currentHandIndex < this.playerHands.length - 1) {
            this.currentHandIndex++;
            this.updateRenderer();
        } else {
            this.dealerPlay();
        }
    }

    async dealerPlay() {
        this.isPlaying = 'dealer_turn';
        this.updateRenderer();

        await new Promise(r => setTimeout(r, 600));

        let dealerVal = this.getHandValue(this.dealerHand);
        // Dealer hits on 16 or less. Stands on 17.
        // Soft 17 rule? "If the dealer has an ace, and counting it as 11 would bring the total to 17 or more (but not over 21), the dealer must count the ace as 11 and stand." -> This implies Dealer stands on Soft 17.
        // Standard rule: "If the total is 17 or more, it must stand."
        while (dealerVal < 17) {
            this.dealerHand.push(this.dealCard());
            this.updateRenderer();
            dealerVal = this.getHandValue(this.dealerHand);
            await new Promise(r => setTimeout(r, 800));
        }

        this.endRound();
    }

    endRound() {
        this.isPlaying = false;
        const dealerVal = this.getHandValue(this.dealerHand);
        const dealerBJ = (dealerVal === 21 && this.dealerHand.length === 2);

        let totalWin = 0;

        this.playerHands.forEach(hand => {
            const val = this.getHandValue(hand.cards);
            const isBJ = (val === 21 && hand.cards.length === 2 && !hand.fromSplitAce);

            if (val > 21) {
                hand.result = 'bust';
            } else if (dealerBJ) {
                if (isBJ) {
                    hand.result = 'push';
                    totalWin += hand.bet;
                } else {
                    hand.result = 'lose';
                }
            } else if (isBJ) {
                hand.result = 'blackjack';
                totalWin += hand.bet * 2.5; // 3:2
            } else if (dealerVal > 21) {
                hand.result = 'win';
                totalWin += hand.bet * 2;
            } else if (val > dealerVal) {
                hand.result = 'win';
                totalWin += hand.bet * 2;
            } else if (val === dealerVal) {
                hand.result = 'push';
                totalWin += hand.bet;
            } else {
                hand.result = 'lose';
            }
        });

        if (totalWin > 0) {
            this.casinoManager.updateBalance(totalWin);
            this.renderer.showMessage(`Round Over. Won $${totalWin}`);
        } else {
            this.renderer.showMessage("Round Over. Dealer Wins.");
        }

        this.currentBet = 0;
        this.updateRenderer();
    }

    createDeck(numDecks) {
        const suits = ['♠', '♥', '♣', '♦'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        let deck = [];
        for (let i = 0; i < numDecks; i++) {
            for (let suit of suits) {
                for (let value of values) {
                    deck.push({ suit, value });
                }
            }
        }
        return deck;
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCard() {
        return this.deck.pop();
    }

    getHandValue(hand) {
        let value = 0;
        let aces = 0;
        for (let card of hand) {
            let val = card.value;
            if (['J', 'Q', 'K'].includes(val)) {
                value += 10;
            } else if (val === 'A') {
                aces += 1;
                value += 11;
            } else {
                value += parseInt(val);
            }
        }
        while (value > 21 && aces > 0) {
            value -= 10;
            aces -= 1;
        }
        return value;
    }

    updateRenderer() {
        let playerScore = 0;
        let dealerScore = 0;

        if (this.playerHands.length > 0) {
            const currentHand = this.playerHands[this.currentHandIndex];
            if (currentHand) {
                playerScore = this.getHandValue(currentHand.cards);
            }
        }

        if (this.dealerHand.length > 0) {
            if (this.isPlaying && this.isPlaying !== 'dealer_turn') {
                dealerScore = this.getHandValue([this.dealerHand[0]]);
            } else {
                dealerScore = this.getHandValue(this.dealerHand);
            }
        }

        const state = {
            playerHands: this.playerHands,
            dealerHand: this.dealerHand,
            currentBet: this.currentBet,
            isPlaying: this.isPlaying,
            currentHandIndex: this.currentHandIndex,
            playerScore,
            dealerScore,
            // Calculate canDouble and canSplit for UI
            canDouble: this.canDoubleCheck(),
            canSplit: this.canSplitCheck()
        };
        this.renderer.updateUI(state);
    }

    canDoubleCheck() {
        if (!this.isPlaying || this.isPlaying === 'dealer_turn') return false;
        const hand = this.playerHands[this.currentHandIndex];
        if (!hand || hand.cards.length !== 2) return false;
        const val = this.getHandValue(hand.cards);
        return [9, 10, 11].includes(val) && this.casinoManager.balance >= hand.bet;
    }

    canSplitCheck() {
        if (!this.isPlaying || this.isPlaying === 'dealer_turn') return false;
        const hand = this.playerHands[this.currentHandIndex];
        if (!hand || hand.cards.length !== 2) return false;
        const c1 = hand.cards[0];
        const c2 = hand.cards[1];
        if (c1.value !== c2.value) return false; // Strict rank check
        return this.casinoManager.balance >= hand.bet;
    }

    destroy() {
        if (this.renderer && this.renderer.container) {
            this.renderer.container.innerHTML = '';
        }
        this.renderer = null;
    }
}
