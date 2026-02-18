# Head‑tracked 3D (web) — Three.js + MediaPipe Face Landmarker

This project performs head‑tracking (translation + yaw/pitch) using your web camera and moves a 3D camera in a Three.js scene accordingly.

<img width="1841" height="946" alt="image" src="https://github.com/user-attachments/assets/53138e27-dd97-4ba0-93c2-f18d136b0e3f" />

<img width="1855" height="973" alt="image" src="https://github.com/user-attachments/assets/432a7099-c59b-48f0-8788-adc2684e5fd2" />

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
