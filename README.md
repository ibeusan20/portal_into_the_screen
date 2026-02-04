# Head‑tracked 3D (web) — Three.js + MediaPipe Face Landmarker

This project performs head‑tracking (translation + yaw/pitch) using your web camera and moves a 3D camera in a Three.js scene accordingly.

<img width="1857" height="976" alt="Screenshot 2026-02-04 004309" src="https://github.com/user-attachments/assets/75169757-b6f1-4c7b-a7a6-c328fed80b43" /> <img width="1854" height="976" alt="Screenshot 2026-02-04 004250" src="https://github.com/user-attachments/assets/85ac4a0f-2674-4502-9fc3-eb20cbc3a33d" />

## Prerequisites
- Node.js 18+ (recommendation: 20+)
- Browser: Chrome/Edge/Firefox (Chrome/Edge typically smoothest)

## Running (dev)
```bash
npm install
npm run dev
```
Opens a local address (e.g., http://localhost:5173).

**Important:** camera works only on `https` or `http://localhost`.

## Build/preview
```bash
npm run build
npm run preview
```
`preview` starts a server on the network (host), but camera still requires https if accessing from another device.

## House (glTF)
To use a real textured house model:
1. Place `house.glb` file in `public/models/house.glb`
2. Select "House (glTF if available)" in the UI

If the model is not found, the application automatically shows a procedural "house".

## Controls
- **Start camera**: requests camera permission
- **Calibrate (Space)**: set "neutral" position (when sitting upright)
- Sliders: movement strength, movement smoothing
