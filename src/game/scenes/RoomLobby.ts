// src/game/scenes/RoomLobby.ts - HTML Overlay Version
import { Scene } from 'phaser';
import  GameStateManager  from '../GameStateManager';
import '../../style/lobby.css';

interface Character {
    name: string;
    desc: string;
    sprite: string;
    car: string;
    trait: string;
}


   // Function to add a stylesheet to the document
   export const loadCSS = (path: string) => {
    if (document.getElementById(path)) return; // Don't load if it already exists

    const link = document.createElement('link');
    link.id = path; // Use the path as a unique ID
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = path;
    document.head.appendChild(link);
};

// Function to remove a stylesheet from the document
export const unloadCSS = (path: string) => {
    const link = document.getElementById(path);
    if (link) {
        document.head.removeChild(link);
    }
};


export class RoomLobby extends Scene {
    private gameStateManager: GameStateManager;
    private playerName: string = '';
    private currentCharacter: Character;
    private htmlContainer: HTMLDivElement | null = null;

    constructor() {
        super({ key: 'RoomLobby' });
        this.gameStateManager = GameStateManager.getInstance();
    }

    init(data: any) {
        console.log(data);
        this.playerName = data.name|| 'Anonymous';
        this.currentCharacter = data.character;
        if (this.gameStateManager.playerData) {
            this.gameStateManager.playerData.character = data.character;
        }
   }


    async create() {
  

        //this.createBackground();
        this.createHTMLUI();
        
        // Connect and join room
        await this.connectAndJoinRoom();
        
        // Setup room event listeners
        this.setupRoomEvents();
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    }

    private createBackground(): void {
        // Keep Phaser background
        const { width, height } = this.sys.game.config;
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x667eea, 0x667eea, 0x764ba2, 0x764ba2);
        graphics.fillRect(0, 0, width as number, height as number);
    }

    private createHTMLUI(): void {
        this.htmlContainer = document.createElement('div');
        this.htmlContainer.id = 'lobby-ui';
        this.htmlContainer.innerHTML = `
            <div class="lobby-container">
               <div class="lobby-header">
                    <h1>Race Lobby</h1>
                    <button id="back-btn" class="back-btn">← Exit Menu</button>
                </div>
                
                <div class="players-section">
                    <div id="status-text" class="status-text">Connecting...</div>
                    <div id="players-list" class="players-list">
                        <!-- Player cards will be populated here -->
                    </div>
                </div>
                
                <div class="controls-section">
                    <button id="ready-btn" class="ready-btn">Ready!</button>
                    <button id="start-btn" class="start-btn" style="display: none;">Start Race!</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.htmlContainer);
        this.setupHTMLEventListeners();
    }


    private setupHTMLEventListeners(): void {
        const backBtn = document.getElementById('back-btn');
        const readyBtn = document.getElementById('ready-btn');
        const startBtn = document.getElementById('start-btn');


        readyBtn?.addEventListener('click', () => {
            this.toggleReady();
        });

        startBtn?.addEventListener('click', () => {
            this.startGame();
        });

        backBtn?.addEventListener('click', () => {
            this.gameStateManager.leaveRoom(); // Correctly leaves the multiplayer room
            this.scene.start('CharaSelect');   // Goes to the Character Selection scene
        });

    }

    // Keep the existing game logic methods but update them to use HTML elements
    private updateStatus(message: string): void {
        const statusElement = document.getElementById('status-text');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    private updatePlayerList(state: any): void {
        const playersListElement = document.getElementById('players-list');
        if (!playersListElement || !state.players) return;

        playersListElement.innerHTML = '';
        this.gameStateManager.roomPlayers.clear();
        
        state.players.forEach((player: any, playerId: string) => {
            this.gameStateManager.roomPlayers.set(playerId, {
                id: playerId,
                name: player.name,
                color: player.color,
                isReady: player.isReady || false,
                character: player.character || null
            });

            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.isReady ? 'is-ready' : ''}`;
            
            const characterSprite = player.character?.sprite || 'path/to/default/character.png';
            // ADDED ICONS BACK HERE
            const readyStatusText = player.isReady ? '✅ Ready' : '⏳ Not Ready';
            const readyStatusClass = player.isReady ? 'status-ready' : 'status-not-ready';

            playerCard.innerHTML = `
                <div class="character-image" style="background-image: url('${characterSprite}')"></div>
                <div class="player-info">
                    <span class="player-name">${player.name || 'Unknown'}</span>
                    <div class="player-status ${readyStatusClass}">${readyStatusText}</div>
                </div>
            `;
            
            playersListElement.appendChild(playerCard);
        });
    }

    private updateGameState(state: any): void {
        const canStart = this.gameStateManager.canStartGame;
        const playerCount = this.gameStateManager.roomPlayers.size;
        const startBtn = document.getElementById('start-btn');
        
        if (playerCount < 2) {
            this.updateStatus(`Waiting for players... (${playerCount}/4)`);
            if (startBtn) startBtn.style.display = 'none';
        } else if (!canStart) {
            this.updateStatus('Waiting for all players to be ready...');
            if (startBtn) startBtn.style.display = 'none';
        } else {
            this.updateStatus('All players ready! Start when ready.');
            if (startBtn) startBtn.style.display = 'block';
        }
    }
    private toggleReady(): void {
        if (!this.gameStateManager.playerData) return;

        const currentReady = this.gameStateManager.playerData.isReady;
        this.gameStateManager.setPlayerReady(!currentReady);
        
        const readyBtn = document.getElementById('ready-btn');
        if (readyBtn) {
            readyBtn.textContent = !currentReady ? 'Cancel' : 'Ready!';
            // Toggling class for styling the main button
            readyBtn.classList.toggle('not-ready', !currentReady);
        }
    }


    private startGame(): void {
        if (this.gameStateManager.canStartGame) {
            this.gameStateManager.startGame();
        }
    }

    // Keep existing methods: connectAndJoinRoom(), setupRoomEvents(), etc.
    private async connectAndJoinRoom(): Promise<void> {
        try {
            const connected = await this.gameStateManager.connectToServer();
            if (!connected) {
                this.updateStatus('❌ Failed to connect to server');
                return;
            }

            const joined = await this.gameStateManager.joinRoom(this.playerName,this.currentCharacter);
            if (!joined) {
                this.updateStatus('❌ Failed to join room');
                return;
            }

            this.updateStatus(`✅ Connected as ${this.playerName}`);
            
        } catch (error) {
            console.error('Connection error:', error);
            this.updateStatus('❌ Connection failed');
        }
    }

    private setupRoomEvents(): void {
        const room = this.gameStateManager.room;
        if (!room) return;

        room.onStateChange((state: any) => {
            this.updatePlayerList(state);
            this.updateGameState(state);
        });

        room.onMessage('gameStarted', () => {
            // this.scene.stop('RoomLobby');
            // this.scene.remove('RoomLobby');
            this.scene.start('MathRacing');
        });

        room.onMessage('playerReady', (data: any) => {
            console.log(`Player ${data.playerId} is ${data.isReady ? 'ready' : 'not ready'}`);
        });
    }

    private onShutdown() {
        
        unloadCSS('../../style/lobby.css');
        unloadCSS('../../style/chara.css');

        console.log("Lobby scene shutting down");
        if (this.htmlContainer) {
          document.body.removeChild(this.htmlContainer);
          this.htmlContainer = null;
        }
      }
}