/**
 * Hand Tracker Engine (MediaPipe Hands + WebRTC Camera)
 * Handles:
 * - Live webcam stream capture with horizontal mirroring
 * - 21 3D hand landmarks detection via MediaPipe Hands
 * - Multi-finger tracking (Index, Middle, Ring, Pinky, Thumb)
 * - Key collision & depression trigger (Hover-Touch, Pinch, Depth-Push)
 * - Visual AR hand skeleton & glowing fingertip tracking canvas overlay
 * - Polyphonic multi-touch key management
 */

class HandTracker {
    constructor(videoElement, canvasOverlayElement, harmonium3D, audioEngine) {
        this.video = videoElement;
        this.canvas = canvasOverlayElement;
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.harmonium3D = harmonium3D;
        this.audio = audioEngine;

        this.hands = null;
        this.camera = null;
        this.isRunning = false;
        this.isMirrored = true;
        this.handsDetectedCount = 0;

        // Interaction settings
        this.interactionMode = 'touch'; // 'touch' (hover/touch), 'pinch', 'tap'
        this.sensitivity = 0.8; // 0.1 to 1.0

        // Active fingers holding keys: key is fingerIdentifier (e.g. '0_8' = hand 0, index finger), value is noteId
        this.activeFingerKeys = new Map();

        // Finger tips to track per hand:
        // 8: Index, 12: Middle, 16: Ring, 20: Pinky, 4: Thumb
        this.fingertipLandmarks = [8, 12, 16, 20, 4];

        // Frame processing flag to avoid backlog
        this.isProcessingFrame = false;

        // Callback hooks
        this.onHandCountChange = null;
        this.onError = null;
        this.onCameraReady = null;

        // Smoothing landmarks
        this.smoothedFingers = new Map();
    }

    /**
     * Start the Webcam and initialize MediaPipe Hands
     */
    async start() {
        if (this.isRunning) return;

        try {
            // 1. Request Camera Stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });

            this.video.srcObject = stream;
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            this.updateCanvasSize();
            this.onCameraReady?.();

            // 2. Initialize MediaPipe Hands
            await this.initMediaPipe();

            this.isRunning = true;
            this.startTrackingLoop();
        } catch (err) {
            console.error('Camera or MediaPipe initialization failed:', err);
            this.onError?.(err);
            throw err;
        }
    }

    /**
     * Stop Camera & MediaPipe
     */
    stop() {
        this.isRunning = false;
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
        this.releaseAllFingers();
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.handsDetectedCount = 0;
        this.onHandCountChange?.(0);
    }

    /**
     * Match canvas overlay resolution with video feed
     */
    updateCanvasSize() {
        if (!this.canvas || !this.video) return;
        this.canvas.width = this.canvas.clientWidth || 1280;
        this.canvas.height = this.canvas.clientHeight || 720;
    }

    /**
     * Initialize MediaPipe Hands instance
     */
    async initMediaPipe() {
        if (typeof Hands === 'undefined') {
            throw new Error('MediaPipe Hands library not loaded yet.');
        }

        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.onHandResults(results));
    }

    /**
     * Map video-relative landmark coordinates to exact canvas pixel coordinates,
     * taking into account object-fit: cover scaling and horizontal mirroring.
     */
    getCoverCoords(landmark) {
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        const videoW = this.video.videoWidth || 1280;
        const videoH = this.video.videoHeight || 720;

        const videoRatio = videoW / videoH;
        const canvasRatio = canvasW / canvasH;

        let drawW, drawH, offX, offY;
        if (canvasRatio > videoRatio) {
            drawW = canvasW;
            drawH = canvasW / videoRatio;
            offX = 0;
            offY = (canvasH - drawH) / 2;
        } else {
            drawW = canvasH * videoRatio;
            drawH = canvasH;
            offX = (canvasW - drawW) / 2;
            offY = 0;
        }

        const rawX = this.isMirrored ? (1.0 - landmark.x) : landmark.x;
        const rawY = landmark.y;

        const screenX = offX + rawX * drawW;
        const screenY = offY + rawY * drawH;

        return {
            x: screenX,
            y: screenY,
            normX: Math.max(0, Math.min(1, screenX / canvasW)),
            normY: Math.max(0, Math.min(1, screenY / canvasH))
        };
    }

    /**
     * Continuous tracking loop sending video frames to MediaPipe
     */
    startTrackingLoop() {
        const processFrame = async () => {
            if (!this.isRunning) return;

            if (this.video.readyState >= 2 && !this.isProcessingFrame && this.hands) {
                this.isProcessingFrame = true;
                try {
                    await this.hands.send({ image: this.video });
                } catch (e) {
                    console.warn('MediaPipe send frame error:', e);
                } finally {
                    this.isProcessingFrame = false;
                }
            }

            requestAnimationFrame(processFrame);
        };
        requestAnimationFrame(processFrame);
    }

    /**
     * Process Hand Detection Results
     */
    onHandResults(results) {
        if (!this.isRunning) return;

        this.updateCanvasSize();
        const ctx = this.ctx;
        if (ctx) {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        const multiHandLandmarks = results.multiHandLandmarks;
        const currentHandsCount = multiHandLandmarks ? multiHandLandmarks.length : 0;

        if (currentHandsCount !== this.handsDetectedCount) {
            this.handsDetectedCount = currentHandsCount;
            this.onHandCountChange?.(currentHandsCount);
        }

        if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
            this.releaseAllFingers();
            return;
        }

        // Set of active finger IDs detected in this frame
        const presentFingerIds = new Set();

        // Process each detected hand
        multiHandLandmarks.forEach((landmarks, handIndex) => {
            // Draw Hand Skeleton overlay on top of 3D Harmonium
            this.drawHandSkeleton(landmarks);

            // Left Hand Bellows Pump Detection (if in manual mode):
            this.detectBellowsPumpGesture(landmarks, handIndex);

            // Check each fingertip for key collisions
            this.fingertipLandmarks.forEach((tipIndex) => {
                const tipLandmark = landmarks[tipIndex];
                const fingerId = `${handIndex}_${tipIndex}`;
                presentFingerIds.add(fingerId);

                // Get exact screen pixel coordinates and normalized coordinates
                const coords = this.getCoverCoords(tipLandmark);
                const normX = coords.normX;
                const normY = coords.normY;

                // Smooth coordinates with exponential moving average to eliminate jitter
                const prevSmoothed = this.smoothedFingers.get(fingerId) || { x: normX, y: normY, sx: coords.x, sy: coords.y };
                const smoothFactor = 0.5;
                const smoothedX = prevSmoothed.x + (normX - prevSmoothed.x) * smoothFactor;
                const smoothedY = prevSmoothed.y + (normY - prevSmoothed.y) * smoothFactor;
                const smoothedSx = prevSmoothed.sx + (coords.x - prevSmoothed.sx) * smoothFactor;
                const smoothedSy = prevSmoothed.sy + (coords.y - prevSmoothed.sy) * smoothFactor;
                this.smoothedFingers.set(fingerId, { x: smoothedX, y: smoothedY, sx: smoothedSx, sy: smoothedSy });

                // Check gesture condition (Pinch vs Direct Touch)
                let isGestureActive = true;
                if (this.interactionMode === 'pinch') {
                    const thumb = landmarks[4];
                    const indexTip = landmarks[8];
                    const dx = thumb.x - indexTip.x;
                    const dy = thumb.y - indexTip.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    isGestureActive = dist < 0.085;
                }

                // Check collision with 3D harmonium keys
                const hitNoteId = this.harmonium3D.getKeyAtScreenCoords(smoothedX, smoothedY);

                // Draw glowing fingertip beacon on top
                this.drawFingertip(smoothedSx, smoothedSy, hitNoteId !== null && isGestureActive, tipIndex === 8, hitNoteId);

                if (hitNoteId && isGestureActive) {
                    const currentNote = this.activeFingerKeys.get(fingerId);
                    if (currentNote !== hitNoteId) {
                        if (currentNote) {
                            this.releaseFingerKey(fingerId, currentNote);
                        }
                        this.pressFingerKey(fingerId, hitNoteId);
                    }
                } else {
                    if (this.activeFingerKeys.has(fingerId)) {
                        const noteToRelease = this.activeFingerKeys.get(fingerId);
                        this.releaseFingerKey(fingerId, noteToRelease);
                    }
                }
            });
        });

        // Release any fingers that disappeared from camera
        for (const [fingerId, noteId] of this.activeFingerKeys.entries()) {
            if (!presentFingerIds.has(fingerId)) {
                this.releaseFingerKey(fingerId, noteId);
            }
        }
    }

    /**
     * Press key triggered by a finger
     */
    pressFingerKey(fingerId, noteId) {
        this.activeFingerKeys.set(fingerId, noteId);

        // Check how many fingers are pressing this note
        let isFirstPress = true;
        for (const [fId, nId] of this.activeFingerKeys.entries()) {
            if (fId !== fingerId && nId === noteId) {
                isFirstPress = false;
                break;
            }
        }

        if (isFirstPress) {
            // Trigger sound in Audio Engine
            this.audio.playNote(noteId);

            // Depress key in 3D scene
            this.harmonium3D.visualKeyPress(noteId);

            // Broadcast key press for practice mode & recorder
            window.dispatchEvent(new CustomEvent('harmonium-keypress', {
                detail: { noteId, source: 'hand' }
            }));
        }
    }

    /**
     * Release key triggered by a finger
     */
    releaseFingerKey(fingerId, noteId) {
        this.activeFingerKeys.delete(fingerId);

        // Only release sound and 3D key if NO other finger is still holding this note
        let stillHeld = false;
        for (const [fId, nId] of this.activeFingerKeys.entries()) {
            if (nId === noteId) {
                stillHeld = true;
                break;
            }
        }

        if (!stillHeld) {
            this.audio.stopNote(noteId);
            this.harmonium3D.visualKeyRelease(noteId);

            window.dispatchEvent(new CustomEvent('harmonium-keyrelease', {
                detail: { noteId, source: 'hand' }
            }));
        }
    }

    /**
     * Release all held keys
     */
    releaseAllFingers() {
        for (const [fingerId, noteId] of this.activeFingerKeys.entries()) {
            this.audio.stopNote(noteId);
            this.harmonium3D.visualKeyRelease(noteId);
        }
        this.activeFingerKeys.clear();
        this.smoothedFingers.clear();
    }

    /**
     * Detect left hand horizontal pumping gesture for Bellows (Dhokna)
     */
    detectBellowsPumpGesture(landmarks, handIndex) {
        if (this.audio.bellowsMode !== 'manual') return;

        // Use wrist (landmark 0) horizontal speed
        const wrist = landmarks[0];
        const prevWrist = this[`prevWrist_${handIndex}`];
        if (prevWrist) {
            const dx = Math.abs(wrist.x - prevWrist.x);
            if (dx > 0.015) {
                this.audio.pumpBellows(dx * 1.8);
            }
        }
        this[`prevWrist_${handIndex}`] = { x: wrist.x, y: wrist.y };
    }

    /**
     * Draw glowing AR Hand Skeleton (Vibrant, high-contrast, fully visible on top of 3D Harmonium)
     */
    drawHandSkeleton(landmarks) {
        if (!this.ctx) return;
        const ctx = this.ctx;

        // Convert all 21 landmarks to canvas coordinates using cover mapping
        const pts = landmarks.map(lm => this.getCoverCoords(lm));

        ctx.save();

        // 1. Draw glowing palm surface mesh
        const palmIndices = [0, 1, 2, 5, 9, 13, 17, 0];
        ctx.beginPath();
        ctx.moveTo(pts[palmIndices[0]].x, pts[palmIndices[0]].y);
        for (let i = 1; i < palmIndices.length; i++) {
            ctx.lineTo(pts[palmIndices[i]].x, pts[palmIndices[i]].y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 180, 50, 0.16)';
        ctx.fill();

        // Connections between 21 MediaPipe hand landmarks
        const connections = [
            [0,1],[1,2],[2,3],[3,4],        // Thumb
            [0,5],[5,6],[6,7],[7,8],        // Index
            [5,9],[9,10],[10,11],[11,12],   // Middle
            [9,13],[13,14],[14,15],[15,16], // Ring
            [13,17],[17,18],[18,19],[19,20],// Pinky
            [0,17]                          // Palm base
        ];

        // 2. Draw outer glow of hand bones
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255, 175, 40, 0.45)';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 12;

        connections.forEach(([i, j]) => {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
        });

        // 3. Draw bright sharp inner core of bones
        ctx.strokeStyle = 'rgba(255, 245, 210, 0.95)';
        ctx.lineWidth = 2.8;
        ctx.shadowBlur = 4;

        connections.forEach(([i, j]) => {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
        });

        // 4. Draw glowing joints
        pts.forEach((pt, idx) => {
            const isTip = [4, 8, 12, 16, 20].includes(idx);
            if (isTip) return; // Tips drawn with custom reticles below

            // Outer joint ring
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 180, 50, 0.9)';
            ctx.shadowColor = '#ffbb33';
            ctx.shadowBlur = 8;
            ctx.fill();

            // Inner bright core
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        });

        ctx.restore();
    }

    /**
     * Draw glowing fingertip touch cursor
     */
    drawFingertip(screenX, screenY, isTouching, isPrimary = false, hitNoteId = null) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const x = screenX;
        const y = screenY;

        ctx.save();

        if (isTouching) {
            // Radiant Golden-Amber Touch Flare
            ctx.shadowColor = '#ff9900';
            ctx.shadowBlur = 24;

            // Outer ripple ring
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 170, 0, 0.9)';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Middle ring
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 200, 50, 0.5)';
            ctx.fill();

            // Inner solid core
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Floating note badge above finger
            if (hitNoteId) {
                const def = this.audio.noteDefinitions[hitNoteId];
                const label = def ? def.devanagari : hitNoteId;
                ctx.fillStyle = 'rgba(20, 16, 10, 0.85)';
                ctx.strokeStyle = '#dfb142';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(x - 22, y - 48, 44, 26, 8) : ctx.rect(x - 22, y - 48, 44, 26);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#ffea9f';
                ctx.font = 'bold 15px "Noto Sans Devanagari", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, x, y - 35);
            }
        } else {
            // Idle Hover Cursor (Vivid Cyan & Gold targeting beacon)
            ctx.shadowColor = isPrimary ? '#00e5ff' : '#dfb142';
            ctx.shadowBlur = 14;

            // Targeting outer ring
            ctx.beginPath();
            ctx.arc(x, y, isPrimary ? 13 : 9, 0, Math.PI * 2);
            ctx.strokeStyle = isPrimary ? '#00e5ff' : 'rgba(255, 220, 120, 0.85)';
            ctx.lineWidth = 2.2;
            ctx.stroke();

            // Inner glowing dot
            ctx.beginPath();
            ctx.arc(x, y, isPrimary ? 5 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        ctx.restore();
    }
}

// Global export
window.HandTracker = HandTracker;
