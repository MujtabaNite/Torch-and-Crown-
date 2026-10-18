# Torch and Crown

**A Pawn's Walk Through the Dark** is a 2.5D gothic horror platform game built with Three.js. Guide a lone pawn through the Hollow King's chessboard using fire, shadow, and time to reach the Eighth Rank and choose a crown.

The game uses procedural Three.js geometry and synthesizes its music and sound effects with the Web Audio API. Three.js is loaded through the import map in `index.html`.

## Run locally

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (by default, `http://localhost:3000`).

Create and serve a production build with:

```bash
npm run build
npm run preview
```

## Controls

| Action | Controls |
| --- | --- |
| Move | `A` / `D` or Left / Right Arrow |
| Jump | `W`, `Space`, or Up Arrow |
| Slow time | Hold `Shift` |
| Rewind | Hold `Q` |
| Interact | `E` |
| Close a dialog | `Escape` |

The game currently supports keyboard controls; gamepad controls are not implemented.

Press **Play** to enter gameplay. The opening cinematic is not currently part of the Play flow.

## Journey

The route is divided into five acts:

1. **The Forgotten Crypt** — Use the torch to reveal temporary phantom platforms and cross the chasm.
2. **Hall of Statues & Balcony** — Navigate the Rook's patrol, find the shadow relic, and light the three braziers in Knight → Rook → Bishop order.
3. **The Crumbling Bridge & Horde** — Solve the portcullis slide puzzle, then cross the collapsing bridge while the horde pursues.
4. **The Diagonal Blades** — Time your movement around the Bishop's warning and blade strikes.
5. **The Eighth Rank & Altar of Crowns** — Reach the altar and choose a promotion ending. The Knight encounter is located near the altar, away from the bridge route.

Checkpoints provide a safe respawn and restore time sand. Golden hourglasses also replenish torch fuel.

## Mechanics

- **Torch and fire:** Torch fuel drains slowly and controls the light radius. Torchlight reveals phantom platforms and can burn nearby pawn swarms.
- **Puzzles:** Rotate the shadow relic into alignment, light the three braziers in order, and solve the 3×3 sliding crest to open the portcullis. The slide-puzzle dialog also includes a **Force Gate (Solve)** option.
- **Time:** Hold `Shift` to slow the world while using sand. Hold `Q` to rewind recent player and enemy states; rewind is limited by the available history and sand.
- **Hazards:** Avoid spikes, enemy contact, the collapsing bridge, and the Bishop's blade.
- **Promotion:** Choose among the Queen, Rook, Bishop, and Knight endings at the altar.

## Settings

Open **Settings** from the title screen to adjust master volume, enable reduced torch flicker, or enable Trailer Director tools.

### Trailer Director tools

Enable the tools in Settings or add `?trailer=1` to the URL.

| Control | Action |
| --- | --- |
| `1`–`5` | Jump to an act |
| `H` | Toggle the HUD |
| `F` | Toggle free camera |
| `C` | Toggle letterbox bars |
| `[` / `]` | Decrease / increase playback speed |
| Mouse drag | Look around while free camera is enabled |

## Project scripts

- `index.html` — Game page, HUD, dialogs, and Three.js import map.
- `style.css` — Game interface and responsive styling.
- `js/main.js` — Game setup, level layout, input, and main loop.
- `js/player.js` — Player movement, collisions, torch, and fuel.
- `js/scene.js` — Three.js scene, camera, lighting, and rendering.
- `js/enemies.js` — Rook, Knight, Bishop, pawn swarms, and horde.
- `js/puzzles.js` — Phantom platforms, braziers, notes, checkpoints, and altar.
- `js/time.js` — Slow-time and rewind mechanics.
- `js/audio.js` — Procedural Web Audio synthesis.
- `js/cinematics.js` — Intro cinematic, subtitles, and ending text.
- `js/trailer.js` — Optional Trailer Director tools.

## Build

The project uses Vite. `npm run build` creates a production build in `dist/`.
