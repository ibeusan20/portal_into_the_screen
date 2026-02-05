import './style.css';

import { World } from './three/World.js';
import { OrbitCameraController } from './three/OrbitCameraController.js';
import { FaceTracker } from './tracking/FaceTracker.js';
import { HudController } from './ui/HudController.js';
import { SceneFactory } from './scenes/SceneFactory.js';

async function main() {
	const canvas = document.getElementById('c');
	const video = document.getElementById('video');

	const hud = new HudController(document);
	const world = new World(canvas);
	const tracker = new FaceTracker(video);
	const orbit = new OrbitCameraController(world.camera, world.target);
	const scenes = new SceneFactory(world);

	let roomParams = hud.getRoomParams();
	let roomGrid = null;

	const applyVideoVisibility = (on) => { video.style.display = on ? 'block' : 'none'; };

	hud.setStatus('initializing…');

	await tracker.init();

	roomGrid = await scenes.setScene(hud.getScene(), roomParams);
	orbit.setRoomGrid(roomGrid);

	scenes.setAxesVisible(hud.areAxesOn());
	scenes.setSubjectOffset(hud.getPos().x, hud.getPos().y, hud.getPos().z);
	orbit.setRadius(hud.getCamDistance());

	hud.setStatus('ready - click "Start camera"');

	tracker.on('update', (t) => {
		if (!tracker.isRunning()) return;
		hud.setStatus(t.hasFace ? 'camera OK - face detected' : 'camera OK - no face');
	});

	tracker.on('error', () => {
		if (!tracker.isRunning()) return;
		hud.setStatus('detection error (check console)');
	});

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

	hud.on('calibrate', () => orbit.calibrate());

	hud.on('camViewToggle', (on) => applyVideoVisibility(on));

	hud.on('axesToggle', (on) => scenes.setAxesVisible(on));

	hud.on('posChange', (p) => scenes.setSubjectOffset(p.x, p.y, p.z));

	hud.on('camDistChange', (r) => orbit.setRadius(r));

	hud.on('roomChange', (p) => {
		roomParams = p;
		roomGrid = scenes.rebuildRoom(roomParams);
		orbit.setRoomGrid(roomGrid);
	});

	hud.on('sceneChange', async (kind) => {
		roomGrid?.dispose?.();
		roomGrid = await scenes.setScene(kind, roomParams);
		orbit.setRoomGrid(roomGrid);

		scenes.setAxesVisible(hud.areAxesOn());
		scenes.setSubjectOffset(hud.getPos().x, hud.getPos().y, hud.getPos().z);
	});

	window.addEventListener('resize', () => world.resize());

	function animate() {
		const now = performance.now();
		const tracking = tracker.getLatest();

		orbit.update(tracking, hud.getStrength(), hud.getSmoothing(), now);
		world.render();

		if (hud.isDebugOn()) {
			hud.setDebugText(orbit.debugString(tracking, hud.getStrength(), hud.getSmoothing()));
		}

		requestAnimationFrame(animate);
	}

	animate();
}

main();
