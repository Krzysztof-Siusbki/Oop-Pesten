
/**
 * Pesten - Card Game Logic
 * Implements OOP principles as requested.
 */

// --- Constants ---
const SUITS = ['H', 'S', 'R', 'K']; // Hart, Schoppen, Ruit, Klaver
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SPECIAL_CARDS = ['2', '8', '10', 'K', 'A', 'X'];

// --- Helper Classes ---

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }

    getImageName() {
        if (this.value === 'X') return 'XX.svg';
        return `${this.suit}${this.value}.svg`;
    }

    // Determine color for matching (R/H = Red, S/K = Black)
    getColor() {
        if (this.value === 'X') return 'Joker';
        if (this.suit === 'H' || this.suit === 'R') return 'red';
        return 'black';
    }

    toString() {
        return `${this.suit}${this.value}`;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        // Standard cards
        for (let suit of SUITS) {
            for (let value of VALUES) {
                this.cards.push(new Card(suit, value));
            }
        }
        // Jokers (2x)
        this.cards.push(new Card('J', 'X'));
        this.cards.push(new Card('J', 'X'));
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }

    addCards(cards) {
        this.cards.push(...cards);
    }

    count() {
        return this.cards.length;
    }
}

class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.hand = [];
    }

    receiveCard(card) {
        if (card) this.hand.push(card);
    }

    playCard(index) {
        return this.hand.splice(index, 1)[0];
    }

    removeOneRandomCard() {
        if (this.hand.length === 0) return null;
        const index = Math.floor(Math.random() * this.hand.length);
        return this.hand.splice(index, 1)[0];
    }
}

// --- Main Game Controller ---

class Game {
    constructor() {
        this.deck = new Deck();
        this.players = [
            new Player(0, "You"),
            new Player(1, "Player 1"),
            new Player(2, "Player 2"),
            new Player(3, "Player 3")
        ];
        this.discardPile = [];
        this.currentPlayerIndex = 0; // Starts with Human (usually random, but for UI easy 0)
        this.direction = 1; // 1 = Clockwise, -1 = Counter-Clockwise
        this.gameOver = false;

        // Bind UI Elements
        this.ui = {
            players: [
                document.querySelector('#player-0'),
                document.querySelector('#player-1'),
                document.querySelector('#player-2'),
                document.querySelector('#player-3')
            ],
            hands: [
                document.querySelector('#player-0 .hand'),
                document.querySelector('#player-1 .hand'),
                document.querySelector('#player-2 .hand'),
                document.querySelector('#player-3 .hand')
            ],
            deck: document.querySelector('#deck'),
            discardPile: document.querySelector('#discard-pile'),
            direction: document.querySelector('#direction-indicator'),
            turnIndicator: document.querySelector('#turn-indicator'),
            winOverlay: document.querySelector('#win-overlay'),
            winnerText: document.querySelector('#winner-text')
        };

        // Event Listeners
        this.ui.deck.addEventListener('click', () => this.handleDrawCard());

        this.init();
    }

    init() {
        this.deck.shuffle();
        this.discardPile = [];
        this.players.forEach(p => p.hand = []);
        this.currentPlayerIndex = Math.floor(Math.random() * 4);

        // Deal 7 cards
        for (let i = 0; i < 7; i++) {
            this.players.forEach(p => p.receiveCard(this.deck.draw()));
        }

        // Initial Discard
        this.discardPile.push(this.deck.draw());

        this.render();
        this.showTurnNotification();

        // If first player is not human, start AI turn
        if (this.currentPlayerIndex !== 0) {
            setTimeout(() => this.playAiTurn(), 1000);
        }
    }

    getTopCard() {
        return this.discardPile[this.discardPile.length - 1];
    }

    nextTurn() {
        if (this.gameOver) return;

        // Check Win Condition
        if (this.players[this.currentPlayerIndex].hand.length === 0) {
            this.handleWin(this.currentPlayerIndex);
            return;
        }

        this.currentPlayerIndex += this.direction;

        // Wrap around
        if (this.currentPlayerIndex >= 4) this.currentPlayerIndex = 0;
        if (this.currentPlayerIndex < 0) this.currentPlayerIndex = 3;

        this.render();
        this.showTurnNotification();

        if (this.currentPlayerIndex !== 0) {
            setTimeout(() => this.playAiTurn(), 1500); // AI Delay
        }
    }

    isValidMove(card) {
        const top = this.getTopCard();

        // Defined Rules:
        // 1. Same Value
        // 2. Same Suit (Teken)
        // 3. Joker (X) matches everything AND allows everything on top
        // 4. Jack (J) matches everything (implied by "Joker mag overal" similarity or rules)
        // Let's stick to standard Pesten rules + Assignment specifics

        // Top is Joker or Jack -> Allow everything? Assignment: "Er mag dan dus elke kaart opgegooid worden" (after Joker)
        if (top.value === 'X' || top.value === 'J') return true;

        // Played card is Joker or Jack -> Always allowed
        if (card.value === 'X' || card.value === 'J') return true;

        // Value Match
        if (card.value === top.value) return true;

        // Suit Match
        if (card.suit === top.suit) return true;

        return false;
    }

    async handleCardPlay(playerIndex, cardIndex) {
        if (this.gameOver) return;

        const player = this.players[playerIndex];
        const card = player.hand[cardIndex];

        if (!this.isValidMove(card)) {
            if (playerIndex === 0) alert("Kan deze kaart niet spelen!");
            return false;
        }

        // Play the card
        player.playCard(cardIndex);
        this.discardPile.push(card);
        this.render();

        // Check Win immediately after playing
        if (player.hand.length === 0) {
            this.handleWin(playerIndex);
            return true;
        }

        // Handle Special Effects
        let skipTurnBase = false;

        switch (card.value) {
            case '2': // Next player +2
                this.advancePointer();
                this.forceDraw(2);
                break;
            case 'X': // Joker: Next player +5
                this.advancePointer();
                this.forceDraw(5);
                break;
            case '8': // Skip next player
                this.advancePointer(); // Skip the one who would have been next
                // Standard nextTurn will move to the one after
                break;
            case 'A': // Reverse
                this.direction *= -1;
                // Immediate turn change handles the direction
                break;
            case '10': // Pass card
                this.handlePassCardRule();
                break; // Proceed to next player
            case 'K': // Play again
                // Do NOT advance turn.
                // If AI, trigger AI again.
                if (playerIndex !== 0) {
                    setTimeout(() => this.playAiTurn(), 1000);
                }
                return true; // Return early, don't nextTurn
            default:
                // Normal turn
                break;
        }

        this.nextTurn();
        return true;
    }

    handleDrawCard() {
        if (this.currentPlayerIndex !== 0) return; // Only human can click deck
        this.executeDraw(this.currentPlayerIndex);
    }

    executeDraw(playerIndex) {
        if (this.deck.count() === 0) {
            this.recycleDeck();
        }

        // Rule: logic says clicking deck draws 1 card and passes turn.
        const card = this.deck.draw();
        this.players[playerIndex].receiveCard(card);

        this.render();
        this.nextTurn();
    }

    forceDraw(amount) {
        const victimIndex = this.currentPlayerIndex;
        // The pointer is currently ON the victim because we advanced it manually in switch

        for (let i = 0; i < amount; i++) {
            if (this.deck.count() === 0) this.recycleDeck();
            this.players[victimIndex].receiveCard(this.deck.draw());
        }
        // Turn ends after receiving penalty? Usually yes.
        // So we just leave the pointer here and let nextTurn() move it away from victim?
        // Wait:
        // P1 Plays 2. 
        // advancePointer() -> P2.
        // forceDraw(2) -> P2 gets cards.
        // nextTurn() -> advances P2 to P3.
        // Correct.
    }

    advancePointer() {
        this.currentPlayerIndex += this.direction;
        if (this.currentPlayerIndex >= 4) this.currentPlayerIndex = 0;
        if (this.currentPlayerIndex < 0) this.currentPlayerIndex = 3;
    }

    handlePassCardRule() {
        // Everyone passes 1 card to the right (next in sequence)
        // Assignment: "10... geef door"

        const passedCards = [];
        this.players.forEach(p => {
            passedCards.push(p.removeOneRandomCard());
        });

        // Rotate cards based on direction? 
        // Usually "Left" or "Right" is static, but let's follow game direction
        const count = this.players.length;

        for (let i = 0; i < count; i++) {
            let nextIndex = i + this.direction;
            if (nextIndex >= count) nextIndex = 0;
            if (nextIndex < 0) nextIndex = count - 1;

            if (passedCards[i]) {
                this.players[nextIndex].receiveCard(passedCards[i]);
            }
        }
        this.render();
    }

    recycleDeck() {
        if (this.discardPile.length <= 1) return; // Can't recycle if empty
        const top = this.discardPile.pop();
        const oldCards = this.discardPile;
        this.discardPile = [top];
        this.deck.addCards(oldCards);
        this.deck.shuffle();
    }

    // --- AI Logic ---
    playAiTurn() {
        if (this.gameOver) return;

        const ai = this.players[this.currentPlayerIndex];
        // 1. Try to find a valid card
        const validCardIndex = ai.hand.findIndex(c => this.isValidMove(c));

        if (validCardIndex !== -1) {
            // Play it
            this.handleCardPlay(this.currentPlayerIndex, validCardIndex);
        } else {
            // Draw
            this.executeDraw(this.currentPlayerIndex);
        }
    }

    // --- UI Rendering ---

    render() {
        // Render Active Player Highlight
        this.ui.players.forEach((el, idx) => {
            el.classList.toggle('active', idx === this.currentPlayerIndex);
        });

        // Render Hands
        this.players.forEach((p, idx) => {
            const container = this.ui.hands[idx];
            container.innerHTML = ''; // Clear

            p.hand.forEach((card, cIdx) => {
                const cardEl = document.createElement('div');
                cardEl.className = 'card';

                // Show face only for Human (0) OR ending game revelation
                // CSS rotates others, so we CAN actually insert the image for all, 
                // but for immersiveness let's keep it "secure" roughly.
                // Actually, CSS rotates P1, P2, P3 piles. 
                // P1 is 90deg, you see side. P2 is 180, you see top upside down?
                // Standard: Only render img for Player 0. Others get generic back.

                if (idx === 0) {
                    cardEl.innerHTML = `<img src="${card.getImageName()}" alt="${card.toString()}">`;
                    cardEl.onclick = () => this.handleCardPlay(0, cIdx);
                } else {
                    cardEl.innerHTML = `<img src="blauw.svg" alt="Back">`;
                }

                container.appendChild(cardEl);
            });
        });

        // Render Discard Pile (Top Only)
        const topCard = this.getTopCard();
        this.ui.discardPile.innerHTML = '';
        if (topCard) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.innerHTML = `<img src="${topCard.getImageName()}" alt="${topCard.toString()}">`;
            this.ui.discardPile.appendChild(cardEl);
        }

        // Render Direction
        if (this.direction === 1) {
            this.ui.direction.className = "clockwise";
            this.ui.direction.textContent = "↻";
        } else {
            this.ui.direction.className = "counter-clockwise";
            this.ui.direction.textContent = "↻";
        }
    }

    showTurnNotification() {
        const text = this.currentPlayerIndex === 0 ? "Jouw Beurt!" : `Speler ${this.currentPlayerIndex}`;
        this.ui.turnIndicator.textContent = text;

        // Reset animation
        this.ui.turnIndicator.classList.remove('hidden');
        this.ui.turnIndicator.style.animation = 'none';
        this.ui.turnIndicator.offsetHeight; /* trigger reflow */
        this.ui.turnIndicator.style.animation = null;
    }

    handleWin(winnerIndex) {
        this.gameOver = true;
        const winnerName = this.players[winnerIndex].name;
        this.ui.winnerText.textContent = `${winnerName} Heeft Gewonnen!`;
        this.ui.winOverlay.classList.remove('hidden');
    }
}

// Start Game
const game = new Game();
