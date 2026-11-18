/**
 * Harmonium Audio Engine
 * Realistic Indian Harmonium multi-reed acoustic synthesizer using Web Audio API.
 * Features:
 * - Dual reed bank (Male + Female / Bass + Treble reeds) with authentic beating/detuning
 * - Wooden resonator cabinet formant filtering
 * - Bellows air pressure simulation with subtle reed breath noise
 * - Classical Tanpura (Sur) drone generator (Sa - Pa accompaniment)
 * - Master compression/limiting to prevent distortion on chords
 * - Audio recording and PCM WAV export
 */

class HarmoniumAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.compressor = null;
        this.recordDestination = null;
        this.isMuted = false;
        this.volume = 0.8;

        // Bellows simulation
        this.bellowsMode = 'auto'; // 'auto' or 'manual'
        this.bellowsPressure = 1.0; // 0.0 to 1.0
        this.bellowsDecayRate = 0.08; // air loss per active note per second

        // Active note voices map: noteId -> voice object
        this.activeVoices = new Map();

        // Drone / Tanpura state
        this.droneActive = false;
        this.droneVoices = [];
        this.droneGain = null;

        // Base scale tuning (Safed 1 / C4 is standard base Sa)
        this.baseRoot = 'C4';
        this.referencePitchA4 = 440;

        // Frequencies for standard Saptak (octave 4 & 5)
        // Shuddha & Vikrit (Komal/Tivra) swaras
        this.noteDefinitions = {
            'Sa':   { name: 'Sa',   devanagari: 'सा',  western: 'C4',  midi: 60, freq: 261.63, isBlack: false },
            're':   { name: 're',   devanagari: 'रे़', western: 'C#4', midi: 61, freq: 277.18, isBlack: true,  type: 'komal' },
            'Re':   { name: 'Re',   devanagari: 'रे',  western: 'D4',  midi: 62, freq: 293.66, isBlack: false },
            'ga':   { name: 'ga',   devanagari: 'ग़', western: 'D#4', midi: 63, freq: 311.13, isBlack: true,  type: 'komal' },
            'Ga':   { name: 'Ga',   devanagari: 'ग',  western: 'E4',  midi: 64, freq: 329.63, isBlack: false },
            'Ma':   { name: 'Ma',   devanagari: 'म',  western: 'F4',  midi: 65, freq: 349.23, isBlack: false },
            'Ma_t': { name: "Ma'",  devanagari: 'म॑', western: 'F#4', midi: 66, freq: 369.99, isBlack: true,  type: 'tivra' },
            'Pa':   { name: 'Pa',   devanagari: 'प',  western: 'G4',  midi: 67, freq: 392.00, isBlack: false },
            'dha':  { name: 'dha',  devanagari: 'ध़', western: 'G#4', midi: 68, freq: 415.30, isBlack: true,  type: 'komal' },
            'Dha':  { name: 'Dha',  devanagari: 'ध',  western: 'A4',  midi: 69, freq: 440.00, isBlack: false },
            'ni':   { name: 'ni',   devanagari: 'नि़', western: 'A#4', midi: 70, freq: 466.16, isBlack: true,  type: 'komal' },
            'Ni':   { name: 'Ni',   devanagari: 'नि',  western: 'B4',  midi: 71, freq: 493.88, isBlack: false },
            'Sa_t': { name: 'Ṡa',   devanagari: 'सां', western: 'C5',  midi: 72, freq: 523.25, isBlack: false }
        };

        // Simplified 8-note Saptak sequence (Sa Re Ga Ma Pa Dha Ni Ṡa)
        this.primaryNotes = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni', 'Sa_t'];

        // Full 13-note chromatic saptak sequence
        this.fullScaleNotes = ['Sa', 're', 'Re', 'ga', 'Ga', 'Ma', 'Ma_t', 'Pa', 'dha', 'Dha', 'ni', 'Ni', 'Sa_t'];

        // Noise buffer for air breath simulation
        this.noiseBuffer = null;

        // Custom Reed options
        this.reedCoupler = true; // Male + Female reeds enabled
        this.tremoloEnabled = true; // Subtle reed beating
    }

    /**
     * Initialize Audio Context on user interaction
     */
    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        // Dynamics compressor to emulate acoustic wooden box compression and prevent clipping
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(20, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4.5, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.015, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

        // Master connect
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // MediaStream destination for recording
        this.recordDestination = this.ctx.createMediaStreamDestination();
        this.masterGain.connect(this.recordDestination);

        // Build noise buffer for reed air breath
        this.buildNoiseBuffer();

        // Setup Bellows animation loop
        this.startBellowsLoop();
    }

    /**
     * Unlock audio context if suspended
     */
    async resume() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    /**
     * Build 2 seconds of pink/white noise for air rush
     */
    buildNoiseBuffer() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Simple pinking filter
            b0 = 0.99765 * b0 + white * 0.0555179;
            b1 = 0.96300 * b1 + white * 0.0750759;
            b2 = 0.57000 * b2 + white * 0.1538520;
            data[i] = (b0 + b1 + b2 + white * 0.1) * 0.12;
        }
    }

    /**
     * Play a note by its key id (e.g. 'Sa', 'Re', 'Ga', etc.)
     * @param {string} noteId
     * @param {number} velocity 0.0 - 1.0
     * @returns {object|null}
     */
    playNote(noteId, velocity = 0.9) {
        if (!this.ctx) this.init();
        this.resume();

        const noteDef = this.noteDefinitions[noteId];
        if (!noteDef) return null;

        // If note is already active, don't re-trigger abruptly
        if (this.activeVoices.has(noteId)) {
            return this.activeVoices.get(noteId);
        }

        const now = this.ctx.currentTime;
        const freq = noteDef.freq;

        // Voice container
        const voice = {
            noteId,
            freq,
            oscillators: [],
            nodes: [],
            envelope: null,
            startTime: now,
            active: true
        };

        // Note Envelope
        const voiceGain = this.ctx.createGain();
        voiceGain.gain.setValueAtTime(0.0001, now);
        
        // Attack: Reeds take ~25-35ms to start vibrating as air rushes in
        const effectiveVelocity = Math.max(0.1, Math.min(1.0, velocity)) * (this.bellowsPressure * 0.7 + 0.3);
        const peakGain = 0.28 * effectiveVelocity;
        const attackTime = 0.035;
        voiceGain.gain.exponentialRampToValueAtTime(peakGain, now + attackTime);
        voice.envelope = voiceGain;

        // --- REED 1: Male / Bass Reed (Rich Sawtooth with warm body) ---
        const maleOsc = this.ctx.createOscillator();
        maleOsc.type = 'sawtooth';
        maleOsc.frequency.setValueAtTime(freq, now);

        const maleFilter = this.ctx.createBiquadFilter();
        maleFilter.type = 'lowpass';
        maleFilter.frequency.setValueAtTime(1400, now);
        maleFilter.Q.setValueAtTime(1.8, now);

        const maleGain = this.ctx.createGain();
        maleGain.gain.setValueAtTime(0.85, now);

        maleOsc.connect(maleFilter);
        maleFilter.connect(maleGain);
        maleGain.connect(voiceGain);

        voice.oscillators.push(maleOsc);
        voice.nodes.push(maleFilter, maleGain);

        // --- REED 2: Female / Treble Reed (Detuned unison / octave coupler for rich shimmer) ---
        if (this.reedCoupler) {
            const femaleOsc = this.ctx.createOscillator();
            femaleOsc.type = 'sawtooth';
            // Detune slightly by +3.2 cents for classic harmonium natural chorus/beating
            femaleOsc.frequency.setValueAtTime(freq, now);
            femaleOsc.detune.setValueAtTime(3.2, now);

            const femaleFilter = this.ctx.createBiquadFilter();
            femaleFilter.type = 'bandpass';
            femaleFilter.frequency.setValueAtTime(1100, now);
            femaleFilter.Q.setValueAtTime(1.2, now);

            const femaleGain = this.ctx.createGain();
            femaleGain.gain.setValueAtTime(0.55, now);

            femaleOsc.connect(femaleFilter);
            femaleFilter.connect(femaleGain);
            femaleGain.connect(voiceGain);

            voice.oscillators.push(femaleOsc);
            voice.nodes.push(femaleFilter, femaleGain);

            // Optional subtle Octave Reed for fuller resonance
            const octOsc = this.ctx.createOscillator();
            octOsc.type = 'triangle';
            octOsc.frequency.setValueAtTime(freq * 2, now);
            octOsc.detune.setValueAtTime(-2.0, now);

            const octGain = this.ctx.createGain();
            octGain.gain.setValueAtTime(0.18, now);

            octOsc.connect(octGain);
            octGain.connect(voiceGain);

            voice.oscillators.push(octOsc);
            voice.nodes.push(octGain);
        }

        // --- AIR NOISE: Subtle reed breath/wind rush ---
        if (this.noiseBuffer) {
            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = this.noiseBuffer;
            noiseNode.loop = true;

            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(freq * 1.5, now);
            noiseFilter.Q.setValueAtTime(2.5, now);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.018 * effectiveVelocity, now);

            noiseNode.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(voiceGain);

            voice.oscillators.push(noiseNode);
            voice.nodes.push(noiseFilter, noiseGain);
        }

        // --- WOODEN BODY FORMANT FILTER ---
        // Simulates the acoustic resonant wooden cavity of the harmonium cabinet
        const bodyFilter = this.ctx.createBiquadFilter();
        bodyFilter.type = 'peaking';
        bodyFilter.frequency.setValueAtTime(820, now);
        bodyFilter.gain.setValueAtTime(3.5, now);
        bodyFilter.Q.setValueAtTime(1.2, now);

        voiceGain.connect(bodyFilter);
        bodyFilter.connect(this.compressor);
        voice.nodes.push(bodyFilter);

        // Start all oscillators
        voice.oscillators.forEach(osc => osc.start(now));

        // Store active voice
        this.activeVoices.set(noteId, voice);
        return voice;
    }

    /**
     * Stop playing a note with realistic reed release
     * @param {string} noteId
     */
    stopNote(noteId) {
        if (!this.ctx || !this.activeVoices.has(noteId)) return;

        const voice = this.activeVoices.get(noteId);
        this.activeVoices.delete(noteId);

        const now = this.ctx.currentTime;
        const releaseTime = 0.12; // 120ms gentle ringdown

        try {
            voice.envelope.gain.cancelScheduledValues(now);
            voice.envelope.gain.setValueAtTime(voice.envelope.gain.value, now);
            voice.envelope.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

            setTimeout(() => {
                voice.oscillators.forEach(osc => {
                    try { osc.stop(); osc.disconnect(); } catch (e) {}
                });
                voice.nodes.forEach(node => {
                    try { node.disconnect(); } catch (e) {}
                });
            }, releaseTime * 1000 + 50);
        } catch (e) {
            console.warn('Error stopping note voice:', e);
        }
    }

    /**
     * Stop all active notes
     */
    stopAllNotes() {
        const noteIds = Array.from(this.activeVoices.keys());
        noteIds.forEach(id => this.stopNote(id));
    }

    /**
     * Toggle or set Indian Tanpura / Sur Drone (Sa - Pa continuous drone)
     * @param {boolean|null} forceState
     */
    toggleDrone(forceState = null) {
        if (!this.ctx) this.init();
        this.resume();

        const targetState = forceState !== null ? forceState : !this.droneActive;
        if (targetState === this.droneActive) return this.droneActive;

        this.droneActive = targetState;

        if (this.droneActive) {
            this.startDrone();
        } else {
            this.stopDrone();
        }
        return this.droneActive;
    }

    /**
     * Start the meditative Indian Tanpura / Sur drone
     */
    startDrone() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.setValueAtTime(0.0001, now);
        this.droneGain.gain.exponentialRampToValueAtTime(0.16, now + 1.2);
        this.droneGain.connect(this.compressor);

        // Tanpura standard strings: Pa (low), Sa (mid), Sa (mid), Sa (lower octave)
        const strings = [
            { freq: 196.00, detune: -1.5, type: 'sawtooth', gain: 0.35 }, // Mandra Pa
            { freq: 261.63, detune: 2.0,  type: 'sawtooth', gain: 0.40 }, // Madhya Sa
            { freq: 261.63, detune: -2.5, type: 'triangle', gain: 0.35 }, // Madhya Sa detuned
            { freq: 130.81, detune: 0.0,  type: 'sawtooth', gain: 0.25 }  // Kharaj Sa (low drone)
        ];

        this.droneVoices = strings.map((str, index) => {
            const osc = this.ctx.createOscillator();
            osc.type = str.type;
            osc.frequency.setValueAtTime(str.freq, now);
            osc.detune.setValueAtTime(str.detune, now);

            // Filter for warm string resonance
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(650, now);

            // Subtle LFO modulation for swara oscillation (jawari / buzz)
            const lfo = this.ctx.createOscillator();
            lfo.frequency.setValueAtTime(0.35 + index * 0.12, now); // slow breathing pulse
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(str.gain * 0.3, now);
            lfo.connect(lfoGain.gain);

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(str.gain, now);

            osc.connect(filter);
            filter.connect(g);
            g.connect(this.droneGain);

            osc.start(now);
            lfo.start(now);

            return { osc, lfo, nodes: [filter, g, lfoGain] };
        });
    }

    /**
     * Stop the drone smoothly
     */
    stopDrone() {
        if (!this.ctx || !this.droneGain) return;
        const now = this.ctx.currentTime;
        this.droneGain.gain.cancelScheduledValues(now);
        this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
        this.droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

        const oldVoices = this.droneVoices;
        this.droneVoices = [];
        setTimeout(() => {
            oldVoices.forEach(v => {
                try {
                    v.osc.stop();
                    v.lfo.stop();
                    v.osc.disconnect();
                    v.lfo.disconnect();
                    v.nodes.forEach(n => n.disconnect());
                } catch (e) {}
            });
        }, 900);
    }

    /**
     * Set master volume (0.0 to 1.0)
     */
    setVolume(val) {
        this.volume = Math.max(0.0, Math.min(1.0, val));
        if (this.masterGain && this.ctx && !this.isMuted) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
        }
    }

    /**
     * Toggle mute state
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            const target = this.isMuted ? 0.0 : this.volume;
            this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
        }
        return this.isMuted;
    }

    /**
     * Pump the Bellows (Bhastrika / Dhokna)
     * In manual mode, pumping fills the air reservoir.
     */
    pumpBellows(amount = 0.35) {
        this.bellowsPressure = Math.min(1.0, this.bellowsPressure + amount);
        this.onBellowsPressureChange?.(this.bellowsPressure);
    }

    /**
     * Background bellows loop: in manual mode, air slowly leaks when playing keys.
     */
    startBellowsLoop() {
        let lastTime = performance.now();
        const loop = (time) => {
            const dt = (time - lastTime) / 1000;
            lastTime = time;

            if (this.bellowsMode === 'manual') {
                const activeCount = this.activeVoices.size;
                if (activeCount > 0) {
                    const leak = this.bellowsDecayRate * activeCount * dt;
                    this.bellowsPressure = Math.max(0.08, this.bellowsPressure - leak);
                    this.onBellowsPressureChange?.(this.bellowsPressure);
                }
            } else {
                // Auto mode stays full
                if (this.bellowsPressure < 1.0) {
                    this.bellowsPressure = Math.min(1.0, this.bellowsPressure + dt * 0.5);
                    this.onBellowsPressureChange?.(this.bellowsPressure);
                }
            }

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    /**
     * Set scale root offset (Transpose)
     * e.g. 'C4' (Safed 1), 'C#4' (Kali 1), 'D4' (Safed 2), etc.
     */
    setScaleRoot(rootNote) {
        const rootOffsets = {
            'C4': 0,
            'C#4': 1,
            'D4': 2,
            'D#4': 3,
            'E4': 4,
            'F4': 5
        };
        const semitones = rootOffsets[rootNote] ?? 0;
        this.baseRoot = rootNote;

        // Base MIDI 60 is C4
        const baseMidis = {
            'Sa': 60, 're': 61, 'Re': 62, 'ga': 63, 'Ga': 64, 'Ma': 65,
            'Ma_t': 66, 'Pa': 67, 'dha': 68, 'Dha': 69, 'ni': 70, 'Ni': 71, 'Sa_t': 72
        };

        for (const [key, baseMidi] of Object.entries(baseMidis)) {
            const newMidi = baseMidi + semitones;
            const newFreq = 440 * Math.pow(2, (newMidi - 69) / 12);
            if (this.noteDefinitions[key]) {
                this.noteDefinitions[key].freq = newFreq;
                this.noteDefinitions[key].midi = newMidi;
            }
        }
    }
}

// Global instance export
window.HarmoniumAudio = HarmoniumAudio;
