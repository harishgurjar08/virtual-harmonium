/**
 * Main Application Controller (AR Virtual Harmonium)
 * Binds UI, Audio, Three.js 3D Harmonium, Hand Tracking, Practice Mode, and Recorder.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Instantiate Core Subsystems
    const audio = new HarmoniumAudio();
    const harmoniumContainer = document.getElementById('harmonium-3d-container');
    const harmonium3D = new Harmonium3D(harmoniumContainer, audio);

    const videoEl = document.getElementById('webcam-video');
    const overlayCanvas = document.getElementById('hand-overlay-canvas');
    const handTracker = new HandTracker(videoEl, overlayCanvas, harmonium3D, audio);

    const practice = new HarmoniumPractice(harmonium3D, audio);
    const recorder = new HarmoniumRecorder(audio, harmonium3D);

    // Global reference for debugging
    window.app = { audio, harmonium3D, handTracker, practice, recorder };

    // 2. DOM Elements Cache
    const el = {
        // AR & Camera Controls
        btnToggleCamera: document.getElementById('btn-toggle-camera'),
        btnMirrorCamera: document.getElementById('btn-mirror-camera'),
        camOpacitySlider: document.getElementById('cam-opacity-slider'),
        cameraContainer: document.getElementById('camera-wrapper'),
        camStatusPill: document.getElementById('camera-status-pill'),
        handsStatusPill: document.getElementById('hands-status-pill'),
        viewSelector: document.getElementById('camera-view-select'),

        // Audio Controls
        volumeSlider: document.getElementById('volume-slider'),
        btnMute: document.getElementById('btn-mute'),
        btnDrone: document.getElementById('btn-drone'),
        bellowsModeSelect: document.getElementById('bellows-mode-select'),
        bellowsPumpBtn: document.getElementById('btn-pump-bellows'),
        bellowsPressureBar: document.getElementById('bellows-pressure-fill'),
        scaleRootSelect: document.getElementById('scale-root-select'),

        // Layout Toggle (8 vs 13 keys)
        layoutSelect: document.getElementById('keyboard-layout-select'),

        // Harmonium Transparency & Position Controls
        btnGlassMode: document.getElementById('btn-glass-mode'),
        harmOpacitySlider: document.getElementById('harm-opacity-slider'),
        harmPosSlider: document.getElementById('harm-pos-slider'),

        // Practice Mode
        btnTogglePractice: document.getElementById('btn-toggle-practice'),
        practiceModal: document.getElementById('practice-modal'),
        lessonSelect: document.getElementById('lesson-select'),
        practiceHud: document.getElementById('practice-hud'),
        targetNoteDisplay: document.getElementById('target-note-display'),
        targetDevanagari: document.getElementById('target-devanagari'),
        targetWestern: document.getElementById('target-western'),
        upcomingNotesContainer: document.getElementById('upcoming-notes-list'),
        practiceScore: document.getElementById('practice-score-value'),
        practiceStreak: document.getElementById('practice-streak-value'),
        practiceProgressBar: document.getElementById('practice-progress-fill'),
        btnMetronome: document.getElementById('btn-metronome'),
        feedbackToast: document.getElementById('feedback-toast'),
        lessonCompleteModal: document.getElementById('lesson-complete-modal'),
        finalScoreVal: document.getElementById('final-score-val'),
        finalAccuracyVal: document.getElementById('final-accuracy-val'),
        btnNextLesson: document.getElementById('btn-next-lesson'),
        btnReplayLesson: document.getElementById('btn-replay-lesson'),

        // Recorder UI
        btnRecord: document.getElementById('btn-record'),
        btnPlayRecording: document.getElementById('btn-play-recording'),
        btnDownloadAudio: document.getElementById('btn-download-audio'),
        btnDownloadSheet: document.getElementById('btn-download-sheet'),
        recordTimer: document.getElementById('record-timer'),
        recordPulseDot: document.getElementById('record-pulse-dot'),

        // Help Modal
        btnHelp: document.getElementById('btn-help'),
        helpModal: document.getElementById('help-modal'),
        closeHelpBtn: document.getElementById('btn-close-help'),

        // Quick touch on screen indicator
        touchRayIndicator: document.getElementById('touch-indicator')
    };

    // 3. Audio & Volume Bindings
    if (el.volumeSlider) {
        el.volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            audio.setVolume(val);
        });
    }

    if (el.btnMute) {
        el.btnMute.addEventListener('click', () => {
            const isMuted = audio.toggleMute();
            el.btnMute.classList.toggle('active', isMuted);
            el.btnMute.innerHTML = isMuted ? '🔇 Unmute' : '🔊 Sound';
        });
    }

    // Drone / Tanpura Toggle
    if (el.btnDrone) {
        el.btnDrone.addEventListener('click', () => {
            const active = audio.toggleDrone();
            el.btnDrone.classList.toggle('active', active);
            el.btnDrone.innerHTML = active ? '🪕 Tanpura: ON' : '🪕 Tanpura: OFF';
        });
    }

    // Scale Root (Safed 1 / C4, Kali 1 / C#4, Safed 2 / D4)
    if (el.scaleRootSelect) {
        el.scaleRootSelect.addEventListener('change', (e) => {
            audio.setScaleRoot(e.target.value);
            // Rebuild harmonium labels
            harmonium3D.buildHarmoniumModel();
        });
    }

    // Bellows Mode
    if (el.bellowsModeSelect) {
        el.bellowsModeSelect.addEventListener('change', (e) => {
            audio.bellowsMode = e.target.value;
            if (el.bellowsPumpBtn) {
                el.bellowsPumpBtn.style.display = (audio.bellowsMode === 'manual') ? 'inline-flex' : 'none';
            }
        });
    }

    if (el.bellowsPumpBtn) {
        el.bellowsPumpBtn.addEventListener('click', () => {
            audio.pumpBellows(0.35);
        });
    }

    // Bellows Pressure feedback
    audio.onBellowsPressureChange = (pressure) => {
        if (el.bellowsPressureBar) {
            el.bellowsPressureBar.style.width = `${Math.round(pressure * 100)}%`;
            if (pressure < 0.25) {
                el.bellowsPressureBar.style.backgroundColor = '#ff4444';
            } else {
                el.bellowsPressureBar.style.backgroundColor = '#d4af37';
            }
        }
    };

    // 4. Keyboard Layout Selector (8 Saptak vs 13 Chromatic)
    if (el.layoutSelect) {
        el.layoutSelect.addEventListener('change', (e) => {
            const mode = e.target.value;
            harmonium3D.setLayoutMode(mode);
        });
    }

    // Harmonium Transparency / Opacity Slider
    if (el.harmOpacitySlider) {
        el.harmOpacitySlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            harmonium3D.setHarmoniumOpacity(val);
            if (el.btnGlassMode) {
                el.btnGlassMode.classList.toggle('active', harmonium3D.isGlassMode);
                el.btnGlassMode.innerHTML = harmonium3D.isGlassMode ? '🪟 Glass: ON' : '🪟 Glass: OFF';
            }
        });
    }

    // Harmonium Glass Mode Toggle Button
    if (el.btnGlassMode) {
        el.btnGlassMode.addEventListener('click', () => {
            const { isGlassMode, opacity } = harmonium3D.toggleGlassMode();
            el.btnGlassMode.classList.toggle('active', isGlassMode);
            el.btnGlassMode.innerHTML = isGlassMode ? '🪟 Glass: ON' : '🪟 Glass: OFF';
            if (el.harmOpacitySlider) {
                el.harmOpacitySlider.value = opacity;
            }
        });
    }

    // Harmonium Vertical Position Slider (Move harmonium up/down)
    if (el.harmPosSlider) {
        el.harmPosSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            harmonium3D.setHarmoniumVerticalPosition(val);
        });
    }

    // Camera Presets View Selector
    if (el.viewSelector) {
        el.viewSelector.addEventListener('change', (e) => {
            harmonium3D.setCameraView(e.target.value, true);
        });
    }

    // Camera Opacity Slider
    if (el.camOpacitySlider) {
        el.camOpacitySlider.addEventListener('input', (e) => {
            if (videoEl) videoEl.style.opacity = e.target.value;
        });
    }

    // Camera Mirror Toggle
    if (el.btnMirrorCamera) {
        el.btnMirrorCamera.addEventListener('click', () => {
            handTracker.isMirrored = !handTracker.isMirrored;
            videoEl.classList.toggle('mirrored', handTracker.isMirrored);
            el.btnMirrorCamera.classList.toggle('active', handTracker.isMirrored);
        });
    }

    // 5. Camera & Hand Tracking Toggle
    if (el.btnToggleCamera) {
        el.btnToggleCamera.addEventListener('click', async () => {
            // Audio unlock on user gesture
            audio.resume();

            if (handTracker.isRunning) {
                handTracker.stop();
                el.btnToggleCamera.innerHTML = '📷 Start AR Camera';
                el.btnToggleCamera.classList.remove('active');
                if (el.camStatusPill) {
                    el.camStatusPill.textContent = 'Camera: Off';
                    el.camStatusPill.className = 'status-pill off';
                }
            } else {
                try {
                    el.btnToggleCamera.innerHTML = '⏳ Starting Camera...';
                    el.btnToggleCamera.disabled = true;

                    await handTracker.start();

                    el.btnToggleCamera.innerHTML = '⏹ Stop Camera';
                    el.btnToggleCamera.classList.add('active');
                    el.btnToggleCamera.disabled = false;
                    if (el.camStatusPill) {
                        el.camStatusPill.textContent = 'Camera: Live';
                        el.camStatusPill.className = 'status-pill active';
                    }
                } catch (err) {
                    el.btnToggleCamera.disabled = false;
                    el.btnToggleCamera.innerHTML = '📷 Start AR Camera';
                    alert('Camera could not be started: ' + (err.message || 'Please allow webcam access. You can still play with Keyboard or Mouse!'));
                }
            }
        });
    }

    // Hand Count & Status Updates
    handTracker.onHandCountChange = (count) => {
        if (el.handsStatusPill) {
            if (count === 'loading') {
                el.handsStatusPill.textContent = 'AI Model: Loading...';
                el.handsStatusPill.className = 'status-pill idle';
            } else if (count === 0) {
                el.handsStatusPill.textContent = 'Hands: 0 (Show in view)';
                el.handsStatusPill.className = 'status-pill idle';
            } else {
                el.handsStatusPill.textContent = `Hands: ${count} Active`;
                el.handsStatusPill.className = 'status-pill active';
            }
        }
    };

    // 6. Practice Mode Integration
    // Populate lesson dropdown
    if (el.lessonSelect) {
        el.lessonSelect.innerHTML = practice.lessons.map((l, idx) =>
            `<option value="${idx}">${l.title}</option>`
        ).join('');

        el.lessonSelect.addEventListener('change', (e) => {
            if (practice.isActive) {
                practice.start(parseInt(e.target.value, 10));
            }
        });
    }

    // Toggle Practice Mode
    if (el.btnTogglePractice) {
        el.btnTogglePractice.addEventListener('click', () => {
            audio.resume();
            if (practice.isActive) {
                practice.stop();
                el.btnTogglePractice.innerHTML = '🎓 Practice Mode';
                el.btnTogglePractice.classList.remove('active');
                if (el.practiceHud) el.practiceHud.style.display = 'none';
            } else {
                const lessonIdx = el.lessonSelect ? parseInt(el.lessonSelect.value, 10) : 0;
                practice.start(lessonIdx);
                el.btnTogglePractice.innerHTML = '⏹ Exit Practice';
                el.btnTogglePractice.classList.add('active');
                if (el.practiceHud) el.practiceHud.style.display = 'flex';
            }
        });
    }

    // Metronome toggle
    if (el.btnMetronome) {
        el.btnMetronome.addEventListener('click', () => {
            audio.resume();
            const active = practice.toggleMetronome();
            el.btnMetronome.classList.toggle('active', active);
            el.btnMetronome.innerHTML = active ? '⏱ Metronome: ON' : '⏱ Metronome: OFF';
        });
    }

    // Practice State listener for UI updates
    practice.onStateChange = (state) => {
        if (!state.isActive) {
            if (el.practiceHud) el.practiceHud.style.display = 'none';
            return;
        }

        if (el.practiceHud) el.practiceHud.style.display = 'flex';

        // Target note
        if (state.targetNote) {
            if (el.targetDevanagari) el.targetDevanagari.textContent = state.targetNote.devanagari;
            if (el.targetWestern) el.targetWestern.textContent = `${state.targetNote.name} (${state.targetNote.western})`;
        }

        // Upcoming notes list
        if (el.upcomingNotesContainer) {
            el.upcomingNotesContainer.innerHTML = state.upcomingNotes.map(n =>
                `<span class="upcoming-badge">${n.def ? n.def.devanagari : n.id}</span>`
            ).join('');
        }

        // Score & Streak
        if (el.practiceScore) el.practiceScore.textContent = state.score;
        if (el.practiceStreak) el.practiceStreak.textContent = `${state.streak}x`;

        // Progress
        if (el.practiceProgressBar) {
            el.practiceProgressBar.style.width = `${Math.round(state.progress * 100)}%`;
        }

        // Lesson Completed celebration modal
        if (state.completed) {
            if (el.lessonCompleteModal) {
                el.lessonCompleteModal.style.display = 'flex';
                if (el.finalScoreVal) el.finalScoreVal.textContent = state.score;
                if (el.finalAccuracyVal) el.finalAccuracyVal.textContent = `${state.accuracy}%`;
            }
        }
    };

    // Practice feedback toast
    window.addEventListener('practice-feedback', (e) => {
        const { isCorrect, message } = e.detail;
        if (el.feedbackToast) {
            el.feedbackToast.textContent = message;
            el.feedbackToast.className = `feedback-toast show ${isCorrect ? 'correct' : 'wrong'}`;
            clearTimeout(el.feedbackToastTimer);
            el.feedbackToastTimer = setTimeout(() => {
                el.feedbackToast.className = 'feedback-toast';
            }, 1200);
        }
    });

    // Lesson complete modal buttons
    if (el.btnNextLesson) {
        el.btnNextLesson.addEventListener('click', () => {
            if (el.lessonCompleteModal) el.lessonCompleteModal.style.display = 'none';
            practice.nextLesson();
            if (el.lessonSelect) el.lessonSelect.value = practice.currentLessonIndex;
        });
    }

    if (el.btnReplayLesson) {
        el.btnReplayLesson.addEventListener('click', () => {
            if (el.lessonCompleteModal) el.lessonCompleteModal.style.display = 'none';
            practice.restartCurrent();
        });
    }

    // 7. Recorder UI Bindings
    if (el.btnRecord) {
        el.btnRecord.addEventListener('click', () => {
            audio.resume();
            if (recorder.isRecording) {
                recorder.stopRecording();
            } else {
                recorder.startRecording();
            }
        });
    }

    if (el.btnPlayRecording) {
        el.btnPlayRecording.addEventListener('click', () => {
            audio.resume();
            if (recorder.isPlaying) {
                recorder.stopPlayback();
            } else {
                recorder.playBack();
            }
        });
    }

    if (el.btnDownloadAudio) {
        el.btnDownloadAudio.addEventListener('click', () => recorder.downloadAudio());
    }

    if (el.btnDownloadSheet) {
        el.btnDownloadSheet.addEventListener('click', () => recorder.downloadSheet());
    }

    recorder.onStateChange = (state) => {
        if (el.btnRecord) {
            el.btnRecord.classList.toggle('recording', state.isRecording);
            el.btnRecord.innerHTML = state.isRecording ? '⏹ Stop Rec' : '⏺ Record';
        }

        if (el.recordPulseDot) {
            el.recordPulseDot.style.display = state.isRecording ? 'inline-block' : 'none';
        }

        if (el.recordTimer) {
            const mins = String(Math.floor(state.elapsedSeconds / 60)).padStart(2, '0');
            const secs = String(state.elapsedSeconds % 60).padStart(2, '0');
            el.recordTimer.textContent = `${mins}:${secs}`;
        }

        if (el.btnPlayRecording) {
            el.btnPlayRecording.disabled = !state.hasRecording || state.isRecording;
            el.btnPlayRecording.innerHTML = state.isPlaying ? '⏹ Stop' : '▶ Play';
            el.btnPlayRecording.classList.toggle('playing', state.isPlaying);
        }

        if (el.btnDownloadAudio) {
            el.btnDownloadAudio.disabled = !state.hasRecording || state.isRecording;
        }

        if (el.btnDownloadSheet) {
            el.btnDownloadSheet.disabled = !state.hasRecording || state.isRecording;
        }
    };

    // 8. Help Modal Toggle
    if (el.btnHelp) {
        el.btnHelp.addEventListener('click', () => {
            if (el.helpModal) el.helpModal.style.display = 'flex';
        });
    }

    if (el.closeHelpBtn) {
        el.closeHelpBtn.addEventListener('click', () => {
            if (el.helpModal) el.helpModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === el.helpModal) el.helpModal.style.display = 'none';
        if (e.target === el.lessonCompleteModal) el.lessonCompleteModal.style.display = 'none';
    });

    // 9. Physical Computer Keyboard Fallback (Play anytime with keys)
    // Mapping keys to Sargam
    const keyboardMap8 = {
        'KeyA': 'Sa',
        'KeyS': 'Re',
        'KeyD': 'Ga',
        'KeyF': 'Ma',
        'KeyG': 'Pa',
        'KeyH': 'Dha',
        'KeyJ': 'Ni',
        'KeyK': 'Sa_t',
        'Digit1': 'Sa',
        'Digit2': 'Re',
        'Digit3': 'Ga',
        'Digit4': 'Ma',
        'Digit5': 'Pa',
        'Digit6': 'Dha',
        'Digit7': 'Ni',
        'Digit8': 'Sa_t'
    };

    const keyboardMap13 = {
        'KeyA': 'Sa',
        'KeyW': 're',
        'KeyS': 'Re',
        'KeyE': 'ga',
        'KeyD': 'Ga',
        'KeyF': 'Ma',
        'KeyT': 'Ma_t',
        'KeyG': 'Pa',
        'KeyY': 'dha',
        'KeyH': 'Dha',
        'KeyU': 'ni',
        'KeyJ': 'Ni',
        'KeyK': 'Sa_t'
    };

    const activeKeyCodes = new Set();

    window.addEventListener('keydown', (e) => {
        // Prevent key repetition while holding key down
        if (e.repeat || activeKeyCodes.has(e.code)) return;
        // Don't intercept when user is typing in form inputs
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

        const map = harmonium3D.layoutMode === 'saptak8' ? keyboardMap8 : keyboardMap13;
        const noteId = map[e.code];

        if (noteId) {
            audio.resume();
            activeKeyCodes.add(e.code);
            audio.playNote(noteId);
            harmonium3D.visualKeyPress(noteId);

            window.dispatchEvent(new CustomEvent('harmonium-keypress', {
                detail: { noteId, source: 'keyboard' }
            }));
        }
    });

    window.addEventListener('keyup', (e) => {
        if (!activeKeyCodes.has(e.code)) return;
        activeKeyCodes.delete(e.code);

        const map = harmonium3D.layoutMode === 'saptak8' ? keyboardMap8 : keyboardMap13;
        const noteId = map[e.code];

        if (noteId) {
            audio.stopNote(noteId);
            harmonium3D.visualKeyRelease(noteId);

            window.dispatchEvent(new CustomEvent('harmonium-keyrelease', {
                detail: { noteId, source: 'keyboard' }
            }));
        }
    });

    // 10. Mouse / Touch Direct Interaction Fallback
    // Allows playing notes directly by clicking or touching keys on the 3D canvas
    let activePointerNote = null;

    const handlePointerAction = (clientX, clientY, isDown) => {
        const rect = harmoniumContainer.getBoundingClientRect();
        const normX = (clientX - rect.left) / rect.width;
        const normY = (clientY - rect.top) / rect.height;

        if (isDown) {
            audio.resume();
            const hitNoteId = harmonium3D.getKeyAtScreenCoords(normX, normY);
            if (hitNoteId && hitNoteId !== activePointerNote) {
                if (activePointerNote) {
                    audio.stopNote(activePointerNote);
                    harmonium3D.visualKeyRelease(activePointerNote);
                }
                activePointerNote = hitNoteId;
                audio.playNote(hitNoteId);
                harmonium3D.visualKeyPress(hitNoteId);

                window.dispatchEvent(new CustomEvent('harmonium-keypress', {
                    detail: { noteId: hitNoteId, source: 'mouse' }
                }));
            }
        } else {
            if (activePointerNote) {
                audio.stopNote(activePointerNote);
                harmonium3D.visualKeyRelease(activePointerNote);
                window.dispatchEvent(new CustomEvent('harmonium-keyrelease', {
                    detail: { noteId: activePointerNote, source: 'mouse' }
                }));
                activePointerNote = null;
            }
        }
    };

    harmoniumContainer.addEventListener('mousedown', (e) => {
        handlePointerAction(e.clientX, e.clientY, true);
    });

    harmoniumContainer.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) {
            handlePointerAction(e.clientX, e.clientY, true);
        }
    });

    window.addEventListener('mouseup', () => {
        handlePointerAction(0, 0, false);
    });

    // Touch events for mobile/tablet
    harmoniumContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            handlePointerAction(touch.clientX, touch.clientY, true);
        }
    }, { passive: true });

    harmoniumContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            handlePointerAction(touch.clientX, touch.clientY, true);
        }
    }, { passive: true });

    harmoniumContainer.addEventListener('touchend', () => {
        handlePointerAction(0, 0, false);
    });

    // Auto-prompt initial camera activation or user guide on first launch
    console.log('Virtual AR Harmonium initialized successfully.');
});
