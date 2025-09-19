import * as Colyseus from "colyseus.js";
import { GameRoomState } from "./schemas"; // <-- IMPORT the schema

const client = new Colyseus.Client("ws://localhost:3001");

// EXPLICITLY TYPE THE RETURN VALUE OF THE FUNCTION
export async function joinGame(): Promise<Colyseus.Room<GameRoomState> | null> {
  try {
    // USE A GENERIC to tell joinOrCreate what state to expect
    const room = await client.joinOrCreate<GameRoomState>("game_room");
    console.log("Joined room successfully!");
    return room;
  } catch (e) {
    console.error("COULD NOT JOIN ROOM", e);
    return null;
  }
}