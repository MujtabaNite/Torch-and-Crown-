/**
 * Puzzles & Interactive Environment Engine
 * Hidden/phantom torchlit platforms, 3-brazier order puzzle, shadow-casting puzzle,
 * 3x3 sliding tile crest door, lore notes, and the Altar of Promotion.
 */

import * as THREE from 'three';
import { audio } from './audio.js';

export class PuzzleManager {
  constructor(scene) {
    this.scene = scene;

    // Phantom / Hidden Platforms (Materialize in ethereal mist when lit by torch)
    this.phantomPlatforms = [];

    // Brazier Order Puzzle (Knight ♞ -> Rook ♜ -> Bishop ♝)
    this.braziers = [
      { x: 38.0, y: 1.6, symbol: '♞', order: 0, lit: false, mesh: null, light: null },
      { x: 41.5, y: 1.6, symbol: '♜', order: 1, lit: false, mesh: null, light: null },
      { x: 45.0, y: 1.6, symbol: '♝', order: 2, lit: false, mesh: null, light: null }
    ];
    this.currentBrazierStep = 0;
    this.brazierGateUnlocked = false;

    // Shadow Puzzle State
    this.shadowPuzzle = {
      x: 31.0,
      y: 3.6,
      solved: false,
      currentAngle: 120, // degrees
      targetAngle: 0,
      tolerance: 15
    };

    // Slide Puzzle State (3x3 tiles, 0 = empty)
    this.slidePuzzle = {
      x: 52.0,
      solved: false,
      grid: [1, 2, 3, 4, 0, 5, 7, 8, 6], // solvable configuration
      solution: [1, 2, 3, 4, 5, 6, 7, 8, 0]
    };

    // Lore Notes placed thoughtfully along multi-tiered platforms
    this.notes = [
      { x: 13.0, y: 3.8, text: 'Clue 1: The phantom stones remember the way, but only where the torch can reach them.', collected: false, mesh: null },
      { x: 29.5, y: 4.4, text: 'Clue 2: The Rook stomps below. Climb to the stone balcony to leap over his charge.', collected: false, mesh: null },
      { x: 40.0, y: 2.8, text: 'Clue 3: Three flames wake in this royal sequence: Knight, Rook, Bishop. Press E at each.', collected: false, mesh: null },
      { x: 50.0, y: 2.8, text: 'Clue 4: When the gate rises, they will surge. Hold [Shift] to bend time across the bridge.', collected: false, mesh: null }
    ];

    // Checkpoints strictly situated on SOLID ground platforms
    this.checkpoints = [
      { x: 2.0, y: 0.5, lit: true, mesh: null },   // Act I: Crypt start
      { x: 26.5, y: 1.8, lit: false, mesh: null },  // Act II: Safe landing after phantom chasm
      { x: 49.5, y: 1.8, lit: false, mesh: null },  // Act III: Before sliding gate & chase
      { x: 69.5, y: 1.8, lit: false, mesh: null },  // Act IV: Safe landing after crumbling bridge
      { x: 87.5, y: 2.0, lit: false, mesh: null }   // Act V: Sanctuary past slammed exit gate
    ];

    // Hourglass Sand Pickups situated on challenge ledges
    this.hourglasses = [
      { x: 10.0, y: 2.8, collected: false, mesh: null },
      { x: 20.5, y: 4.4, collected: false, mesh: null }, // atop high phantom stone
      { x: 59.0, y: 3.6, collected: false, mesh: null }, // floating over crumbling bridge
      { x: 77.0, y: 4.6, collected: false, mesh: null }  // high arch in blade corridor
    ];

    // Altar of Promotion (Eighth Rank)
    this.altar = {
      x: 99.0,
      y: 4.6,
      active: true,
      crownMeshes: []
    };

    this.initWorldObjects();
  }

  initWorldObjects() {
    this.initPhantomPlatforms();
    this.initBraziers();
    this.initNotes();
    this.initCheckpoints();
    this.initHourglasses();
    this.initAltar();
  }

  initPhantomPlatforms() {
    // Stepping stones across the chasm at varied heights
    const coords = [
      { x: 17.5, y: 2.0, w: 2.6, h: 0.5 },
      { x: 20.5, y: 3.2, w: 2.4, h: 0.5 },
      { x: 23.5, y: 2.2, w: 2.6, h: 0.5 }
    ];

    coords.forEach(c => {
      const geo = new THREE.BoxGeometry(c.w, c.h, 1.8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x334460,
        roughness: 0.6,
        metalness: 0.4,
        transparent: true,
        opacity: 0.15
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(c.x, c.y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Glowing rune trim on edges
      const runeMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.2 });
      const runeGeo = new THREE.BoxGeometry(c.w + 0.05, 0.06, 1.85);
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(0, c.h / 2, 0);
      mesh.add(rune);

      this.phantomPlatforms.push({
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
        mesh,
        runeMat,
        isSolid: false
      });
    });
  }

  initBraziers() {
    this.braziers.forEach(b => {
      const group = new THREE.Group();

      // Stone Pedestal
      const baseGeo = new THREE.CylinderGeometry(0.45, 0.6, 1.2, 8);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.9 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.6;
      base.castShadow = true;
      group.add(base);

      // Iron Bowl
      const bowlGeo = new THREE.CylinderGeometry(0.7, 0.4, 0.4, 8);
      const bowlMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.7, roughness: 0.4 });
      const bowl = new THREE.Mesh(bowlGeo, bowlMat);
      bowl.position.y = 1.35;
      group.add(bowl);

      // Flame Mesh
      const flameGeo = new THREE.ConeGeometry(0.28, 0.7, 8);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        blending: THREE.AdditiveBlending,
        visible: false
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 1.8;
      group.add(flame);

      group.position.set(b.x, b.y, 0);
      this.scene.add(group);

      b.mesh = group;
      b.flameMesh = flame;
    });
  }

  initNotes() {
    this.notes.forEach(n => {
      const geo = new THREE.BoxGeometry(0.45, 0.55, 0.05);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xe0d6c2,
        roughness: 0.6
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(n.x, n.y, 0);
      mesh.rotation.z = 0.2;
      this.scene.add(mesh);
      n.mesh = mesh;
    });
  }

  initCheckpoints() {
    this.checkpoints.forEach(cp => {
      const group = new THREE.Group();
      const colGeo = new THREE.CylinderGeometry(0.25, 0.35, 1.8, 8);
      const colMat = new THREE.MeshStandardMaterial({ color: 0x1b2029 });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.y = 0.9;
      group.add(col);

      // Crystal / Ember at top
      const topGeo = new THREE.OctahedronGeometry(0.28);
      const topMat = new THREE.MeshBasicMaterial({
        color: cp.lit ? 0xffaa22 : 0x3a4555
      });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 2.0;
      group.add(top);

      group.position.set(cp.x, cp.y, 0);
      this.scene.add(group);
      cp.mesh = group;
      cp.topMesh = top;
    });
  }

  initHourglasses() {
    this.hourglasses.forEach(hg => {
      const group = new THREE.Group();
      const geo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 8);
      geo.scale(1, 1.4, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xe5b842,
        roughness: 0.2,
        metalness: 0.8
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      group.position.set(hg.x, hg.y, 0);
      this.scene.add(group);
      hg.mesh = group;
    });
  }

  initAltar() {
    const group = new THREE.Group();

    // High Grand Dais
    const daisGeo = new THREE.CylinderGeometry(3.5, 4.2, 1.4, 16);
    const daisMat = new THREE.MeshStandardMaterial({ color: 0x121722, roughness: 0.6, metalness: 0.5 });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.y = 0.7;
    dais.receiveShadow = true;
    group.add(dais);

    // Four hovering crown pedestals
    const crowns = ['Queen', 'Rook', 'Bishop', 'Knight'];
    crowns.forEach((name, i) => {
      const angle = (i * Math.PI * 2) / 4;
      const pedGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.6, 8);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x222c3d });
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.set(Math.cos(angle) * 2.2, 1.5, Math.sin(angle) * 1.5);
      group.add(ped);

      // Glowing Crown
      const crownMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.08, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      crownMesh.position.set(ped.position.x, 2.7, ped.position.z);
      crownMesh.rotation.x = Math.PI / 2;
      group.add(crownMesh);
      this.altar.crownMeshes.push(crownMesh);
    });

    group.position.set(this.altar.x, this.altar.y, 0);
    this.scene.add(group);
  }

  update(dt, player, gameTime) {
    // 1. Update Phantom Platforms (Solid and glowing when in torch range)
    const torchX = player.x + player.facing * 0.5;
    const torchY = player.y + 1.4;

    this.phantomPlatforms.forEach(p => {
      const dist = Math.hypot(torchX - p.x, torchY - p.y);
      const isInTorchlight = dist < player.currentLightRadius && player.fuel > 0.04;

      if (isInTorchlight) {
        p.isSolid = true;
        p.mesh.material.opacity = THREE.MathUtils.lerp(p.mesh.material.opacity, 0.95, dt * 5.0);
        p.runeMat.opacity = THREE.MathUtils.lerp(p.runeMat.opacity, 0.85, dt * 5.0);
      } else {
        p.isSolid = false;
        p.mesh.material.opacity = THREE.MathUtils.lerp(p.mesh.material.opacity, 0.15, dt * 3.0);
        p.runeMat.opacity = THREE.MathUtils.lerp(p.runeMat.opacity, 0.1, dt * 3.0);
      }
    });

    // 2. Animate Hourglasses & check collection
    this.hourglasses.forEach(hg => {
      if (hg.collected || !hg.mesh) return;
      hg.mesh.rotation.y += dt * 2.0;
      hg.mesh.position.y = hg.y + Math.sin(gameTime * 3 + hg.x) * 0.15;

      if (Math.hypot(player.x - hg.x, player.y - hg.y) < 1.4) {
        hg.collected = true;
        hg.mesh.visible = false;
        audio.promotionChime();
        player.refillFuel(0.35);
      }
    });

    // 3. Animate Notes bobbing
    this.notes.forEach(n => {
      if (!n.collected && n.mesh) {
        n.mesh.position.y = n.y + Math.sin(gameTime * 2.5 + n.x) * 0.08;
      }
    });

    // 4. Animate Altar Crowns
    this.altar.crownMeshes.forEach((cm, i) => {
      cm.rotation.z += dt * (1.2 + i * 0.2);
      cm.position.y = 2.7 + Math.sin(gameTime * 2.0 + i) * 0.12;
    });
  }

  interactBrazier(player) {
    for (let i = 0; i < this.braziers.length; i++) {
      const b = this.braziers[i];
      const dist = Math.hypot(player.x - b.x, player.y - b.y);

      if (dist < 2.0) {
        if (b.lit) return { message: `This brazier of the ${b.symbol} already burns brightly.` };

        if (b.order === this.currentBrazierStep) {
          b.lit = true;
          b.flameMesh.visible = true;
          this.currentBrazierStep++;
          audio.brazierIgnite();

          if (this.currentBrazierStep === this.braziers.length) {
            this.brazierGateUnlocked = true;
            audio.promotionChime();
            audio.settleOut();
            return { message: 'All three ancestral braziers burn! The stone counterweight drops!' };
          }
          return { message: `You ignite the flame of the ${b.symbol}. (${this.currentBrazierStep}/3 braziers lit)` };
        } else {
          audio.wrongOrderSting();
          this.braziers.forEach(br => {
            br.lit = false;
            br.flameMesh.visible = false;
          });
          this.currentBrazierStep = 0;
          return { message: 'Wrong flame order! The braziers hiss and extinguish in the cold wind.' };
        }
      }
    }
    return null;
  }

  checkNoteInteraction(player) {
    for (const note of this.notes) {
      if (!note.collected && Math.hypot(player.x - note.x, player.y - note.y) < 1.6) {
        note.collected = true;
        if (note.mesh) note.mesh.visible = false;
        audio.footstep('wood');
        return note;
      }
    }
    return null;
  }

  getCollectedCluesCount() {
    return this.notes.filter(n => n.collected).length;
  }
}
