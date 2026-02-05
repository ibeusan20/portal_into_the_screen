import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { clamp, lerp } from '../utils/math.js';
import { Emitter } from '../utils/emitter.js';

const IDX_NOSE_TIP = 1; // commonly used nose tip
const IDX_L_EYE_OUT = 33; // outer eye corner
const IDX_R_EYE_OUT = 263; // outer eye corner

export class FaceTracker extends Emitter {
	constructor(videoEl, { targetFps = 20 } = {}) {
		super();
		this.video = videoEl;

		this.landmarker = null;
		this.stream = null;
		this.running = false;

		this.targetFps = targetFps;
		this._lastDetectAt = 0;
		this._raf = 0;

		// latest measurements (normalized)
		this.latest = {
			hasFace: false,
			// [-1..1] head center in frame
			x: 0, y: 0,
			// centroid in [0..1]
			cx: 0.5, cy: 0.5,
			// eye distance (in [0..~1]) - used for auto-zoom
			eyeDist: 0.18
		};
	}

	async init() {
		if (this.landmarker) return;

		const fileset = await FilesetResolver.forVisionTasks(
			'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
		);

		this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
			baseOptions: {
				modelAssetPath:
					'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
			},
			runningMode: 'VIDEO',
			numFaces: 1,
			outputFaceBlendshapes: false,
			outputFacialTransformationMatrixes: false
		});
	}

	isRunning() { return this.running; }
	getLatest() { return this.latest; }

	async start() {
		if (this.running) return;
		await this.init();

		this.stream = await navigator.mediaDevices.getUserMedia({
			video: { width: 1280, height: 720, facingMode: 'user' },
			audio: false
		});

		this.video.srcObject = this.stream;
		await this.video.play();

		this.running = true;
		this._lastDetectAt = 0;
		this._loop();
	}

	stop() {
		this.running = false;
		cancelAnimationFrame(this._raf);

		if (this.stream) {
			this.stream.getTracks().forEach(t => t.stop());
			this.stream = null;
		}
		this.video.srcObject = null;

		this.latest = { ...this.latest, hasFace: false };
		this.emit('update', this.latest);
	}

	setTargetFps(fps) {
		this.targetFps = Math.max(5, Math.min(60, fps));
	}

	_loop() {
		if (!this.running) return;

		const now = performance.now();
		const minDt = 1000 / this.targetFps;

		// Throttle detection (CPU optimization)
		if (now - this._lastDetectAt >= minDt) {
			this._lastDetectAt = now;
			this._detect(now);
		}

		this._raf = requestAnimationFrame(() => this._loop());
	}

	_detect(now) {
		if (!this.landmarker || this.video.readyState < 2) return;

		try {
			const res = this.landmarker.detectForVideo(this.video, now);
			const hasFace = !!(res.faceLandmarks && res.faceLandmarks.length);

			if (!hasFace) {
				this.latest = { ...this.latest, hasFace: false };
				this.emit('update', this.latest);
				return;
			}

			const lm = res.faceLandmarks[0];
			const L = lm[IDX_L_EYE_OUT];
			const R = lm[IDX_R_EYE_OUT];
			const N = lm[IDX_NOSE_TIP];

			// Center: midpoint of eyes + pull slightly toward nose (more stable for y)
			const eyeCx = (L.x + R.x) * 0.5;
			const eyeCy = (L.y + R.y) * 0.5;

			const cx = eyeCx;
			const cy = lerp(eyeCy, N.y, 0.35);

			// Eye distance (normalized in image space)
			const dx = L.x - R.x;
			const dy = L.y - R.y;
			const eyeDist = Math.hypot(dx, dy);

			// Normalize center to [-1..1]
			const x = clamp((cx - 0.5) / 0.5, -1, 1);
			const y = clamp((cy - 0.5) / 0.5, -1, 1);

			this.latest = { hasFace: true, x, y, cx, cy, eyeDist };
			this.emit('update', this.latest);
		} catch (e) {
			this.latest = { ...this.latest, hasFace: false };
			this.emit('error', e);
			this.emit('update', this.latest);
		}
	}
}
