/**
 * Time Mechanics Engine
 * Sand Hourglass resource, Time Slow (25% world speed / 60% player speed),
 * and 4-second continuous Ring-Buffer Rewind system.
 */

import { audio } from './audio.js';

export class TimeManager {
  constructor() {
    this.sand = 100.0; // 0.0 to 100.0%
    this.maxSand = 100.0;
    this.sandDrainRate = 18.0; // % per second while holding Shift
    this.sandRegenRate = 3.5;  // passive regen per second when not manipulating time

    // Time Slow State
    this.isTimeSlow = false;
    this.worldTimeScale = 1.0;
    this.playerTimeScale = 1.0;

    // Time Rewind Ring Buffer (4.0 seconds at 60 FPS = 240 frames)
    this.bufferCapacity = 240;
    this.historyBuffer = [];
    this.isRewinding = false;
    this.rewindPlaybackIndex = -1;

    // Visual indicators
    this.fxOverlay = document.getElementById('fx-overlay');
    this.sandBar = document.getElementById('sand-bar');
  }

  update(dt, input, player, enemies) {
    // 1. Process Time Slow (Shift held)
    if (input.slowTimeHeld && this.sand > 5.0 && !this.isRewinding) {
      if (!this.isTimeSlow) audio.applyTimeSlow(true);
      this.isTimeSlow = true;
      this.worldTimeScale = 0.25;
      this.playerTimeScale = 0.65;
      this.sand = Math.max(0, this.sand - this.sandDrainRate * dt);

      if (this.fxOverlay) this.fxOverlay.className = 'time-slow';
    } else {
      if (this.isTimeSlow) audio.applyTimeSlow(false);
      this.isTimeSlow = false;
      this.worldTimeScale = 1.0;
      this.playerTimeScale = 1.0;

      // Passive sand recovery
      if (!this.isRewinding && this.sand < this.maxSand) {
        this.sand = Math.min(this.maxSand, this.sand + this.sandRegenRate * dt);
      }

      if (this.fxOverlay && !this.isRewinding) {
        this.fxOverlay.className = '';
      }
    }

    // 2. Process Time Rewind (Q held/pressed)
    if (input.rewindHeld && this.sand > 15.0 && this.historyBuffer.length > 30) {
      if (!this.isRewinding) {
        this.startRewind();
      }
      this.executeRewindStep(player, enemies);
      this.sand = Math.max(0, this.sand - 28.0 * dt);
    } else {
      if (this.isRewinding) {
        this.stopRewind();
      }
      // Record normal frame into ring buffer
      this.recordFrame(player, enemies);
    }

    // 3. Update HUD Sand Fill Bar
    if (this.sandBar) {
      this.sandBar.style.width = `${(this.sand / this.maxSand) * 100}%`;
    }

    return {
      worldDt: dt * this.worldTimeScale,
      playerDt: dt * this.playerTimeScale,
      isSlow: this.isTimeSlow,
      isRewinding: this.isRewinding
    };
  }

  recordFrame(player, enemies) {
    if (this.historyBuffer.length >= this.bufferCapacity) {
      this.historyBuffer.shift(); // remove oldest frame
    }

    this.historyBuffer.push({
      player: player.getState(),
      enemies: enemies.getState(),
      time: performance.now()
    });
  }

  startRewind() {
    this.isRewinding = true;
    this.rewindPlaybackIndex = this.historyBuffer.length - 1;
    audio.playRewindSweep();
    if (this.fxOverlay) this.fxOverlay.className = 'time-rewind';
  }

  executeRewindStep(player, enemies) {
    // Rewind back 2 frames per step for fast tape rewind feel
    this.rewindPlaybackIndex -= 2;

    if (this.rewindPlaybackIndex >= 0 && this.rewindPlaybackIndex < this.historyBuffer.length) {
      const frame = this.historyBuffer[this.rewindPlaybackIndex];
      player.setState(frame.player);
      enemies.setState(frame.enemies);

      // Truncate the buffer forward to this point
      this.historyBuffer.splice(this.rewindPlaybackIndex);
    } else {
      this.stopRewind();
    }
  }

  stopRewind() {
    this.isRewinding = false;
    this.rewindPlaybackIndex = -1;
    if (this.fxOverlay) this.fxOverlay.className = '';
  }

  addSand(amount = 35.0) {
    this.sand = Math.min(this.maxSand, this.sand + amount);
  }

  refillFull() {
    this.sand = this.maxSand;
  }
}
