/**
 * Trailer Mode & Director Tools (?trailer=1)
 * Act jump hotkeys (1-5), HUD toggle [H], Free Orbit Camera [F],
 * Game Speed slider ([ and ]), and CinemaScope Letterbox [C].
 */

export class TrailerDirector {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    this.isHudHidden = false;
    this.isLetterboxActive = false;
    this.timeMultiplier = 1.0;

    // Free Cam Controls
    this.freeCamActive = false;
    this.freeCamPos = { x: 0, y: 3.5, z: 16.5 };
    this.freeCamRot = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.lastMouse = { x: 0, y: 0 };

    this.trailerBar = document.getElementById('trailer-bar');
    this.speedDisplay = document.getElementById('speed-display');

    this.checkUrlParams();
    this.bindEvents();
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('trailer') === '1') {
      this.enableTrailerMode();
    }
  }

  enableTrailerMode() {
    this.isActive = true;
    if (this.trailerBar) {
      this.trailerBar.classList.remove('hidden');
    }
  }

  bindEvents() {
    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      const key = e.key.toLowerCase();

      // Jump to Acts (1 to 5)
      if (key === '1') this.jumpToAct(1);
      if (key === '2') this.jumpToAct(2);
      if (key === '3') this.jumpToAct(3);
      if (key === '4') this.jumpToAct(4);
      if (key === '5') this.jumpToAct(5);

      // HUD Toggle
      if (key === 'h') this.toggleHud();

      // Free Cam Toggle
      if (key === 'f') this.toggleFreeCam();

      // Letterbox Toggle
      if (key === 'c') this.toggleLetterbox();

      // Speed Adjustments
      if (e.key === '[') this.adjustSpeed(-0.25);
      if (e.key === ']') this.adjustSpeed(0.25);
    });

    // Toolbar buttons
    const actButtons = document.querySelectorAll('.act-btn[data-act]');
    actButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const act = parseInt(btn.getAttribute('data-act'), 10);
        this.jumpToAct(act);
      });
    });

    const btnHud = document.getElementById('btn-toggle-hud');
    if (btnHud) btnHud.addEventListener('click', () => this.toggleHud());

    const btnCam = document.getElementById('btn-toggle-cam');
    if (btnCam) btnCam.addEventListener('click', () => this.toggleFreeCam());

    const btnCin = document.getElementById('btn-toggle-cin');
    if (btnCin) btnCin.addEventListener('click', () => this.toggleLetterbox());

    // Mouse drag for free cam
    window.addEventListener('mousedown', (e) => {
      if (this.freeCamActive) {
        this.isMouseDown = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.freeCamActive && this.isMouseDown) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };

        const cam = this.game.sceneManager.camera;
        cam.rotation.y -= dx * 0.004;
        cam.rotation.x -= dy * 0.004;
      }
    });
  }

  jumpToAct(actIndex) {
    const actCoordinates = {
      1: 2.0,   // Act 1: The Cellar & Torch
      2: 28.0,  // Act 2: Puzzles & Rook
      3: 48.0,  // Act 3: The Horde Chase
      4: 68.0,  // Act 4: Diagonal Bishop Blades
      5: 88.0   // Act 5: The Altar of Promotion
    };

    const targetX = actCoordinates[actIndex] || 2.0;
    this.game.teleportPlayer(targetX, 2.5);

    // If jumping to Act 3, start the horde chase
    if (actIndex === 3) {
      this.game.enemyManager.startHordeChase(44.0);
    }

    // Highlight active button
    document.querySelectorAll('.act-btn[data-act]').forEach(b => {
      b.classList.toggle('active', parseInt(b.getAttribute('data-act'), 10) === actIndex);
    });
  }

  toggleHud() {
    this.isHudHidden = !this.isHudHidden;
    document.body.classList.toggle('hud-hidden', this.isHudHidden);
  }

  toggleLetterbox() {
    this.isLetterboxActive = !this.isLetterboxActive;
    document.body.classList.toggle('letterbox-active', this.isLetterboxActive);
  }

  toggleFreeCam() {
    this.freeCamActive = !this.freeCamActive;
    this.game.sceneManager.isFreeCam = this.freeCamActive;
  }

  adjustSpeed(delta) {
    this.timeMultiplier = Math.max(0.25, Math.min(3.0, this.timeMultiplier + delta));
    if (this.speedDisplay) {
      this.speedDisplay.textContent = `${this.timeMultiplier.toFixed(2)}x`;
    }
  }
}
