# 🎵 AR Virtual Harmonium (स)

An interactive, web-based Augmented Reality (AR) Indian Virtual Harmonium built with **HTML5**, **CSS3**, **JavaScript**, **Three.js**, and **MediaPipe Hands**.

Play classical Indian Sargam swaras (**Sa, Re, Ga, Ma, Pa, Dha, Ni, Ṡa**) directly in your camera view using AI finger tracking, or play using your keyboard or mouse!

---

## 🚀 How to Run

### Option 1: Using `npm run dev` (Recommended)

1. Open your terminal in this directory (`/Users/apple/Desktop/armo`).
2. Run:
   ```bash
   npm run dev
   ```
3. Open the URL in your browser:
   👉 **[http://localhost:3000](http://localhost:3000)**

*(No heavy `npm install` or external dependencies required — it uses Node's built-in HTTP engine!)*

---

## ✨ Features

- **Augmented Reality Webcam View**:
  - Displays a realistic 3D harmonium keyboard directly in your camera feed.
  - Horizontal mirror mode for natural, mirror-like interaction.
  - Camera opacity slider and multiple 3D perspective presets (*AR Lap View*, *3D Front View*, *Top View*).

- **MediaPipe AI Hand Tracking**:
  - Live 21-point hand landmark detection with glowing neon skeleton visualization.
  - Multi-finger tracking (Index, Middle, Ring, Pinky, and Thumb).
  - Exponential moving-average coordinate smoothing to eliminate hand jitter.
  - Touch/Hover key strike detection, with support for multi-touch chords and two-handed playing.

- **Realistic Acoustic Harmonium Sound Engine (Web Audio API)**:
  - **Dual Reed Bank (Male + Female Reeds)**: Authentic beating/chorusing (+3.2 cents detuning).
  - **Wooden Resonator Formant Filter**: Simulates the acoustic resonant cavity of a teak/rosewood harmonium cabinet.
  - **Bellows Air Simulation**: Air pressure reservoir, reed breath noise, and gentle attack/release envelopes.
  - **Tanpura / Sur Drone**: Built-in Sa-Pa classical drone accompaniment for a concert-like experience.
  - **Scale Transposition**: Switch between *Safed 1 (C4)*, *Kali 1 (C#4)*, *Safed 2 (D4)*, and *Kali 2 (D#4)*.

- **Sargam Music Practice Mode**:
  - 7 interactive lessons and songs:
    1. *Aaroh & Avroh (आरोह - अवरोह)* - Basic Bilawal scale
    2. *Alankar 1: Double Notes (जोड़े स्वर)* - Sa Sa, Re Re...
    3. *Alankar 2: Swara Pairs (स्वर युग्म)* - Sa Re, Re Ga...
    4. *Alankar 3: Triplets (त्रिक अलंकार)* - Sa Re Ga, Re Ga Ma...
    5. *Bhajan: Raghupati Raghav Raja Ram (रघुपति राघव)*
    6. *Melodic Tune: Twinkle Star*
    7. *Aarti: Om Jai Jagdish Hare (ॐ जय जगदीश)*
  - Visual target key beacon glowing in green/gold on the 3D harmonium.
  - Real-time note validation with positive reinforcement toasts (*"Sahi! Perfect!"*).
  - Score counter, streak combo multiplier, progress bar, metronome, and lesson completion celebration.

- **Performance Recorder & Exporter**:
  - Record performance with live timer and pulsing indicator.
  - Synchronized 3D playback (keys physically depress in sync with the audio).
  - Download high-fidelity audio (`.webm` / `.wav`).
  - Download recorded Sargam music sheet (`.json`).

- **Computer Keyboard & Mouse Fallback**:
  - Playable anytime even without a webcam or in low light.

---

## 🎹 Keyboard Controls

| Keyboard Key | Indian Sargam | Western Note | Devanagari |
|---|---|---|---|
| `A` or `1` | Sa (Shuddha) | C4 | सा |
| `W` | re (Komal) | C#4 | रे़ |
| `S` or `2` | Re (Shuddha) | D4 | रे |
| `E` | ga (Komal) | D#4 | ग़ |
| `D` or `3` | Ga (Shuddha) | E4 | ग |
| `F` or `4` | Ma (Shuddha) | F4 | म |
| `T` | Ma' (Tivra) | F#4 | म॑ |
| `G` or `5` | Pa | G4 | प |
| `Y` | dha (Komal) | G#4 | ध़ |
| `H` or `6` | Dha (Shuddha) | A4 | ध |
| `U` | ni (Komal) | A#4 | नि़ |
| `J` or `7` | Ni (Shuddha) | B4 | नि |
| `K` or `8` | Ṡa (Tar Saptak) | C5 | सां |

---

## 🛠️ Technology Stack

- **Three.js (r128)**: 3D procedural woodgrain materials, key pivot kinematics, particle systems, and AR raycasting.
- **MediaPipe Hands**: Real-time AI hand landmark detection (21 3D points per hand).
- **Web Audio API**: Additive dual-reed synthesis, formant filtering, noise generation, and dynamics compression.
- **HTML5 & CSS3**: Glassmorphic UI with Indian Classical aesthetic.
