/**
 * Enemies Engine
 * Rook (patrol & charge), Bishop (diagonal blade strikes), Knight (parabolic leaps),
 * Pawn-Swarm (fire burn mechanic), and The Horde (cinematic chase set-piece).
 */

import * as THREE from 'three';
import { audio } from './audio.js';

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;

    // Rook Enemy
    this.rook = {
      x: 32.0,
      y: 0.0,
      vx: 1.8,
      direction: 1,
      minX: 26.0,
      maxX: 40.0,
      chargeSpeed: 5.6,
      patrolSpeed: 1.8,
      isCharging: false,
      mesh: null,
      eyes: null
    };

    // Bishop Enemy
    this.bishop = {
      x: 72.0,
      bladeX: 72.0,
      bladeY: 10.0,
      timer: 0.0,
      interval: 2.8,
      warningActive: false,
      isStriking: false,
      beamMesh: null,
      bladeMesh: null,
      bishopMesh: null
    };

    // Knight Enemy
    this.knight = {
      x: 46.0,
      y: 0.0,
      vx: 0.0,
      vy: 0.0,
      isAirborne: false,
      jumpCooldown: 2.2,
      timer: 1.0,
      mesh: null
    };

    // Pawn Swarm (Burn Mechanic)
    this.pawnSwarms = [];

    // The Horde Chase Set-Piece
    this.horde = {
      active: false,
      x: 48.0,
      speed: 4.8,
      group: null,
      eyeParticles: null,
      gateClosed: false
    };

    this.initMeshes();
  }

  initMeshes() {
    // 1. Build Rook
    this.buildRookMesh();

    // 2. Build Bishop
    this.buildBishopMesh();

    // 3. Build Knight
    this.buildKnightMesh();

    // 4. Build Pawn Swarm Spawners
    this.spawnPawnSwarm(22.0);
    this.spawnPawnSwarm(24.5);
    this.spawnPawnSwarm(62.0);
    this.spawnPawnSwarm(64.5);

    // 5. Build The Horde
    this.buildHordeMesh();
  }

  buildRookMesh() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x090b10,
      roughness: 0.9,
      metalness: 0.2
    });

    // Castle Tower Body
    const towerGeo = new THREE.CylinderGeometry(0.85, 1.15, 3.2, 12);
    const tower = new THREE.Mesh(towerGeo, mat);
    tower.position.y = 1.6;
    tower.castShadow = true;
    group.add(tower);

    // Battlements
    const topGeo = new THREE.CylinderGeometry(1.2, 0.95, 0.7, 12);
    const top = new THREE.Mesh(topGeo, mat);
    top.position.y = 3.4;
    top.castShadow = true;
    group.add(top);

    // Glowing Red Slit Eye
    const eyeGeo = new THREE.BoxGeometry(0.5, 0.08, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
    this.rook.eyes = new THREE.Mesh(eyeGeo, eyeMat);
    this.rook.eyes.position.set(0, 2.5, 0.85);
    group.add(this.rook.eyes);

    this.rook.mesh = group;
    this.scene.add(group);
  }

  buildBishopMesh() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x07090e,
      roughness: 0.8,
      metalness: 0.3
    });

    // Bishop statue suspended aloft
    const bGeo = new THREE.CylinderGeometry(0.5, 0.9, 3.4, 12);
    const body = new THREE.Mesh(bGeo, mat);
    body.position.set(0, 7.5, 0);
    body.castShadow = true;
    group.add(body);

    // Vertical Telegraph Warning Beam
    const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, 12, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xb3122b,
      transparent: true,
      opacity: 0.0
    });
    this.bishop.beamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.bishop.beamMesh.position.set(0, 5, 0);
    group.add(this.bishop.beamMesh);

    // Lethal Guillotine Blade
    const bladeGeo = new THREE.BoxGeometry(0.2, 2.4, 0.8);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xd8dde8,
      roughness: 0.2,
      metalness: 0.95
    });
    this.bishop.bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.bishop.bladeMesh.position.set(0, 11, 0);
    this.bishop.bladeMesh.castShadow = true;
    group.add(this.bishop.bladeMesh);

    this.bishop.bishopMesh = group;
    this.scene.add(group);
  }

  buildKnightMesh() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x080a0f,
      roughness: 0.85,
      metalness: 0.15
    });

    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.95, 1.4, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    const neckGeo = new THREE.BoxGeometry(0.65, 1.6, 0.9);
    const neck = new THREE.Mesh(neckGeo, mat);
    neck.position.set(0.2, 1.8, 0);
    neck.rotation.z = -0.3;
    neck.castShadow = true;
    group.add(neck);

    // Red eye
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1525 });
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), eyeMat);
    eye.position.set(-0.25, 2.5, 0.35);
    group.add(eye);

    this.knight.mesh = group;
    this.scene.add(group);
  }

  spawnPawnSwarm(xPos) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x050608,
      roughness: 0.9
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.9, 8), mat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mat);
    head.position.y = 1.05;
    head.castShadow = true;
    group.add(head);

    // Glowing Red Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.2), eyeMat);
    eyes.position.set(0.15, 1.05, 0);
    group.add(eyes);

    group.position.set(xPos, 0, 0);
    this.scene.add(group);

    this.pawnSwarms.push({
      x: xPos,
      y: 0,
      vx: 1.4,
      mesh: group,
      alive: true,
      burning: false,
      burnTimer: 0.0
    });
  }

  buildHordeMesh() {
    this.horde.group = new THREE.Group();
    const silMat = new THREE.MeshBasicMaterial({ color: 0x010204 });

    // Wall of 45 silhouetted chess figures
    for (let i = 0; i < 45; i++) {
      const h = 2.5 + (i % 6) * 0.8;
      const w = 0.8 + (i % 4) * 0.4;
      const geo = new THREE.BoxGeometry(w, h, 1.0);
      const piece = new THREE.Mesh(geo, silMat);
      const ox = -Math.random() * 8.0;
      const oy = h / 2 + Math.random() * 0.5;
      const oz = (Math.random() - 0.5) * 4.0;
      piece.position.set(ox, oy, oz);
      this.horde.group.add(piece);
    }

    // Swarm of glowing red eyes
    const eyeCount = 60;
    const eyeGeo = new THREE.BufferGeometry();
    const eyePositions = new Float32Array(eyeCount * 3);
    for (let i = 0; i < eyeCount; i++) {
      eyePositions[i * 3] = -Math.random() * 7.0;
      eyePositions[i * 3 + 1] = 1.0 + Math.random() * 4.0;
      eyePositions[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
    }
    eyeGeo.setAttribute('position', new THREE.BufferAttribute(eyePositions, 3));
    const eyePointsMat = new THREE.PointsMaterial({
      color: 0xff1525,
      size: 0.28,
      blending: THREE.AdditiveBlending
    });
    this.horde.eyeParticles = new THREE.Points(eyeGeo, eyePointsMat);
    this.horde.group.add(this.horde.eyeParticles);

    this.horde.group.position.set(this.horde.x, 0, 0);
    this.horde.group.visible = false;
    this.scene.add(this.horde.group);
  }

  update(dt, player, braziers, gameTime) {
    let playerKilled = false;

    // 1. Update Rook
    playerKilled = this.updateRook(dt, player) || playerKilled;

    // 2. Update Bishop Blade Strikes
    playerKilled = this.updateBishop(dt, player) || playerKilled;

    // 3. Update Knight Leap
    playerKilled = this.updateKnight(dt, player) || playerKilled;

    // 4. Update Pawn Swarm & Burn Mechanic
    playerKilled = this.updatePawnSwarm(dt, player, braziers) || playerKilled;

    // 5. Update The Horde Chase
    playerKilled = this.updateHorde(dt, player) || playerKilled;

    return playerKilled;
  }

  updateRook(dt, player) {
    const r = this.rook;
    const distToPlayer = Math.abs(player.x - r.x);

    // Charge trigger when player enters territory
    if (distToPlayer < 12.0 && player.x > r.minX - 4 && player.x < r.maxX + 4) {
      if (!r.isCharging) {
        r.isCharging = true;
        r.direction = player.x > r.x ? 1 : -1;
        audio.speak("Crush the pawn!", 'rook');
      }
    } else if (distToPlayer > 18.0) {
      r.isCharging = false;
    }

    const currentSpeed = r.isCharging ? r.chargeSpeed : r.patrolSpeed;
    r.x += r.direction * currentSpeed * dt;

    if (r.x > r.maxX) {
      r.x = r.maxX;
      r.direction = -1;
    } else if (r.x < r.minX) {
      r.x = r.minX;
      r.direction = 1;
    }

    // Heavy footstep audio
    if (Math.abs(Math.sin(r.x * 2)) > 0.95) {
      audio.rookStomp(r.x, player.x);
    }

    if (r.mesh) {
      r.mesh.position.set(r.x, r.y, 0);
      r.mesh.scale.x = r.direction;
      if (r.eyes) {
        r.eyes.material.color.setHex(r.isCharging ? 0xff0000 : 0xaa2222);
      }
    }

    // Check collision with player
    if (Math.abs(player.x - r.x) < 1.2 && Math.abs(player.y - r.y) < 2.5) {
      return true; // Death
    }
    return false;
  }

  updateBishop(dt, player) {
    const b = this.bishop;
    // Bishop active in Act IV corridor (x: 68 to 86)
    if (player.x < 66.0 || player.x > 88.0) {
      if (b.bishopMesh) b.bishopMesh.visible = false;
      return false;
    }

    if (b.bishopMesh) b.bishopMesh.visible = true;
    b.timer += dt;

    // Phase 1: Track player and telegraph warning beam
    if (b.timer < 1.6) {
      b.bladeX = player.x;
      b.bishopMesh.position.x = b.bladeX;
      b.beamMesh.material.opacity = Math.min(0.65, b.timer * 0.45);
      b.bladeMesh.position.y = 11.0;
      if (b.timer > 1.2 && !b.warningActive) {
        b.warningActive = true;
        audio.bishopStrikeWarning();
        audio.speak("Sever along the diagonal!", 'bishop');
      }
    }
    // Phase 2: Lethal blade strike downwards
    else if (b.timer < 2.2) {
      b.warningActive = false;
      const strikeProgress = (b.timer - 1.6) / 0.6;
      b.bladeMesh.position.y = 11.0 - strikeProgress * 11.0;

      if (b.bladeMesh.position.y < 3.0 && !b.isStriking) {
        b.isStriking = true;
        audio.bishopBladeSlash();
      }

      // Lethal collision check with blade
      if (Math.abs(player.x - b.bladeX) < 0.9 && player.y < 3.2) {
        return true; // Decapitated
      }
    }
    // Phase 3: Blade retracts
    else if (b.timer < b.interval) {
      b.isStriking = false;
      b.beamMesh.material.opacity = 0.0;
      b.bladeMesh.position.y = 11.0;
    } else {
      b.timer = 0.0;
    }

    return false;
  }

  updateKnight(dt, player) {
    const k = this.knight;
    k.timer += dt;

    if (!k.isAirborne && k.timer > k.jumpCooldown) {
      const dist = Math.abs(player.x - k.x);
      if (dist < 14.0 && player.x > 40.0 && player.x < 56.0) {
        // Initiate high parabolic leap
        k.isAirborne = true;
        const dir = player.x > k.x ? 1 : -1;
        k.vx = dir * 6.5;
        k.vy = 12.0;
        k.timer = 0;
      }
    }

    if (k.isAirborne) {
      k.x += k.vx * dt;
      k.vy -= 28.0 * dt; // gravity
      k.y += k.vy * dt;

      if (k.y <= 0) {
        k.y = 0;
        k.vy = 0;
        k.vx = 0;
        k.isAirborne = false;
        audio.land();
      }
    }

    if (k.mesh) {
      k.mesh.position.set(k.x, k.y, 0);
    }

    // Collision check
    if (Math.abs(player.x - k.x) < 1.1 && Math.abs(player.y - k.y) < 2.2) {
      return true;
    }
    return false;
  }

  updatePawnSwarm(dt, player, braziers) {
    let killed = false;
    for (const swarm of this.pawnSwarms) {
      if (!swarm.alive) continue;

      // Burning mechanic: If touching player torchlight (within 2.2m and player has torch on)
      // or near a lit brazier, swarm catches fire!
      const distToPlayer = Math.hypot(player.x - swarm.x, player.y - swarm.y);
      let nearLitFire = false;

      // Check lit braziers
      for (const br of braziers) {
        if (br.lit && Math.abs(br.x - swarm.x) < 2.5) {
          nearLitFire = true;
          break;
        }
      }

      // Check player torch
      if (distToPlayer < 2.0 && player.fuel > 0.05) {
        nearLitFire = true;
      }

      if (nearLitFire && !swarm.burning) {
        swarm.burning = true;
        audio.pawnBurn();
      }

      if (swarm.burning) {
        swarm.burnTimer += dt;
        swarm.mesh.rotation.z += dt * 8.0;
        swarm.mesh.scale.multiplyScalar(0.92);
        if (swarm.burnTimer > 0.6) {
          swarm.alive = false;
          swarm.mesh.visible = false;
        }
      } else {
        // Scurry toward player
        const dir = player.x > swarm.x ? 1 : -1;
        swarm.x += dir * swarm.vx * dt;
        swarm.mesh.position.set(swarm.x, swarm.y, 0);

        // Lethal collision if not burned
        if (distToPlayer < 0.8) {
          killed = true;
        }
      }
    }
    return killed;
  }

  updateHorde(dt, player) {
    const h = this.horde;
    if (!h.active || h.gateClosed) return false;

    // Advance horde
    h.x += h.speed * dt;
    if (h.group) {
      h.group.position.x = h.x;
      // Animate glowing red eye particles
      if (h.eyeParticles) {
        h.eyeParticles.rotation.y = Math.sin(performance.now() * 0.003) * 0.1;
      }
    }

    // Set audio threat level based on horde proximity
    const distToHorde = player.x - h.x;
    const threat = Math.max(0, Math.min(1, 1 - distToHorde / 20.0));
    audio.setThreatLevel(threat);

    // Collide with player
    if (player.x <= h.x + 0.5) {
      return true; // Overrun by the horde
    }
    return false;
  }

  startHordeChase(startX = 48.0) {
    this.horde.active = true;
    this.horde.x = startX;
    this.horde.gateClosed = false;
    audio.speak("Kill the pawn! Tear him down!", 'horde');
    if (this.horde.group) {
      this.horde.group.visible = true;
      this.horde.group.position.x = startX;
    }
  }

  closeHordeGate() {
    this.horde.gateClosed = true;
    this.horde.active = false;
    audio.settleOut();
  }

  // State Serialization for Time Rewind
  getState() {
    return {
      rook: { x: this.rook.x, y: this.rook.y, dir: this.rook.direction, charging: this.rook.isCharging },
      bishop: { timer: this.bishop.timer, bladeX: this.bishop.bladeX },
      knight: { x: this.knight.x, y: this.knight.y, vx: this.knight.vx, vy: this.knight.vy, air: this.knight.isAirborne },
      horde: { active: this.horde.active, x: this.horde.x, closed: this.horde.gateClosed }
    };
  }

  setState(st) {
    if (!st) return;
    this.rook.x = st.rook.x;
    this.rook.y = st.rook.y;
    this.rook.direction = st.rook.dir;
    this.rook.isCharging = st.rook.charging;
    if (this.rook.mesh) this.rook.mesh.position.set(this.rook.x, this.rook.y, 0);

    this.bishop.timer = st.bishop.timer;
    this.bishop.bladeX = st.bishop.bladeX;

    this.knight.x = st.knight.x;
    this.knight.y = st.knight.y;
    this.knight.vx = st.knight.vx;
    this.knight.vy = st.knight.vy;
    this.knight.isAirborne = st.knight.air;
    if (this.knight.mesh) this.knight.mesh.position.set(this.knight.x, this.knight.y, 0);

    this.horde.active = st.horde.active;
    this.horde.x = st.horde.x;
    this.horde.gateClosed = st.horde.closed;
    if (this.horde.group) this.horde.group.position.x = this.horde.x;
  }
}
