// src/game/GameStateManager.ts
import * as Colyseus from 'colyseus.js';

interface PlayerData {
    id: string;
    name: string;
    color: string;
    isReady: boolean;
    avatar?: string;
    character?: Character;
}

interface Character {
    name: string;
    desc: string;
    sprite: string;
    car: string;
    trait: string;
}

export  default class GameStateManager {
    private static instance: GameStateManager;
    
    public client: Colyseus.Client | null = null;
    public room: Colyseus.Room | null = null;
    public playerData: PlayerData | null = null;
    public roomPlayers: Map<string, PlayerData> = new Map();
    public gameSettings = {
        difficulty: 'easy' as 'easy' | 'medium' | 'hard',
        trackTheme: 'forest'
    };

    private constructor() {}

    public static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }

    async connectToServer(): Promise<boolean> {
        try {
            this.client = new Colyseus.Client('ws://localhost:3001');
            return true;
        } catch (error) {
            console.error('Failed to connect to server:', error);
            return false;
        }
    }

    async joinRoom(playerName: string,currentCharacter:Character, difficulty: string = 'easy'): Promise<boolean> {
        if (!this.client) {
            throw new Error('Not connected to server');
        }

        
        console.log(currentCharacter);

        try {
            this.room = await this.client.joinOrCreate('game_room', {
                name: playerName,
                difficulty: difficulty,
                character:currentCharacter,
            });

            this.playerData = {
                id: this.room.sessionId,
                name: playerName,
                color: this.getRandomColor(),
                isReady: false,
                character:this.playerData?.character
            };

            return true;
        } catch (error) {
            console.error('Failed to join room:', error);
            return false;
        }
    }

    setPlayerName(username: string): void {
        if (username) {
            if (this.playerData) { // Check if playerData exists
                this.playerData.name = username;
            }
        }
    }    


    setPlayerReady(isReady: boolean): void {
        if (this.room && this.playerData) {
            this.playerData.isReady = isReady;
            this.room.send('playerReady', { isReady });
        }
    }

    startGame(): void {
        if (this.room) {
            this.room.send('startGame');
        }
    }

    sendAnswer(answer: number): void {
        if (this.room) {
            this.room.send('answer', { answer });
        }
    }

    useSpecial(type: 'boost' | 'attack', targetId?: string): void {
        if (this.room) {
            this.room.send('useSpecial', { type, targetId });
        }
    }

    leaveRoom(): void {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
        this.playerData = null;
        this.roomPlayers.clear();
    }

    disconnect(): void {
        this.leaveRoom();
        if (this.client) {
            this.client = null;
        }
    }

    private getRandomColor(): string {
        const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57", "#FF9FF3", "#54A0FF"];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Getters for easy access
    get myPlayerId(): string | null {
        return this.playerData?.id || null;
    }

    get isConnected(): boolean {
        return this.client !== null && this.room !== null;
    }

    get canStartGame(): boolean {
        return this.roomPlayers.size >= 2 && 
               Array.from(this.roomPlayers.values()).every(player => player.isReady);
    }
}