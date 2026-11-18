# 🎵 AR Virtual Harmonium — Complete Features & Options Guide

An in-depth guide to all features, controls, sound architecture, and interaction modes available in the **AR Virtual Harmonium**.

---

## 📌 Table of Contents
1. [Overview & Concept](#1-overview--concept)
2. [Augmented Reality & Camera Controls](#2-augmented-reality--camera-controls)
3. [Harmonium Transparency & Display Modes](#3-harmonium-transparency--display-modes)
4. [AI Hand Tracking & Interaction (MediaPipe)](#4-ai-hand-tracking--interaction-mediapipe)
5. [Realistic Acoustic Harmonium Sound Engine](#5-realistic-acoustic-harmonium-sound-engine)
6. [Interactive Music Practice Mode (Sargam Tutor)](#6-interactive-music-practice-mode-sargam-tutor)
7. [Performance Recorder & Playback Engine](#7-performance-recorder--playback-engine)
8. [Computer Keyboard & Mouse Fallback Controls](#8-computer-keyboard--mouse-fallback-controls)
9. [Free Hosting & Deployment Guide](#9-free-hosting--deployment-guide)

---

## 1. Overview & Concept

The **AR Virtual Harmonium** transforms any modern web browser into a physical-free Indian classical musical instrument. 

- **No physical harmonium required:** All sounds and 3D graphics are generated on the fly.
- **Client-side performance:** Runs 100% in the user's browser with hardware acceleration (WebGL & Web Audio API) with zero server latency.
- **Bi-musical notation:** Supports both traditional Indian Classical Sargam (*Sa, Re, Ga, Ma, Pa, Dha, Ni, Ṡa* in Devanagari & Latin script) and Western notation (*C4, D4, E4...*).

---

## 2. Augmented Reality & Camera Controls

The application uses your computer or mobile webcam to overlay a realistic 3D harmonium keyboard onto your live video feed.

| Control | Location | What It Does |
|---|---|---|
| **`📷 Start AR Camera`** | Top Right Navbar | Starts the WebRTC video stream (`navigator.mediaDevices.getUserMedia`) and activates the MediaPipe AI hand tracking engine. Clicking again turns off the camera safely. |
| **`🪞 Mirror`** | Bottom Control Bar | Toggles horizontal video mirroring on/off. When mirrored (default), moving your right hand moves the hand on the right side of the screen, just like looking in a real mirror. |
| **`Cam` (Camera Opacity Slider)** | Bottom Control Bar | Adjusts webcam background brightness/opacity from **10% to 100%**. Lower it if you want to focus purely on the 3D harmonium, or raise it for a clear view of your surroundings. |
| **`Camera View` Preset Selector** | Bottom Control Bar | Offers 3 custom camera perspectives: <br>• **AR Lap View:** Slightly tilted downward, mimicking the natural view when looking at a harmonium placed in your lap or on a low table (*chowki*).<br>• **3D Front View:** Straight-on view, great for inspecting bellows and stop knobs.<br>• **Top View:** Direct birds-eye view of the keyboard. |

---

## 3. Harmonium Transparency & Display Modes

Designed specifically so that you can see your physical hands through the instrument while playing.

| Feature | Control | How to Use & Visual Effect |
|---|---|---|
| **AR Glass Mode** | **`🪟 Glass: ON/OFF`** Button | Toggles the entire harmonium between **Solid Teak Wood (100% Opacity)** and **Translucent Amber AR Glass (45% Opacity)**. In Glass Mode, your real webcam hands and background are visible directly behind the keys. |
| **Fine Opacity Slider** | **`Harm` Slider** | Smoothly adjusts the transparency of the harmonium cabinet, ivory keys, and bellows from **20% (Ultra-Translucent Glass)** to **100% (Solid Wood)**. |
| **Vertical Height Adjustment** | **`Pos` Slider** | Moves the 3D harmonium up or down on your screen. Allows you to align the virtual keyboard precisely with where you naturally rest your hands in front of the camera, preventing the instrument from blocking your chest or face. |
| **Keyboard Layout Selector** | **`Keyboard Layout` Dropdown** | Switch between two playing layouts:<br>• **8 Notes (Sa to Ṡa):** Wide, beginner-friendly keys covering the Bilawal Saptak (*Sa, Re, Ga, Ma, Pa, Dha, Ni, Ṡa*).<br>• **Full Harmonium (13 Keys):** Authentic chromatic harmonium layout with ivory white keys and raised ebony black keys (*re, ga, Ma', dha, ni*). |

---

## 4. AI Hand Tracking & Interaction (MediaPipe)

Powered by Google's **MediaPipe Hands** library, detecting 21 landmarks per hand in 3D real-time space.

### Key Capabilities
- **Multi-Finger Polyphony:** You can play with multiple fingers at the same time (index, middle, thumb, ring, pinky) or even play with both hands simultaneously to produce harmonium chords or swara combinations.
- **Top-Layer Hand Skeleton (`z-index: 5`):** The hand overlay canvas renders *above* the 3D harmonium, ensuring your hands and fingertips are never hidden beneath the keys.
- **Glowing Visual Markers:**
  - **Palm Mesh:** Soft translucent glowing amber web showing palm volume.
  - **Bones:** Neon gold/cyan bones with double-stroke outer glow.
  - **Joints:** Bright circular beads at all finger knuckles.
  - **Fingertips:** High-visibility circular reticles with floating Devanagari note badges (e.g., **सा**, **रे**) displaying the exact note being triggered.
- **Pixel-Perfect Alignment (`getCoverCoords`):** Automatically maps webcam coordinates to your display aspect ratio to eliminate letterboxing offset errors.
- **Jitter Filtering:** Uses exponential moving-average smoothing so notes don't flicker or re-trigger erratically.

---

## 5. Realistic Acoustic Harmonium Sound Engine

Harmoniums are free-reed aerophones. Rather than using simplistic synthetic beeps, the custom Web Audio API engine accurately reproduces the physics of an authentic Indian harmonium:

### Sound Architecture
1. **Dual Reed Bank (*Male + Female Reeds*):**
   - **Bass / Male Reed:** Rich sawtooth wave with warm body cavity low-pass filtering.
   - **Treble / Female Reed:** Slightly detuned by **+3.2 cents** to generate the signature acoustic "beating" chorus that gives Indian harmoniums their soulful, devotional sound.
2. **Acoustic Wooden Resonator Formant Filter:**
   - Peaking parametric bandpass filter centered around **820 Hz**, emulating the resonant wooden cabinet of teak and mahogany harmoniums.
3. **Bellows Dynamics & Reed Breath Noise:**
   - Subtle filtered pink noise simulates air rushing past metallic brass reeds upon key depression.
   - Realistic **35ms attack swell** (air accelerating the reed) and **120ms gentle ringdown** upon key release.
4. **Bellows Pressure Simulation:**
   - **Auto Mode:** Air reservoir remains full automatically.
   - **Manual Mode:** Air leaks slowly as notes are played. You can pump the bellows using the on-screen **`💨 Pump`** button or by pumping your left hand horizontally in front of the camera!
5. **Classical Tanpura (Sur) Drone (`🪕 Tanpura`):**
   - Built-in meditative continuous drone accompaniment sounding the traditional *Pa – Sa – Sa – Sa (low)* acoustic strings with gentle jawari buzz oscillation.
6. **Scale Tuning & Pitch Transposition:**
   - Switch standard root pitch using the **`Scale`** dropdown:
     - **C4 (Safed 1 / White 1)** — Standard default
     - **C#4 (Kali 1 / Black 1)** — Popular female vocal & bhajan scale
     - **D4 (Safed 2 / White 2)** — Standard male vocal scale
     - **D#4 (Kali 2 / Black 2)**

---

## 6. Interactive Music Practice Mode (Sargam Tutor)

Click **`🎓 Practice Mode`** to transform the AR Harmonium into an interactive music learning game.

### Built-in Curriculum
1. **Aaroh & Avroh (आरोह - अवरोह):** Ascending & descending Bilawal scale (*Sa Re Ga Ma Pa Dha Ni Ṡa ➔ Ṡa Ni Dha Pa Ma Ga Re Sa*).
2. **Alankar 1: Double Notes (जोड़े स्वर):** *Sa Sa, Re Re, Ga Ga, Ma Ma...*
3. **Alankar 2: Swara Pairs (स्वर युग्म):** *Sa Re, Re Ga, Ga Ma, Ma Pa...*
4. **Alankar 3: Triplets (त्रिक अलंकार):** *Sa Re Ga, Re Ga Ma, Ga Ma Pa...*
5. **Bhajan: Raghupati Raghav Raja Ram (रघुपति राघव):** Popular devotional melody.
6. **Melodic Tune: Twinkle Star:** Classic melody transposed into Indian Sargam.
7. **Aarti: Om Jai Jagdish Hare (ॐ जय जगदीश):** Traditional evening prayer theme.

### Practice HUD Features
- **Target Note Beacon:** The target note is displayed prominently with Devanagari (*सा*), English (*Sa*), and Western notation (*C4*).
- **3D Glowing Key Indicator:** The exact key you need to strike pulses with a luminous green/gold beacon on the 3D harmonium keyboard.
- **Upcoming Notes Queue:** Previews the next 4 notes in sequence so you can prepare your finger movements.
- **Real-Time Feedback:** Correct notes trigger positive feedback banners (*"Sahi! Perfect!"*) and audio sparkles.
- **Streak & Scoring:** Tracks consecutive correct notes with combo multipliers (**2x, 3x, 5x**).
- **Rhythmic Metronome (`⏱ Metronome`):** Generates steady click pulses to train rhythm and tempo.
- **Lesson Completion Celebration:** Displays a modal with star rating (**⭐⭐⭐**), accuracy percentage, and final score.

---

## 7. Performance Recorder & Playback Engine

Allows you to record your practice sessions or improvisations.

| Button | Function |
|---|---|
| **`⏺ Record`** | Starts recording both audio and note event timestamps. The red indicator pulses and the timer begins counting. |
| **`⏹ Stop Rec`** | Ends the current recording session. |
| **`▶ Play`** | Plays back your performance with authentic sound while **physically animating the 3D keys depressing in real-time synchronization**! |
| **`⬇ Audio`** | Downloads your recording as a high-fidelity `.webm` / `.wav` audio file directly to your computer. |
| **`📄 Sheet`** | Exports your recorded performance as a structured `.json` music sheet containing the Sargam transcript and precise event timestamps. |

---

## 8. Computer Keyboard & Mouse Fallback Controls

If you are in low lighting, do not have a webcam, or prefer physical typing, the application is 100% playable via keyboard and mouse:

### 8-Note Layout (Bilawal Saptak)
| Keyboard Key | Alternate Key | Indian Sargam | Western Note | Devanagari |
|:---:|:---:|:---:|:---:|:---:|
| `A` | `1` | Sa | C4 | सा |
| `S` | `2` | Re | D4 | रे |
| `D` | `3` | Ga | E4 | ग |
| `F` | `4` | Ma | F4 | म |
| `G` | `5` | Pa | G4 | प |
| `H` | `6` | Dha | A4 | ध |
| `J` | `7` | Ni | B4 | नि |
| `K` | `8` | Ṡa | C5 | सां |

### Full 13-Key Chromatic Harmonium Layout
| Key | Swara | Western | Type |
|:---:|:---:|:---:|:---:|
| `A` | Sa | C4 | Shuddha |
| `W` | re | C#4 | Komal (Flat) |
| `S` | Re | D4 | Shuddha |
| `E` | ga | D#4 | Komal (Flat) |
| `D` | Ga | E4 | Shuddha |
| `F` | Ma | F4 | Shuddha |
| `T` | Ma' | F#4 | Tivra (Sharp) |
| `G` | Pa | G4 | Shuddha |
| `Y` | dha | G#4 | Komal (Flat) |
| `H` | Dha | A4 | Shuddha |
| `U` | ni | A#4 | Komal (Flat) |
| `J` | Ni | B4 | Shuddha |
| `K` | Ṡa | C5 | Tar Saptak |

- **Mouse / Touch Drag:** You can also click or drag your mouse or touch on any key on the screen to play notes directly.

---

## 9. Free Hosting & Deployment Guide

Because the app is a pure client-side static web application with zero backend dependencies, it can be hosted **100% free with automatic SSL (HTTPS)** on any of the following platforms:

### Method 1: Netlify Drop (Fastest — 30 Seconds, No Git Required)
1. Open [app.netlify.com/drop](https://app.netlify.com/drop) in your browser.
2. Drag and drop the `armo` folder directly into the window.
3. You immediately receive a live public HTTPS link (e.g., `https://virtual-harmonium.netlify.app`).

### Method 2: Vercel CLI (1 Command)
Run from terminal inside `/Users/apple/Desktop/armo`:
```bash
npx vercel
```
Follow the 3 prompts to deploy your site live in under a minute.

### Method 3: GitHub Pages (Permanent & Portfolio-Friendly)
1. Initialize git and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial release of AR Virtual Harmonium"
   git branch -M main
   git remote add origin https://github.com/<your-username>/ar-harmonium.git
   git push -u origin main
   ```
2. In your GitHub repository, navigate to **Settings ➔ Pages**.
3. Under **Branch**, select `main` and root `/`, then click **Save**.
4. Your site will be live at `https://<your-username>.github.io/ar-harmonium/`.

---

*Enjoy playing, practicing, and performing with the AR Virtual Harmonium!*
