import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { clamp } from '../utils/math.js';
import { Emitter } from '../utils/emitter.js';

export class FaceTracker extends Emitter {
	constructor(videoEl) {
		super();
		this.video = videoEl;

		this.landmarker = null;
		this.stream = null;
		this.running = false;
		this._raf = 0;

		this.latest = { hasFace: false, x: 0, y: 0, cx: 0.5, cy: 0.5 };
	}

	async init() {
		if (this.landmarker) return;

		const filesetResolver = await FilesetResolver.forVisionTasks(
			'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
		);

		this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
			baseOptions: {
				modelAssetPath:
					'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
			},
			outputFaceBlendshapes: false,
			outputFacialTransformationMatrixes: false,
			runningMode: 'VIDEO',
			numFaces: 1
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
		this._loop();
	}

	stop() {
		this.running = false;
		cancelAnimationFrame(this._raf);

		if (this.stream) {
			this.stream.getTracks().forEach((t) => t.stop());
			this.stream = null;
		}
		this.video.srcObject = null;

		this.latest = { ...this.latest, hasFace: false };
		this.emit('update', this.latest);
	}

	_loop() {
		if (!this.running) return;

		const now = performance.now();

		if (this.landmarker && this.video.readyState >= 2) {
			try {
				const res = this.landmarker.detectForVideo(this.video, now);
				const hasFace = !!(res.faceLandmarks && res.faceLandmarks.length);

				if (hasFace) {
					const lm = res.faceLandmarks[0];

					let sx = 0, sy = 0;
					for (let i = 0; i < lm.length; i++) { sx += lm[i].x; sy += lm[i].y; }

					const cx = sx / lm.length;
					const cy = sy / lm.length;

					const x = clamp((cx - 0.5) / 0.5, -1, 1);
					const y = clamp((cy - 0.5) / 0.5, -1, 1);

					this.latest = { hasFace: true, x, y, cx, cy };
				} else {
					this.latest = { ...this.latest, hasFace: false };
				}

				this.emit('update', this.latest);
			} catch (e) {
				this.latest = { ...this.latest, hasFace: false };
				this.emit('error', e);
				this.emit('update', this.latest);
			}
		}

		this._raf = requestAnimationFrame(() => this._loop());
	}
}
