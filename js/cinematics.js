/**
 * Cinematics & Story Beats Engine
 * Timeline of camera keyframes, typewriter subtitles, audio cues,
 * skippable 35-45s animated intro, in-engine moments, and promotion endings.
 */

import * as THREE from 'three';
import { audio } from './audio.js';

export class CinematicManager {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.isPlaying = false;
    this.elapsed = 0.0;
    this.timelineDuration = 35.0;
    this.onCompleteCallback = null;

    // Triggered cues set to guarantee each voice cue fires exactly ONCE
    this.triggeredCues = new Set();

    // DOM Elements
    this.subtitleBox = document.getElementById('subtitle-box');
    this.subtitleSpeaker = document.getElementById('subtitle-speaker');
    this.subtitleContent = document.getElementById('subtitle-content');
    this.fadeOverlay = document.getElementById('fade-overlay');
    this.flashOverlay = document.getElementById('flash-overlay');
    this.skipBtn = document.getElementById('skip-cinematic-btn');

    // Typewriter state
    this.typewriterTimer = null;

    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => this.skip());
    }
  }

  startIntroCinematic(onComplete) {
    this.isPlaying = true;
    this.elapsed = 0.0;
    this.triggeredCues.clear();
    this.onCompleteCallback = onComplete;

    document.body.classList.add('letterbox-deep');
    if (this.skipBtn) this.skipBtn.classList.add('visible');

    // Start with black screen
    if (this.fadeOverlay) {
      this.fadeOverlay.style.opacity = '1.0';
      this.fadeOverlay.style.transition = 'opacity 2.0s ease';
    }

    audio.resume();
  }

  update(dt) {
    if (!this.isPlaying) return;

    this.elapsed += dt;
    const t = this.elapsed;
    const cam = this.sm.camera;

    // Shot 1: (0.0s - 5.0s) Black Screen, Heartbeat, Wind, Single Ember
    if (t < 5.0) {
      cam.position.set(0, 2.5, 12);
      cam.lookAt(0, 2.0, 0);

      if (t >= 1.0 && !this.triggeredCues.has('cue1')) {
        this.triggeredCues.add('cue1');
        this.showSubtitle('Narrator', "On the Hollow King's eternal board, millions fell unnamed.");
      }

      if (t > 2.8 && this.fadeOverlay) {
        this.fadeOverlay.style.opacity = '0.4'; // Ember glows in dark
      }
    }
    // Shot 2: (5.0s - 13.0s) Camera sweeps over vast chessboard of silhouettes
    else if (t < 13.0) {
      if (this.fadeOverlay) this.fadeOverlay.style.opacity = '0.0';

      const progress = (t - 5.0) / 8.0;
      cam.position.x = progress * 16.0;
      cam.position.y = 3.5 + Math.sin(progress * Math.PI) * 1.5;
      cam.position.z = 14.0 - progress * 3.5;
      cam.lookAt(cam.position.x + 3.0, 2.0, 0);

      if (t >= 6.0 && !this.triggeredCues.has('cue2')) {
        this.triggeredCues.add('cue2');
        this.showSubtitle('Narrator', "Stepped over. Trampled. Discarded as fodder.");
      }
    }
    // Shot 3: (13.0s - 21.0s) Colossal pieces stride past, tiny pawn shoved
    else if (t < 21.0) {
      const progress = (t - 13.0) / 8.0;
      cam.position.x = 16.0 + progress * 5.0;
      cam.position.y = 2.2;
      cam.position.z = 8.5;
      cam.lookAt(cam.position.x, 1.8, 0);

      if (t >= 14.0 && !this.triggeredCues.has('cue3')) {
        this.triggeredCues.add('cue3');
        this.showSubtitle('The Pieces', "Out of the way, dust. You are nothing!");
      }
    }
    // Shot 4: (21.0s - 29.0s) Pawn falls into cellar. Match struck, torch blooms!
    else if (t < 29.0) {
      cam.position.set(2.0, 2.2, 7.5);
      cam.lookAt(2.0, 2.0, 0);

      if (t >= 21.8 && !this.triggeredCues.has('cue4')) {
        this.triggeredCues.add('cue4');
        this.showSubtitle('Narrator', "In the forgotten crypt... he struck a match. The flame defied the dark.");
      }

      if (t >= 25.5 && !this.triggeredCues.has('cue5')) {
        this.triggeredCues.add('cue5');
        this.flashScreen(0.7);
        audio.torchIgnite();
        this.showSubtitle('TORCH AND CROWN', "A Pawn's Walk Through the Dark");
      }
    }
    // Shot 5: (29.0s - 34.0s) Camera eases into 2.5D gameplay side-rail
    else if (t < 34.0) {
      const easeProgress = (t - 29.0) / 5.0;
      cam.position.x = THREE.MathUtils.lerp(2.0, 3.2, easeProgress);
      cam.position.y = THREE.MathUtils.lerp(2.2, 3.2, easeProgress);
      cam.position.z = THREE.MathUtils.lerp(7.5, 10.8, easeProgress);
      cam.lookAt(cam.position.x + 1.0, 2.9, 0);
    } else {
      this.finish();
    }
  }

  showSubtitle(speaker, text) {
    if (!this.subtitleBox) return;
    this.subtitleBox.style.display = 'inline-block';
    if (this.subtitleSpeaker) this.subtitleSpeaker.textContent = speaker;

    // Voice Narration & Character Dialogues
    let role = 'narrator';
    const sLower = speaker.toLowerCase();
    if (sLower.includes('piece')) role = 'pieces';
    else if (sLower.includes('shadow') || sLower.includes('horde')) role = 'horde';
    else if (sLower.includes('rook')) role = 'rook';
    else if (sLower.includes('bishop')) role = 'bishop';
    else if (sLower.includes('king')) role = 'king';
    audio.speak(text, role);

    // Typewriter effect
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
    if (this.subtitleContent) {
      this.subtitleContent.textContent = '';
      let charIdx = 0;
      this.typewriterTimer = setInterval(() => {
        if (charIdx < text.length) {
          this.subtitleContent.textContent += text.charAt(charIdx);
          charIdx++;
        } else {
          clearInterval(this.typewriterTimer);
        }
      }, 22);
    }
  }

  hideSubtitle() {
    if (this.subtitleBox) {
      this.subtitleBox.style.display = 'none';
    }
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
    }
  }

  flashScreen(intensity = 0.5) {
    if (!this.flashOverlay) return;
    this.flashOverlay.style.opacity = `${intensity}`;
    setTimeout(() => {
      if (this.flashOverlay) this.flashOverlay.style.opacity = '0';
    }, 120);
  }

  skip() {
    if (!this.isPlaying) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.finish();
  }

  finish() {
    this.isPlaying = false;
    this.hideSubtitle();
    document.body.classList.remove('letterbox-deep');
    if (this.skipBtn) this.skipBtn.classList.remove('visible');
    if (this.fadeOverlay) this.fadeOverlay.style.opacity = '0.0';

    // Horror "Settle Out": sigh of survival, serene chimes, calm atmosphere
    audio.settleOut();

    if (this.onCompleteCallback) {
      this.onCompleteCallback();
      this.onCompleteCallback = null;
    }
  }

  // In-Engine Story Moments
  playMomentHordeWakes() {
    this.flashScreen(0.4);
    this.showSubtitle('The Hollow King', 'THE HOLLOW KING HAS NOTICED YOU. KILL THE PAWN.');
    setTimeout(() => this.hideSubtitle(), 5000);
  }

  playMomentGateSlams() {
    this.flashScreen(0.5);
    this.showSubtitle('Narrator', 'The heavy portcullis slams shut. The horde screams in the dark.');
    audio.settleOut('gate'); // Horror settle-out after surviving the intense chase
    setTimeout(() => this.hideSubtitle(), 5500);
  }

  // 4 Promotion Endings Text
  getPromotionEnding(crownName) {
    const endings = {
      Queen: {
        title: 'Promotion: The Queen',
        text: 'Every piece on the board kneels. Her crown hums at night in a voice like the pawns she stepped over. She rules a silent board with no one left to rule.'
      },
      Rook: {
        title: 'Promotion: The Rook',
        text: 'He chose walls: stone, silent, unbreakable. Nothing can reach him now. Nothing ever will.'
      },
      Bishop: {
        title: 'Promotion: The Bishop',
        text: 'He sees along the diagonals what the living cannot: every pawn who died in the dark, still waiting on their squares.'
      },
      Knight: {
        title: 'Promotion: The Knight',
        text: 'He leapt over the board and over the Hollow King’s shadow. He landed outside the squares, where it is darker, and something was waiting.'
      }
    };
    return endings[crownName] || endings.Queen;
  }
}
