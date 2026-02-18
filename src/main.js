import './style.css';

import { World } from './three/World.js';
import { RoomGrid } from './three/RoomGrid.js';
import { OrbitCameraController } from './three/OrbitCameraController.js';
import { FaceTracker } from './tracking/FaceTracker.js';
import { HudController } from './ui/HudController.js';
import { AssetCache } from './three/AssetCache.js';
import { SceneManager } from './scenes/SceneManager.js';
import { debounce } from './utils/debounce.js';

async function main() {
	const canvas = document.getElementById('c');
	const video = document.getElementById('video');

	const hud = new HudController(document);
	const world = new World(canvas);

	const assets = new AssetCache();
	const scenes = new SceneManager(world, assets);

	const tracker = new FaceTracker(video, { targetFps: 30 }); // <-- perf: 30fps
	const orbit = new OrbitCameraController(world.camera, world.target);

	// Room grid (lives in world.room)
	let roomParams = hud.getRoomParams();
	let roomGrid = new RoomGrid().build(roomParams).addTo(world.room);
	orbit.setRoomGrid(roomGrid);

	// init scenes
	scenes.setAxesVisible(hud.areAxesOn());
	scenes.setSubjectOffset(hud.getPos().x, hud.getPos().y, hud.getPos().z);
	await scenes.setScene(hud.getScene());

	// --- HUD events ---
	const p0 = hud.getPos();
	scenes.setSubjectOffset(p0.x, p0.y, p0.z);

	const t0 = hud.getTarget();
	scenes.setTargetPoint(t0.x, t0.y, t0.z);


	// base distance for auto-zoom
	orbit.setBaseRadius(hud.getCamDistance());
	orbit.setAutoZoom(hud.isAutoZoomOn());

	hud.setStatus('ready - click "Start camera"');

	tracker.on('update', (t) => {
		if (!tracker.isRunning()) return;
		hud.setStatus(t.hasFace ? 'camera OK - face detected' : 'camera OK - no face');
	});

	tracker.on('error', () => {
		if (!tracker.isRunning()) return;
		hud.setStatus('detection error (check console)');
	});

	// --- UI events ---
	hud.on('startStop', async () => {
		if (!tracker.isRunning()) {
			try {
				hud.setStatus('requesting camera permission…');
				await tracker.start();
				orbit.resetAutoCalibration();
				hud.setRunning(true);
			} catch {
				hud.setStatus('camera error (permission?)');
			}
		} else {
			tracker.stop();
			hud.setRunning(false);
			hud.setStatus('camera stopped');
		}
	});

	hud.on('calibrate', () => orbit.calibrate(performance.now()));

	hud.on('camViewToggle', (on) => {
		video.style.display = on ? 'block' : 'none';
	});

	hud.on('axesToggle', (on) => scenes.setAxesVisible(on));

	hud.on('posChange', (p) => scenes.setSubjectOffset(p.x, p.y, p.z));

	hud.on('camDistChange', (r) => orbit.setBaseRadius(r));

	hud.on('autoZoomToggle', (on) => {
		orbit.setAutoZoom(on);
	});

	hud.on('sceneChange', async (kind) => {
		await scenes.setScene(kind);
		scenes.setAxesVisible(hud.areAxesOn());
		scenes.setSubjectOffset(hud.getPos().x, hud.getPos().y, hud.getPos().z);
	});

	// Perf: debounce room rebuild while dragging
	const rebuildRoom = () => {
		roomGrid?.dispose?.();
		world.clearGroup(world.room);
		roomGrid = new RoomGrid().build(roomParams).addTo(world.room);
		orbit.setRoomGrid(roomGrid);
	};

	const rebuildRoomDebounced = debounce(rebuildRoom, 140);

	hud.on('roomChange', (p) => {
		roomParams = p;
		rebuildRoomDebounced();
	});

	hud.on('roomChangeCommit', (p) => {
		roomParams = p;
		rebuildRoom(); // instant on release
	});

	window.addEventListener('resize', () => world.resize());

	hud.on('targetChange', (t) => {
		scenes.setTargetPoint(t.x, t.y, t.z);
	}); // re-apply the anchor


	// --- render loop (60fps) ---
	function animate() {
		const now = performance.now();
		const tracking = tracker.getLatest();

		orbit.update(tracking, {
			strength: hud.getStrength(),
			smoothing: hud.getSmoothing()
		}, now);

		world.render();

		if (hud.isDebugOn()) {
			hud.setDebugText(orbit.debugString(tracking, {
				strength: hud.getStrength(),
				smoothing: hud.getSmoothing()
			}));
		}

		requestAnimationFrame(animate);
	}

	animate();
}

main();
