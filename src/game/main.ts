import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { RoomLobby } from './scenes/RoomLobby';
import { CharaSelection } from './scenes/CharaSelection';

import { MathRacing as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 1024,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scene: [
        CharaSelection,
        RoomLobby,
        MainGame,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
