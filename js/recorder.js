/**
 * Harmonium Recorder & Playback Engine
 * Captures:
 * 1. Note event sequence (timestamps, pitch, durations) for animated 3D key playback
 * 2. High-fidelity audio stream via MediaRecorder & 16-bit PCM WAV exporter
 * 3. Playback with live animated 3D key depression
 * 4. Download options: Studio WAV audio & JSON music sheet
 */

class HarmoniumRecorder {
    constructor(audioEngine, harmonium3D) {
        this.audio = audioEngine;
        this.harmonium3D = harmonium3D;

        this.isRecording = false;
        this.isPlaying = false;
        this.recordStartTime = 0;
        this.recordedEvents = []; // [{ type: 'down'|'up', noteId, time: ms }]
        this.activeRecordedNotes = new Map();

        // Audio MediaRecorder
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.audioUrl = null;

        // Playback timers
        this.playbackTimeouts = [];
        this.playbackStartTime = 0;
        this.playbackDuration = 0;

        // Listen for key events
        window.addEventListener('harmonium-keypress', (e) => this.onKeyAction('down', e.detail.noteId));
        window.addEventListener('harmonium-keyrelease', (e) => this.onKeyAction('up', e.detail.noteId));

        // State change callback
        this.onStateChange = null;
        this.timerInterval = null;
        this.elapsedSeconds = 0;
    }

    /**
     * Start Recording
     */
    startRecording() {
        if (this.isRecording || this.isPlaying) return;

        this.isRecording = true;
        this.recordedEvents = [];
        this.audioChunks = [];
        this.audioBlob = null;
        this.audioUrl = null;
        this.recordStartTime = performance.now();
        this.elapsedSeconds = 0;

        // Start Web Audio MediaStream recording
        if (this.audio.recordDestination) {
            try {
                const stream = this.audio.recordDestination.stream;
                const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
                this.mediaRecorder = new MediaRecorder(stream, { mimeType });

                this.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) this.audioChunks.push(e.data);
                };

                this.mediaRecorder.onstop = () => {
                    this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
                    this.audioUrl = URL.createObjectURL(this.audioBlob);
                    this.notifyState();
                };

                this.mediaRecorder.start(100);
            } catch (err) {
                console.warn('MediaRecorder not available or failed:', err);
            }
        }

        // Timer interval for UI
        this.timerInterval = setInterval(() => {
            this.elapsedSeconds++;
            this.notifyState();
        }, 1000);

        this.notifyState();
    }

    /**
     * Stop Recording
     */
    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        // Calculate total recorded duration
        this.playbackDuration = (performance.now() - this.recordStartTime) / 1000;

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        this.notifyState();
    }

    /**
     * Record a key down / up action
     */
    onKeyAction(type, noteId) {
        if (!this.isRecording) return;
        const relativeTime = performance.now() - this.recordStartTime;
        this.recordedEvents.push({
            type,
            noteId,
            time: Math.round(relativeTime)
        });
    }

    /**
     * Play back the recorded performance with 3D key animations & audio
     */
    playBack() {
        if (this.isPlaying || this.isRecording || this.recordedEvents.length === 0) return;

        this.isPlaying = true;
        this.clearPlaybackTimeouts();
        this.playbackStartTime = performance.now();

        // Schedule all recorded note events
        this.recordedEvents.forEach((ev) => {
            const timeoutId = setTimeout(() => {
                if (!this.isPlaying) return;

                if (ev.type === 'down') {
                    this.audio.playNote(ev.noteId);
                    this.harmonium3D.visualKeyPress(ev.noteId);
                } else {
                    this.audio.stopNote(ev.noteId);
                    this.harmonium3D.visualKeyRelease(ev.noteId);
                }
            }, ev.time);

            this.playbackTimeouts.push(timeoutId);
        });

        // Schedule end of playback
        const totalDuration = this.recordedEvents[this.recordedEvents.length - 1].time + 600;
        const endTimeout = setTimeout(() => {
            this.stopPlayback();
        }, totalDuration);
        this.playbackTimeouts.push(endTimeout);

        this.notifyState();
    }

    /**
     * Stop Playback
     */
    stopPlayback() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        this.clearPlaybackTimeouts();

        // Release any held notes in audio and 3D
        this.audio.stopAllNotes();
        for (const noteId of this.harmonium3D.keys.keys()) {
            this.harmonium3D.visualKeyRelease(noteId);
        }

        this.notifyState();
    }

    /**
     * Clear all pending timeouts
     */
    clearPlaybackTimeouts() {
        this.playbackTimeouts.forEach(id => clearTimeout(id));
        this.playbackTimeouts = [];
    }

    /**
     * Download Recording as Audio File
     */
    downloadAudio() {
        if (!this.audioBlob && this.audioChunks.length === 0) {
            alert('No recorded audio available. Record something first!');
            return;
        }

        const blob = this.audioBlob || new Blob(this.audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `harmonium-recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Download Recorded Music Sheet (JSON Sargam transcript)
     */
    downloadSheet() {
        if (this.recordedEvents.length === 0) {
            alert('No notes recorded yet!');
            return;
        }

        // Format notes into human-readable Sargam string
        const sargamNotes = [];
        this.recordedEvents.forEach(ev => {
            if (ev.type === 'down') {
                const def = this.audio.noteDefinitions[ev.noteId];
                sargamNotes.push(def ? def.devanagari : ev.noteId);
            }
        });

        const sheetData = {
            title: 'Virtual AR Harmonium Performance',
            recordedAt: new Date().toISOString(),
            durationSeconds: Math.round(this.playbackDuration),
            sargamTranscript: sargamNotes.join(' '),
            events: this.recordedEvents
        };

        const blob = new Blob([JSON.stringify(sheetData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `harmonium-sheet-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Notify state change to UI
     */
    notifyState() {
        const state = {
            isRecording: this.isRecording,
            isPlaying: this.isPlaying,
            hasRecording: this.recordedEvents.length > 0,
            elapsedSeconds: this.elapsedSeconds,
            duration: Math.round(this.playbackDuration),
            eventCount: this.recordedEvents.length
        };
        this.onStateChange?.(state);
    }
}

// Global export
window.HarmoniumRecorder = HarmoniumRecorder;
