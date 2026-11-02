/**
 * ============================================================================
 * PORTFÓLIO 3D INTERATIVO — GUSTAVO (@30781-max)
 * Conceito: Experiência imersiva inspirada em tommybiglow.com com Smartphone 3D
 * Tecnologias: HTML5, CSS3, JavaScript ES6+, Three.js, CSS3DRenderer, GSAP & ScrollTrigger
 * Plano de Contingência Completo (Seção 9)
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. CONFIGURAÇÃO & ESTADO GLOBAL DO PORTFÓLIO
     ========================================================================== */
  const APP_CONFIG = {
    githubUser: '30781-max',
    githubApiUrl: 'https://api.github.com/users/30781-max/repos?sort=updated',
    cacheReposUrl: 'assets/repos-cache.json',
    cacheUserUrl: 'assets/user-cache.json',
    totalSteps: 8,
    phoneDimensions: {
      width: 3.6,
      height: 7.4,
      depth: 0.36,
      radius: 0.48,
      cssScale: 0.00947 // Escala exata para embutir 380px no Three.js
    },
    // Chaveamento editorial de cada etapa
    stages: [
      { tag: 'ETAPA 01 // OVERVIEW', title: 'SISTEMAS MODERNOS & ENGENHARIA DIGITAL' },
      { tag: 'ETAPA 02 // PERFIL', title: 'DESENVOLVIMENTO COM PROPÓSITO E EFICIÊNCIA' },
      { tag: 'ETAPA 03 // STACK', title: 'TECNOLOGIAS APLICADAS EM PRODUÇÃO' },
      { tag: 'ETAPA 04 // DESTAQUE 01', title: 'CHAVEGATTO — TECH FORCE GYM TECH' },
      { tag: 'ETAPA 05 // DESTAQUE 02', title: 'ANTIGRAVIT — CYBER PULSE NEON RHYTHM' },
      { tag: 'ETAPA 06 // OPEN SOURCE', title: 'MORE THAN JUST IDEAS. REAL PROJECTS.' },
      { tag: 'ETAPA 07 // EXPERTISE', title: 'ARQUITETURA, QUALIDADE E CI/CD' },
      { tag: 'ETAPA 08 // CONEXÃO', title: 'VAMOS CONSTRUIR O PRÓXIMO PROJETO?' }
    ],
    // Mapeamento das posições e rotações do Smartphone 3D por etapa
    stepTransforms: [
      // 0: Apresentação (Frente, centralizado)
      { rotX: 0.05, rotY: 0.0, rotZ: 0.0, posX: 0.0, posY: 0.0, posZ: 0.0 },
      // 1: Sobre Mim (Leve inclinação à direita)
      { rotX: 0.08, rotY: -0.32, rotZ: -0.04, posX: 0.75, posY: 0.1, posZ: 0.15 },
      // 2: Habilidades (Leve inclinação à esquerda)
      { rotX: 0.04, rotY: 0.28, rotZ: 0.03, posX: -0.7, posY: 0.0, posZ: 0.2 },
      // 3: Projeto 1 - Chavegatto (Zoom e inclinação)
      { rotX: 0.02, rotY: -0.16, rotZ: -0.02, posX: 0.5, posY: 0.0, posZ: 0.35 },
      // 4: Projeto 2 - Antigravit (Perspectiva dinâmica)
      { rotX: 0.03, rotY: 0.18, rotZ: 0.02, posX: -0.5, posY: 0.0, posZ: 0.35 },
      // 5: Repositórios GitHub (Centralizado, aberto)
      { rotX: 0.06, rotY: 0.0, rotZ: 0.0, posX: 0.0, posY: 0.0, posZ: 0.1 },
      // 6: Experiência & Estudos (Inclinado)
      { rotX: 0.08, rotY: -0.24, rotZ: -0.03, posX: 0.65, posY: 0.0, posZ: 0.2 },
      // 7: Contato (Frontal elegante)
      { rotX: 0.04, rotY: 0.0, rotZ: 0.0, posX: 0.0, posY: -0.1, posZ: 0.25 }
    ]
  };

  const STATE = {
    currentStep: 0,
    targetStep: 0,
    scrollProgress: 0,
    is3dActive: true,
    isGsapActive: true,
    isApiFallback: false,
    isImgFallback: false,
    isReducedMotion: false,
    audioEnabled: false,
    reposData: []
  };

  /* ==========================================================================
     2. ÁUDIO TÁTIL SINTETIZADO (WEB AUDIO API — ZERO DEPENDÊNCIAS EXTERNAS)
     ========================================================================== */
  class AudioHaptics {
    constructor() {
      this.ctx = null;
      this.initCtx();
    }

    initCtx() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      } catch (e) {
        console.warn('Web Audio indisponível:', e);
      }
    }

    playClick(freq = 600, duration = 0.04) {
      if (!STATE.audioEnabled || !this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + duration);

        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (err) {}
    }

    playStepTick() {
      this.playClick(850, 0.035);
    }
  }

  const haptics = new AudioHaptics();

  /* ==========================================================================
     3. RELÓGIO EM TEMPO REAL NO CELULAR
     ========================================================================== */
  function initLiveClock() {
    const clockEl = document.getElementById('phoneLiveClock');
    if (!clockEl) return;

    function update() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      clockEl.textContent = `${hours}:${minutes}`;
    }

    update();
    setInterval(update, 10000);
  }

  /* ==========================================================================
     4. SISTEMA DE TOAST E FEEDBACK
     ========================================================================== */
  function showToast(message, duration = 3000) {
    const toast = document.getElementById('siteToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-active');
    haptics.playClick(1000, 0.05);

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('is-active');
    }, duration);
  }

  /* ==========================================================================
     5. THREE.JS 3D SMARTPHONE ENGINE
     ========================================================================== */
  class Phone3DEngine {
    constructor() {
      this.container = document.getElementById('viewport3d');
      this.scene = null;
      this.cssScene = null;
      this.camera = null;
      this.webglRenderer = null;
      this.css3dRenderer = null;
      this.phoneGroup = null;
      this.cssPhoneObject = null;
      this.shadowPlane = null;
      this.isInitialized = false;
      this.animId = null;

      // Posições / Rotações com interpolação suave (lerp)
      this.currentPos = { x: 0, y: 0, z: 0 };
      this.targetPos = { x: 0, y: 0, z: 0 };
      this.currentRot = { x: 0.05, y: 0, z: 0 };
      this.targetRot = { x: 0.05, y: 0, z: 0 };
      this.currentScale = 1;
      this.targetScale = 1;

      // Movimento de respiração orgânica sutil
      this.idleTime = 0;
    }

    // Validação de WebGL (Seção 9.5)
    checkWebGLSupport() {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    }

    init() {
      // 1. Verificação de bibliotecas e WebGL
      if (typeof THREE === 'undefined') {
        throw new Error('Three.js não carregado');
      }
      if (!this.checkWebGLSupport()) {
        throw new Error('Navegador sem suporte a WebGL');
      }

      const w = window.innerWidth;
      const h = window.innerHeight;

      // 2. Cena WebGL & Cena CSS3D
      this.scene = new THREE.Scene();
      this.cssScene = new THREE.Scene();

      // 3. Câmera Perspectiva
      const fov = 42;
      this.camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 1000);
      this.updateCameraDistance();

      // 4. WebGL Renderer
      this.webglRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.webglRenderer.setSize(w, h);
      this.webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.webglRenderer.outputEncoding = THREE.sRGBEncoding;
      this.container.appendChild(this.webglRenderer.domElement);

      // 5. CSS3D Renderer (Para renderizar o DOM nativo na tela do 3D)
      if (typeof THREE.CSS3DRenderer !== 'undefined') {
        this.css3dRenderer = new THREE.CSS3DRenderer();
        this.css3dRenderer.setSize(w, h);
        this.css3dRenderer.domElement.style.position = 'absolute';
        this.css3dRenderer.domElement.style.top = '0';
        this.css3dRenderer.domElement.style.left = '0';
        this.container.appendChild(this.css3dRenderer.domElement);
      }

      // 6. Grupo Raiz do Celular
      this.phoneGroup = new THREE.Group();
      this.scene.add(this.phoneGroup);

      // 7. Construção do Celular Realista
      this.buildRealisticPhone();

      // 8. Iluminação Profissional de Estúdio
      this.setupStudioLighting();

      // 9. Sombra Suave Projetada
      this.setupGroundShadow();

      // 10. Embutir DOM na tela 3D via CSS3D
      this.embedScreenDOM();

      // 11. Listeners de Redimensionamento
      window.addEventListener('resize', () => this.onResize(), { passive: true });

      this.isInitialized = true;
      this.startLoop();
    }

    updateCameraDistance() {
      const w = window.innerWidth;
      if (w > 1024) {
        this.camera.position.set(0, 0, 11.8);
      } else if (w > 768) {
        this.camera.position.set(0, 0, 13.2);
      } else {
        this.camera.position.set(0, -0.35, 15.2);
      }
      this.camera.lookAt(0, 0, 0);
    }

    buildRealisticPhone() {
      const { width: w, height: h, depth: d, radius: r } = APP_CONFIG.phoneDimensions;

      // Shape com cantos arredondados suaves
      const shape = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;

      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r);
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);

      // Geometria chanfrada de titânio
      const extrudeSettings = {
        depth: d,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 1,
        bevelSize: 0.08,
        bevelThickness: 0.08
      };
      const chassisGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      chassisGeom.center();

      // Material Metálico de Titânio Grafite Escuro
      const titaniumMat = new THREE.MeshStandardMaterial({
        color: 0x1d222b,
        metalness: 0.88,
        roughness: 0.28
      });
      const chassisMesh = new THREE.Mesh(chassisGeom, titaniumMat);
      this.phoneGroup.add(chassisMesh);

      // Borda Frontal Fina / Moldura da Tela
      const screenBezelGeom = new THREE.PlaneGeometry(w - 0.12, h - 0.12);
      const bezelMat = new THREE.MeshBasicMaterial({ color: 0x07080a });
      const bezelMesh = new THREE.Mesh(screenBezelGeom, bezelMat);
      bezelMesh.position.z = d / 2 + 0.082;
      this.phoneGroup.add(bezelMesh);

      // Vidro Frontal com Reflexo Fresnel Sutil
      const glassGeom = new THREE.PlaneGeometry(w - 0.16, h - 0.16);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        metalness: 0.1,
        roughness: 0.08,
        transparent: true,
        opacity: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });
      const glassMesh = new THREE.Mesh(glassGeom, glassMat);
      glassMesh.position.z = d / 2 + 0.085;
      this.phoneGroup.add(glassMesh);

      // Ilha da Câmera Traseira (Módulo com 3 Lentes)
      this.buildCameraBump(w, h, d);

      // Botões Laterais (Volume, Ação, Power)
      this.buildSideButtons(w, h, d);
    }

    buildCameraBump(phoneW, phoneH, phoneD) {
      const bumpGroup = new THREE.Group();

      // Base elevada da câmera
      const bumpW = 1.45;
      const bumpH = 1.55;
      const bumpGeom = new THREE.BoxGeometry(bumpW, bumpH, 0.12);
      const bumpMat = new THREE.MeshStandardMaterial({
        color: 0x141820,
        metalness: 0.85,
        roughness: 0.3
      });
      const bumpMesh = new THREE.Mesh(bumpGeom, bumpMat);
      bumpGroup.add(bumpMesh);

      // 3 Lentes de Vidro com Aros Metálicos
      const lensPositions = [
        { x: -0.32, y: 0.35 },
        { x: -0.32, y: -0.35 },
        { x: 0.34, y: 0.0 }
      ];

      const ringGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 24);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x2e3544, metalness: 0.95, roughness: 0.15 });

      const lensGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.11, 24);
      const lensMat = new THREE.MeshPhysicalMaterial({
        color: 0x030712,
        metalness: 0.2,
        roughness: 0.05,
        clearcoat: 1.0
      });

      lensPositions.forEach(pos => {
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(pos.x, pos.y, 0.06);

        const lens = new THREE.Mesh(lensGeom, lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(pos.x, pos.y, 0.07);

        bumpGroup.add(ring);
        bumpGroup.add(lens);
      });

      // Mini Flash LED e sensor LiDAR
      const flashGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 16);
      const flashMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const flash = new THREE.Mesh(flashGeom, flashMat);
      flash.rotation.x = Math.PI / 2;
      flash.position.set(0.34, 0.48, 0.05);
      bumpGroup.add(flash);

      const lidarGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16);
      const lidarMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
      const lidar = new THREE.Mesh(lidarGeom, lidarMat);
      lidar.rotation.x = Math.PI / 2;
      lidar.position.set(0.34, -0.48, 0.05);
      bumpGroup.add(lidar);

      // Posiciona o módulo no canto superior esquerdo da traseira
      bumpGroup.position.set(-phoneW / 2 + bumpW / 2 + 0.2, phoneH / 2 - bumpH / 2 - 0.25, -phoneD / 2 - 0.1);
      this.phoneGroup.add(bumpGroup);
    }

    buildSideButtons(phoneW, phoneH, phoneD) {
      const btnMat = new THREE.MeshStandardMaterial({ color: 0x2a313d, metalness: 0.9, roughness: 0.2 });

      // Botão Power (Lado Direito)
      const powerGeom = new THREE.BoxGeometry(0.05, 0.75, 0.14);
      const powerBtn = new THREE.Mesh(powerGeom, btnMat);
      powerBtn.position.set(phoneW / 2 + 0.08, 0.8, 0);
      this.phoneGroup.add(powerBtn);

      // Botões de Volume (Lado Esquerdo)
      const volGeom = new THREE.BoxGeometry(0.05, 0.55, 0.14);
      const volUp = new THREE.Mesh(volGeom, btnMat);
      volUp.position.set(-phoneW / 2 - 0.08, 0.85, 0);
      this.phoneGroup.add(volUp);

      const volDown = new THREE.Mesh(volGeom, btnMat);
      volDown.position.set(-phoneW / 2 - 0.08, 0.15, 0);
      this.phoneGroup.add(volDown);

      // Botão de Ação (Lado Esquerdo Superior)
      const actGeom = new THREE.BoxGeometry(0.05, 0.35, 0.14);
      const actBtn = new THREE.Mesh(actGeom, btnMat);
      actBtn.position.set(-phoneW / 2 - 0.08, 1.45, 0);
      this.phoneGroup.add(actBtn);
    }

    setupStudioLighting() {
      // Luz Ambiente Neutra
      const ambient = new THREE.AmbientLight(0x222831, 1.4);
      this.scene.add(ambient);

      // Luz Principal Key (Branco Frio Suave)
      const keyLight = new THREE.DirectionalLight(0xf0f6ff, 1.8);
      keyLight.position.set(5, 7, 7);
      this.scene.add(keyLight);

      // Luz de Borda / Rim Light Neon Verde (#00FF99)
      const rimLight = new THREE.DirectionalLight(0x00FF99, 1.2);
      rimLight.position.set(-6, 3, -4);
      this.scene.add(rimLight);

      // Luz de Preenchimento Suave por baixo
      const fillLight = new THREE.DirectionalLight(0x1e293b, 0.9);
      fillLight.position.set(0, -6, 4);
      this.scene.add(fillLight);
    }

    setupGroundShadow() {
      // Criação de textura de sombra com gradiente radial
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      const shadowTex = new THREE.CanvasTexture(canvas);
      const shadowGeom = new THREE.PlaneGeometry(6, 6);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      });

      this.shadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
      this.shadowPlane.rotation.x = -Math.PI / 2;
      this.shadowPlane.position.y = -4.3;
      this.scene.add(this.shadowPlane);
    }

    embedScreenDOM() {
      const screenRoot = document.getElementById('phoneScreenTemplate');
      if (!screenRoot || !this.css3dRenderer) return;

      // Criação do objeto CSS3D
      this.cssPhoneObject = new THREE.CSS3DObject(screenRoot);
      const s = APP_CONFIG.phoneDimensions.cssScale;
      this.cssPhoneObject.scale.set(s, s, s);

      // Alinha com a face frontal do celular
      const { depth: d } = APP_CONFIG.phoneDimensions;
      this.cssPhoneObject.position.set(0, 0, d / 2 + 0.088);

      // Adiciona à cena CSS3D
      this.cssScene.add(this.cssPhoneObject);
    }

    setTargetTransform(stepIndex) {
      const isMobile = window.innerWidth <= 768;
      const t = APP_CONFIG.stepTransforms[stepIndex] || APP_CONFIG.stepTransforms[0];

      if (STATE.isReducedMotion) {
        this.targetRot = { x: 0, y: 0, z: 0 };
        this.targetPos = { x: 0, y: 0, z: 0 };
        return;
      }

      if (isMobile) {
        // No celular, preserva rotações bem sutis para não prejudicar leitura
        this.targetRot = {
          x: t.rotX * 0.4,
          y: Math.max(-0.14, Math.min(0.14, t.rotY * 0.5)),
          z: t.rotZ * 0.3
        };
        this.targetPos = { x: 0, y: 0, z: t.posZ * 0.5 };
      } else {
        this.targetRot = { x: t.rotX, y: t.rotY, z: t.rotZ };
        this.targetPos = { x: t.posX, y: t.posY, z: t.posZ };
      }
    }

    startLoop() {
      const render = () => {
        this.animId = requestAnimationFrame(render);
        this.update();
      };
      render();
    }

    update() {
      if (!this.isInitialized || !STATE.is3dActive) return;

      this.idleTime += 0.015;

      // Efeito de flutuação / respiração suave quando parado
      const idlePitch = STATE.isReducedMotion ? 0 : Math.sin(this.idleTime * 0.8) * 0.015;
      const idleYaw = STATE.isReducedMotion ? 0 : Math.cos(this.idleTime * 0.6) * 0.015;
      const idleY = STATE.isReducedMotion ? 0 : Math.sin(this.idleTime) * 0.04;

      // Interpolação suave (lerp)
      const ease = 0.07;
      this.currentPos.x += (this.targetPos.x - this.currentPos.x) * ease;
      this.currentPos.y += (this.targetPos.y + idleY - this.currentPos.y) * ease;
      this.currentPos.z += (this.targetPos.z - this.currentPos.z) * ease;

      this.currentRot.x += (this.targetRot.x + idlePitch - this.currentRot.x) * ease;
      this.currentRot.y += (this.targetRot.y + idleYaw - this.currentRot.y) * ease;
      this.currentRot.z += (this.targetRot.z - this.currentRot.z) * ease;

      // Atualiza o grupo WebGL
      this.phoneGroup.position.set(this.currentPos.x, this.currentPos.y, this.currentPos.z);
      this.phoneGroup.rotation.set(this.currentRot.x, this.currentRot.y, this.currentRot.z);

      // Sincroniza perfeitamente o objeto CSS3D com o celular 3D
      if (this.cssPhoneObject) {
        this.cssPhoneObject.position.set(this.currentPos.x, this.currentPos.y, this.currentPos.z);
        this.cssPhoneObject.rotation.set(this.currentRot.x, this.currentRot.y, this.currentRot.z);
      }

      // Sincroniza a sombra
      if (this.shadowPlane) {
        this.shadowPlane.position.x = this.currentPos.x * 0.8;
        const shadowScale = 1 - this.currentPos.y * 0.1;
        this.shadowPlane.scale.set(shadowScale, shadowScale, shadowScale);
      }

      // Renderiza as duas camadas
      this.webglRenderer.render(this.scene, this.camera);
      if (this.css3dRenderer) {
        this.css3dRenderer.render(this.cssScene, this.camera);
      }
    }

    onResize() {
      if (!this.isInitialized) return;
      const w = window.innerWidth;
      const h = window.innerHeight;

      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.updateCameraDistance();

      this.webglRenderer.setSize(w, h);
      if (this.css3dRenderer) {
        this.css3dRenderer.setSize(w, h);
      }

      this.setTargetTransform(STATE.currentStep);
    }

    destroy() {
      if (this.animId) cancelAnimationFrame(this.animId);
      if (this.webglRenderer && this.webglRenderer.domElement) {
        this.webglRenderer.domElement.remove();
      }
      if (this.css3dRenderer && this.css3dRenderer.domElement) {
        this.css3dRenderer.domElement.remove();
      }
      this.isInitialized = false;
    }
  }

  let phone3d = null;

  /* ==========================================================================
     6. CONTROLADOR DE ETAPAS E TRANSIÇÕES DA TELA
     ========================================================================== */
  function setPortfolioStep(stepIndex, isUserInteraction = false) {
    if (stepIndex < 0 || stepIndex >= APP_CONFIG.totalSteps) return;
    if (stepIndex === STATE.currentStep && isUserInteraction) return;

    STATE.currentStep = stepIndex;

    // 1. Atualiza visualização na tela do celular
    const views = document.querySelectorAll('.phone-view');
    views.forEach(v => {
      const idx = parseInt(v.getAttribute('data-view'), 10);
      if (idx === stepIndex) {
        v.classList.add('active-view');
        v.scrollTop = 0; // Reseta scroll interno da view
      } else {
        v.classList.remove('active-view');
      }
    });

    // 2. Atualiza Indicador Lateral (Timeline)
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
      const idx = parseInt(item.getAttribute('data-index'), 10);
      if (idx === stepIndex) {
        item.classList.add('is-active');
      } else {
        item.classList.remove('is-active');
      }
    });

    // Barra de progresso lateral
    const progressFill = document.getElementById('timelineProgressFill');
    if (progressFill) {
      const pct = (stepIndex / (APP_CONFIG.totalSteps - 1)) * 100;
      progressFill.style.height = `${pct}%`;
    }

    // 3. Atualiza Rótulo Editorial no Background
    const stageInfo = APP_CONFIG.stages[stepIndex];
    const stageLabel = document.getElementById('stageLabel');
    if (stageLabel && stageInfo) {
      stageLabel.classList.remove('is-visible');
      setTimeout(() => {
        const tagEl = stageLabel.querySelector('.stage-tag');
        const headEl = stageLabel.querySelector('.stage-headline');
        if (tagEl) tagEl.textContent = stageInfo.tag;
        if (headEl) headEl.textContent = stageInfo.title;
        stageLabel.classList.add('is-visible');
      }, 200);
    }

    // Frase editorial principal (oculta suavemente em certas etapas para não poluir)
    const quoteEl = document.getElementById('editorialQuote');
    if (quoteEl) {
      quoteEl.style.opacity = stepIndex === 0 ? '1' : '0.25';
    }

    // 4. Atualiza Modelo 3D ou Fallback CSS
    if (STATE.is3dActive && phone3d) {
      phone3d.setTargetTransform(stepIndex);
    } else {
      updateCssFallbackTransform(stepIndex);
    }

    // Efeito sonoro tátil
    if (isUserInteraction) {
      haptics.playStepTick();
    }
  }

  /* ==========================================================================
     7. SINCRONIZAÇÃO DE SCROLL (GSAP SCROLLTRIGGER COM FALLBACK NATIVO)
     ========================================================================== */
  function initScrollSystem() {
    const checkpoints = document.querySelectorAll('.scroll-checkpoint');

    // Tentar inicializar GSAP + ScrollTrigger
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && STATE.isGsapActive) {
      try {
        gsap.registerPlugin(ScrollTrigger);

        checkpoints.forEach((cp, idx) => {
          ScrollTrigger.create({
            trigger: cp,
            start: 'top center',
            end: 'bottom center',
            onEnter: () => setPortfolioStep(idx),
            onEnterBack: () => setPortfolioStep(idx)
          });
        });

        // Suporte a rolagem contínua suave no ScrollTrack
        ScrollTrigger.create({
          trigger: '#scrollTrackContainer',
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => {
            STATE.scrollProgress = self.progress;
          }
        });

        console.log('✓ GSAP & ScrollTrigger inicializados com sucesso.');
        return;
      } catch (err) {
        console.warn('Falha ao inicializar GSAP ScrollTrigger, ativando fallback nativo:', err);
      }
    }

    // Fallback Nativo de Scroll (Seção 9.2)
    initNativeScrollFallback();
  }

  function initNativeScrollFallback() {
    STATE.isGsapActive = false;
    console.log('→ Utilizando Scroll Fallback Nativo (CSS / JS Observer).');

    let isScrolling = false;

    function handleScroll() {
      const scrollY = window.scrollY || window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollY / docHeight : 0;
      STATE.scrollProgress = Math.max(0, Math.min(1, progress));

      // Calcula a etapa baseada no progresso proporcional
      const stepFloat = progress * (APP_CONFIG.totalSteps - 1);
      const targetStep = Math.round(stepFloat);

      if (targetStep !== STATE.currentStep) {
        setPortfolioStep(targetStep);
      }
    }

    window.addEventListener('scroll', () => {
      if (!isScrolling) {
        window.requestAnimationFrame(() => {
          handleScroll();
          isScrolling = false;
        });
        isScrolling = true;
      }
    }, { passive: true });

    // Chamada inicial
    handleScroll();
  }

  /* ==========================================================================
     8. SERVIÇO GITHUB API & CACHE RESILIENTE (SEÇÃO 4 & FALLBACK 9.4)
     ========================================================================== */
  const FALLBACK_REPOS_STATIC = [
    {
      name: 'chavegatto',
      html_url: 'https://github.com/30781-max/chavegatto',
      description: 'Tech Force — Solução inteligente desenvolvida para gestão e inovação em academias.',
      language: 'HTML',
      stargazers_count: 0,
      homepage: 'https://chavegatto.vercel.app/',
      isPriority: true
    },
    {
      name: 'antigravit',
      html_url: 'https://github.com/30781-max/antigravit',
      description: 'CYBER PULSE — Hardcore 2D Neon Rhythm Game renderizado via HTML5 Canvas e Web Audio.',
      language: 'JavaScript',
      stargazers_count: 0,
      homepage: 'https://antigravit-eight.vercel.app/',
      isPriority: true
    },
    {
      name: 'V2',
      html_url: 'https://github.com/30781-max/V2',
      description: 'Projeto avançado de algoritmos, automações e lógica estruturada em Python.',
      language: 'Python',
      stargazers_count: 0,
      isPriority: false
    },
    {
      name: 'hub',
      html_url: 'https://github.com/30781-max/hub',
      description: 'Hub de utilitários e componentes reutilizáveis para aplicações modernas.',
      language: 'JavaScript',
      stargazers_count: 0,
      isPriority: false
    },
    {
      name: 'Kaua',
      html_url: 'https://github.com/30781-max/Kaua',
      description: 'Módulo de automações e scripts inteligentes desenvolvidos em Python.',
      language: 'Python',
      stargazers_count: 0,
      isPriority: false
    },
    {
      name: 'Jogo',
      html_url: 'https://github.com/30781-max/Jogo',
      description: 'Desenvolvimento de jogos, física e mecânicas interativas em Python.',
      language: 'Python',
      stargazers_count: 0,
      isPriority: false
    },
    {
      name: 'gerador-de-frase',
      html_url: 'https://github.com/30781-max/gerador-de-frase',
      description: 'Aplicação dinâmica de geração de citações e manipulação do DOM em tempo real.',
      language: 'JavaScript',
      stargazers_count: 0,
      isPriority: false
    },
    {
      name: 'skin',
      html_url: 'https://github.com/30781-max/skin',
      description: 'Interface web moderna com temas dinâmicos e estilização de alto contraste.',
      language: 'HTML',
      stargazers_count: 0,
      isPriority: false
    }
  ];

  const LANG_COLORS = {
    'JavaScript': '#f1e05a',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Python': '#3572A5',
    'Java': '#b07219',
    'TypeScript': '#3178c6',
    'Default': '#00FF99'
  };

  async function fetchGitHubRepositories() {
    const reposContainer = document.getElementById('reposListContainer');
    const badgeCount = document.getElementById('reposCountBadge');

    // Renderiza imediatamente com a lista verificada para zero atraso visual
    renderRepositories(FALLBACK_REPOS_STATIC, 'Sincronizando repositórios...');

    // Se forçado o modo offline/fallback para teste
    if (STATE.isApiFallback) {
      renderRepositories(FALLBACK_REPOS_STATIC, 'Modo Fallback / Cache Local');
      return;
    }

    try {
      // 1. Tenta requisitar da API oficial pública do GitHub (com timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(APP_CONFIG.githubApiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const rawRepos = await res.json();
      if (!Array.isArray(rawRepos) || rawRepos.length === 0) {
        throw new Error('Lista de repositórios vazia');
      }

      // Ordena garantindo prioridade absoluta para Chavegatto e Antigravit
      const sorted = sortPrioritizeRepos(rawRepos);
      STATE.reposData = sorted;
      renderRepositories(sorted, `${rawRepos.length} repositórios sincronizados`);
      console.log('✓ Repositórios GitHub sincronizados via API pública.');

    } catch (apiError) {
      console.warn('API pública do GitHub indisponível ou limitada, tentando cache local:', apiError.message);

      // 2. Fallback para cache estático local pré-gerado
      try {
        const cacheRes = await fetch(APP_CONFIG.cacheReposUrl);
        if (cacheRes.ok) {
          const cachedRepos = await cacheRes.json();
          const sorted = sortPrioritizeRepos(cachedRepos);
          STATE.reposData = sorted;
          renderRepositories(sorted, `${sorted.length} repositórios (Cache Local)`);
          return;
        }
      } catch (cacheError) {
        console.warn('Cache local inacessível, utilizando lista estática verificada.');
      }

      // 3. Fallback estático garantido (Seção 9.4)
      STATE.reposData = FALLBACK_REPOS_STATIC;
      renderRepositories(FALLBACK_REPOS_STATIC, 'Repositórios Principais (Offline)');
    }
  }

  function sortPrioritizeRepos(repos) {
    const priorityNames = ['chavegatto', 'antigravit'];
    const pList = [];
    const others = [];

    repos.forEach(r => {
      const nameLower = r.name.toLowerCase();
      if (priorityNames.includes(nameLower)) {
        r.isPriority = true;
        // Atribui descrições fiéis caso no GitHub esteja nulo
        if (!r.description) {
          if (nameLower === 'chavegatto') {
            r.description = 'Tech Force — Solução inteligente desenvolvida para gestão e inovação em academias.';
          } else if (nameLower === 'antigravit') {
            r.description = 'CYBER PULSE — Hardcore 2D Neon Rhythm Game renderizado via HTML5 Canvas e Web Audio.';
          }
        }
        pList.push(r);
      } else {
        r.isPriority = false;
        others.push(r);
      }
    });

    // Ordena prioridades: Chavegatto primeiro, depois Antigravit
    pList.sort((a, b) => {
      if (a.name.toLowerCase() === 'chavegatto') return -1;
      if (b.name.toLowerCase() === 'chavegatto') return 1;
      return 0;
    });

    return [...pList, ...others];
  }

  function renderRepositories(reposList, statusText) {
    const container = document.getElementById('reposListContainer');
    const badgeCount = document.getElementById('reposCountBadge');
    if (badgeCount && statusText) badgeCount.textContent = statusText;
    if (!container) return;

    container.innerHTML = '';

    // Renderiza os 7 repositórios principais
    const displayList = reposList.slice(0, 8);

    displayList.forEach(repo => {
      const card = document.createElement('div');
      card.className = 'repo-card-item';

      const lang = repo.language || 'Geral';
      const langColor = LANG_COLORS[lang] || LANG_COLORS['Default'];
      const stars = repo.stargazers_count || 0;
      const desc = repo.description || 'Código e desenvolvimento de sistemas por @30781-max.';

      card.innerHTML = `
        <div class="repo-top-row">
          <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-name-link" title="Abrir repositório no GitHub">
            <span>${repo.name}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
          </a>
          ${repo.isPriority ? '<span class="repo-priority-badge">DESTAQUE</span>' : ''}
        </div>
        <p class="repo-desc">${desc}</p>
        <div class="repo-bottom-row">
          <span class="repo-lang-badge">
            <span class="lang-color-dot" style="background-color: ${langColor};"></span>
            <span>${lang}</span>
          </span>
          <span class="repo-stars">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>${stars}</span>
          </span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  /* ==========================================================================
     9. PLANO DE FALLBACK — CONTINUIDADE E ESTABILIDADE (SEÇÃO 9)
     ========================================================================== */
  function activate3dFallback(reason = 'Fallback 3D ativado') {
    STATE.is3dActive = false;
    console.warn(`[FALLBACK] ${reason}`);

    const screenTemplate = document.getElementById('phoneScreenTemplate');
    const targetSlot = document.querySelector('.phone-screen-target-fallback');

    // Destrói / oculta o renderizador Three.js
    if (phone3d) {
      phone3d.destroy();
      phone3d = null;
    }

    // Exibe o smartphone CSS 3D/2D realista
    const viewport = document.getElementById('viewport3d');
    const fallbackPhone = document.getElementById('smartphoneFallback');

    if (viewport) viewport.style.display = 'none';
    if (fallbackPhone) fallbackPhone.classList.remove('is-hidden');

    // Move o conteúdo DOM para dentro do mockup CSS
    if (screenTemplate && targetSlot) {
      screenTemplate.style.transform = 'none';
      screenTemplate.style.position = 'relative';
      screenTemplate.style.top = '0';
      screenTemplate.style.left = '0';
      targetSlot.appendChild(screenTemplate);
    }

    // Atualiza indicador no header
    const statusDot = document.getElementById('engineStatusDot');
    const statusText = document.getElementById('engineStatusText');
    if (statusDot) statusDot.classList.add('is-fallback');
    if (statusText) statusText.textContent = '2D CSS MODE';

    updateCssFallbackTransform(STATE.currentStep);
    showToast('Modo de exibição alternativo 2D/CSS ativado com sucesso.');
  }

  function restore3dMode() {
    STATE.is3dActive = true;

    const viewport = document.getElementById('viewport3d');
    const fallbackPhone = document.getElementById('smartphoneFallback');
    const screenTemplate = document.getElementById('phoneScreenTemplate');

    if (fallbackPhone) fallbackPhone.classList.add('is-hidden');
    if (viewport) viewport.style.display = 'block';

    // Move a tela de volta para o body antes de recriar o Three.js
    if (screenTemplate) {
      screenTemplate.style.transform = '';
      screenTemplate.style.position = '';
      screenTemplate.style.top = '';
      screenTemplate.style.left = '';
      document.body.appendChild(screenTemplate);
    }

    try {
      phone3d = new Phone3DEngine();
      phone3d.init();
      phone3d.setTargetTransform(STATE.currentStep);

      const statusDot = document.getElementById('engineStatusDot');
      const statusText = document.getElementById('engineStatusText');
      if (statusDot) statusDot.classList.remove('is-fallback');
      if (statusText) statusText.textContent = '3D ENGINE';

      showToast('Experiência 3D Three.js restaurada.');
    } catch (e) {
      console.error('Falha ao restaurar Three.js:', e);
      activate3dFallback('Erro ao reiniciar Three.js');
    }
  }

  function updateCssFallbackTransform(stepIndex) {
    const fallbackCase = document.querySelector('.phone-case-fallback');
    if (!fallbackCase) return;

    if (STATE.isReducedMotion) {
      fallbackCase.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg)';
      return;
    }

    const t = APP_CONFIG.stepTransforms[stepIndex] || APP_CONFIG.stepTransforms[0];
    const isMobile = window.innerWidth <= 768;

    // Converte radianos para graus suaves em CSS 3D
    const degY = (t.rotY * 180 / Math.PI) * (isMobile ? 0.35 : 0.85);
    const degX = (t.rotX * 180 / Math.PI) * (isMobile ? 0.35 : 0.85);
    const transX = isMobile ? 0 : t.posX * 35;

    fallbackCase.style.transform = `perspective(1200px) translateX(${transX}px) rotateY(${degY}deg) rotateX(${-degX}deg)`;
  }

  /* ==========================================================================
     10. PAINEL DE TESTES DE FALLBACK (SEÇÃO 9.7)
     ========================================================================== */
  function initFallbackModal() {
    const openBtn = document.getElementById('fallbackToggleBtn');
    const modal = document.getElementById('fallbackModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const backdrop = document.getElementById('modalBackdrop');
    const resetBtn = document.getElementById('resetAllFallbacksBtn');

    if (!openBtn || !modal) return;

    function openModal() {
      modal.classList.remove('is-hidden');
    }
    function closeModal() {
      modal.classList.add('is-hidden');
    }

    openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    // Teste 1: 3D Fallback
    const btn3d = document.getElementById('testToggle3dFallback');
    if (btn3d) {
      btn3d.addEventListener('click', () => {
        const isActive = btn3d.getAttribute('data-active') === 'true';
        if (isActive) {
          btn3d.setAttribute('data-active', 'false');
          btn3d.querySelector('span').textContent = 'TESTAR 2D';
          restore3dMode();
        } else {
          btn3d.setAttribute('data-active', 'true');
          btn3d.querySelector('span').textContent = 'RESTAURAR 3D';
          activate3dFallback('Simulação de Fallback 3D solicitada pelo usuário');
        }
      });
    }

    // Teste 2: GSAP Fallback
    const btnGsap = document.getElementById('testToggleGsapFallback');
    if (btnGsap) {
      btnGsap.addEventListener('click', () => {
        const isActive = btnGsap.getAttribute('data-active') === 'true';
        if (isActive) {
          btnGsap.setAttribute('data-active', 'false');
          btnGsap.querySelector('span').textContent = 'TESTAR NATIVO';
          STATE.isGsapActive = true;
          showToast('Scroll GSAP restaurado.');
        } else {
          btnGsap.setAttribute('data-active', 'true');
          btnGsap.querySelector('span').textContent = 'RESTAURAR GSAP';
          initNativeScrollFallback();
          showToast('Scroll nativo CSS ativado.');
        }
      });
    }

    // Teste 3: GitHub API Fallback
    const btnApi = document.getElementById('testToggleApiFallback');
    if (btnApi) {
      btnApi.addEventListener('click', () => {
        const isActive = btnApi.getAttribute('data-active') === 'true';
        if (isActive) {
          btnApi.setAttribute('data-active', 'false');
          btnApi.querySelector('span').textContent = 'TESTAR OFFLINE';
          STATE.isApiFallback = false;
          fetchGitHubRepositories();
          showToast('Tentando reconectar API do GitHub.');
        } else {
          btnApi.setAttribute('data-active', 'true');
          btnApi.querySelector('span').textContent = 'RESTAURAR API';
          STATE.isApiFallback = true;
          fetchGitHubRepositories();
          showToast('Simulando API offline (usando cache estático).');
        }
      });
    }

    // Teste 4: Imagens Fallback
    const btnImg = document.getElementById('testToggleImgFallback');
    if (btnImg) {
      btnImg.addEventListener('click', () => {
        const isActive = btnImg.getAttribute('data-active') === 'true';
        const projectImgs = document.querySelectorAll('.project-real-img');
        if (isActive) {
          btnImg.setAttribute('data-active', 'false');
          btnImg.querySelector('span').textContent = 'TESTAR FALLBACK';
          projectImgs.forEach(img => img.classList.remove('is-fallback'));
          showToast('Capturas reais dos projetos exibidas.');
        } else {
          btnImg.setAttribute('data-active', 'true');
          btnImg.querySelector('span').textContent = 'RESTAURAR IMAGENS';
          projectImgs.forEach(img => img.classList.add('is-fallback'));
          showToast('Fallback visual estilizado ativado.');
        }
      });
    }

    // Teste 5: Reduced Motion
    const btnMotion = document.getElementById('testToggleReducedMotion');
    if (btnMotion) {
      btnMotion.addEventListener('click', () => {
        const isActive = btnMotion.getAttribute('data-active') === 'true';
        if (isActive) {
          btnMotion.setAttribute('data-active', 'false');
          btnMotion.querySelector('span').textContent = 'REDUZIR MOVIMENTO';
          STATE.isReducedMotion = false;
          setPortfolioStep(STATE.currentStep);
          showToast('Animações e rotações 3D normais.');
        } else {
          btnMotion.setAttribute('data-active', 'true');
          btnMotion.querySelector('span').textContent = 'RESTAURAR MOVIMENTO';
          STATE.isReducedMotion = true;
          setPortfolioStep(STATE.currentStep);
          showToast('Modo de movimento reduzido ativado.');
        }
      });
    }

    // Resetar todos os testes
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (btn3d && btn3d.getAttribute('data-active') === 'true') btn3d.click();
        if (btnGsap && btnGsap.getAttribute('data-active') === 'true') btnGsap.click();
        if (btnApi && btnApi.getAttribute('data-active') === 'true') btnApi.click();
        if (btnImg && btnImg.getAttribute('data-active') === 'true') btnImg.click();
        if (btnMotion && btnMotion.getAttribute('data-active') === 'true') btnMotion.click();
        closeModal();
      });
    }
  }

  /* ==========================================================================
     11. INTERATIVIDADE GERAL (COPIAR EMAIL, TIMELINE, SOM)
     ========================================================================== */
  function initUserInteractions() {
    // 1. Cópia de E-mail com Feedback
    const copyBtn = document.getElementById('emailCopyBtn');
    const copyCard = document.getElementById('emailCopyCard');
    const emailToCopy = 'gustavo.dev.systems@gmail.com';

    function executeCopy() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(emailToCopy).then(() => {
          showToast('E-mail copiado para a área de transferência! 📋');
          if (copyBtn) copyBtn.querySelector('.btn-text').textContent = 'COPIADO!';
          setTimeout(() => {
            if (copyBtn) copyBtn.querySelector('.btn-text').textContent = 'COPIAR';
          }, 2500);
        }).catch(() => {
          fallbackClipboardCopy(emailToCopy);
        });
      } else {
        fallbackClipboardCopy(emailToCopy);
      }
    }

    function fallbackClipboardCopy(text) {
      const tempInput = document.createElement('input');
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showToast('E-mail copiado! 📋');
    }

    if (copyBtn) copyBtn.addEventListener('click', (e) => { e.stopPropagation(); executeCopy(); });
    if (copyCard) copyCard.addEventListener('click', executeCopy);

    // 2. Clique nos Itens da Timeline Lateral
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        const targetSection = document.getElementById(`step-${idx}`);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          setPortfolioStep(idx, true);
        }
      });
    });

    // 3. Toggle de Som
    const audioBtn = document.getElementById('audioToggleBtn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        STATE.audioEnabled = !STATE.audioEnabled;
        const iconOn = audioBtn.querySelector('.icon-sound-on');
        const iconOff = audioBtn.querySelector('.icon-sound-off');

        if (STATE.audioEnabled) {
          if (iconOn) iconOn.classList.remove('is-hidden');
          if (iconOff) iconOff.classList.add('is-hidden');
          haptics.initCtx();
          haptics.playClick(800, 0.08);
          showToast('Efeitos sonoros ativados.');
        } else {
          if (iconOn) iconOn.classList.add('is-hidden');
          if (iconOff) iconOff.classList.remove('is-hidden');
          showToast('Efeitos sonoros desativados.');
        }
      });
    }

    // 4. Interação Lúdica na Dynamic Island
    const island = document.getElementById('dynamicIsland');
    if (island) {
      island.addEventListener('click', () => {
        haptics.playClick(1200, 0.04);
        showToast('Dynamic Island: Gustavo OS v2.6 Online ⚡');
      });
    }
  }

  /* ==========================================================================
     12. PRELOADER ELEGANTE & INICIALIZAÇÃO CONTROLADA
     ========================================================================== */
  function startApplication() {
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('preloaderProgress');
    const percentEl = document.getElementById('preloaderPercent');
    const textEl = document.getElementById('preloaderText');

    let currentPct = 0;
    const progressInterval = setInterval(() => {
      currentPct += Math.floor(Math.random() * 18) + 12;
      if (currentPct > 95) currentPct = 95;

      if (progressBar) progressBar.style.width = `${currentPct}%`;
      if (percentEl) percentEl.textContent = `${currentPct}%`;
    }, 80);

    // Inicialização da Experiência
    initLiveClock();
    initFallbackModal();
    initUserInteractions();

    // Carrega dados do GitHub em paralelo
    fetchGitHubRepositories();

    // Tentativa de Inicialização do 3D
    try {
      phone3d = new Phone3DEngine();
      phone3d.init();
      console.log('✓ Smartphone 3D inicializado com sucesso.');
    } catch (err3d) {
      console.warn('Erro ao inicializar Three.js, ativando plano de fallback:', err3d.message);
      activate3dFallback(err3d.message);
    }

    // Inicializa sistema de rolagem
    initScrollSystem();

    // Finalização do Preloader
    setTimeout(() => {
      clearInterval(progressInterval);
      if (progressBar) progressBar.style.width = '100%';
      if (percentEl) percentEl.textContent = '100%';
      if (textEl) textEl.textContent = 'PRONTO';

      setTimeout(() => {
        if (preloader) {
          preloader.classList.add('is-hidden');
          preloader.style.display = 'none';
        }
        document.body.classList.remove('loading-state');

        const params = new URLSearchParams(window.location.search);
        const urlStep = params.get('step');
        if (urlStep !== null) {
          setPortfolioStep(parseInt(urlStep, 10));
        } else {
          setPortfolioStep(0);
        }

        if (params.get('fallback') === '3d') {
          activate3dFallback('Modo Fallback ativado via URL');
        }

        showToast('Bem-vindo ao Portfólio 3D de Gustavo!');
      }, 400);
    }, 600);
  }

  // Executa após carregamento do DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApplication);
  } else {
    startApplication();
  }

  // Exporta funções de teste no window para debug/validação de requisitos
  window.portfolioDebug = {
    testFallback3D: activate3dFallback,
    restore3D: restore3dMode,
    goToStep: setPortfolioStep,
    getState: () => ({ ...STATE })
  };

})();
