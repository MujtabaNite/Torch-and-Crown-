# TORCH AND CROWN: A Pawn's Walk Through the Dark

> A 2.5D horror side-scroller built for the 3-day Game Jam with themes **FIRE**, **SHADOW**, and **TIME**.  
> Inspired by the atmosphere of *Limbo* merged with chess gothic horror.

---

## ♟️ Game Overview

On the Hollow King's eternal chessboard, countless pawns have fallen unnamed, discarded as fodder. One pawn refuses his fate. Armed only with a flickering torch struck in the cellar depths, he embarks on the long, perilous march toward the **Eighth Rank**—where promotion awaits.

All models and visual silhouettes are 100% procedurally generated using **Three.js** geometry. All soundscapes, music, and sound effects are synthesized 100% in real-time via the **Web Audio API**—zero external audio files, zero 3D models downloaded, zero copied assets.

---

## 🕹️ Controls

| Action | Keyboard | Gamepad | Description |
| :--- | :--- | :--- | :--- |
| **Move** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Left Stick / D-Pad | Walk left and right |
| **Jump** | <kbd>W</kbd> / <kbd>Space</kbd> or <kbd>↑</kbd> | <kbd>A</kbd> / <kbd>✕</kbd> | Jump (variable height, coyote time enabled) |
| **Slow Time** | Hold <kbd>Shift</kbd> | Left Trigger (<kbd>LT</kbd>) | Slow world to 25%, pawn at 65% speed |
| **Rewind Time** | Press / Hold <kbd>Q</kbd> | Right Trigger (<kbd>RT</kbd>) | Rewind state back up to 4.0 seconds |
| **Interact** | <kbd>E</kbd> | <kbd>X</kbd> / <kbd>◻</kbd> | Light braziers, inspect notes, examine puzzles |
| **Skip Cutscene** | <kbd>Space</kbd> / Click Button | <kbd>Start</kbd> | Skip animated opening cinematic |

---

## 🎬 Trailer Director Mode (`?trailer=1`)

Append `?trailer=1` to the URL or click **Trailer Mode** on the title screen to enable director tools for screen recording:

| Hotkey | Feature | Purpose |
| :--- | :--- | :--- |
| <kbd>1</kbd> | **Jump to Act I: The Cellar** | Teleport to initial torch strike and phantom platforms |
| <kbd>2</kbd> | **Jump to Act II: The Puzzles** | Teleport to Braziers, Shadow Puzzle, and Rook charge |
| <kbd>3</kbd> | **Jump to Act III: The Horde Chase** | Trigger the cinematic collapsing chase sequence |
| <kbd>4</kbd> | **Jump to Act IV: Diagonal Blades** | Teleport to Bishop guillotine blade gauntlet |
| <kbd>5</kbd> | **Jump to Act V: The Altar of Crowns** | Teleport to the Hollow King throne and promotion crowns |
| <kbd>H</kbd> | **Toggle HUD** | Hide all UI overlays for clean 1080p recording |
| <kbd>F</kbd> | **Free Orbit Camera** | Fly camera with mouse drag for cinematic angles |
| <kbd>[</kbd> / <kbd>]</kbd> | **Speed Multiplier** | Adjust engine speed (0.25x for slow-mo to 2.5x fast-forward) |
| <kbd>C</kbd> | **Toggle Letterbox** | Toggle 2.39:1 CinemaScope black bars |

---

## 🧩 The Three Game Jam Themes

### 1. 🔥 FIRE
- **The Torch as Survival**: The pawn carries a procedural iron torch with a real-time `PointLight` casting dynamic shadows.
- **Fuel as a Clock**: Torch fuel slowly drains. As fuel depletes, the light radius shrinks, deepening the surrounding darkness.
- **Hidden Phantom Platforms**: Ancient stone platforms only solidify and become visible when bathed in torchlight; stepping onto them in darkness causes the pawn to plummet.
- **Harmonic Brazier Order Puzzle**: Three ancient stone braziers (Knight, Rook, Bishop) must be ignited in sequence to open the way forward.
- **Burn Mechanic**: Scurrying hollow pawn swarms cannot be killed by stepping on them—they must be lured into torch flame or lit braziers to catch fire and dissolve into ash.

### 2. 👥 SHADOW
- **2.5D Silhouette Art Style**: High-contrast monochromatic black silhouettes layered against multi-plane parallax depth with exponential dark mist.
- **Dynamic Chess Shadows**: Patrolling Rooks, leaping Knights, and colossal background pieces cast real PCF soft shadows across the checkered board.
- **Shadow Alignment Puzzle**: The player rotates a relic so its cast shadow aligns precisely with the royal crest engraved into the stone wall to disengage an ancient locking mechanism.
- **Darkness Falloff Shader**: Custom GLSL post-processing pass darkens the screen with heavy vignette outside the torchlight radius.

### 3. ⏳ TIME
- **Hourglass Sand Resource**: Sand meter in the HUD powers both temporal abilities. Sand is replenished at checkpoints and by collecting golden hourglass relics.
- **Time Slow (Shift)**: Drains sand to slow world physics to 25%, while the pawn moves at 65% speed (a 2.6x relative advantage). The Web Audio engine applies a steep low-pass filter (450Hz) and pitch drop, while the screen desaturates with a cyan tint.
- **4-Second Ring-Buffer Rewind (Q)**: Continuous 240-frame buffer stores positions, velocities, enemy behaviors, and fuel. Triggering rewind reverses physics backwards with reverse-audio sweeps, chromatic aberration, and VHS scanlines.
- **Time-Critical Level Hazards**:
  1. Dodging high-speed Bishop guillotine blade strikes.
  2. Leaping across crumbling stone bridge tiles that collapse 0.65s after touch.
  3. Evading a charging Rook in a narrow corridor.
- **The Horde Chase**: A scripted set-piece clock forcing continuous forward momentum as a wall of 50+ silhouetted pieces with red eyes tears down the floor behind the player.
- **Echoes (Stretch Goal)**: Ethereal translucent ghosts of the previous death run replay their trajectory.

---

## 🎧 Procedural Web Audio Engine Architecture

Zero external sound files (.mp3, .wav, or .ogg) are loaded. Everything is synthesized procedurally in code:
- **Master Bus**: DynamicsCompressorNode + procedural ConvolverNode (cathedral impulse response generated via exponential noise decay).
- **Sub Drone**: Dual detuned sawtooth and sine oscillators at 43.6Hz with low-pass filtering.
- **Cavern Wind**: Pink noise buffer modulated with an LFO band-pass filter.
- **Fire Crackle**: Stochastic micro-bursts of high-pass filtered clicks and pops tied to torch intensity.
- **Dynamic Heartbeat**: 52Hz → 48Hz double-thump that accelerates from 60 BPM to 140 BPM based on threat distance.
- **3D Positional Panners**: Spatial audio for Rook heavy stomps, Bishop blade slices, and the approaching horde.
- **Action SFX**: Footsteps on stone, jump whoosh, torch ignite flare, brazier chords, wrong-order dissonance sting, gate grinding stone, and promotion chime.

---

## 📽️ 3-Minute Trailer Director Plan (Game Jam Submission)

### Trailer Overview & Specs
- **Total Duration**: Exactly 3:00 (180 seconds).
- **Format**: 1080p60 MP4 (H.264), 16:9, Stereo.
- **Gameplay Footage Ratio**: 2:15 gameplay, 0:45 stylised cinematic / graphics.
- **Key Capture Tool**: OBS Studio capturing the game with `?trailer=1`.

---

### Shot List & Timecodes

#### 0:00 - 0:25 | TEASER (Stylised Opening)
- **0:00 - 0:08**: Black screen. Fade in heartbeat thump (54Hz). Distant cavern wind. Single golden ember drifts slowly down from darkness.
  - *VO*: *(Quiet, gravelly whisper)* "On the Hollow King's board... millions fell unnamed."
- **0:08 - 0:16**: Cut to game intro camera push through dense fog. Colossal broken King and Queen heads looming in silhouette.
  - *On-Screen Text*: (Cinzel, 32pt, bone white): `NO PIECE WALKS BACKWARD.`
  - *VO*: "Fodder for the back rank. Stepped over. Forgotten."
- **0:16 - 0:21**: Quick flash frames (3 frames each) of glowing red eyes in the dark, the charging Rook, and the rising horde.
  - *VO*: "Everyone underestimated the pawn."
- **0:21 - 0:25**: Sudden match strike sound (*FZZZT*). Light blooms. Screen slams to title card.
  - *Sound*: Massive sub-bass drone hit + cathedral chord.
  - *On-Screen Title*: **EIGHTH RANK: A PAWN'S WALK THROUGH THE DARK**

---

#### 0:25 - 1:10 | ACT I: THE CELLAR & FIRE (Gameplay)
- **0:25 - 0:38**: Gameplay footage in Act 1 (`Trailer Hotkey: 1`, HUD visible). Pawn jumps down onto stone tiles, holding flickering torch. Real-time shadow stretches behind him.
  - *On-Screen Tag* (Upper-left, Ember Orange): `THEME 1: FIRE`
  - *On-Screen Subtitle*: `His torch is his only guide.`
  - *VO*: "Down in the cellar, light is not a luxury. It is existence."
- **0:38 - 0:52**: Pawn approaches the black chasm. As the torch light reaches the void, translucent phantom platforms solidify into blue-veined stone. The pawn leaps across.
  - *VO*: "The path does not exist... until the flame reveals it."
- **0:52 - 1:02**: Pawn picks up Note Clue 1 (parchment popup: *"The false stones remember the way..."*).
- **1:02 - 1:10**: Scurrying pawn-swarm rushes the player. Player holds ground; the swarm hits the torch radius, catches fire with crackling embers, and turns to ash.
  - *On-Screen Text*: `LURE THEM TO THE FLAME.`

---

#### 1:10 - 1:55 | ACT II: THE HALL OF STATUES & SHADOW (Gameplay)
- **1:10 - 1:22**: Jump to Act 2 (`Trailer Hotkey: 2`). Giant gothic arches and hanging iron chains swinging in parallax. The three stone braziers come into view.
  - *On-Screen Tag* (Upper-left, Slate Blue): `THEME 2: SHADOW`
  - *On-Screen Subtitle*: `What hides in the dark can be conquered.`
  - *VO*: "The dead left riddles in stone. Three flames: Knight, Rook, Bishop."
- **1:22 - 1:33**: Quick cut: Player lights the Knight brazier (chord rings), then Rook, then Bishop. Golden flames ignite; gate latch shudders open.
- **1:34 - 1:44**: The Shadow Inscription puzzle. Player rotates the relic; its cast shadow sweeps across the wall until it aligns perfectly with the carved queen silhouette. A stone latch clicks.
- **1:44 - 1:55**: Ground shakes. A colossal stone Rook with glowing crimson eye slits roars and charges. Pawn sprints and executes a high jump over the charging castle just in time!
  - *VO*: "Keep your footing. The heavy pieces do not brake."

---

#### 1:55 - 2:35 | ACT III: TIME & THE HORDE CHASE (Gameplay)
- **1:55 - 2:07**: Jump to Act 4 (`Trailer Hotkey: 4`). Bishop diagonal blade strikes. Red telegraph beam shines down. Pawn holds <kbd>Shift</kbd>: screen desaturates to cyan, audio drops pitch, time slows to 25%. Pawn glides smoothly beneath the falling guillotine blade as it crashes down in slow motion.
  - *On-Screen Tag* (Upper-left, Sand Gold): `THEME 3: TIME`
  - *On-Screen Subtitle*: `Slow it. Outmaneuver it.`
- **2:07 - 2:16**: Pawn mistimes a jump onto spikes. Player taps <kbd>Q</kbd>: VHS scanlines fire, tape reverse whoosh sounds, pawn smoothly rewinds back to safety on the platform ledge.
  - *On-Screen Subtitle*: `Rewind the mistake.`
- **2:16 - 2:35**: Jump to Act 3 (`Trailer Hotkey: 3`). **The Horde Chase Set-Piece**.
  - Camera shakes violently. 50+ silhouetted chess pieces with glowing red eyes surge from the left.
  - Floor tiles crumble into the abyss right behind the running pawn.
  - Chains swing, heartbeat accelerates to panic tempo.
  - Pawn slides under collapsing obstacles, sprints across the final threshold, and the iron portcullis slams shut with an earth-shaking thud, locking the horde out!
  - *VO*: "Run. Never look back."

---

#### 2:35 - 3:00 | CLIMAX, RECAP & CREDITS
- **2:35 - 2:44**: Jump to Act 5 (`Trailer Hotkey: 5`). The Eighth Rank Altar. The colossal Hollow King throne. Four floating spectral golden crowns (Queen, Rook, Bishop, Knight) hovering above stone pedestals.
  - *VO*: "The Eighth Rank. Every piece on the board kneels."
- **2:44 - 2:50**: Quick 1-second cuts of each promotion crown ending card:
  - *Queen*: "She rules a silent board with no one left to rule."
  - *Knight*: "He leapt outside the squares, where something was waiting."
- **2:50 - 2:56**: Theme Recap Card on black background:
  - `FIRE: Light the unlit. Purge the swarm.`
  - `SHADOW: Read the dark. Align the unseen.`
  - `TIME: Bend the seconds. Outrun the past.`
- **2:56 - 3:00**: Final Tagline & Title Slam:
  - *VO*: "How far does a pawn walk... when no one is watching?"
  - Title: **EIGHTH RANK: A Pawn's Walk Through the Dark**
  - Sub-text: `Created for Game Jam 2026 · 100% Procedural Geometry & Web Audio`
  - Sudden cut to black and silence.

---

### CapCut / DaVinci Resolve Editing Checklist

- [x] **Resolution & Frame Rate**: Project sequence set to 1920x1080 @ 60.00 FPS.
- [x] **Gameplay Duration Rule**: Verified at least 2:10 of raw, unadulterated gameplay footage.
- [x] **HUD Discipline**: HUD visible during mechanical gameplay demonstrations (sand meter, torch fuel, clue pickups); HUD hidden (<kbd>H</kbd>) during teaser and cinematic shots.
- [x] **Pacing & Cuts**: No single clip exceeds 5.5 seconds without camera move, action, or beat transition.
- [x] **Theme Visibility**: Clear on-screen titles for `THEME 1: FIRE`, `THEME 2: SHADOW`, `THEME 3: TIME` paired with explicit gameplay demonstrations.
- [x] **Audio Balance**: Voice-over audio leveled to -14 LUFS; game audio side-chain ducked by 6dB during narration.
- [x] **Export Settings**: Format: MP4, Codec: H.264 High Profile, Bitrate: 16-20 Mbps VBR 2-Pass, Audio: AAC 320 kbps.

---

## 🛠️ How to Run

### Method 1: Zero-Build Static Server (Any browser)
Because the stack is pure ES modules and three.js is pinned via native `<script type="importmap">`, simply serve the project folder using any static server:
```bash
# Using Python
python3 -m http.server 3000

# Using Node npx
npx serve .
```
Then open `http://localhost:3000` in your modern browser (Chrome, Edge, Firefox, Safari).

### Method 2: Development with Vite
```bash
npm install
npm run dev
```

---

## 📜 Credits & Jam Statement

- **Engine & Rendering**: Three.js r160 (via CDN import map).
- **Audio Engine**: 100% Procedural Web Audio API synthesis (zero sampled files).
- **Art & Silhouettes**: 100% Procedural geometries (Lathes, Extrusions, Compound primitives).
- *All assets procedural and original. No Limbo or copyrighted assets copied.*
