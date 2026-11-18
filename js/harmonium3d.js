/**
 * Harmonium 3D Viewport & Scene (Three.js)
 * Creates an authentic Indian Harmonium 3D model with:
 * - Handcrafted procedural Teak/Mahogany woodgrain and polished brass materials
 * - Ivory and Ebony keys with authentic mechanical pivot depression
 * - Floating Sargam (Devanagari + English) labels on each key
 * - Particle note burst effects on key strike
 * - Bellows accordion motion
 * - Responsive AR camera alignment and screen-to-key raycasting
 */

class Harmonium3D {
    constructor(containerElement, audioEngine) {
        this.container = containerElement;
        this.audio = audioEngine;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // 3D Model components
        this.harmoniumGroup = new THREE.Group();
        this.bellowsMesh = null;
        this.keys = new Map(); // noteId -> { mesh, originalY, originalRotX, targetRotX, isPressed, labelMesh }
        this.particles = [];

        // Key Layout Mode: 'saptak8' (8 large shuddha keys) or 'full13' (full chromatic harmonium)
        this.layoutMode = 'saptak8';

        // Harmonium Transparency & AR Glass Mode
        this.harmoniumOpacity = 0.85; // Default slightly translucent for AR feel
        this.isGlassMode = false;
        this.harmoniumYOffset = -0.85; // Comfortably seated in lower 45% of screen

        // Camera presets
        this.cameraViews = {
            'ar-lap': { pos: [0, 2.9, 3.8], lookAt: [0, -0.7, 0.3] }, // natural lap/table view
            'front':  { pos: [0, 1.6, 4.4], lookAt: [0, -0.3, 0.4] },
            'top':    { pos: [0, 4.6, 1.2], lookAt: [0, -0.2, 0.5] }
        };
        this.currentView = 'ar-lap';

        // Materials cache
        this.materials = {};

        // Active keys state
        this.pressedKeys = new Set();
        this.highlightedTargetKey = null; // for practice mode

        this.init();
    }

    /**
     * Initialize Three.js Scene, Renderer, Lighting
     */
    init() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        // Scene
        this.scene = new THREE.Scene();

        // Camera (Perspective with realistic field of view for AR overlay)
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.setCameraView(this.currentView, false);

        // Renderer with alpha for transparent AR background over webcam feed
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Create Procedural Textures & Materials
        this.createMaterials();

        // Build 3D Harmonium Model
        this.buildHarmoniumModel();

        // Particle System
        this.setupParticleSystem();

        // Window resize listener
        window.addEventListener('resize', () => this.onResize());

        // Animation Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    /**
     * Setup realistic studio/stage lighting for warm wooden luster
     */
    setupLighting() {
        // Soft ambient light
        const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.7);
        this.scene.add(ambientLight);

        // Warm directional key light from top-front
        const keyLight = new THREE.DirectionalLight(0xffeedd, 1.2);
        keyLight.position.set(2, 6, 4);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 15;
        keyLight.shadow.bias = -0.001;
        this.scene.add(keyLight);

        // Cool fill light from left
        const fillLight = new THREE.DirectionalLight(0xddeeff, 0.4);
        fillLight.position.set(-4, 3, 2);
        this.scene.add(fillLight);

        // Golden rim light from rear to highlight wooden edges and bellows
        const rimLight = new THREE.DirectionalLight(0xffaa44, 0.6);
        rimLight.position.set(0, 3, -4);
        this.scene.add(rimLight);
    }

    /**
     * Generate procedural textures (Woodgrain, Brass, Ivory)
     */
    createMaterials() {
        // Procedural Teak Wood Texture
        const woodCanvas = document.createElement('canvas');
        woodCanvas.width = 512;
        woodCanvas.height = 512;
        const ctx = woodCanvas.getContext('2d');

        // Warm mahogany / dark teak base
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#4a1e0d');
        grad.addColorStop(0.5, '#6a2c13');
        grad.addColorStop(1, '#3a1608');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Fine woodgrain lines
        ctx.fillStyle = 'rgba(20, 8, 4, 0.15)';
        for (let i = 0; i < 600; i++) {
            const y = Math.random() * 512;
            const h = 1 + Math.random() * 3;
            ctx.fillRect(0, y, 512, h);
        }
        // Subtle golden sheen highlights
        ctx.fillStyle = 'rgba(220, 140, 50, 0.08)';
        for (let i = 0; i < 200; i++) {
            const y = Math.random() * 512;
            ctx.fillRect(0, y, 512, 2);
        }

        const woodTexture = new THREE.CanvasTexture(woodCanvas);
        woodTexture.wrapS = THREE.RepeatWrapping;
        woodTexture.wrapT = THREE.RepeatWrapping;

        this.materials.wood = new THREE.MeshStandardMaterial({
            map: woodTexture,
            roughness: 0.35,
            metalness: 0.1,
            color: 0x8a3818,
            transparent: true,
            opacity: this.harmoniumOpacity
        });

        this.materials.darkWood = new THREE.MeshStandardMaterial({
            map: woodTexture,
            roughness: 0.4,
            metalness: 0.05,
            color: 0x3d180a,
            transparent: true,
            opacity: this.harmoniumOpacity
        });

        // Polished Brass Metal (Stops, corners, handle mounts)
        this.materials.brass = new THREE.MeshStandardMaterial({
            color: 0xdfb142,
            metalness: 0.88,
            roughness: 0.22,
            envMapIntensity: 1.0,
            transparent: true,
            opacity: Math.max(0.7, this.harmoniumOpacity)
        });

        // Ivory White Keys
        this.materials.ivoryKey = new THREE.MeshStandardMaterial({
            color: 0xfffdfa,
            roughness: 0.25,
            metalness: 0.02,
            transparent: true,
            opacity: Math.max(0.6, this.harmoniumOpacity)
        });

        // Ebony Black Keys
        this.materials.blackKey = new THREE.MeshStandardMaterial({
            color: 0x18181c,
            roughness: 0.3,
            metalness: 0.1,
            transparent: true,
            opacity: Math.max(0.7, this.harmoniumOpacity)
        });

        // Active Key Glow Materials
        this.materials.ivoryPressed = new THREE.MeshStandardMaterial({
            color: 0xffe8aa,
            emissive: 0xff9900,
            emissiveIntensity: 0.85,
            roughness: 0.2,
            transparent: true,
            opacity: Math.max(0.85, this.harmoniumOpacity)
        });

        this.materials.blackPressed = new THREE.MeshStandardMaterial({
            color: 0x332211,
            emissive: 0xffaa22,
            emissiveIntensity: 0.95,
            roughness: 0.2,
            transparent: true,
            opacity: Math.max(0.85, this.harmoniumOpacity)
        });

        // Target Practice Glow Material (Pulsing Green-Gold)
        this.materials.targetGlow = new THREE.MeshStandardMaterial({
            color: 0x99ff66,
            emissive: 0x33dd22,
            emissiveIntensity: 0.95,
            roughness: 0.2,
            transparent: true,
            opacity: 0.95
        });

        // Bellows Leatherette (Burgundy accordion folds)
        this.materials.bellows = new THREE.MeshStandardMaterial({
            color: 0x5a1820,
            roughness: 0.6,
            metalness: 0.05,
            transparent: true,
            opacity: Math.max(0.5, this.harmoniumOpacity)
        });

        this.materials.bellowsGold = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.7,
            roughness: 0.3,
            transparent: true,
            opacity: Math.max(0.7, this.harmoniumOpacity)
        });
    }

    /**
     * Build the detailed 3D Harmonium
     */
    buildHarmoniumModel() {
        // Clear previous components if any
        while (this.harmoniumGroup.children.length > 0) {
            this.harmoniumGroup.remove(this.harmoniumGroup.children[0]);
        }
        this.keys.clear();

        // 1. Harmonium Wooden Cabinet
        const cabinetWidth = 4.2;
        const cabinetHeight = 0.9;
        const cabinetDepth = 2.4;

        // Base box
        const baseGeom = new THREE.BoxGeometry(cabinetWidth, cabinetHeight, cabinetDepth);
        const baseMesh = new THREE.Mesh(baseGeom, this.materials.wood);
        baseMesh.position.set(0, -cabinetHeight / 2, 0.4);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        this.harmoniumGroup.add(baseMesh);

        // Side Wooden Cheeks (Left and Right arms)
        const cheekWidth = 0.28;
        const cheekHeight = 1.1;
        const cheekDepth = 2.45;

        const leftCheekGeom = new THREE.BoxGeometry(cheekWidth, cheekHeight, cheekDepth);
        const leftCheek = new THREE.Mesh(leftCheekGeom, this.materials.darkWood);
        leftCheek.position.set(-(cabinetWidth / 2 - cheekWidth / 2), 0.1, 0.4);
        leftCheek.castShadow = true;
        this.harmoniumGroup.add(leftCheek);

        const rightCheek = new THREE.Mesh(leftCheekGeom, this.materials.darkWood);
        rightCheek.position.set((cabinetWidth / 2 - cheekWidth / 2), 0.1, 0.4);
        rightCheek.castShadow = true;
        this.harmoniumGroup.add(rightCheek);

        // Front Fascia Board with Brass Knobs
        const frontBoardGeom = new THREE.BoxGeometry(cabinetWidth - cheekWidth * 2, 0.4, 0.06);
        const frontBoard = new THREE.Mesh(frontBoardGeom, this.materials.darkWood);
        frontBoard.position.set(0, -0.35, 1.62);
        this.harmoniumGroup.add(frontBoard);

        // Brass Stop Knobs on Front Board (Authentic Sur/Bellows stops)
        const knobCount = 7;
        const knobSpacing = 0.42;
        const startX = -((knobCount - 1) * knobSpacing) / 2;
        for (let i = 0; i < knobCount; i++) {
            const knobBaseGeom = new THREE.CylinderGeometry(0.045, 0.06, 0.06, 16);
            const knobHeadGeom = new THREE.SphereGeometry(0.06, 16, 16);

            const knobBase = new THREE.Mesh(knobBaseGeom, this.materials.brass);
            knobBase.rotation.x = Math.PI / 2;
            knobBase.position.set(startX + i * knobSpacing, -0.35, 1.66);

            const knobHead = new THREE.Mesh(knobHeadGeom, this.materials.brass);
            knobHead.position.set(startX + i * knobSpacing, -0.35, 1.71);

            this.harmoniumGroup.add(knobBase);
            this.harmoniumGroup.add(knobHead);
        }

        // Brass Corner Brackets (Traditional Indian Harmonium Hardware)
        this.addBrassCorners(cabinetWidth, cabinetHeight, cabinetDepth);

        // 2. Rear Bellows (Dhokna / Accordion pleats)
        this.buildBellows(cabinetWidth - cheekWidth * 2);

        // 3. Harmonium Keys Keyboard
        this.buildKeyboard(cabinetWidth - cheekWidth * 2 - 0.1);

        // Place harmonium in scene (comfortably seated in lower view for AR ergonomics)
        this.harmoniumGroup.position.set(0, this.harmoniumYOffset, 0.2);
        this.scene.add(this.harmoniumGroup);
    }

    /**
     * Add decorative brass corner protectors
     */
    addBrassCorners(w, h, d) {
        const cornerGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const corners = [
            [-w / 2 + 0.05, -h + 0.06, 0.4 + d / 2 - 0.05],
            [ w / 2 - 0.05, -h + 0.06, 0.4 + d / 2 - 0.05],
            [-w / 2 + 0.05,  0.55,     0.4 + d / 2 - 0.05],
            [ w / 2 - 0.05,  0.55,     0.4 + d / 2 - 0.05],
            [-w / 2 + 0.05,  0.55,     0.4 - d / 2 + 0.05],
            [ w / 2 - 0.05,  0.55,     0.4 - d / 2 + 0.05]
        ];

        corners.forEach(pos => {
            const corner = new THREE.Mesh(cornerGeom, this.materials.brass);
            corner.position.set(pos[0], pos[1], pos[2]);
            this.harmoniumGroup.add(corner);
        });
    }

    /**
     * Build Accordion Bellows at the rear
     */
    buildBellows(width) {
        const foldsGroup = new THREE.Group();
        const foldCount = 7;
        const foldHeight = 0.7;
        const foldDepth = 0.5;

        for (let i = 0; i < foldCount; i++) {
            const z = -0.5 - i * 0.07;
            const foldGeom = new THREE.BoxGeometry(width, foldHeight - i * 0.02, 0.04);
            const foldMesh = new THREE.Mesh(foldGeom, this.materials.bellows);
            foldMesh.position.set(0, 0.05, z);
            foldsGroup.add(foldMesh);

            // Gold decorative tape on pleat rim
            const rimGeom = new THREE.BoxGeometry(width + 0.02, 0.02, 0.05);
            const rimMesh = new THREE.Mesh(rimGeom, this.materials.bellowsGold);
            rimMesh.position.set(0, 0.05 + foldHeight / 2, z);
            foldsGroup.add(rimMesh);
        }

        this.bellowsMesh = foldsGroup;
        this.harmoniumGroup.add(foldsGroup);
    }

    /**
     * Build the Keys according to layoutMode ('saptak8' or 'full13')
     */
    buildKeyboard(availableWidth) {
        const noteDefs = this.audio.noteDefinitions;

        if (this.layoutMode === 'saptak8') {
            // 8 Main Saptak Notes: Sa Re Ga Ma Pa Dha Ni Ṡa
            const keysList = this.audio.primaryNotes;
            const keyCount = keysList.length;
            const keyWidth = (availableWidth / keyCount) * 0.94;
            const keyGap = (availableWidth / keyCount) * 0.06;
            const keyLength = 1.45;
            const keyThickness = 0.14;

            const keyboardStartX = -((keyCount * (keyWidth + keyGap)) - keyGap) / 2 + keyWidth / 2;

            keysList.forEach((noteId, index) => {
                const def = noteDefs[noteId];
                const posX = keyboardStartX + index * (keyWidth + keyGap);
                const posZ = 0.85;

                const keyObj = this.createKeyMesh(def, keyWidth, keyLength, keyThickness, false, index);
                keyObj.group.position.set(posX, 0.08, posZ);

                this.harmoniumGroup.add(keyObj.group);
                this.keys.set(noteId, keyObj);
            });
        } else {
            // Full 13-note Chromatic Harmonium (White keys + Raised Black keys)
            const whiteNotes = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni', 'Sa_t'];
            const whiteCount = whiteNotes.length;
            const whiteKeyWidth = (availableWidth / whiteCount) * 0.93;
            const whiteKeyGap = (availableWidth / whiteCount) * 0.07;
            const whiteKeyLength = 1.5;
            const whiteThickness = 0.14;

            const startX = -((whiteCount * (whiteKeyWidth + whiteKeyGap)) - whiteKeyGap) / 2 + whiteKeyWidth / 2;

            // Map white note positions
            const whitePositions = {};
            whiteNotes.forEach((noteId, idx) => {
                const posX = startX + idx * (whiteKeyWidth + whiteKeyGap);
                whitePositions[noteId] = posX;

                const def = noteDefs[noteId];
                const keyObj = this.createKeyMesh(def, whiteKeyWidth, whiteKeyLength, whiteThickness, false, idx);
                keyObj.group.position.set(posX, 0.08, 0.85);

                this.harmoniumGroup.add(keyObj.group);
                this.keys.set(noteId, keyObj);
            });

            // Black keys positioned between appropriate white keys
            const blackKeysConfig = [
                { id: 're',   between: ['Sa', 'Re'] },
                { id: 'ga',   between: ['Re', 'Ga'] },
                { id: 'Ma_t', between: ['Ma', 'Pa'] },
                { id: 'dha',  between: ['Pa', 'Dha'] },
                { id: 'ni',   between: ['Dha', 'Ni'] }
            ];

            const blackKeyWidth = whiteKeyWidth * 0.62;
            const blackKeyLength = whiteKeyLength * 0.62;
            const blackThickness = whiteThickness * 1.35;

            blackKeysConfig.forEach((cfg, idx) => {
                const def = noteDefs[cfg.id];
                const x1 = whitePositions[cfg.between[0]];
                const x2 = whitePositions[cfg.between[1]];
                const posX = (x1 + x2) / 2;

                const keyObj = this.createKeyMesh(def, blackKeyWidth, blackKeyLength, blackThickness, true, idx);
                // Placed further back and elevated
                keyObj.group.position.set(posX, 0.16, 0.85 - (whiteKeyLength - blackKeyLength) / 2);

                this.harmoniumGroup.add(keyObj.group);
                this.keys.set(cfg.id, keyObj);
            });
        }
    }

    /**
     * Create a single 3D key mesh with authentic mechanical pivot & floating Sargam label
     */
    createKeyMesh(noteDef, width, length, thickness, isBlack, index) {
        // Pivot group: positioned at the rear of the key so rotating X pivots the front down
        const pivotGroup = new THREE.Group();

        // Geometry: Box with bevelled appearance
        const keyGeom = new THREE.BoxGeometry(width, thickness, length);
        const material = isBlack ? this.materials.blackKey.clone() : this.materials.ivoryKey.clone();

        const keyMesh = new THREE.Mesh(keyGeom, material);
        keyMesh.castShadow = true;
        keyMesh.receiveShadow = true;

        // Shift key mesh forward so pivot point (0,0,0) is at the rear edge
        keyMesh.position.set(0, 0, length / 2);
        pivotGroup.add(keyMesh);

        // Store user data for raycaster detection
        keyMesh.userData = {
            noteId: noteDef.name,
            noteKey: this.getKeyIdByName(noteDef.name),
            isBlack: isBlack,
            pivotGroup: pivotGroup
        };

        // Create Sargam Label Texture (Devanagari + English + Western + Key shortcut)
        const labelMesh = this.createKeyLabelMesh(noteDef, width, length, isBlack, index);
        labelMesh.position.set(0, thickness / 2 + 0.002, length / 2);
        labelMesh.rotation.x = -Math.PI / 2;
        pivotGroup.add(labelMesh);

        return {
            noteId: noteDef.name,
            group: pivotGroup,
            mesh: keyMesh,
            material: material,
            isBlack: isBlack,
            labelMesh: labelMesh,
            currentRotX: 0,
            targetRotX: 0,
            isPressed: false
        };
    }

    /**
     * Map note name to internal ID
     */
    getKeyIdByName(name) {
        for (const [id, def] of Object.entries(this.audio.noteDefinitions)) {
            if (def.name === name) return id;
        }
        return name;
    }

    /**
     * Generate sharp high-DPI canvas texture for key label
     */
    createKeyLabelMesh(noteDef, width, length, isBlack, index) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Transparent background
        ctx.clearRect(0, 0, 256, 512);

        // Color scheme
        const textColor = isBlack ? '#ffffff' : '#1a1815';
        const subColor = isBlack ? '#e0a94d' : '#8c531b';
        const badgeBg = isBlack ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)';

        // Keyboard shortcut mapping (A S D F G H J K ...)
        const shortcuts = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'W', 'E', 'T', 'Y', 'U'];
        const shortcutChar = shortcuts[index % shortcuts.length] || '';

        // 1. Devanagari Sargam Note (e.g. सा, रे, ग)
        ctx.fillStyle = textColor;
        ctx.font = 'bold 110px "Noto Sans Devanagari", "Mangal", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(noteDef.devanagari, 128, 140);

        // 2. English Sargam Note (e.g. Sa, Re, Ga)
        ctx.fillStyle = subColor;
        ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(noteDef.name, 128, 250);

        // 3. Western Note (e.g. C4, D4)
        ctx.fillStyle = isBlack ? '#aaaaaa' : '#666666';
        ctx.font = '500 42px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(noteDef.western, 128, 340);

        // 4. Keyboard Shortcut Pill Badge
        ctx.fillStyle = badgeBg;
        this.roundRect(ctx, 78, 410, 100, 60, 14);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 36px monospace';
        ctx.fillText(`[${shortcutChar}]`, 128, 442);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;

        const labelGeom = new THREE.PlaneGeometry(width * 0.88, length * 0.88);
        const labelMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.95,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(labelGeom, labelMat);
        mesh.userData.canvas = canvas;
        mesh.userData.ctx = ctx;
        mesh.userData.texture = texture;
        return mesh;
    }

    /**
     * Helper for rounded rectangle on canvas
     */
    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /**
     * Switch between 'saptak8' (8 large notes) and 'full13' (chromatic)
     */
    setLayoutMode(mode) {
        if (mode === this.layoutMode) return;
        this.layoutMode = mode;
        this.buildHarmoniumModel();
    }

    /**
     * Set Harmonium Opacity (0.15 = Ultra-translucent AR Glass, 1.0 = Fully Solid Wood)
     */
    setHarmoniumOpacity(opacity) {
        this.harmoniumOpacity = Math.max(0.15, Math.min(1.0, opacity));
        this.isGlassMode = this.harmoniumOpacity < 0.85;

        // Update all base materials
        for (const [key, mat] of Object.entries(this.materials)) {
            if (mat) {
                mat.transparent = true;
                if (key === 'ivoryPressed' || key === 'blackPressed' || key === 'targetGlow') {
                    mat.opacity = Math.max(0.85, this.harmoniumOpacity);
                } else if (key === 'ivoryKey') {
                    mat.opacity = Math.max(0.45, this.harmoniumOpacity * 0.9);
                } else if (key === 'blackKey') {
                    mat.opacity = Math.max(0.6, this.harmoniumOpacity);
                } else {
                    mat.opacity = this.harmoniumOpacity;
                }
                mat.needsUpdate = true;
            }
        }

        // Update active key meshes and label textures
        for (const keyObj of this.keys.values()) {
            if (keyObj.mesh && keyObj.mesh.material) {
                keyObj.mesh.material.transparent = true;
                keyObj.mesh.material.opacity = keyObj.isBlack ?
                    Math.max(0.6, this.harmoniumOpacity) :
                    Math.max(0.45, this.harmoniumOpacity * 0.9);
                keyObj.mesh.material.needsUpdate = true;
            }
            if (keyObj.labelMesh && keyObj.labelMesh.material) {
                keyObj.labelMesh.material.opacity = Math.max(0.5, this.harmoniumOpacity * 0.95);
                keyObj.labelMesh.material.needsUpdate = true;
            }
        }
    }

    /**
     * Toggle Glass / Holographic AR Mode
     */
    toggleGlassMode(forceState = null) {
        const nextState = forceState !== null ? forceState : !this.isGlassMode;
        this.isGlassMode = nextState;
        const targetOpacity = this.isGlassMode ? 0.45 : 1.0;
        this.setHarmoniumOpacity(targetOpacity);
        return { isGlassMode: this.isGlassMode, opacity: targetOpacity };
    }

    /**
     * Set Harmonium Vertical Height/Position on screen
     * e.g. -0.5 (raised) to -1.1 (lowered down)
     */
    setHarmoniumVerticalPosition(yOffset) {
        this.harmoniumYOffset = yOffset;
        if (this.harmoniumGroup) {
            this.harmoniumGroup.position.y = this.harmoniumYOffset;
        }
    }

    /**
     * Set Camera Preset View with smooth interpolation
     */
    setCameraView(viewName, animate = true) {
        const view = this.cameraViews[viewName];
        if (!view) return;
        this.currentView = viewName;

        if (!animate) {
            this.camera.position.set(view.pos[0], view.pos[1], view.pos[2]);
            this.camera.lookAt(new THREE.Vector3(...view.lookAt));
        } else {
            this.targetCameraPos = new THREE.Vector3(...view.pos);
            this.targetCameraLookAt = new THREE.Vector3(...view.lookAt);
        }
    }

    /**
     * Setup Floating Musical Particle System
     */
    setupParticleSystem() {
        const particleCount = 60;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3 + 0] = 0;
            positions[i * 3 + 1] = -10;
            positions[i * 3 + 2] = 0;

            // Golden-amber particle colors
            colors[i * 3 + 0] = 1.0;
            colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
            colors[i * 3 + 2] = 0.2;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Create circular glowing particle canvas texture
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 64;
        pCanvas.height = 64;
        const pCtx = pCanvas.getContext('2d');
        const radGrad = pCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
        radGrad.addColorStop(0, 'rgba(255, 235, 160, 1)');
        radGrad.addColorStop(0.4, 'rgba(255, 180, 50, 0.6)');
        radGrad.addColorStop(1, 'rgba(255, 140, 0, 0)');
        pCtx.fillStyle = radGrad;
        pCtx.fillRect(0, 0, 64, 64);

        const pTexture = new THREE.CanvasTexture(pCanvas);

        const pMaterial = new THREE.PointsMaterial({
            size: 0.18,
            map: pTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(geom, pMaterial);
        this.scene.add(this.particleSystem);

        // Particle pool data
        this.particleData = Array.from({ length: particleCount }, () => ({
            active: false,
            velX: 0, velY: 0, velZ: 0,
            life: 0, maxLife: 1
        }));
    }

    /**
     * Spawn burst of glowing particles when a key is struck
     */
    spawnNoteBurst(x, y, z) {
        if (!this.particleSystem) return;
        const positions = this.particleSystem.geometry.attributes.position.array;

        let spawned = 0;
        for (let i = 0; i < this.particleData.length && spawned < 8; i++) {
            const p = this.particleData[i];
            if (!p.active) {
                p.active = true;
                p.life = 0;
                p.maxLife = 0.6 + Math.random() * 0.5;
                p.velX = (Math.random() - 0.5) * 0.6;
                p.velY = 0.8 + Math.random() * 1.2;
                p.velZ = (Math.random() - 0.5) * 0.4;

                positions[i * 3 + 0] = x;
                positions[i * 3 + 1] = y + 0.1;
                positions[i * 3 + 2] = z;
                spawned++;
            }
        }
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Visual Key Press (depresses key in 3D, turns on glow, spawns particles)
     */
    visualKeyPress(noteId) {
        const keyObj = this.keys.get(noteId);
        if (!keyObj) return;

        keyObj.isPressed = true;
        keyObj.targetRotX = 0.055; // Tilt front of key down by ~3.2 degrees

        // Apply Glow Material
        if (noteId === this.highlightedTargetKey) {
            keyObj.mesh.material = this.materials.targetGlow;
        } else {
            keyObj.mesh.material = keyObj.isBlack ? this.materials.blackPressed : this.materials.ivoryPressed;
        }

        // Spawn particles at key front tip
        const worldPos = new THREE.Vector3();
        keyObj.mesh.getWorldPosition(worldPos);
        this.spawnNoteBurst(worldPos.x, worldPos.y + 0.1, worldPos.z + 0.5);

        // Bellows reaction: subtle accordion breath
        if (this.bellowsMesh) {
            this.bellowsMesh.position.z = -0.02 + Math.sin(Date.now() * 0.02) * 0.015;
        }
    }

    /**
     * Visual Key Release (springs key back to resting position)
     */
    visualKeyRelease(noteId) {
        const keyObj = this.keys.get(noteId);
        if (!keyObj) return;

        keyObj.isPressed = false;
        keyObj.targetRotX = 0;

        // Restore Material
        if (noteId === this.highlightedTargetKey) {
            keyObj.mesh.material = this.materials.targetGlow;
        } else {
            keyObj.mesh.material = keyObj.isBlack ? this.materials.blackKey : this.materials.ivoryKey;
        }
    }

    /**
     * Highlight target key for Practice Mode tutorial
     */
    setTargetKeyHighlight(noteId) {
        // Clear old target highlight
        if (this.highlightedTargetKey && this.keys.has(this.highlightedTargetKey)) {
            const oldObj = this.keys.get(this.highlightedTargetKey);
            if (!oldObj.isPressed) {
                oldObj.mesh.material = oldObj.isBlack ? this.materials.blackKey : this.materials.ivoryKey;
            }
        }

        this.highlightedTargetKey = noteId;

        if (noteId && this.keys.has(noteId)) {
            const newObj = this.keys.get(noteId);
            newObj.mesh.material = this.materials.targetGlow;
        }
    }

    /**
     * Screen Coordinates Raycasting (e.g. from Fingertip landmark or Mouse click)
     * @param {number} normX - 0.0 (left) to 1.0 (right)
     * @param {number} normY - 0.0 (top) to 1.0 (bottom)
     * @returns {string|null} noteId
     */
    getKeyAtScreenCoords(normX, normY) {
        // Convert [0, 1] screen coords to normalized device coordinates [-1, 1]
        this.mouse.x = (normX * 2) - 1;
        this.mouse.y = -(normY * 2) + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Intersect only with key meshes
        const keyMeshes = Array.from(this.keys.values()).map(k => k.mesh);
        const intersects = this.raycaster.intersectObjects(keyMeshes, false);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const noteKey = hitMesh.userData.noteKey;
            return noteKey || null;
        }
        return null;
    }

    /**
     * Get 3D screen projection bounding boxes for all keys
     * Useful for fast proximity detection with finger landmarks
     */
    getKeyScreenBoundingBoxes() {
        const boxes = [];
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        for (const [noteId, keyObj] of this.keys.entries()) {
            const box3 = new THREE.Box3().setFromObject(keyObj.mesh);

            // Project 8 corners of 3D box to screen
            const corners = [
                new THREE.Vector3(box3.min.x, box3.min.y, box3.min.z),
                new THREE.Vector3(box3.max.x, box3.min.y, box3.min.z),
                new THREE.Vector3(box3.min.x, box3.max.y, box3.min.z),
                new THREE.Vector3(box3.max.x, box3.max.y, box3.min.z),
                new THREE.Vector3(box3.min.x, box3.min.y, box3.max.z),
                new THREE.Vector3(box3.max.x, box3.min.y, box3.max.z),
                new THREE.Vector3(box3.min.x, box3.max.y, box3.max.z),
                new THREE.Vector3(box3.max.x, box3.max.y, box3.max.z)
            ];

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            corners.forEach(corner => {
                corner.project(this.camera);
                const screenX = (corner.x + 1) * width / 2;
                const screenY = (-corner.y + 1) * height / 2;
                minX = Math.min(minX, screenX);
                maxX = Math.max(maxX, screenX);
                minY = Math.min(minY, screenY);
                maxY = Math.max(maxY, screenY);
            });

            boxes.push({
                noteId,
                minX, minY, maxX, maxY,
                isBlack: keyObj.isBlack,
                center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
            });
        }
        return boxes;
    }

    /**
     * Main Animation & Physics Frame Loop
     */
    animate() {
        requestAnimationFrame(this.animate);

        const delta = 0.016; // approximate frame time

        // Smooth Key Depression Lerping
        for (const keyObj of this.keys.values()) {
            keyObj.currentRotX += (keyObj.targetRotX - keyObj.currentRotX) * 0.35;
            keyObj.group.rotation.x = keyObj.currentRotX;
        }

        // Target key practice pulse animation
        if (this.highlightedTargetKey && this.keys.has(this.highlightedTargetKey)) {
            const targetObj = this.keys.get(this.highlightedTargetKey);
            const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.008);
            if (!targetObj.isPressed) {
                targetObj.mesh.material.emissiveIntensity = pulse;
            }
        }

        // Particle Physics Update
        if (this.particleSystem) {
            const positions = this.particleSystem.geometry.attributes.position.array;
            let needsUpdate = false;

            for (let i = 0; i < this.particleData.length; i++) {
                const p = this.particleData[i];
                if (p.active) {
                    p.life += delta;
                    if (p.life >= p.maxLife) {
                        p.active = false;
                        positions[i * 3 + 1] = -10; // hide below screen
                    } else {
                        positions[i * 3 + 0] += p.velX * delta;
                        positions[i * 3 + 1] += p.velY * delta;
                        positions[i * 3 + 2] += p.velZ * delta;
                        p.velY -= 0.6 * delta; // slight gravity
                    }
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                this.particleSystem.geometry.attributes.position.needsUpdate = true;
            }
        }

        // Camera Smooth Transition Lerp
        if (this.targetCameraPos) {
            this.camera.position.lerp(this.targetCameraPos, 0.08);
            if (this.camera.position.distanceTo(this.targetCameraPos) < 0.02) {
                this.camera.position.copy(this.targetCameraPos);
                this.targetCameraPos = null;
            }
            this.camera.lookAt(new THREE.Vector3(...this.cameraViews[this.currentView].lookAt));
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle Window Resize
     */
    onResize() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// Global export
window.Harmonium3D = Harmonium3D;
