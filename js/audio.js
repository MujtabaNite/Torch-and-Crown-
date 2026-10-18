/**
 * Audio Engine - 100% Procedural Web Audio API Synthesis + Demonic Vocal Formants
 * Zero external audio files or dependencies.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.reverbNode = null;
    this.lowPassFilter = null;

    // Ambient continuous layers
    this.droneGain = null;
    this.windGain = null;
    this.fireGain = null;
    this.choirGain = null;
    this.heartbeatGain = null;
    this.chaseRiserGain = null;

    this.droneOsc = null;
    this.heartbeatInterval = null;
    this.heartbeatBpm = 60;
    this.threatLevel = 0; // 0 (calm) to 1 (chase climax)

    this.isMuted = false;
    this.masterVolume = 0.85;
    this.initialized = false;

    // Main Menu Theme
    this.menuThemePlaying = false;
    this.menuGain = null;
    this.menuThemeTimeout = null;

    // Speech synthesis caching
    this.cachedVoices = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.cachedVoices = window.speechSynthesis.getVoices() || [];
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
      };
    }
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Compressor to prevent clipping & ensure crisp dynamic mix
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // Low pass filter for Time-Slow effect
      this.lowPassFilter = this.ctx.createBiquadFilter();
      this.lowPassFilter.type = 'lowpass';
      this.lowPassFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      // Procedural Reverb (Cathedral / Stone Crypt Impulse)
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.generateImpulseResponse(2.5, 2.2);

      const reverbGain = this.ctx.createGain();
      reverbGain.gain.setValueAtTime(0.38, this.ctx.currentTime);

      // Wire nodes
      this.lowPassFilter.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.reverbNode.connect(reverbGain);
      reverbGain.connect(this.lowPassFilter);

      this.setupAmbientLayers();
      this.startHeartbeatLoop();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio init deferred:', e);
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  generateImpulseResponse(duration, decay) {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const dec = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * dec;
      right[i] = (Math.random() * 2 - 1) * dec;
    }
    return impulse;
  }

  setupAmbientLayers() {
    const now = this.ctx.currentTime;

    // 1. Sub Bass Drone (Low D1 = 36.71 Hz & Detune)
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.08, now);
    this.droneGain.connect(this.lowPassFilter);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(36.71, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(37.4, now);

    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(130, now);

    osc1.connect(droneFilter);
    osc2.connect(droneFilter);
    droneFilter.connect(this.droneGain);
    osc1.start();
    osc2.start();

    // 2. Wind & Cavern Howl (Filtered Noise with LFO)
    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.045, now);
    this.windGain.connect(this.lowPassFilter);

    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(340, now);
    bandpass.Q.setValueAtTime(3.8, now);

    const windLfo = this.ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.12, now);
    const windLfoGain = this.ctx.createGain();
    windLfoGain.gain.setValueAtTime(160, now);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(bandpass.frequency);

    whiteNoise.connect(bandpass);
    bandpass.connect(this.windGain);
    whiteNoise.start();
    windLfo.start();

    // 3. Torch Crackle (Filtered high noise bursts)
    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.setValueAtTime(0.05, now);
    this.fireGain.connect(this.lowPassFilter);

    const crackleSource = this.ctx.createBufferSource();
    crackleSource.buffer = noiseBuffer;
    crackleSource.loop = true;

    const crackleFilter = this.ctx.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.setValueAtTime(1200, now);

    crackleSource.connect(crackleFilter);
    crackleFilter.connect(this.fireGain);
    crackleSource.start();

    // 4. Distant Choir Pad (Haunting minor triad chords)
    this.choirGain = this.ctx.createGain();
    this.choirGain.gain.setValueAtTime(0.04, now);
    this.choirGain.connect(this.reverbNode);

    const choirNotes = [146.83, 174.61, 220.00]; // D3, F3, A3
    choirNotes.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.03, now);
      osc.connect(cg);
      cg.connect(this.choirGain);
      osc.start();
    });

    // 5. Chase Riser Synth (Tension builds when threats near)
    this.chaseRiserGain = this.ctx.createGain();
    this.chaseRiserGain.gain.setValueAtTime(0.001, now);
    this.chaseRiserGain.connect(this.reverbNode);

    const riserOsc = this.ctx.createOscillator();
    riserOsc.type = 'sawtooth';
    riserOsc.frequency.setValueAtTime(55, now);
    const riserFilter = this.ctx.createBiquadFilter();
    riserFilter.type = 'lowpass';
    riserFilter.frequency.setValueAtTime(280, now);

    riserOsc.connect(riserFilter);
    riserFilter.connect(this.chaseRiserGain);
    riserOsc.start();
    this.riserOsc = riserOsc;
    this.riserFilter = riserFilter;
  }

  startHeartbeatLoop() {
    const playThump = () => {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      // First lub (low sine drop)
      const osc1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      osc1.frequency.setValueAtTime(75, now);
      osc1.frequency.exponentialRampToValueAtTime(32, now + 0.12);
      g1.gain.setValueAtTime(0.12 * (0.4 + this.threatLevel * 0.8), now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc1.connect(g1);
      g1.connect(this.lowPassFilter);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second dub (slightly softer, 120ms later)
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.frequency.setValueAtTime(65, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(28, now + 0.26);
      g2.gain.setValueAtTime(0.09 * (0.4 + this.threatLevel * 0.8), now + 0.14);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc2.connect(g2);
      g2.connect(this.lowPassFilter);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.3);

      // Schedule next heartbeat based on current threat
      const bpm = 55 + this.threatLevel * 85;
      const intervalMs = (60 / bpm) * 1000;
      this.heartbeatInterval = setTimeout(playThump, intervalMs);
    };

    playThump();
  }

  setThreatLevel(level) {
    this.threatLevel = Math.max(0, Math.min(1, level));
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.chaseRiserGain) {
      this.chaseRiserGain.gain.setTargetAtTime(0.001 + this.threatLevel * 0.14, now, 0.4);
    }
    if (this.riserOsc) {
      this.riserOsc.frequency.setTargetAtTime(55 + this.threatLevel * 140, now, 0.4);
    }
    if (this.riserFilter) {
      this.riserFilter.frequency.setTargetAtTime(280 + this.threatLevel * 900, now, 0.4);
    }
    if (this.droneGain) {
      this.droneGain.gain.setTargetAtTime(0.08 + this.threatLevel * 0.08, now, 0.4);
    }
  }

  // Time Mechanics Audio Effects
  applyTimeSlow(active) {
    if (!this.ctx || !this.lowPassFilter) return;
    const now = this.ctx.currentTime;
    if (active) {
      this.lowPassFilter.frequency.setTargetAtTime(650, now, 0.12);
      this.playPitchDropWhoosh();
    } else {
      this.lowPassFilter.frequency.setTargetAtTime(20000, now, 0.18);
    }
  }

  playPitchDropWhoosh() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(g);
    g.connect(this.reverbNode);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playRewindSweep() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);

    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(g);
    g.connect(this.reverbNode);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  // SFX Synthesizers
  footstep(surface = 'stone') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = surface === 'wood' ? 110 : 70;
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 25, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.08);

    g.gain.setValueAtTime(0.07, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(g);
    g.connect(this.lowPassFilter);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  jump() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.14);

    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(g);
    g.connect(this.lowPassFilter);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  torchIgnite() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.playTone(180, 0.4, 'triangle', 0.15, 60);

    // Fire whoosh burst
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.45);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.reverbNode);
    noise.start(now);
  }

  brazierIgnite() {
    if (!this.ctx) return;
    this.torchIgnite();
    this.playTone(440, 1.2, 'triangle', 0.12, 550);
  }

  wrongOrderSting() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    // Dissonant tritone sting (Eb / A)
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(155.56, now);
    osc2.frequency.setValueAtTime(220.00, now);

    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(this.reverbNode);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.85);
    osc2.stop(now + 0.85);
  }

  gateGrind() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(48, now);
    osc.frequency.linearRampToValueAtTime(32, now + 1.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);

    g.gain.setValueAtTime(0.22, now);
    g.gain.linearRampToValueAtTime(0.001, now + 1.4);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.reverbNode);
    osc.start(now);
    osc.stop(now + 1.45);
  }

  bladeStrike() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.22);

    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(g);
    g.connect(this.reverbNode);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  bishopStrikeWarning() {
    this.playTone(660, 0.45, 'triangle', 0.14, 1800);
  }

  bishopBladeSlash() {
    this.bladeStrike();
  }

  land() {
    this.playTone(65, 0.12, 'triangle', 0.16, 140);
  }

  pawnBurn() {
    this.torchIgnite();
  }

  rookStomp(rookX, playerX) {
    if (!this.ctx) return;
    const dist = Math.abs(rookX - playerX);
    const volume = Math.max(0, 1 - dist / 30) * 0.35;
    if (volume <= 0.02) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(58, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.32);

    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(g);
    g.connect(this.reverbNode);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  death() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.7);

    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(g);
    g.connect(this.reverbNode);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  promotionChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chord = [293.66, 369.99, 440.00, 587.33]; // D Major triumph
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      g.gain.setValueAtTime(0.12, now + idx * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 2.8);

      osc.connect(g);
      g.connect(this.reverbNode);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 3.0);
    });
  }

  playTone(freq, duration = 0.5, type = 'sine', volume = 0.1, lowpass = 8000) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpass, now);

    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.reverbNode);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  // Dedicated Main Menu Horror Music: Subterranean Drone, Spectral Bell Arpeggios, and Cavern Wind
  startMenuHorrorTheme() {
    if (this.menuThemePlaying) return;
    this.resume();
    if (!this.ctx) return;
    this.menuThemePlaying = true;

    this.menuGain = this.ctx.createGain();
    this.menuGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.menuGain.gain.exponentialRampToValueAtTime(0.24, this.ctx.currentTime + 1.8);
    this.menuGain.connect(this.reverbNode);

    // Eerie haunting gothic chime palette in D minor / diminished
    const gothicScale = [146.83, 174.61, 207.65, 220.00, 246.94, 293.66, 311.13, 349.23, 415.30, 440.00];
    let noteStep = 0;

    const playNextNote = () => {
      if (!this.menuThemePlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const f = gothicScale[noteStep % gothicScale.length];
      noteStep = (noteStep + 1 + Math.floor(Math.random() * 2)) % gothicScale.length;

      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = Math.random() > 0.45 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * (1 + (Math.random() - 0.5) * 0.02), now + 2.4);

      g.gain.setValueAtTime(0.11, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);

      osc.connect(g);
      g.connect(this.menuGain);
      osc.start(now);
      osc.stop(now + 2.4);

      const nextDelay = 800 + Math.random() * 1100;
      this.menuThemeTimeout = setTimeout(playNextNote, nextDelay);
    };

    playNextNote();
  }

  stopMenuHorrorTheme() {
    this.menuThemePlaying = false;
    if (this.menuThemeTimeout) {
      clearTimeout(this.menuThemeTimeout);
      this.menuThemeTimeout = null;
    }
    if (this.menuGain && this.ctx) {
      this.menuGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
      setTimeout(() => {
        try { this.menuGain.disconnect(); } catch (e) {}
      }, 600);
    }
  }

  // ==========================================
  // PROCEDURAL DEMONIC VOCAL FORMANT SYNTHESIS
  // ==========================================
  // Synthesizes eerie creature growls, screeching whispers, and king murmurs directly in Web Audio
  playCreatureVocal(role = 'rook') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (role === 'rook') {
      // Subterranean gravelly guttural roar ("CRUSH")
      const osc = this.ctx.createOscillator();
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.7, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      // Vocal formant filters for guttural /u/ -> /o/
      const f1 = this.ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(320, now);
      f1.Q.setValueAtTime(4.0, now);

      const f2 = this.ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(750, now);
      f2.Q.setValueAtTime(5.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      noise.connect(f1);
      noise.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(this.reverbNode);
      noise.start(now);
      noise.stop(now + 0.7);

    } else if (role === 'bishop') {
      // Sibilant spectral blade hiss / screech
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(840, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.45);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(7.0, now);

      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.reverbNode);
      osc.start(now);
      osc.stop(now + 0.46);

    } else if (role === 'knight') {
      // Metallic whinny / demonic war cry
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(520, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.5);

      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

      osc.connect(g);
      g.connect(this.reverbNode);
      osc.start(now);
      osc.stop(now + 0.55);

    } else if (role === 'horde') {
      // Chittering whispering swarm
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.0, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(6.0, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      noise.connect(filter);
      filter.connect(g);
      g.connect(this.reverbNode);
      noise.start(now);
      noise.stop(now + 0.95);
    }
  }

  // Voiced Narration & Enemy Taunts (Hybrid Web Speech + Web Audio Formants)
  speak(text, role = 'narrator') {
    // Prevent spamming the exact same voice line within 1.5 seconds
    const nowMs = performance.now();
    if (this.lastSpokenText === text && nowMs - this.lastSpokenTime < 1500) {
      return;
    }
    this.lastSpokenText = text;
    this.lastSpokenTime = nowMs;

    // Trigger synthetic audio accompaniment
    this.playCreatureVocal(role);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[“”—"]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);

      let pitch = 0.65;
      let rate = 0.82;

      if (role === 'narrator') {
        pitch = 0.58;
        rate = 0.8;
      } else if (role === 'rook') {
        pitch = 0.2;
        rate = 0.72;
      } else if (role === 'bishop') {
        pitch = 1.25;
        rate = 0.92;
      } else if (role === 'knight') {
        pitch = 0.45;
        rate = 0.88;
      } else if (role === 'horde' || role === 'pieces') {
        pitch = 0.35;
        rate = 0.78;
      } else if (role === 'king') {
        pitch = 0.4;
        rate = 0.75;
      }

      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = Math.min(1.0, this.masterVolume * 1.25);

      if (!this.cachedVoices || this.cachedVoices.length === 0) {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
      }
      const engVoice = this.cachedVoices.find(v => v.lang.startsWith('en') && (
        v.name.includes('Male') || v.name.includes('David') || v.name.includes('Natural') ||
        v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('George')
      ));
      if (engVoice) utterance.voice = engVoice;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis skipped:', err);
    }
  }

  // ==========================================
  // HORROR "SETTLE OUT": Atmosphere of Survival
  // ==========================================
  // When an encounter ends, tension releases: breathing exhale, calming chime, wind softens
  settleOut(context = 'general') {
    this.threatLevel = 0;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Shuddering Exhale of Relief (Breath of life/survival)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.2, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const breathFilter = this.ctx.createBiquadFilter();
    breathFilter.type = 'lowpass';
    breathFilter.frequency.setValueAtTime(400, now);
    breathFilter.frequency.exponentialRampToValueAtTime(160, now + 1.1);

    const breathGain = this.ctx.createGain();
    breathGain.gain.setValueAtTime(0.001, now);
    breathGain.gain.linearRampToValueAtTime(0.09, now + 0.25);
    breathGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

    noise.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(this.lowPassFilter);
    noise.start(now);
    noise.stop(now + 1.2);

    // 2. Lingering warm cathedral chime (D-A-D safe harmonic sanctuary)
    const safeChime = [146.83, 220.00, 293.66];
    safeChime.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + 0.1 + idx * 0.12);

      g.gain.setValueAtTime(0.06, now + 0.1 + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      osc.connect(g);
      g.connect(this.reverbNode);
      osc.start(now + 0.1 + idx * 0.12);
      osc.stop(now + 2.6);
    });

    // 3. Ambient wind softens into a quiet hollow whisper
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(0.025, now, 1.2);
    }

    // 4. Choir pad gently hums in the safe sanctuary
    if (this.choirGain) {
      this.choirGain.gain.setTargetAtTime(0.05, now, 1.5);
    }
  }
}

export const audio = new AudioEngine();
