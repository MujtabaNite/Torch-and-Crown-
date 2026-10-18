/**
 * Master Game Orchestrator - Torch and Crown
 * Integrates Three.js Scene, Multi-Tiered Depth Platform Physics, Web Audio Synthesis,
 * Time Rewind/Slow, Puzzles, Horde Chase Set-Piece, Voices, and Trailer Mode.
 */

import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { PuzzleManager } from './puzzles.js';
import { TimeManager } from './time.js';
import { CinematicManager } from './cinematics.js';
import { TrailerDirector } from './trailer.js';
import { audio } from './audio.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.sceneManager = null;
    this.player = null;
    this.enemyManager = null;
    this.puzzleManager = null;
    this.timeManager = null;
    this.cinematicManager = null;
    this.trailerDirector = null;

    // Game State
    this.state = 'TITLE'; // 'TITLE', 'CINEMATIC', 'PLAY', 'MODAL', 'DEAD', 'ENDING'
    this.modalReturnState = null;
    this.currentAct = 1;
    this.checkpointX = 2.0;
    this.checkpointY = 1.5;  // platform top is y=1.0; spawn above it
    this.deathsCount = 0;
    this.gameTime = 0;
    this.lastFrameTime = performance.now();

    // Input State
    this.input = {
      left: false,
      right: false,
      jumpHeld: false,
      jumpPressed: false,
      interactPressed: false,
      slowTimeHeld: false,
      rewindHeld: false
    };

    // Level Platforms & Spikes
    this.platforms = [];
    this.spikes = [];
    this.gateMesh = null;
    this.gateX = 52.0;
    this.gateOpen = false;

    this.exitGateMesh = null;
    this.exitGateX = 86.0;
    this.exitGateClosed = false;

    // Toast Prompt
    this.promptToast = document.getElementById('prompt-toast');
    this.toastTimer = null;

    // Trajectory recorder for Echoes
    this.currentRunTrajectory = [];
    this.lastRecordedEcho = [];

    this.init();
  }

  init() {
    // 1. Initialize Scene & Three.js WebGL Renderer
    this.sceneManager = new SceneManager(this.canvas);

    // 2. Build Multi-Tiered Level Platforms with Depth
    this.buildLevelGeometry();

    // 3. Initialize Actors & Managers
    this.player = new Player(this.sceneManager.scene, { reducedFlicker: false });
    this.enemyManager = new EnemyManager(this.sceneManager.scene);
    this.puzzleManager = new PuzzleManager(this.sceneManager.scene);
    this.timeManager = new TimeManager();
    this.cinematicManager = new CinematicManager(this.sceneManager);
    this.trailerDirector = new TrailerDirector(this);

    // 4. Bind Input & UI Event Listeners
    this.bindInputs();
    this.bindUI();

    // 5. Restore Checkpoint from LocalStorage if present
    this.loadCheckpoint();

    // Set initial player position above platform top
    this.teleportPlayer(this.checkpointX, this.checkpointY + 1.5);

    // 6. Start Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  buildLevelGeometry() {
    const matSlate = new THREE.MeshStandardMaterial({
      color: 0x1e2736,
      roughness: 0.65,
      metalness: 0.35
    });
    const matBone = new THREE.MeshStandardMaterial({
      color: 0x7a899e,
      roughness: 0.5,
      metalness: 0.2
    });
    const matFoundation = new THREE.MeshStandardMaterial({
      color: 0x151c27,
      roughness: 0.8,
      metalness: 0.2
    });
    const matTrim = new THREE.MeshStandardMaterial({
      color: 0x324054,
      roughness: 0.6,
      metalness: 0.4
    });

    // Helper to create architectural gothic chessboard platform with depth
    const createSlab = (x, y, w, h, isCrumbling = false) => {
      const slabGroup = new THREE.Group();
      const tileSize = 1.8;
      const tilesCount = Math.max(1, Math.ceil(w / tileSize));

      // 1. Top Checkered Stone Pavers
      for (let i = 0; i < tilesCount; i++) {
        const tx = -w / 2 + i * tileSize + tileSize / 2;
        const isLight = i % 2 === 0;
        const tileGeo = new THREE.BoxGeometry(tileSize - 0.04, 0.35, 3.4);
        const tile = new THREE.Mesh(tileGeo, isLight ? matBone : matSlate);
        tile.position.set(tx, h / 2 - 0.175, 0);
        tile.receiveShadow = true;
        slabGroup.add(tile);
      }

      // 2. Beveled Edge Trim along front and back
      const trimGeo = new THREE.BoxGeometry(w, 0.25, 0.3);
      const frontTrim = new THREE.Mesh(trimGeo, matTrim);
      frontTrim.position.set(0, h / 2 - 0.125, 1.7);
      frontTrim.receiveShadow = true;
      slabGroup.add(frontTrim);

      // 3. Foundation Wall extending into the mist
      const wallHeight = isCrumbling ? 1.5 : 8.0;
      const wallGeo = new THREE.BoxGeometry(w - 0.1, wallHeight, 3.0);
      const wall = new THREE.Mesh(wallGeo, matFoundation);
      wall.position.set(0, h / 2 - wallHeight / 2 - 0.35, 0);
      wall.receiveShadow = true;
      slabGroup.add(wall);

      // 4. Vertical Stone Pilasters / Buttress Ribs (without laggy lights)
      if (!isCrumbling) {
        const pilasterCount = Math.max(2, Math.floor(w / 3.0));
        for (let j = 0; j < pilasterCount; j++) {
          const px = -w / 2 + (j + 0.5) * (w / pilasterCount);
          const pilasterGeo = new THREE.BoxGeometry(0.5, wallHeight, 0.3);
          const pilaster = new THREE.Mesh(pilasterGeo, matTrim);
          pilaster.position.set(px, h / 2 - wallHeight / 2 - 0.35, 1.55);
          pilaster.castShadow = true;
          slabGroup.add(pilaster);

          // Glowing sconce torch (emissive mesh only, no expensive PointLight pass)
          if (j % 2 === 0 && w > 5.0) {
            const sconceGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
            const sconceMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
            const sconce = new THREE.Mesh(sconceGeo, sconceMat);
            sconce.position.set(px, h / 2 - 0.7, 1.75);
            slabGroup.add(sconce);
          }
        }
      }

      slabGroup.position.set(x, y, 0);
      this.sceneManager.scene.add(slabGroup);

      const platObj = {
        x, y, w, h,
        mesh: slabGroup,
        isSolid: true,
        isCrumbling,
        onStep: null
      };

      if (isCrumbling) {
        platObj.onStep = () => {
          if (!platObj.crumblingStarted) {
            platObj.crumblingStarted = true;
            // Crumble shake
            let ct = 0;
            const shakeInt = setInterval(() => {
              ct += 0.05;
              platObj.mesh.position.y += Math.sin(ct * 40) * 0.04;
              if (ct > 0.55) clearInterval(shakeInt);
            }, 30);

            setTimeout(() => {
              platObj.isSolid = false;
              platObj.mesh.position.y -= 14;
            }, 600);
          }
        };
      }

      this.platforms.push(platObj);
      return platObj;
    };

    // ========================================================
    // MULTI-TIERED GOTHIC LEVEL ARCHITECTURE (RICH VERTICAL DEPTH)
    // ========================================================

    // Act I: The Sunken Crypt & Vault (x: 0 to 18)
    // Lower sunken floor
    createSlab(5.5, 0.5, 12.0, 1.0); // top at y = 1.0
    // Stepped stone tier rising up
    createSlab(12.5, 1.3, 4.0, 1.0); // top at y = 1.8
    // Upper Catwalk Ledge with Clue Note 1!
    createSlab(13.0, 3.2, 4.5, 0.5); // top at y = 3.45 (jump up to read lore!)
    // Lower landing stepping into the phantom chasm
    createSlab(15.5, 0.9, 2.5, 1.0); // top at y = 1.4

    // Act II: Hall of Statues & Upper Balcony (x: 25 to 48)
    // Safe landing floor after crossing the phantom chasm
    createSlab(29.0, 1.0, 9.0, 1.0); // x: 24.5 to 33.5, top at y = 1.5
    // Upper Balcony / Rafters (Jump onto to evade the charging Rook!)
    createSlab(31.0, 3.6, 7.5, 0.5); // top at y = 3.85 (overlooks the patrolling Rook)
    // Stepped Transition to the Brazier Courtyard
    createSlab(34.5, 1.2, 3.0, 1.0); // top at y = 1.7
    // Brazier Courtyard Dais
    createSlab(42.0, 1.4, 12.0, 1.0); // x: 36.0 to 48.0, top at y = 1.9

    // Act III: Horde Chase Zone with Collapsing Bridge (x: 48 to 68)
    // Staging Courtyard before Portcullis
    createSlab(50.0, 1.4, 4.5, 1.0); // top at y = 1.9
    // Crumbling Bridge tiles across the chasm (requires Time-Slow [Shift] to survive!)
    createSlab(55.5, 1.4, 3.2, 0.8, true); // crumbling tile 1
    createSlab(59.0, 2.0, 3.2, 0.8, true); // crumbling tile 2 (elevated step!)
    createSlab(62.5, 1.4, 3.2, 0.8, true); // crumbling tile 3
    // Safe landing past the crumbling bridge
    createSlab(66.0, 1.4, 5.0, 1.0); // top at y = 1.9

    // Act IV: Diagonal Bishop Blades Corridor (x: 68 to 86)
    // Corridor floor
    createSlab(77.0, 1.0, 18.0, 1.0); // x: 68.0 to 86.0, top at y = 1.5
    // Elevated stone evasion arches (jump up to bypass ground blades)
    createSlab(73.5, 3.4, 3.2, 0.5); // top at y = 3.65
    createSlab(80.5, 3.4, 3.2, 0.5); // top at y = 3.65

    // Act V: Ascent to the Eighth Rank & Altar of Crowns (x: 86 to 105)
    // Safe landing platform right past the slam gate
    createSlab(88.0, 1.4, 4.5, 1.0); // top at y = 1.9
    // Monumental grand ascending staircase
    createSlab(91.5, 2.0, 3.0, 1.0); // step 1 (top at y = 2.5)
    createSlab(94.5, 2.8, 3.0, 1.0); // step 2 (top at y = 3.3)
    createSlab(97.5, 3.6, 3.0, 1.0); // step 3 (top at y = 4.1)
    // High Grand Altar Dais where the 4 crowns hover
    createSlab(102.0, 4.2, 7.0, 1.0); // top at y = 4.7

    // Portcullis Gate at x = 52.0 (Unlocked via Slide Puzzle)
    const gateGeo = new THREE.BoxGeometry(0.8, 6.0, 2.4);
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x11151c, metalness: 0.8, roughness: 0.3 });
    this.gateMesh = new THREE.Mesh(gateGeo, gateMat);
    this.gateMesh.position.set(this.gateX, 4.4, 0);
    this.gateMesh.castShadow = true;
    this.sceneManager.scene.add(this.gateMesh);
    this.gateCollider = { x: this.gateX, y: 4.4, w: 0.8, h: 6.0, isSolid: true };
    this.platforms.push(this.gateCollider);

    // Exit Slam Gate at x = 86.0 (Slams shut to lock out the Horde)
    this.exitGateMesh = new THREE.Mesh(gateGeo, gateMat);
    this.exitGateMesh.position.set(this.exitGateX, 11.0, 0); // starts lifted aloft
    this.sceneManager.scene.add(this.exitGateMesh);

    // Spikes (Lethal Obstacles placed in pits and corridors)
    this.createSpikeHazard(35.5, 1.0, 3);
    this.createSpikeHazard(76.5, 1.6, 4);
  }

  createSpikeHazard(xPos, yPos, count = 3) {
    const group = new THREE.Group();
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0x889098,
      metalness: 0.9,
      roughness: 0.2
    });

    for (let i = 0; i < count; i++) {
      const geo = new THREE.ConeGeometry(0.2, 0.7, 6);
      const spike = new THREE.Mesh(geo, spikeMat);
      spike.position.set((i - (count - 1) / 2) * 0.45, 0.35, 0);
      spike.castShadow = true;
      group.add(spike);
    }

    group.position.set(xPos, yPos, 0);
    this.sceneManager.scene.add(group);
    this.spikes.push({ x: xPos, y: yPos, radius: (count * 0.45) / 2 });
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }

      // Audio Context Unlock
      audio.resume();

      if (k === 'a' || k === 'arrowleft') this.input.left = true;
      if (k === 'd' || k === 'arrowright') this.input.right = true;

      if (k === 'w' || k === 'arrowup' || k === ' ') {
        if (!this.input.jumpHeld) this.input.jumpPressed = true;
        this.input.jumpHeld = true;

        // Skip cinematic shortcut
        if (this.state === 'CINEMATIC') {
          this.cinematicManager.skip();
        }
      }

      if (k === 'shift') this.input.slowTimeHeld = true;
      if (k === 'q') this.input.rewindHeld = true;

      if (k === 'e') {
        this.input.interactPressed = true;
        this.handleInteraction();
      }

      if (k === 'escape') {
        this.closeAllModals();
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') this.input.left = false;
      if (k === 'd' || k === 'arrowright') this.input.right = false;
      if (k === 'w' || k === 'arrowup' || k === ' ') this.input.jumpHeld = false;
      if (k === 'shift') this.input.slowTimeHeld = false;
      if (k === 'q') this.input.rewindHeld = false;
    });

    window.addEventListener('touchstart', () => audio.resume(), { once: true });

    // Start main menu horror theme on first user gesture
    const triggerMenuAudio = () => {
      if (this.state === 'TITLE') {
        audio.startMenuHorrorTheme();
      }
    };
    window.addEventListener('pointerdown', triggerMenuAudio);
    window.addEventListener('pointermove', triggerMenuAudio, { once: true });
    window.addEventListener('keydown', triggerMenuAudio);
  }

  bindUI() {
    // Title Screen buttons - Only Play and Settings as requested
    document.getElementById('btn-start')?.addEventListener('click', () => {
      audio.stopMenuHorrorTheme();
      this.startGame();
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.openModal('settings-modal');
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.closeModal('settings-modal');
    });

    document.getElementById('btn-enable-trailer')?.addEventListener('click', () => {
      this.trailerDirector.enableTrailerMode();
      this.closeModal('settings-modal');
      this.showToast('Trailer Director tools enabled in top toolbar.');
    });

    // Note Modal
    document.getElementById('btn-close-note')?.addEventListener('click', () => {
      this.closeModal('note-modal');
      this.state = 'PLAY';
    });

    // Slide Puzzle
    document.getElementById('btn-solve-slide')?.addEventListener('click', () => {
      this.unlockPortcullis();
      this.closeModal('slide-modal');
      this.showToast('The portcullis rises with a heavy grinding roar!');
    });

    document.getElementById('btn-close-slide')?.addEventListener('click', () => {
      this.closeModal('slide-modal');
      this.state = 'PLAY';
    });

    // Shadow Puzzle
    document.getElementById('btn-rot-left')?.addEventListener('click', () => this.rotateShadow(-30));
    document.getElementById('btn-rot-right')?.addEventListener('click', () => this.rotateShadow(30));
    document.getElementById('btn-align-shadow')?.addEventListener('click', () => this.checkShadowAlignment());

    // Ending Crown selections
    document.querySelectorAll('.crown-card').forEach(card => {
      card.addEventListener('click', () => {
        const crown = card.getAttribute('data-crown');
        this.selectPromotionEnding(crown);
      });
    });

    document.getElementById('btn-restart-game')?.addEventListener('click', () => {
      this.closeModal('ending-modal');
      this.teleportPlayer(2.0, 1.5);
      this.state = 'PLAY';
    });

    // Settings inputs
    document.getElementById('chk-flicker')?.addEventListener('change', (e) => {
      if (this.player) this.player.reducedFlicker = e.target.checked;
    });

    document.getElementById('rng-volume')?.addEventListener('input', (e) => {
      audio.setVolume(parseFloat(e.target.value));
    });
  }

  startGame() {
    const title = document.getElementById('title-screen');
    if (title) title.classList.add('hidden');
    audio.stopMenuHorrorTheme();
    audio.resume();
    this.state = 'PLAY';
  }

  playCinematic() {
    const title = document.getElementById('title-screen');
    if (title) title.classList.add('hidden');
    audio.stopMenuHorrorTheme();
    this.state = 'CINEMATIC';
    this.cinematicManager.startIntroCinematic(() => {
      this.state = 'PLAY';
    });
  }

  handleInteraction() {
    if (this.state !== 'PLAY') return;

    // 1. Check Brazier Interaction
    const brResult = this.puzzleManager.interactBrazier(this.player);
    if (brResult) {
      this.showToast(brResult.message);
      return;
    }

    // 2. Check Note Interaction
    const note = this.puzzleManager.checkNoteInteraction(this.player);
    if (note) {
      document.getElementById('note-body').textContent = note.text;
      this.openModal('note-modal');
      this.updateHudClues();
      return;
    }

    // 3. Check Shadow Puzzle Proximity
    if (Math.hypot(this.player.x - this.puzzleManager.shadowPuzzle.x, this.player.y - this.puzzleManager.shadowPuzzle.y) < 2.5 && !this.puzzleManager.shadowPuzzle.solved) {
      this.openModal('shadow-modal');
      this.updateShadowPuzzleStage();
      return;
    }

    // 4. Check Slide Puzzle Door Proximity (x: ~52.0)
    if (Math.abs(this.player.x - this.gateX) < 2.2 && !this.gateOpen) {
      this.openSlidePuzzle();
      return;
    }

    // 5. Check Altar of Promotion (x: ~99.0)
    if (Math.abs(this.player.x - this.puzzleManager.altar.x) < 4.0) {
      this.openModal('ending-modal');
      document.getElementById('ending-result').style.display = 'none';
      document.getElementById('crowns-container').style.display = 'grid';
      this.state = 'ENDING';
    }
  }

  rotateShadow(deltaDeg) {
    const sp = this.puzzleManager.shadowPuzzle;
    sp.currentAngle = (sp.currentAngle + deltaDeg + 360) % 360;
    this.updateShadowPuzzleStage();
  }

  updateShadowPuzzleStage() {
    const cast = document.getElementById('cast-silhouette');
    if (cast) {
      const sp = this.puzzleManager.shadowPuzzle;
      cast.style.transform = `translate(-50%, -50%) rotate(${sp.currentAngle}deg) scale(${1.0 + Math.sin(sp.currentAngle * 0.05) * 0.15})`;
    }
  }

  checkShadowAlignment() {
    const sp = this.puzzleManager.shadowPuzzle;
    const diff = Math.min(sp.currentAngle, 360 - sp.currentAngle);
    if (diff <= sp.tolerance) {
      sp.solved = true;
      audio.promotionChime();
      audio.settleOut();
      this.closeModal('shadow-modal');
      this.showToast('The shadow aligns with the royal seal! The latch clicks into place.');
      this.state = 'PLAY';
    } else {
      audio.wrongOrderSting();
      this.showToast('The shadow does not align with the carved crest.');
    }
  }

  openSlidePuzzle() {
    this.openModal('slide-modal');
    this.renderSlideBoard();
  }

  renderSlideBoard() {
    const board = document.getElementById('slide-board');
    if (!board) return;
    board.innerHTML = '';

    const sp = this.puzzleManager.slidePuzzle;
    sp.grid.forEach((num, index) => {
      const tile = document.createElement('div');
      tile.className = `slide-tile ${num === 0 ? 'empty' : ''}`;
      tile.textContent = num !== 0 ? '♟♜♝♞♛♚'[num % 6] : '';
      tile.addEventListener('click', () => this.clickSlideTile(index));
      board.appendChild(tile);
    });
  }

  clickSlideTile(idx) {
    const sp = this.puzzleManager.slidePuzzle;
    const emptyIdx = sp.grid.indexOf(0);
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const emptyRow = Math.floor(emptyIdx / 3);
    const emptyCol = emptyIdx % 3;

    if (Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1) {
      [sp.grid[idx], sp.grid[emptyIdx]] = [sp.grid[emptyIdx], sp.grid[idx]];
      audio.footstep('stone');
      this.renderSlideBoard();

      if (sp.grid.every((val, i) => val === sp.solution[i])) {
        sp.solved = true;
        this.unlockPortcullis();
        this.closeModal('slide-modal');
        this.showToast('The shattered relief clicks into place! The gate rises.');
      }
    }
  }

  unlockPortcullis() {
    this.gateOpen = true;
    this.gateCollider.isSolid = false;
    audio.gateGrind();

    const startY = this.gateMesh.position.y;
    let t = 0;
    const lift = () => {
      t += 0.05;
      this.gateMesh.position.y = THREE.MathUtils.lerp(startY, 9.5, t);
      if (t < 1.0) requestAnimationFrame(lift);
    };
    lift();
  }

  selectPromotionEnding(crown) {
    const endingData = this.cinematicManager.getPromotionEnding(crown);
    document.getElementById('crowns-container').style.display = 'none';
    const resultBox = document.getElementById('ending-result');
    resultBox.style.display = 'block';
    document.getElementById('ending-heading').textContent = endingData.title;
    document.getElementById('ending-description').textContent = '';
    document.getElementById('ending-text').textContent = endingData.text;
    audio.promotionChime();
    audio.speak(endingData.text, 'narrator');
    audio.settleOut();
  }

  // Death & Respawn
  die() {
    if (this.state === 'DEAD' || this.state === 'ENDING') return;
    this.state = 'DEAD';
    this.deathsCount++;
    audio.death();

    if (this.currentRunTrajectory.length > 20) {
      this.player.createEcho(this.currentRunTrajectory);
    }
    this.currentRunTrajectory = [];

    const fade = document.getElementById('fade-overlay');
    if (fade) {
      fade.style.opacity = '1.0';
      fade.style.transition = 'opacity 0.25s ease';
    }

    setTimeout(() => {
      // Teleport safely on top of checkpoint platform
      this.teleportPlayer(this.checkpointX, this.checkpointY + 0.5);
      this.player.fuel = 1.0;
      this.timeManager.refillFull();

      // Reset enemies & horde if before gate
      if (!this.exitGateClosed) {
        this.enemyManager.horde.active = false;
        this.enemyManager.horde.x = 44.0;
        if (this.enemyManager.horde.group) this.enemyManager.horde.group.visible = false;
      }

      audio.settleOut();
      if (fade) fade.style.opacity = '0.0';
      this.state = 'PLAY';
    }, 450);
  }

  teleportPlayer(x, y) {
    this.player.x = x;
    this.player.y = y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.group.position.set(x, y, 0);
    this.sceneManager.camCurrentX = x;
    this.sceneManager.camCurrentY = y + 1.2;
  }

  updateActProgression() {
    const px = this.player.x;
    let act = 1;
    let title = 'Act I: The Cellar';

    if (px < 24.0) {
      act = 1;
      title = 'Act I: The Forgotten Crypt';
    } else if (px < 48.0) {
      act = 2;
      title = 'Act II: Hall of Statues & Balcony';
    } else if (px < 68.0) {
      act = 3;
      title = 'Act III: The Crumbling Bridge & Horde';
      if (!this.enemyManager.horde.active && !this.exitGateClosed && px > 53.0) {
        this.enemyManager.startHordeChase(46.0);
        this.cinematicManager.playMomentHordeWakes();
      }
    } else if (px < 86.0) {
      act = 4;
      title = 'Act IV: The Diagonal Blades';
      if (!this.exitGateClosed) {
        this.exitGateClosed = true;
        this.enemyManager.closeHordeGate();
        this.exitGateMesh.position.y = 4.4; // slam down
        audio.gateGrind();
        this.cinematicManager.playMomentGateSlams();
      }
    } else {
      act = 5;
      title = 'Act V: The Eighth Rank & Altar of Crowns';
    }

    if (act !== this.currentAct) {
      this.currentAct = act;
      const actEl = document.getElementById('act-title');
      if (actEl) actEl.textContent = title;
    }
  }

  openModal(modalId) {
    if (this.state !== 'MODAL' && this.state !== 'ENDING') {
      this.modalReturnState = this.state;
    }
    this.state = 'MODAL';
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
    if (this.state === 'MODAL') {
      this.state = this.modalReturnState || 'PLAY';
    }
    this.modalReturnState = null;
  }

  closeAllModals() {
    document.querySelectorAll('.modal-layer').forEach(m => m.classList.remove('active'));
    if (this.state === 'MODAL' || this.state === 'ENDING') {
      this.state = this.modalReturnState || 'PLAY';
    }
    this.modalReturnState = null;
  }

  showToast(msg) {
    if (!this.promptToast) return;
    this.promptToast.textContent = msg;
    this.promptToast.classList.add('active');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.promptToast.classList.remove('active');
    }, 4500);
  }

  updateHudClues() {
    const count = this.puzzleManager.getCollectedCluesCount();
    const el = document.getElementById('clues-value');
    if (el) el.textContent = `${count} / 4 Clues`;
  }

  saveCheckpoint(x, y) {
    this.checkpointX = x;
    this.checkpointY = y;
    try {
      localStorage.setItem('torch_and_crown_checkpoint', JSON.stringify({ x, y, act: this.currentAct }));
    } catch (e) {}
  }

  loadCheckpoint() {
    try {
      const data = localStorage.getItem('torch_and_crown_checkpoint');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.x && parsed.x > 1.0) {
          this.checkpointX = parsed.x;
          this.checkpointY = parsed.y;
        }
      }
    } catch (e) {}
  }

  // Master Animation & Game Loop
  loop(timestamp) {
    const rawDt = Math.min((timestamp - this.lastFrameTime) * 0.001, 0.06);
    this.lastFrameTime = timestamp;
    this.gameTime += rawDt;

    const dt = rawDt * (this.trailerDirector?.timeMultiplier || 1.0);

    // 1. Cinematic Update
    if (this.state === 'CINEMATIC') {
      this.cinematicManager.update(dt);
      this.sceneManager.render(this.gameTime);
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    // 2. Time Manager (Slow Time & Rewind)
    const timeDelta = this.timeManager.update(dt, this.input, this.player, this.enemyManager);

    // 3. Gameplay Updates
    if (this.state === 'PLAY') {
      if (!timeDelta.isRewinding) {
        this.currentRunTrajectory.push({ x: this.player.x, y: this.player.y });
      }

      // Update Player Physics
      const allPlatforms = this.platforms.concat(this.puzzleManager.phantomPlatforms);
      this.player.update(timeDelta.playerDt, this.input, allPlatforms, this.gameTime);

      // Check Fall Out of Bounds
      if (this.player.y < -5.0) {
        this.die();
      }

      // Check Spike Hazards
      for (const sp of this.spikes) {
        if (Math.hypot(this.player.x - sp.x, this.player.y - sp.y) < sp.radius + 0.3) {
          this.die();
          break;
        }
      }

      // Update Enemies
      const killedByEnemy = this.enemyManager.update(
        timeDelta.worldDt,
        this.player,
        this.puzzleManager.braziers,
        this.gameTime
      );
      if (killedByEnemy) {
        this.die();
      }

      // Update Puzzles & Checkpoints
      this.puzzleManager.update(timeDelta.worldDt, this.player, this.gameTime);

      // Checkpoint reach with Horror Settle-Out
      for (const cp of this.puzzleManager.checkpoints) {
        if (!cp.lit && Math.abs(this.player.x - cp.x) < 1.6 && Math.abs(this.player.y - cp.y) < 2.5) {
          cp.lit = true;
          if (cp.topMesh) cp.topMesh.material.color.setHex(0xffaa22);
          this.player.refillFuel(0.65);
          this.timeManager.refillFull();
          audio.brazierIgnite();
          audio.settleOut();
          this.saveCheckpoint(cp.x, cp.y + 0.5);
          this.showToast('Sanctuary ignited: Safe checkpoint reached.');
        }
      }

      // Update Act Progression
      this.updateActProgression();

      // Update Torch Bar in HUD
      const torchFill = document.getElementById('torch-bar');
      if (torchFill) {
        torchFill.style.width = `${Math.round(this.player.fuel * 100)}%`;
      }

      // Reset single-frame input flags
      this.input.jumpPressed = false;
      this.input.interactPressed = false;
    }

    // 4. Update Environmental Particles & Parallax
    this.sceneManager.updateParticles(timeDelta.worldDt, this.player.x);

    // 5. Camera Tracking & Screen Shake
    let shake = 0;
    if (this.enemyManager.horde.active && !this.enemyManager.horde.gateClosed) {
      shake = 0.45;
    }
    this.sceneManager.updateCamera(this.player.x, this.player.y, dt, shake);

    // 6. Calculate Torch screen coordinate
    const torchScreen = new THREE.Vector3(this.player.x + this.player.facing * 0.5, this.player.y + 1.2, 0);
    torchScreen.project(this.sceneManager.camera);
    const torchUv = {
      x: (torchScreen.x + 1) * 0.5,
      y: (torchScreen.y + 1) * 0.5
    };

    // 7. Render Three.js Scene
    this.sceneManager.render(this.gameTime, torchUv, this.timeManager.worldTimeScale, timeDelta.isRewinding);

    requestAnimationFrame((t) => this.loop(t));
  }
}

function launchGame() {
  if (window.__gameInstance) return;
  window.__gameInstance = new Game();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', launchGame);
} else {
  launchGame();
}
