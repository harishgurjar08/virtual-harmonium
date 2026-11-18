/**
 * Harmonium Practice Mode & Sargam Interactive Tutor
 * Features:
 * - Structured Indian Classical Alankars and popular melodies
 * - Visual target key beacon on 3D harmonium
 * - Real-time note validation with positive reinforcement feedback
 * - Progress bar, accuracy score, and streak combo
 * - Metronome / Tempo guide
 */

class HarmoniumPractice {
    constructor(harmonium3D, audioEngine) {
        this.harmonium3D = harmonium3D;
        this.audio = audioEngine;

        this.isActive = false;
        this.currentLessonIndex = 0;
        this.currentNoteIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.correctCount = 0;
        this.totalAttemptCount = 0;

        // Metronome
        this.metronomeActive = false;
        this.bpm = 72;
        this.metronomeTimer = null;

        // Built-in Lessons & Songs library
        this.lessons = [
            {
                id: 'aaroh_avroh',
                title: '1. Aaroh & Avroh (आरोह - अवरोह)',
                category: 'Basics',
                description: 'The fundamental ascending and descending Bilawal scale.',
                notes: [
                    'Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni', 'Sa_t',
                    'Sa_t', 'Ni', 'Dha', 'Pa', 'Ma', 'Ga', 'Re', 'Sa'
                ]
            },
            {
                id: 'alankar_1',
                title: '2. Alankar 1: Double Notes (जोड़े स्वर)',
                category: 'Alankar',
                description: 'Practice finger control with doubled notes.',
                notes: [
                    'Sa', 'Sa', 'Re', 'Re', 'Ga', 'Ga', 'Ma', 'Ma',
                    'Pa', 'Pa', 'Dha', 'Dha', 'Ni', 'Ni', 'Sa_t', 'Sa_t',
                    'Sa_t', 'Sa_t', 'Ni', 'Ni', 'Dha', 'Dha', 'Pa', 'Pa',
                    'Ma', 'Ma', 'Ga', 'Ga', 'Re', 'Re', 'Sa', 'Sa'
                ]
            },
            {
                id: 'alankar_2',
                title: '3. Alankar 2: Swara Pairs (स्वर युग्म)',
                category: 'Alankar',
                description: 'Smooth transitions across step pairs.',
                notes: [
                    'Sa', 'Re', 'Re', 'Ga', 'Ga', 'Ma', 'Ma', 'Pa',
                    'Pa', 'Dha', 'Dha', 'Ni', 'Ni', 'Sa_t',
                    'Sa_t', 'Ni', 'Ni', 'Dha', 'Dha', 'Pa', 'Pa', 'Ma',
                    'Ma', 'Ga', 'Ga', 'Re', 'Re', 'Sa'
                ]
            },
            {
                id: 'alankar_3',
                title: '4. Alankar 3: Triplets (त्रिक अलंकार)',
                category: 'Alankar',
                description: 'Three-note phrases for agility.',
                notes: [
                    'Sa', 'Re', 'Ga', 'Re', 'Ga', 'Ma', 'Ga', 'Ma', 'Pa',
                    'Ma', 'Pa', 'Dha', 'Pa', 'Dha', 'Ni', 'Dha', 'Ni', 'Sa_t'
                ]
            },
            {
                id: 'raghupati_raghav',
                title: '5. Bhajan: Raghupati Raghav (रघुपति राघव)',
                category: 'Song',
                description: 'Iconic devotional bhajan melody.',
                notes: [
                    'Sa', 'Sa', 'Sa', 'Re', 'Ga', 'Ga', 'Re', 'Ga',
                    'Ma', 'Ga', 'Re', 'Ga', 'Re', 'Sa',
                    'Ga', 'Ga', 'Ma', 'Pa', 'Pa', 'Dha', 'Pa', 'Ma',
                    'Ga', 'Ma', 'Pa', 'Ma', 'Ga', 'Re', 'Sa'
                ]
            },
            {
                id: 'twinkle',
                title: '6. Melodic Tune: Twinkle Star',
                category: 'Song',
                description: 'Simple international melody transposed to Sargam.',
                notes: [
                    'Sa', 'Sa', 'Pa', 'Pa', 'Dha', 'Dha', 'Pa',
                    'Ma', 'Ma', 'Ga', 'Ga', 'Re', 'Re', 'Sa',
                    'Pa', 'Pa', 'Ma', 'Ma', 'Ga', 'Ga', 'Re',
                    'Pa', 'Pa', 'Ma', 'Ma', 'Ga', 'Ga', 'Re',
                    'Sa', 'Sa', 'Pa', 'Pa', 'Dha', 'Dha', 'Pa',
                    'Ma', 'Ma', 'Ga', 'Ga', 'Re', 'Re', 'Sa'
                ]
            },
            {
                id: 'om_jai_jagdish',
                title: '7. Aarti: Om Jai Jagdish (ॐ जय जगदीश)',
                category: 'Song',
                description: 'Beloved evening prayer opening theme.',
                notes: [
                    'Sa', 'Sa', 'Re', 'Ga', 'Ga', 'Ga', 'Re', 'Ga',
                    'Re', 'Sa', 'Re', 'Re', 'Ga', 'Ma', 'Ga', 'Re', 'Sa'
                ]
            }
        ];

        // Listen for global keypress event from handTracker or keyboard
        this.boundKeyHandler = (e) => this.onKeyPlayed(e.detail.noteId);
        window.addEventListener('harmonium-keypress', this.boundKeyHandler);

        // UI update callback
        this.onStateChange = null;
    }

    /**
     * Start Practice Mode
     */
    start(lessonIndex = 0) {
        this.isActive = true;
        this.currentLessonIndex = lessonIndex;
        this.currentNoteIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.correctCount = 0;
        this.totalAttemptCount = 0;

        const currentLesson = this.getCurrentLesson();
        if (currentLesson) {
            const targetNote = currentLesson.notes[0];
            this.harmonium3D.setTargetKeyHighlight(targetNote);
        }

        this.notifyState();
    }

    /**
     * Stop Practice Mode and return to free play
     */
    stop() {
        this.isActive = false;
        this.harmonium3D.setTargetKeyHighlight(null);
        this.stopMetronome();
        this.notifyState();
    }

    /**
     * Get active lesson object
     */
    getCurrentLesson() {
        return this.lessons[this.currentLessonIndex] || null;
    }

    /**
     * Get current target note ID
     */
    getTargetNoteId() {
        const lesson = this.getCurrentLesson();
        if (!lesson || !this.isActive) return null;
        return lesson.notes[this.currentNoteIndex] || null;
    }

    /**
     * Called whenever user strikes a note (via finger tracking, mouse, or keyboard)
     */
    onKeyPlayed(playedNoteId) {
        if (!this.isActive) return;

        const currentLesson = this.getCurrentLesson();
        if (!currentLesson) return;

        const targetNoteId = currentLesson.notes[this.currentNoteIndex];
        this.totalAttemptCount++;

        if (playedNoteId === targetNoteId) {
            // Correct note hit!
            this.correctCount++;
            this.streak++;
            this.score += 100 + (this.streak * 10);

            // Audio celebration chirp or subtle sparkle
            this.notifyFeedback(true, 'Sahi! Perfect!', playedNoteId);

            // Advance to next note
            this.currentNoteIndex++;

            if (this.currentNoteIndex >= currentLesson.notes.length) {
                // Completed the lesson!
                this.onLessonComplete();
            } else {
                const nextTarget = currentLesson.notes[this.currentNoteIndex];
                this.harmonium3D.setTargetKeyHighlight(nextTarget);
            }
        } else {
            // Wrong note
            this.streak = 0;
            const targetDef = this.audio.noteDefinitions[targetNoteId];
            const msg = `Try ${targetDef?.devanagari || targetNoteId} (${targetNoteId})`;
            this.notifyFeedback(false, msg, playedNoteId);
        }

        this.notifyState();
    }

    /**
     * Finished entire lesson
     */
    onLessonComplete() {
        this.harmonium3D.setTargetKeyHighlight(null);
        const accuracy = Math.round((this.correctCount / Math.max(1, this.totalAttemptCount)) * 100);

        this.notifyState({
            completed: true,
            accuracy: accuracy,
            score: this.score
        });
    }

    /**
     * Advance to next lesson
     */
    nextLesson() {
        const nextIdx = (this.currentLessonIndex + 1) % this.lessons.length;
        this.start(nextIdx);
    }

    /**
     * Restart current lesson
     */
    restartCurrent() {
        this.start(this.currentLessonIndex);
    }

    /**
     * Toggle Metronome
     */
    toggleMetronome() {
        this.metronomeActive = !this.metronomeActive;
        if (this.metronomeActive) {
            this.startMetronome();
        } else {
            this.stopMetronome();
        }
        return this.metronomeActive;
    }

    /**
     * Start Metronome rhythm clicks
     */
    startMetronome() {
        this.stopMetronome();
        const interval = (60 / this.bpm) * 1000;
        this.metronomeTimer = setInterval(() => {
            this.playMetronomeClick();
        }, interval);
    }

    /**
     * Stop Metronome
     */
    stopMetronome() {
        if (this.metronomeTimer) {
            clearInterval(this.metronomeTimer);
            this.metronomeTimer = null;
        }
    }

    /**
     * Metronome click sound via Web Audio API
     */
    playMetronomeClick() {
        if (!this.audio || !this.audio.ctx) return;
        try {
            const ctx = this.audio.ctx;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

            osc.connect(gain);
            gain.connect(this.audio.masterGain || ctx.destination);

            osc.start(now);
            osc.stop(now + 0.05);

            window.dispatchEvent(new CustomEvent('metronome-tick'));
        } catch (e) {}
    }

    /**
     * Dispatch state change to UI
     */
    notifyState(extra = {}) {
        const lesson = this.getCurrentLesson();
        const targetId = this.getTargetNoteId();
        const targetDef = targetId ? this.audio.noteDefinitions[targetId] : null;

        // Preview next 3 upcoming notes
        const upcoming = [];
        if (lesson && this.isActive) {
            for (let i = 1; i <= 4; i++) {
                const noteId = lesson.notes[this.currentNoteIndex + i];
                if (noteId) {
                    upcoming.push({
                        id: noteId,
                        def: this.audio.noteDefinitions[noteId]
                    });
                }
            }
        }

        const state = {
            isActive: this.isActive,
            lesson: lesson,
            noteIndex: this.currentNoteIndex,
            totalNotes: lesson ? lesson.notes.length : 0,
            targetNote: targetDef,
            upcomingNotes: upcoming,
            score: this.score,
            streak: this.streak,
            progress: lesson ? (this.currentNoteIndex / lesson.notes.length) : 0,
            metronomeActive: this.metronomeActive,
            ...extra
        };

        this.onStateChange?.(state);
    }

    /**
     * Dispatch visual feedback toast
     */
    notifyFeedback(isCorrect, message, noteId) {
        window.dispatchEvent(new CustomEvent('practice-feedback', {
            detail: { isCorrect, message, noteId }
        }));
    }
}

// Global export
window.HarmoniumPractice = HarmoniumPractice;
