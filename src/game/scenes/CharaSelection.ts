import { Scene } from 'phaser';
import GameStateManager from '../GameStateManager';
import '../../style/chara.css';

interface Character {
    name: string;
    desc: string;
    sprite: string;
    car: string;
    trait: string;
}


export class CharaSelection extends Scene {
    private gameStateManager: GameStateManager;
    private htmlContainer: HTMLDivElement | null = null;

    
    private characters: Character[] = [        {
            name: "Rahman",
            desc: "Seorang pembalap amatir yang tumbuh dengan rasa kagum pada mendiang ayahnya, seorang legenda lintasan balap yang dihormati semua orang. Tekniknya masih kasar, tapi semangat dan tekadnya membuatnya selalu bangkit lagi.",
            sprite: "assets/png/char/mc.png",
            car: "assets/png/char/mc_car_.png",
            trait:""
        },
        {
            name: "Seto",
            desc: "Peneliti lab yang gila kerja, Tubuhnya kurus agak bungkuk karena bertahun-tahun menekuni eksperimen. Punya penyakit rasa penasaran berlebihan",
            sprite: "assets/png/char/doc.png",
            car: "assets/png/char/doc_car_.png",
            trait:""

        },
        {
            name: "Jacky",
            desc: "Serigala jadi bertubuh besar dan berotot. alak di luar, tapi berhati baik. Bahunya bidang, lengannya kuat, tukang ngebut di jalanan. Pengemudi ojek malam yang penuh cerita",
            sprite: "assets/png/char/wolf.png",
            car: "assets/png/char/wolf_car_.png",
            trait:""

        },
        {
            name: "Rishaq",
            desc: "Pengelana Gurun. Sosok tangguh yang terbiasa hidup keras di bawah teriknya matahari dan selalu mencari harta karun tersembuny dan situs arkeologi.",
            sprite: "assets/png/char/farmer.png",
            car: "assets/png/char/farmer_car_.png",
            trait:""

        },
        {
            name: "Silfy",
            desc: "Makhluk mungil nan anggun dengan jiwa yang menyatu dengan alam. Kulitnya seolah memancarkan cahaya lembut, menandadkan kekuatan magis yang tinggi",
            sprite: "assets/png/char/fairy.png",
            car: "assets/png/char/fairy_car_.png",
            trait:""

        },
    ];
    private currentIndex = 0;

    constructor() {
        super({ key: 'CharaSelect' });
        this.gameStateManager = GameStateManager.getInstance();
    }

    create() {
        this.createBackground();
        const canvas = document.getElementsByTagName('canvas')[0] as HTMLElement;
        canvas.style.display="none";
        this.createHTMLUI();
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    }

    private createBackground(): void {
        const { width, height } = this.sys.game.config;
        const graphics = this.add.graphics();
        graphics.fillRect(0, 0, width as number, height as number);
        graphics.setAlpha(0);
    }

    private createHTMLUI(): void {
        const body = document.getElementsByTagName('body')[0] as HTMLElement;
        body.style.backgroundImage=`url(assets/road_bg.jpg)`;
        this.htmlContainer = document.createElement('div');
        this.htmlContainer.id = 'chara-selection-ui';
        this.htmlContainer.innerHTML = `
        <div class="selection-scene">
        <img class="game-title" src="assets/logo_title.png"></img>

            <div class="username-container">
                <input required type="text" id="username-input" class="username-input" placeholder="Enter Your Name">
            </div>
            <h2 class="panel-title">Pick Character</h2>
            <div class="character-panel">
                <button class="arrow-button left-arrow">◀</button>

                <div class="character-display">
                    <div id="char-sprite" class="character-sprite-container"></div>
                    <div id="car-sprite" class="car-sprite-container"></div>
                </div>

                <button class="arrow-button right-arrow">▶</button>

                <div class="info-and-confirm">
                    <div class="character-description-box">
                        <h2 id="char-name">${this.characters[0].name}</h2>
                        <p id="char-desc">${this.characters[0].desc}</p>
                    </div>
                    <button id="confirm-btn" class="confirm-button">Let's Race!</button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(this.htmlContainer);

        this.setupHTMLEventListeners();
        this.updateCharacterDisplay();
    }

    private setupHTMLEventListeners(): void {
        const leftArrow = this.htmlContainer?.querySelector('.left-arrow');
        const rightArrow = this.htmlContainer?.querySelector('.right-arrow');
        const confirmBtn = document.getElementById('confirm-btn');

        leftArrow?.addEventListener('click', () => {
            this.currentIndex = (this.currentIndex - 1 + this.characters.length) % this.characters.length;
            this.updateCharacterDisplay();
        });

        rightArrow?.addEventListener('click', () => {
            this.currentIndex = (this.currentIndex + 1) % this.characters.length;
            this.updateCharacterDisplay();
        });

        confirmBtn?.addEventListener('click', () => {
            const username = (document.getElementById('username-input') as HTMLInputElement).value || "Anonymous";
            const chosenChar = this.characters[this.currentIndex];
            console.log("✅ Player confirmed:", username);

            // Example: store in game state and start next scene
            // this.gameStateManager.setPlayerName(username);
            // this.gameStateManager.setPlayerChara(chosenChar.name);

            this.scene.start("RoomLobby",{name:username,character:chosenChar}); 
        });
    }

    private updateCharacterDisplay(): void {
        const char = this.characters[this.currentIndex];
        const charSprite = document.getElementById('char-sprite') as HTMLDivElement;
        const carSprite = document.getElementById('car-sprite') as HTMLDivElement;

        if (charSprite) charSprite.style.backgroundImage = `url(${char.sprite})`;
        if (carSprite) carSprite.style.backgroundImage = `url(${char.car})`;

        const nameEl = document.getElementById('char-name');
        const descEl = document.getElementById('char-desc');
        if (nameEl) nameEl.textContent = char.name;
        if (descEl) descEl.textContent = char.desc;
    }

    private onShutdown() {
        if (this.htmlContainer) {
            document.body.removeChild(this.htmlContainer);
            this.htmlContainer = null;
        }
    }
}
