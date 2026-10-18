/**
 * Scene & Rendering Engine - World-Class 2.5D Gothic Chess Horror
 * Multi-layer backlit parallax, colossal chess statues, moonlit sky gradient,
 * sculpted stone platform architecture, soft particle emitters, and cinematic rim lighting.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Generate soft radial particle sprite texture in memory
function createSoftParticleTexture(r = 255, g = 160, b = 40) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.3, `rgba(${r}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.3)}, 0.8)`);
  gradient.addColorStop(0.7, `rgba(${r}, ${Math.floor(g * 0.4)}, 0, 0.25)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Generate sky gradient canvas texture
function createGothicSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep midnight moonlit fog gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#060a12'); // zenith deep navy
  grad.addColorStop(0.4, '#101826'); // moonlit haze
  grad.addColorStop(0.75, '#1e2c40'); // horizon mist
  grad.addColorStop(1.0, '#121a28'); // ground fog

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Pale colossal moon behind clouds
  const moonGrad = ctx.createRadialGradient(256, 170, 10, 256, 170, 140);
  moonGrad.addColorStop(0.0, 'rgba(230, 240, 255, 0.45)');
  moonGrad.addColorStop(0.3, 'rgba(180, 210, 245, 0.2)');
  moonGrad.addColorStop(0.7, 'rgba(120, 160, 210, 0.08)');
  moonGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = moonGrad;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth || 800;
    this.height = window.innerHeight || 600;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.bloomPass = null;

    // Cinematic camera rail (tighter and closer to pawn)
    this.camTargetX = 2.0;
    this.camTargetY = 3.2;
    this.camCurrentX = 2.0;
    this.camCurrentY = 3.2;
    this.camZ = 13.0; // Pulled back slightly for better platformer overview
    this.camShake = 0;

    // Free camera for trailer
    this.isFreeCam = false;

    // Lighting
    this.hemiLight = null;
    this.rimLight = null;
    this.keyLight = null;

    // Parallax groups
    this.skyBackdrop = null;
    this.farStatuesGroup = new THREE.Group();
    this.midArchesGroup = new THREE.Group();
    this.nearBackgroundGroup = new THREE.Group();
    this.foregroundGroup = new THREE.Group();

    // Environmental elements
    this.ashParticles = null;
    this.emberParticles = null;
    this.chains = [];
    this.torchHalo = null;

    this.init();
  }

  init() {
    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e1420);
    this.scene.fog = new THREE.FogExp2(0x111928, 0.018); // Soft atmospheric mist

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      42,
      Math.max(0.1, this.width / Math.max(1, this.height)),
      0.1,
      160
    );
    this.camera.position.set(2.0, 3.2, this.camZ);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // 4. Cinematic Lighting Setup (Moonlit Rim + Ambient + Torch)
    // Cool sky vs ground hemisphere fill
    this.hemiLight = new THREE.HemisphereLight(0x7da2d0, 0x1c2434, 1.35);
    this.scene.add(this.hemiLight);

    // Strong Backlight / Rim Light (Gives all silhouettes gorgeous glowing silver-blue edges)
    this.rimLight = new THREE.DirectionalLight(0xa5c8f8, 2.0);
    this.rimLight.position.set(-15, 22, -14);
    this.scene.add(this.rimLight);

    // Key Light from front-top-right (casts soft chess shadows)
    this.keyLight = new THREE.DirectionalLight(0xffeedd, 1.25);
    this.keyLight.position.set(12, 18, 10);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 60;
    this.keyLight.shadow.camera.left = -20;
    this.keyLight.shadow.camera.right = 20;
    this.keyLight.shadow.camera.top = 18;
    this.keyLight.shadow.camera.bottom = -14;
    this.keyLight.shadow.bias = -0.0008;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // 5. Post-Processing Pipeline (Optimized half-res Bloom for 60 FPS)
    this.setupPostProcessing();

    // 6. Build the Gothic Chess Horizon & Parallax Architecture
    this.buildGothicWorld();

    // 7. Atmospheric Particle Systems (Soft circular glowing embers and ash)
    this.createAshParticles();
    this.createEmberParticles();

    // Resize handler
    window.addEventListener('resize', () => this.onResize());
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // UnrealBloomPass at half-resolution: silky smooth 60 FPS with warm flame bloom
    const bloomW = Math.max(1, Math.floor(this.width / 2));
    const bloomH = Math.max(1, Math.floor(this.height / 2));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(bloomW, bloomH),
      0.75,  // strength
      0.45,  // radius
      0.3    // threshold
    );
    this.composer.addPass(this.bloomPass);
  }

  onResize() {
    this.width = window.innerWidth || 800;
    this.height = window.innerHeight || 600;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    if (this.composer) {
      this.composer.setSize(this.width, this.height);
      const bloomW = Math.max(1, Math.floor(this.width / 2));
      const bloomH = Math.max(1, Math.floor(this.height / 2));
      if (this.bloomPass) this.bloomPass.setSize(bloomW, bloomH);
    }
  }

  buildGothicWorld() {
    // 1. Sky Backdrop Plane (Z = -30)
    const skyGeo = new THREE.PlaneGeometry(160, 60);
    const skyMat = new THREE.MeshBasicMaterial({
      map: createGothicSkyTexture(),
      depthWrite: false
    });
    this.skyBackdrop = new THREE.Mesh(skyGeo, skyMat);
    this.skyBackdrop.position.set(0, 16, -30);
    this.scene.add(this.skyBackdrop);

    // 2. Far Statues Layer (Z = -18): Colossal King, Queen, & Ruined Towers
    this.scene.add(this.farStatuesGroup);
    const statueMat = new THREE.MeshStandardMaterial({
      color: 0x141e2e,
      roughness: 0.85,
      metalness: 0.2
    });

    for (let i = 0; i < 24; i++) {
      const x = i * 22 - 15;
      const h = 20 + ((i * 13) % 16);

      // Colossal stone chess tower
      const colGeo = new THREE.BoxGeometry(6.5, h, 6.0);
      const col = new THREE.Mesh(colGeo, statueMat);
      col.position.set(x, h / 2 - 3, -18);
      col.receiveShadow = true;
      this.farStatuesGroup.add(col);

      // Colossal King's Crown & Cross atop every 3rd tower
      if (i % 3 === 0) {
        const crown = this.createColossalCrown(4.2, 0x1c293d);
        crown.position.set(x, h - 1.5, -18);
        crown.rotation.z = ((i % 4) - 1.5) * 0.12;
        this.farStatuesGroup.add(crown);
      }
      // Shattered Knight horse head silhouette
      else if (i % 3 === 1) {
        const knightHead = this.createKnightBust(3.8, 0x182436);
        knightHead.position.set(x, h - 2, -18);
        knightHead.rotation.y = 0.3;
        this.farStatuesGroup.add(knightHead);
      }
    }

    // 3. Midground Layer (Z = -6.5): Gothic Arches, Stone Pillars, Wall Torches
    this.scene.add(this.midArchesGroup);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x243248,
      roughness: 0.7,
      metalness: 0.3
    });

    for (let i = 0; i < 35; i++) {
      const x = i * 14 - 10;

      // Ornate fluted pillar
      const pillarGeo = new THREE.CylinderGeometry(0.7, 0.95, 16, 12);
      const pillar = new THREE.Mesh(pillarGeo, archMat);
      pillar.position.set(x, 6.5, -6.5);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.midArchesGroup.add(pillar);

      // Capital & Base Trim
      const capGeo = new THREE.BoxGeometry(2.0, 0.6, 2.0);
      const cap = new THREE.Mesh(capGeo, archMat);
      cap.position.set(x, 14.5, -6.5);
      this.midArchesGroup.add(cap);

      // Arch Connecting Beam
      if (i < 34) {
        const archBeam = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 1.4), archMat);
        archBeam.position.set(x + 7, 14.8, -6.5);
        this.midArchesGroup.add(archBeam);
      }

      // Half-buried fallen pawns and bishop statues in the mist
      if (i % 4 === 2) {
        const fallenPawn = this.createPawnSculpture(2.2, 0x223046);
        fallenPawn.position.set(x + 3.5, 0.6, -6.0);
        fallenPawn.rotation.z = 0.65;
        this.midArchesGroup.add(fallenPawn);
      }
    }

    // 4. Foreground Silhouettes (Z = +2.5): Hanging Iron Chains & Gargoyles
    this.scene.add(this.foregroundGroup);
    for (let i = 0; i < 16; i++) {
      const x = i * 35 + 8;
      const chain = this.createHangingChain(13 + ((i * 5) % 6));
      chain.position.set(x, 14.5, 2.5);
      this.foregroundGroup.add(chain);
      this.chains.push(chain);
    }
  }

  createColossalCrown(scale = 1.0, colorHex = 0x1c293d) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7, metalness: 0.4 });

    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * scale, 1.0 * scale, 0.6 * scale, 14), mat);
    group.add(baseRing);

    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3 * scale, 1.1 * scale, 8), mat);
      const angle = (i * Math.PI * 2) / 5;
      spike.position.set(Math.cos(angle) * 1.15 * scale, 0.75 * scale, Math.sin(angle) * 1.15 * scale);
      group.add(spike);
    }

    // Golden cross emblem
    const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 1.2 * scale, 0.18 * scale), mat);
    crossVert.position.y = 1.6 * scale;
    group.add(crossVert);
    const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.8 * scale, 0.18 * scale, 0.18 * scale), mat);
    crossHoriz.position.y = 1.8 * scale;
    group.add(crossHoriz);

    return group;
  }

  createKnightBust(scale = 1.0, colorHex = 0x182436) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8, metalness: 0.2 });

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.8 * scale, 2.2 * scale, 1.1 * scale), mat);
    neck.rotation.z = -0.3;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.3 * scale, 0.9 * scale, 0.9 * scale), mat);
    head.position.set(-0.4 * scale, 1.2 * scale, 0);
    head.rotation.z = 0.15;
    group.add(head);

    return group;
  }

  createPawnSculpture(scale = 1.0, colorHex = 0x223046) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.75, metalness: 0.25 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * scale, 0.8 * scale, 1.8 * scale, 12), mat);
    body.position.y = 0.9 * scale;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45 * scale, 12, 12), mat);
    head.position.y = 2.1 * scale;
    group.add(head);

    return group;
  }

  createHangingChain(length = 12) {
    const group = new THREE.Group();
    const linkGeo = new THREE.TorusGeometry(0.2, 0.05, 6, 10);
    const linkMat = new THREE.MeshBasicMaterial({ color: 0x05080e });

    const count = Math.floor(length / 0.35);
    for (let i = 0; i < count; i++) {
      const link = new THREE.Mesh(linkGeo, linkMat);
      link.position.y = -i * 0.35;
      link.rotation.y = (i % 2) * Math.PI * 0.5;
      group.add(link);
    }
    return group;
  }

  // Soft Circular Ember Particles (Glowing Orange Fire Sparks)
  createEmberParticles() {
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = Math.random() * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;

      velocities[i * 3] = (Math.random() - 0.5) * 0.4;
      velocities[i * 3 + 1] = 0.4 + Math.random() * 0.9;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.userData = { velocities };

    // Soft round glowing sprite texture
    const emberTex = createSoftParticleTexture(255, 170, 50);
    const mat = new THREE.PointsMaterial({
      map: emberTex,
      size: 0.65,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.emberParticles = new THREE.Points(geo, mat);
    this.scene.add(this.emberParticles);
  }

  // Soft Floating Ash Flakes
  createAshParticles() {
    const count = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.random() * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;

      velocities[i * 3] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = -0.3 - Math.random() * 0.6;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.userData = { velocities };

    const ashTex = createSoftParticleTexture(180, 200, 220);
    const mat = new THREE.PointsMaterial({
      map: ashTex,
      size: 0.45,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });

    this.ashParticles = new THREE.Points(geo, mat);
    this.scene.add(this.ashParticles);
  }

  updateParticles(dt, playerX) {
    if (this.emberParticles) {
      const pos = this.emberParticles.geometry.attributes.position.array;
      const vel = this.emberParticles.geometry.userData.velocities;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;

        if (pos[i * 3 + 1] > 14) {
          pos[i * 3 + 1] = 0.5;
          pos[i * 3] = playerX + (Math.random() - 0.5) * 35;
        }
      }
      this.emberParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.ashParticles) {
      const pos = this.ashParticles.geometry.attributes.position.array;
      const vel = this.ashParticles.geometry.userData.velocities;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;

        if (pos[i * 3 + 1] < 0) {
          pos[i * 3 + 1] = 16;
          pos[i * 3] = playerX + (Math.random() - 0.5) * 50;
        }
      }
      this.ashParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Camera side-rail tracking with smooth parallax & dampening
  updateCamera(targetX, targetY, dt, shakeIntensity = 0) {
    if (this.isFreeCam) return;

    this.camTargetX = targetX + 1.2;
    this.camTargetY = Math.max(2.4, Math.min(6.5, targetY + 1.4));

    // Smooth exponential damping
    this.camCurrentX = THREE.MathUtils.damp(this.camCurrentX, this.camTargetX, 5.0, dt);
    this.camCurrentY = THREE.MathUtils.damp(this.camCurrentY, this.camTargetY, 4.5, dt);

    let shakeX = 0;
    let shakeY = 0;
    if (shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * shakeIntensity * 0.35;
      shakeY = (Math.random() - 0.5) * shakeIntensity * 0.35;
    }

    this.camera.position.x = this.camCurrentX + shakeX;
    this.camera.position.y = this.camCurrentY + shakeY;
    this.camera.position.z = this.camZ;

    this.camera.lookAt(this.camCurrentX + 1.0, this.camCurrentY - 0.3, 0);

    // Dynamic Parallax layers shift smoothly with camera
    this.skyBackdrop.position.x = this.camCurrentX * 0.95;
    this.farStatuesGroup.position.x = this.camCurrentX * 0.72;
    this.midArchesGroup.position.x = this.camCurrentX * 0.42;
    this.foregroundGroup.position.x = -this.camCurrentX * 0.2;

    // Hanging chains sway in the cavern wind
    const time = performance.now() * 0.0015;
    this.chains.forEach((ch, idx) => {
      ch.rotation.z = Math.sin(time + idx * 0.7) * 0.07;
    });

    // Follow key light shadow camera
    this.keyLight.position.x = this.camCurrentX + 12;
    this.keyLight.target.position.set(this.camCurrentX, 2, 0);
    this.keyLight.target.updateMatrixWorld();
  }

  render(timeSeconds, torchScreenUv = { x: 0.5, y: 0.5 }, timeScale = 1.0, rewindActive = false) {
    try {
      this.composer.render();
    } catch (e) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
