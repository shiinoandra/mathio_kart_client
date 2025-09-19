import { Schema, MapSchema,type } from "@colyseus/schema";

// This is the client-side definition of the Player schema from your server
export class PlayerState extends Schema {
    name: string;
    x: number;
    speed: number;
    score: number;
    hasSpecial: boolean;
    currentPersonalQuestion: string;
}

// This is the client-side definition of the GameState schema from your server
export class GameRoomState extends Schema {
    players = new MapSchema<PlayerState>();
    trackDistance: number;
    gamePhase: string;
}