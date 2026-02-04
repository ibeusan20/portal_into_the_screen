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

	let currentRoomGrid = null;

	function setVideoVisible(on) {
		video.style.display = on ? 'block' : 'none';
	}

	// status helpers
	const setStatus = (t) => hud.setStatus(t);

	// tracker updates -> only for status text
	tracker.setOnUpdate((t) => {
		if (!tracker.isRunning()) return;
		if (t.hasFace) setStatus('camera OK - face detected');
		else setStatus('camera OK - no face (move closer / more light)');
	});

	// initial scene
	setStatus('initializing…');
	await tracker.init();
	currentRoomGrid = await scenes.setScene(hud.getScene());
	orbit.setRoomGrid(currentRoomGrid);
	setStatus('ready - click "Start camera"');

	// UI events
	hud.on('startStop', async () => {
		if (!tracker.isRunning()) {
			try {
				setStatus('requesting camera permission…');
				await tracker.start();
				orbit.resetAutoCalibration();
				hud.setRunning(true);
			} catch {
				setStatus('camera error (permission?)');
			}
		} else {
			tracker.stop();
			hud.setRunning(false);
			setStatus('camera stopped');
		}
	});

	hud.on('calibrate', () => {
		orbit.calibrate();
	});

	hud.on('sceneChange', async (kind) => {
		currentRoomGrid?.dispose?.();
		currentRoomGrid = await scenes.setScene(kind);
		orbit.setRoomGrid(currentRoomGrid);
	});

	hud.on('camViewToggle', (on) => {
		setVideoVisible(on);
	});

	hud.on('axesToggle', (on) => {
		scenes.setAxesVisible(on);
	});

	// resize
	window.addEventListener('resize', () => world.resize());

	// render loop (always running)
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
