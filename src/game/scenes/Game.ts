// src/game/scenes/MathRacing.ts
import { Scene } from 'phaser';
import GameStateManager from '../GameStateManager'
import * as Colyseus from 'colyseus.js';
import '../../style/game.css';

export class MathRacing extends Scene {
    private client: Colyseus.Client | null = null;
    private gameStateManager: GameStateManager | null = null;

    private room: Colyseus.Room | null = null;
    private players: Map<string, any> = new Map();
    private myPlayerId: string | null = null;
    private trackObjects: any[] = [];
    private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    // UI Elements
    private questionPanel: Phaser.GameObjects.Container | null = null;
    private questionText: Phaser.GameObjects.Text | null = null;
    private timerBarBg: Phaser.GameObjects.Graphics; // For the background of the bar
    private timerBarFill: Phaser.GameObjects.Graphics; // For the fill of the bar
    private questionTimer: Phaser.Time.TimerEvent; // To control the timer

    private currentQuestionText: string | null = null;
    private scoreText: Phaser.GameObjects.Text | null = null;
    private connectionStatusText: Phaser.GameObjects.Text | null = null;
    private answerContainer: HTMLDivElement | null = null;
    private answerInput: HTMLInputElement | null = null;
    private answerButton: HTMLButtonElement | null = null;


    constructor() {
        super({ key: 'MathRacing' });
    }

    create() {
        console.log('Math Racing scene started!');
        this.players = new Map();

        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 8, 8); // Draw a white 8x8 square
        graphics.generateTexture('spark', 8, 8); // Convert the drawing to a texture named 'spark'
        graphics.destroy(); // Clean up the graphics object, we don't need it anym

        this.gameStateManager = GameStateManager.getInstance();
        const canvas = document.getElementsByTagName('canvas')[0] as HTMLElement;
        canvas.style.display="block";
        // The room should already be connected from RoomLobby
        if (!this.gameStateManager.isConnected) {
            console.error('No active room connection!');
            this.scene.start('MainMenu');
            return;
        }

        this.room = this.gameStateManager.room;
        this.myPlayerId = this.gameStateManager.myPlayerId;

        console.log('Using existing connection:', this.myPlayerId);

        // Create beautiful gradient background
        this.createBackground();

        // Create track
        this.createTrack();

        // Create UI elements
        this.createUI();

        // Create particle system for effects
        this.createParticleSystem();

        // Connect to game server        
        // Setup keyboard controls for debugging
        this.setupControls();
        this.setupRoomEvents();
        this.createAnswerForm();
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
        this.updateConnectionStatus(this.gameStateManager.isConnected);

    }

    private createBackground(): void {
        // Create animated gradient background
        const { width, height } = this.sys.game.config;
        const graphics = this.add.graphics();

        // Main background gradient
        graphics.fillGradientStyle(0x667eea, 0x667eea, 0x764ba2, 0x764ba2);
        graphics.fillRect(0, 0, width as number, height as number);

        // Add floating cloud-like shapes for Fall Guys aesthetic
        for (let i = 0; i < 8; i++) {
            const cloud = this.add.graphics();
            const colors = [0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3];
            const color = colors[Math.floor(Math.random() * colors.length)];

            cloud.fillStyle(color, 0.1);
            cloud.fillCircle(0, 0, 40 + Math.random() * 60);
            cloud.x = Math.random() * (width as number);
            cloud.y = Math.random() * (height as number);

            // Gentle floating animation
            this.tweens.add({
                targets: cloud,
                y: cloud.y + (Math.random() * 40 - 20),
                x: cloud.x + (Math.random() * 60 - 30),
                duration: 4000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    private createTrack(): void {
        const { width } = this.sys.game.config;
        const laneHeight = 120; // one lane height
        const trackWidth = (width as number) - 100;
        const startY = 150; // top Y offset
        const numPlayers = this.gameStateManager!.roomPlayers.size;

        // === Draw lanes ===
        const roadTileHeight = this.textures.get("roadMain").getSourceImage().height;
        for (let i = 0; i < numPlayers; i++) {
            const y = startY + i * laneHeight + laneHeight / 2;

            const roadMain = this.add.tileSprite(
                (width as number) / 2,
                y,
                width as number,
                laneHeight,
                "roadMain"
            );

            // Scale texture vertically so one full tile fits in 100px
            const roadTileHeight = this.textures.get("roadMain").getSourceImage().height;
            roadMain.setTileScale(1, laneHeight / roadTileHeight);
        }


        // === Add side borders ===
        const totalHeight = numPlayers * laneHeight;

        // top side
        this.add.tileSprite(
            (width as number) / 2,
            startY - 20,
            width as number,
            40,
            "roadSide01"
        );

        // bottom side
        this.add.tileSprite(
            (width as number) / 2,
            startY + totalHeight,
            width as number,
            40,
            "roadSide02"
        );

        // === Lane dividers ===
        const overlay = this.add.graphics();
        overlay.lineStyle(2, 0xe9ecef, 0.7);
        for (let i = 1; i < numPlayers; i++) {
            const y = startY + i * laneHeight;
            overlay.lineBetween(60, y, trackWidth + 40, y);
        }

        // // Start and finish lines
        // overlay.lineStyle(8, 0x4ecdc4);
        // overlay.lineBetween(70, startY, 70, startY + totalHeight);

        // overlay.lineStyle(8, 0xff6b6b);
        // overlay.lineBetween(trackWidth + 30, startY, trackWidth + 30, startY + totalHeight);


        // Get the original width of our start line image. After rotating, this becomes its "height".
        const startLineWidth = this.textures.get('start').getSourceImage().width;

        // Calculate the required scale to make the rotated image span the total track height.
        const requiredScaleY = totalHeight / startLineWidth;

        // --- Create the Start Line ---
        const startLineX = 30;
        // The Y position should be the center of the entire track height.
        const lineCenterY = startY + totalHeight / 2;

        const startLineImage = this.add.image(startLineX, lineCenterY - 10, 'start');
        startLineImage.setAngle(90); // Rotate it 90 degrees to be vertical
        startLineImage.setScale(requiredScaleY); // Scale it to fit the track height
        startLineImage.setAlpha(0.7);
        // --- Create the Finish Line ---
        const finishLineX = trackWidth + 50;
        const finishLineImage = this.add.image(finishLineX, lineCenterY - 10, 'finish');
        finishLineImage.setAngle(90);
        finishLineImage.setScale(requiredScaleY);
        finishLineImage.setAlpha(0.7);

    }

    private createTrackDecorations(trackWidth: number): void {
        // Add some cute decorative elements along the track
        for (let i = 0; i < 12; i++) {
            const decoration = this.add.graphics();
            const colors = [0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3, 0x54a0ff];
            const color = colors[Math.floor(Math.random() * colors.length)];

            decoration.fillStyle(color, 0.6);
            decoration.fillCircle(0, 0, 8 + Math.random() * 6);
            decoration.x = 80 + (i * (trackWidth - 60) / 11);
            decoration.y = 60 + Math.random() * 20;

            // Gentle bounce animation
            this.tweens.add({
                targets: decoration,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 1000 + Math.random() * 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Math.random() * 2000
            });
        }
    }

    private startQuestionTimer(duration: number): void {

        // Reset the bar to its full width initially
        this.timerBarFill.scaleX = 1;

        // Use a tween for a super smooth reduction
        this.tweens.add({
            targets: this.timerBarFill,
            scaleX: 0, // Animate the horizontal scale to 0
            ease: 'Linear', // Ensures a constant speed
            duration: duration,
            onComplete: () => {
                console.log("Time's up!");
                // Handle what happens when the timer runs out
            }
        });
    }

    private createUI(): void {
        const { width, height } = this.sys.game.config;

        // Connection status
        this.connectionStatusText = this.add.text(20, 20, 'Connecting...', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#ff6b6b',
            padding: { x: 10, y: 5 }
        }).setDepth(100);

        // Score display
        this.scoreText = this.add.text((width as number) - 20, 20, 'Score: 0', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#4ecdc4',
            padding: { x: 15, y: 8 }
        }).setOrigin(1, 0).setDepth(100);

        // Question panel container
        this.questionPanel = this.add.container((width as number) / 2, 60);

        const questionBg = this.add.graphics();
        questionBg.fillStyle(0xff6b6b, 0.95);
        questionBg.fillRoundedRect(-200, -40, 400, 80, 20);

        this.questionText = this.add.text(0, 0, 'Ready to race!', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // --- New Progress Bar Code ---

        // Define dimensions for the progress bar
        const barWidth = 360;
        const barHeight = 25;
        const barRadius = 12;
        const barYOffset = 60; // Position it below the question background

        // 1. Create the background for the timer bar
        this.timerBarBg = this.add.graphics();
        this.timerBarBg.fillStyle(0x4E4E4E, 0.7); // Dark grey, slightly transparent background
        this.timerBarBg.fillRoundedRect(-barWidth / 2, barYOffset - barHeight / 2, barWidth, barHeight, barRadius);

        // 2. Create the fill for the timer bar
        this.timerBarFill = this.add.graphics();
        this.timerBarFill.fillStyle(0x66ff66); // Bright green for the fill
        this.timerBarFill.fillRoundedRect(-barWidth / 2, barYOffset - barHeight / 2, barWidth, barHeight, barRadius);

        // 3. Create a mask to keep the corners of the fill rounded as it scales
        const maskGraphics = this.add.graphics();
        maskGraphics.fillStyle(0xffffff); // Color doesn't matter for a mask
        maskGraphics.fillRoundedRect(-barWidth / 2, barYOffset - barHeight / 2, barWidth, barHeight, barRadius);

        const mask = new Phaser.Display.Masks.GeometryMask(this, maskGraphics);
        this.timerBarFill.setMask(mask);
        // Note: The mask's position is relative to the scene, so we add it to the container too
        // to ensure it moves with the panel.
        maskGraphics.x = this.questionPanel.x;
        maskGraphics.y = this.questionPanel.y;



        this.questionPanel.add([questionBg, this.questionText, this.timerBarBg, this.timerBarFill]);

        this.questionPanel.setDepth(100);
        this.questionPanel.setVisible(false);

        // Instructions
        // this.add.text((width as number) / 2, (height as number) - 40, 
        //     'Press SPACE to answer 42 | Arrow Keys: Navigate | ENTER: Submit Answer', {
        //     fontSize: '14px',
        //     fontFamily: 'Arial',
        //     color: '#ffffff',
        //     backgroundColor: '#000000',
        //     padding: { x: 10, y: 5 }
        // }).setOrigin(0.5).setDepth(100);
    }

// Replace your old createParticleSystem function with this new "flashier" version

private createParticleSystem(): void {
    this.particles = this.add.particles(0, 0, 'spark', {
        // --- Visual Upgrades ---
        scale: { start: 0.8, end: 0 }, // Particles are now larger at the start
        lifespan: 600,                 // They last longer, creating a more visible trail
        blendMode: 'ADD',              // Keeps the bright glow effect
        tint: 0xffff00,                // Adds a fiery yellow tint to the white sparks
        
        // --- Motion Upgrades ---
        speed: { min: 150, max: 300 }, // They shoot out faster and with more variance
        angle: { min: 150, max: 210 }, // A tighter cone pointing backwards
        gravityY: 300,                 // Pulls particles down slightly for a nice arc effect
        
        // --- Emitter Settings ---
        frequency: -1,                 // Still a "burst" emitter
        quantity: 30                   // Emits double the particles for a bigger burst
    });

    this.particles.setDepth(100);
}

    private setupControls(): void {
        // Create cursors for debugging/demo purposes
        const cursors = this.input.keyboard?.createCursorKeys();

        // Space key to submit answer (demo: always answer 42)
        this.input.keyboard?.on('keydown-SPACE', () => {
            if (this.room) {
                // this.room.send('answer', { answer: 42 });
                // this.showNotification('Answer submitted: 42', 0x4ecdc4);
                this.submitAnswer();
            }
        });

        // Enter to start game
        this.input.keyboard?.on('keydown-ENTER', () => {
            if (this.room && this.room.state.gamePhase === 'waiting') {
                this.room.send('startGame');
            }
            if (this.room && this.room.state.gamePhase === 'racing') {
                this.submitAnswer();
            }
        });
    }

    //answering elements and function

    private submitAnswer(): void {
        if (!this.answerInput) return;
        const value = parseInt(this.answerInput.value, 10);
        if (!isNaN(value)) {
            console.log("Submitting answer:", value);
            this.room?.send("answer", { answer: value });
            this.answerInput.value = ""; // clear after submit
        }
    }


    private createAnswerForm(): void {
        this.answerContainer = document.createElement("div");
        this.answerContainer.className = "answer-container";

        // Input
        this.answerInput = document.createElement("input");
        this.answerInput.type = "number";
        this.answerInput.placeholder = "Enter your answer";
        this.answerInput.className = "answer-input";

        // Button
        this.answerButton = document.createElement("button");
        this.answerButton.innerText = "Submit";
        this.answerButton.className = "answer-button";

        this.answerButton.addEventListener("click", () => this.submitAnswer());

        this.answerContainer.appendChild(this.answerInput);
        this.answerContainer.appendChild(this.answerButton);
        document.body.appendChild(this.answerContainer);


    }

    private onShutdown(): void {
        console.log("MathRacing scene shutting down, cleaning HTML");

        if (this.players) {
            this.players.forEach((playerObj) => {
                // Destroying the main container also destroys its children (kart, nameplate)
                playerObj.container?.destroy(); 
            });
            // Clear the map itself after destroying the objects
            this.players.clear();
        }

        
        if (this.answerContainer) {
            document.body.removeChild(this.answerContainer);
            this.answerContainer = null;
            this.answerInput = null;
            this.answerButton = null;
        }
        
        // --- ADD THIS CLEANUP LOGIC ---
        const gameOverUI = document.getElementById('game-over-ui');
        if (gameOverUI) {
            document.body.removeChild(gameOverUI);
        }
    }


    private setupRoomEvents(): void {

        const room = this.gameStateManager!.room;
        if (!room) {
            console.error('No room available!');
            return;
        }


        // Wait for the initial state to be available, then set up continuous listeners
        room.onStateChange.once((state: any) => {
            console.log('Initial state received', state);

            // Now set up the player events that will continue to work
            if (state.players) {
                // Handle existing players (already in the room)
                state.players.forEach((player: any, playerId: string) => {
                    console.log('Existing player:', playerId, player);
                    this.createPlayerKart(player, playerId);
                });
            }
        });

        // Set up continuous listeners that will work for all future changes
        room.onStateChange((state: any) => {
            this.updateConnectionStatus(this.gameStateManager!.isConnected);
            if (state.players) {
                // Handle existing players first
                state.players.forEach((player: any, playerId: string) => {
                    if (!this.players.has(playerId)) {
                        console.log('Creating kart for existing player:', playerId, player.name);
                        this.createPlayerKart(player, playerId);
                    } else {
                        // Update existing player
                        this.updatePlayer(player, playerId);
                    }
                });

                // Remove players that left
                const currentPlayerIds = new Set();
                state.players.forEach((player: any, playerId: string) => {
                    currentPlayerIds.add(playerId);
                });

                this.players.forEach((playerObj, playerId) => {
                    if (!currentPlayerIds.has(playerId)) {
                        console.log('Player left during race:', playerId);
                        playerObj.container?.destroy(); // Destroy the main container
                        this.players.delete(playerId);
                    }
                });
            }
        });

        // Game messages
        this.room!.onMessage('gameStarted', (data: any) => {
            this.showNotification('🏁 Race Started! Answer questions to speed up!', 0x4ecdc4);
        });

        this.room!.onMessage('playerAnswered', (data: any) => {
            if (data.correct) {
                this.showSpeedBoost(data.playerId);
                if (data.playerId === this.myPlayerId) {
                    this.showNotification('✅ Correct! Speed boost!', 0x4ecdc4);
                }
            } else {
                if (data.playerId === this.myPlayerId) {
                    this.showNotification('❌ Wrong answer, try again!', 0xff6b6b);
                }
            }
        });

        this.room!.onMessage('gameFinished', (data: any) => {
            this.showGameOver(data.winner, data.standings);
        });

        this.room!.onMessage('canStart', (data: any) => {
            if (data.playersNeeded === 0) {
                this.showNotification('Ready to start! Press ENTER to begin race.', 0xfeca57);
            }
        });

        // Handle disconnection
        this.room!.onLeave((code: number) => {
            console.log('Left room with code:', code);
            this.updateConnectionStatus(false);
        });
    }
    private createPlayerKart(player: any, playerId: string): void {
        const startY = 150;
        const laneHeight = 120;
        const laneIndex = this.players.size;
        const laneY = startY + (laneIndex * laneHeight) + (laneHeight / 2);
    
        // --- 1. Create the MAIN PARENT CONTAINER ---
        // This is the only object we will move later.
        const playerContainer = this.add.container(80, laneY);
    
        // --- 2. Create the Kart Sprite AT (0, 0) ---
        // Its position is now RELATIVE to the playerContainer.
        const carSpriteKey = player.character?.car || 'assets/png/char/mc_car.png';
        const kart = this.add.sprite(0, 0, carSpriteKey);
        kart.setAngle(-90);
        kart.setScale(0.2);
    
        // --- 3. Create the Nameplate, also RELATIVE to the parent ---
        const nameplateContainer = this.add.container(0, -45); // Positioned above the kart (0,0)
    
        const nameplateBg = this.add.graphics();
        nameplateBg.fillStyle(0x2d3436, 0.8);
        nameplateBg.fillRoundedRect(-50, -15, 100, 30, 15);
        nameplateBg.lineStyle(2, 0xffffff, 0.9);
        nameplateBg.strokeRoundedRect(-50, -15, 100, 30, 15);
    
        const nameText = this.add.text(0, 0, player.name || 'Player', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    
        nameplateContainer.add([nameplateBg, nameText]);
    
        // --- 4. Add the kart and nameplate AS CHILDREN to the main container ---
        playerContainer.add([kart, nameplateContainer]);
        playerContainer.setDepth(10);
    
        // --- 5. Store the main container AND the kart for individual effects ---
        this.players.set(playerId, {
            container: playerContainer, // This is what we'll move
            kart: kart,                 // We keep a reference to this for effects like scaling
            data: player
        });
    }

// Replace your old updatePlayer function with this one

private updatePlayer(player: any, playerId: string): void {
    if (!this.players.has(playerId)) return;

    const playerObj = this.players.get(playerId);
    const { width } = this.sys.game.config;
    const trackWidth = (width as number) - 150;

    const progress = Math.min(player.x / 2000, 1);
    const targetX = 80 + (progress * trackWidth);

    // --- FIX: We now only need to tween the single parent container ---
    this.tweens.add({
        targets: playerObj.container, // Just move the parent!
        x: targetX,
        duration: 100,
        ease: 'Power2'
    });

    if (playerId === this.myPlayerId) {
        this.currentQuestionText = player.currentQuestion;
        this.updateQuestionPanel(player);
        this.updateScore(player.score || 0);
    }
}

    private updateQuestionPanel(player: any): void {
        if (!this.questionPanel || !this.questionText) return;
        if (player.currentQuestion && player.currentQuestion !== this.questionText.text.replace(' = ?', '')) {
            // <<< FIX 1: Stop any tweens currently running on the timer bar.
            // This is the crucial step that was missing.
            this.tweens.killTweensOf(this.timerBarFill);

            // Update the question text
            this.questionText.setText(`${player.currentQuestion} = ?`);

            // <<< FIX 2: Now that the old tween is gone, start the new one.
            this.startQuestionTimer(player.questionTimer);

        }


        if (player.currentQuestion && player.currentQuestion !== '') {
            this.questionPanel.setVisible(true);
        } else {
            this.questionPanel.setVisible(false);
        }

    }

    private updateScore(score: number): void {
        if (this.scoreText) {
            this.scoreText.setText(`Score: ${score}`);
        }
    }

    private updateConnectionStatus(isConnected: boolean): void {
        if (this.connectionStatusText) {
            if (isConnected) {
                this.connectionStatusText.setText('🟢 Connected');
                this.connectionStatusText.setBackgroundColor('#4ecdc4');
            } else {
                this.connectionStatusText.setText('🔴 Disconnected');
                this.connectionStatusText.setBackgroundColor('#ff6b6b');
            }
        }
    }
// Replace your showSpeedBoost function one last time with this correct version.

// Replace your old showSpeedBoost function with this one

private showSpeedBoost(playerId: string): void {
    if (this.players.has(playerId)) {
        const playerObj = this.players.get(playerId);
        const playerContainer = playerObj.container;

        if (this.particles) {
            // --- THE POSITIONING FIX ---
            // Calculate the position for the back of the car.
            // 'displayWidth' is the car's width after being scaled.
            // We subtract half of that from the center to get to the back edge.
            const emitX = playerContainer.x - (playerObj.kart.displayWidth / 2) - 5;
            const emitY = playerContainer.y;

            // Emit the particles at the new, corrected position.
            // The quantity is now controlled by the emitter's config, so we don't need it here.
            this.particles.emitParticleAt(emitX, emitY);
        }

        // Scale animation (no change needed here)
        this.tweens.add({
            targets: playerObj.kart,
            scaleX: 0.25,
            scaleY: 0.25,
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }
}

    private showNotification(message: string, color: number): void {
        const { width } = this.sys.game.config;
        const notification = this.add.text(
            (width as number) / 2,
            150,
            message,
            {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#ffffff',
                backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
                padding: { x: 15, y: 8 }
            }
        ).setOrigin(0.5).setDepth(200);

        // Animate notification
        notification.setAlpha(0);
        this.tweens.add({
            targets: notification,
            alpha: 1,
            y: 170,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Remove after delay
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: notification,
                alpha: 0,
                y: 130,
                duration: 300,
                onComplete: () => notification.destroy()
            });
        });
    }

    private showGameOver(winner: string, standings: any[]): void {
        // 1. Create the main overlay container
        const gameOverContainer = document.createElement('div');
        gameOverContainer.id = 'game-over-ui';
        gameOverContainer.className = 'game-over-overlay';
    
        // 2. Prepare the HTML for the podium spots
        // We will build this dynamically from the standings array
        let podiumHTML = '';
        const medals = ['🥇', '🥈', '🥉'];
    
        // Create HTML for the top 3 players
        for (let i = 0; i < Math.min(standings.length, 3); i++) {
            const player = standings[i];
            const placement = ['first', 'second', 'third'][i];
            
            podiumHTML += `
                <div class="podium-spot ${placement}-place">
                    <div class="player-name">${medals[i]} ${player.name}</div>
                    <div class="player-score">${player.score} PTS</div>
                </div>
            `;
        }
    
        // 3. Assemble the final HTML for the entire screen
        gameOverContainer.innerHTML = `
            <div class="results-panel">
                <img src="assets/png/crown.png" class="crown-image" alt="Crown" />
                <h1 class="results-title">RACE FINISHED!</h1>
                <div class="winner-podium">
                    ${podiumHTML}
                </div>
                <button id="exit-results-btn" class="exit-button answer-button">Back to Lobby</button>
            </div>
        `;
    
        // 4. Add the new UI to the document
        document.body.appendChild(gameOverContainer);
    
        // 5. Set up the event listener for the exit button
        const exitButton = document.getElementById('exit-results-btn');
        exitButton?.addEventListener('click', () => {
            // Clean up the UI when the button is clicked
            document.body.removeChild(gameOverContainer);
            
            // Go back to the character selection scene
            this.scene.start('CharaSelect');
        });
    }

    preload(): void {


        this.load.image("assets/png/char/mc_car_.png", "assets/png/char/mc_car.png");
        this.load.image("assets/png/char/wolf_car_.png", "assets/png/char/wolf_car.png");
        this.load.image("assets/png/char/farmer_car_.png", "assets/png/char/farmer_car.png");
        this.load.image("assets/png/char/fairy_car_.png", "assets/png/char/fairy_car.png");
        this.load.image("assets/png/char/doc_car_.png", "assets/png/char/doc_car.png");

        this.load.image("roadMain", "assets/png/Road_01/Road_01_Tile_07/Layers/Road_Main.png");
        this.load.image("roadSide01", "assets/png/Road_01/Road_01_Tile_04/Layers//Road_Side_01.png");
        this.load.image("roadSide02", "assets/png/Road_01/Road_01_Tile_04/Layers//Road_Side_02.png");
        this.load.image("start", "assets/png/start_resized.png");
        this.load.image("finish", "assets/png/finish.png");

        // Create simple colored rectangles as placeholders for sprites
        // this.load.image('spark', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAJ0lEQVQYlWP8//8/AzYwirUBF2BkZPxvYGDA6gIspk9gYGBgZGQEADeXAxPRjwOlAAAAAElFTkSuQmCC');
    }

    update(): void {
        // Game loop - handle any continuous updates here
        if (this.room && this.room.state.gamePhase === 'racing') {
            // Update any animations or effects
        }
    }

    
}