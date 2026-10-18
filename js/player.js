/**
 * Player Pawn Controller
 * 2.5D kinematic physics, dynamic torch PointLight with shadow-casting & flicker,
 * fuel depletion, glowing eye slits, coyote time, and rewind state serialization.
 */

import * as THREE from 'three';
import { audio } from './audio.js';

export class Player {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.reducedFlicker = options.reducedFlicker || false;

    // Kinematics & Position
    this.x = 2.0;
    this.y = 2.0;
    this.z = 0.0;
    this.vx = 0.0;
    this.vy = 0.0;
    this.width = 0.7;
    this.height = 1.6;
    this.facing = 1; // 1 = right, -1 = left

    // Physical Constants
    this.speed = 7.5;
    this.jumpForce = 13.5;
    this.gravity = 34.0;

    // Jump feel helpers
    this.isGrounded = false;
    this.coyoteTimer = 0.0;
    this.jumpBufferTimer = 0.0;
    this.coyoteTimeMax = 0.12;
    this.jumpBufferMax = 0.12;

    // Torch & Fuel
    this.fuel = 1.0; // 0.0 to 1.0
    this.fuelDepletionRate = 0.004; // ~4 minutes base life, replenished at checkpoints
    this.baseLightRadius = 16.0;
    this.currentLightRadius = 16.0;

    // Visual Mesh Group
    this.group = new THREE.Group();
    this.pawnMesh = null;
    this.eyeLeft = null;
    this.eyeRight = null;
    this.torchLight = null;
    this.torchFlameMesh = null;

    // Footstep audio timing
    this.footstepTimer = 0;

    // Echoes: previous ghost run after death
    this.echoMesh = null;
    this.echoTrajectory = [];
    this.echoPlaybackIndex = 0;

    this.initMesh();
  }

  initMesh() {
    // 1. Procedural Pawn Body with Gothic Chess Finishes
    const matBody = new THREE.MeshStandardMaterial({
      color: 0x1a2332,
      roughness: 0.55,
      metalness: 0.35
    });
    const matTrim = new THREE.MeshStandardMaterial({
      color: 0x2e3a4e,
      roughness: 0.45,
      metalness: 0.5
    });

    // Base stepped pedestal ring
    const baseGeo = new THREE.CylinderGeometry(0.48, 0.55, 0.22, 16);
    const baseMesh = new THREE.Mesh(baseGeo, matTrim);
    baseMesh.position.y = 0.11;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.group.add(baseMesh);

    // Torus base molding
    const torusGeo = new THREE.TorusGeometry(0.46, 0.08, 8, 16);
    const torusMesh = new THREE.Mesh(torusGeo, matTrim);
    torusMesh.position.y = 0.22;
    torusMesh.rotation.x = Math.PI / 2;
    this.group.add(torusMesh);

    // Lathe profile for Pawn body
    const lathePoints = [];
    lathePoints.push(new THREE.Vector2(0, 0));
    lathePoints.push(new THREE.Vector2(0.42, 0));
    lathePoints.push(new THREE.Vector2(0.36, 0.1));
    lathePoints.push(new THREE.Vector2(0.26, 0.25));
    lathePoints.push(new THREE.Vector2(0.18, 0.65));
    lathePoints.push(new THREE.Vector2(0.15, 0.95));
    lathePoints.push(new THREE.Vector2(0.24, 1.05)); // Collar ring
    lathePoints.push(new THREE.Vector2(0.16, 1.14));
    lathePoints.push(new THREE.Vector2(0, 1.14));

    const latheGeo = new THREE.LatheGeometry(lathePoints, 16);
    this.pawnMesh = new THREE.Mesh(latheGeo, matBody);
    this.pawnMesh.position.y = 0.22;
    this.pawnMesh.castShadow = true;
    this.pawnMesh.receiveShadow = true;
    this.group.add(this.pawnMesh);

    // Head Sphere
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const head = new THREE.Mesh(headGeo, matBody);
    head.position.y = 1.48;
    head.castShadow = true;
    this.group.add(head);

    // 2. Piercing White Glowing Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.045, 0.06);

    this.eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeLeft.position.set(0.14, 1.5, 0.18);
    this.group.add(this.eyeLeft);

    this.eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeRight.position.set(0.23, 1.5, 0.12);
    this.group.add(this.eyeRight);

    // 3. Ornate Iron Torch Bracket & Handle
    const handleGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.85, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.85 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.42, 1.05, 0.15);
    handle.rotation.z = -0.45;
    this.group.add(handle);

    // Iron torch cup / crown holding embers
    const cupGeo = new THREE.CylinderGeometry(0.12, 0.06, 0.18, 8);
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x141820, metalness: 0.8, roughness: 0.3 });
    const cup = new THREE.Mesh(cupGeo, ironMat);
    cup.position.set(0.62, 1.34, 0.15);
    this.group.add(cup);

    // Multi-tier animated flame:
    // Outer flame (warm amber)
    const flameGeo = new THREE.ConeGeometry(0.15, 0.45, 8);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff7711,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95
    });
    this.torchFlameMesh = new THREE.Mesh(flameGeo, flameMat);
    this.torchFlameMesh.position.set(0.62, 1.54, 0.15);
    this.group.add(this.torchFlameMesh);

    // Inner core flame (bright white-yellow)
    const coreGeo = new THREE.ConeGeometry(0.08, 0.3, 8);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff0aa,
      blending: THREE.AdditiveBlending
    });
    const coreFlame = new THREE.Mesh(coreGeo, coreMat);
    coreFlame.position.set(0.62, 1.48, 0.15);
    this.group.add(coreFlame);

    // 4. Torch PointLight (Dynamic illumination with 60 FPS performance)
    this.torchLight = new THREE.PointLight(0xff9933, 4.2, this.baseLightRadius, 1.3);
    this.torchLight.position.set(0.62, 1.55, 0.25);
    this.torchLight.castShadow = false;
    this.group.add(this.torchLight);

    this.scene.add(this.group);
  }

  update(dt, input, platforms, gameTime) {
    // 1. Process Horizontal Movement
    let moveDir = 0;
    if (input.left) moveDir -= 1;
    if (input.right) moveDir += 1;

    if (moveDir !== 0) {
      this.vx = moveDir * this.speed;
      this.facing = moveDir;
      this.group.scale.x = this.facing;

      // Footstep audio cadence
      if (this.isGrounded) {
        this.footstepTimer += dt;
        if (this.footstepTimer > 0.32) {
          audio.footstep('stone');
          this.footstepTimer = 0;
        }
      }
    } else {
      this.vx = 0;
      this.footstepTimer = 0.25;
    }

    // 2. Jump Kinematics & Timers
    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteTimeMax;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (input.jumpPressed) {
      this.jumpBufferTimer = this.jumpBufferMax;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // Execute jump if buffer and coyote are active
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      audio.jump();
    }

    // Short-hop mechanic: cut jump velocity if releasing key early
    if (!input.jumpHeld && this.vy > 4.0) {
      this.vy = 4.0;
    }

    // Apply Gravity
    this.vy -= this.gravity * dt;

    // 3. Collision Resolution (AABB)
    const prevGrounded = this.isGrounded;
    this.resolveCollisions(dt, platforms);

    if (!prevGrounded && this.isGrounded) {
      audio.land();
    }

    // 4. Torch Fuel & Flame Dynamics
    this.fuel = Math.max(0.05, this.fuel - this.fuelDepletionRate * dt);
    this.currentLightRadius = this.baseLightRadius * (0.45 + 0.55 * this.fuel);

    // Realistic Torch Light Flicker
    let flicker = 1.0;
    if (!this.reducedFlicker) {
      flicker = 1.0 + Math.sin(gameTime * 22) * 0.08 + Math.cos(gameTime * 41) * 0.05 + (Math.random() - 0.5) * 0.06;
    }

    this.torchLight.intensity = (1.5 + 1.2 * this.fuel) * flicker;
    this.torchLight.distance = this.currentLightRadius;
    audio.setTorchIntensity(this.torchLight.intensity);

    if (this.torchFlameMesh) {
      const flameScale = (0.7 + 0.4 * this.fuel) * flicker;
      this.torchFlameMesh.scale.set(flameScale, flameScale * (1 + Math.sin(gameTime * 30) * 0.2), flameScale);
    }

    // 5. Sync 3D Mesh Position
    this.group.position.set(this.x, this.y, this.z);

    // Subtle walk bob
    if (this.isGrounded && Math.abs(this.vx) > 0.1) {
      this.group.position.y += Math.abs(Math.sin(gameTime * 14)) * 0.06;
      this.group.rotation.z = Math.sin(gameTime * 14) * 0.04 * this.facing;
    } else {
      this.group.rotation.z = 0;
    }

    // 6. Playback previous run echo if present
    this.updateEcho(dt);
  }

  resolveCollisions(dt, platforms) {
    // Horizontal step
    this.x += this.vx * dt;
    for (const p of platforms) {
      if (!p.isSolid) continue;
      if (this.checkOverlap(this.x, this.y, p)) {
        if (this.vx > 0) {
          this.x = p.x - p.w / 2 - this.width / 2;
        } else if (this.vx < 0) {
          this.x = p.x + p.w / 2 + this.width / 2;
        }
        this.vx = 0;
      }
    }

    // Vertical step
    this.y += this.vy * dt;
    this.isGrounded = false;

    for (const p of platforms) {
      if (!p.isSolid) continue;
      if (this.checkOverlap(this.x, this.y, p)) {
        if (this.vy < 0) {
          // Landing on platform top
          this.y = p.y + p.h / 2;
          this.vy = 0;
          this.isGrounded = true;
          // Trigger crumbling platform collapse if platform has trigger
          if (p.onStep) p.onStep();
        } else if (this.vy > 0) {
          // Hitting ceiling
          this.y = p.y - p.h / 2 - this.height;
          this.vy = 0;
        }
      }
    }
  }

  checkOverlap(px, py, p) {
    const pLeft = px - this.width / 2;
    const pRight = px + this.width / 2;
    const pBottom = py;
    const pTop = py + this.height;

    const bLeft = p.x - p.w / 2;
    const bRight = p.x + p.w / 2;
    const bBottom = p.y - p.h / 2;
    const bTop = p.y + p.h / 2;

    return pLeft < bRight && pRight > bLeft && pBottom < bTop && pTop > bBottom;
  }

  // Refill torch fuel at checkpoints & braziers
  refillFuel(amount = 0.5) {
    this.fuel = Math.min(1.0, this.fuel + amount);
  }

  // Spawn translucent Echo of previous death run (Stretch Goal)
  createEcho(recordedTrajectory) {
    if (this.echoMesh) {
      this.scene.remove(this.echoMesh);
    }
    if (!recordedTrajectory || recordedTrajectory.length === 0) return;

    this.echoTrajectory = recordedTrajectory.slice();
    this.echoPlaybackIndex = 0;

    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    const geo = new THREE.CylinderGeometry(0.3, 0.4, 1.4, 8);
    this.echoMesh = new THREE.Mesh(geo, ghostMat);
    this.scene.add(this.echoMesh);
  }

  updateEcho(dt) {
    if (!this.echoMesh || this.echoTrajectory.length === 0) return;
    if (this.echoPlaybackIndex < this.echoTrajectory.length) {
      const pt = this.echoTrajectory[this.echoPlaybackIndex];
      this.echoMesh.position.set(pt.x, pt.y + 0.7, 0);
      this.echoPlaybackIndex++;
    } else {
      this.echoMesh.visible = false;
    }
  }

  // State Serialization for 4-Second Time Rewind
  getState() {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      facing: this.facing,
      fuel: this.fuel,
      isGrounded: this.isGrounded
    };
  }

  setState(st) {
    this.x = st.x;
    this.y = st.y;
    this.vx = st.vx;
    this.vy = st.vy;
    this.facing = st.facing;
    this.fuel = st.fuel;
    this.isGrounded = st.isGrounded;

    this.group.position.set(this.x, this.y, this.z);
    this.group.scale.x = this.facing;
  }
}
