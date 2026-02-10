import { clamp, ema } from '../utils/math.js';

export class OrbitCameraController {
	constructor(camera, target) {
		this.camera = camera;
		this.target = target;

		// filtered inputs
		this.filtered = { x: 0, y: 0, eye: 0.18 };
		this.neutral = { x: 0, y: 0, eye: 0.18 };

		// orbit state
		this.orbit = { yaw: 0, pitch: 0, r: 5.2 };
		this.baseR = 5.2;

		this.lastSeenAt = 0;
		this.autoCalibrated = false;

		// auto-recenter stability
		this._prev = { x: 0, y: 0, eye: 0.18 };
		this._stableSince = 0;
		this._lastAutoCalibAt = 0;

		this.roomGrid = null;

		this.autoZoomOn = true;
	}

	setRoomGrid(grid) { this.roomGrid = grid; }
	setBaseRadius(r) { this.baseR = r; }
	setAutoZoom(on) { this.autoZoomOn = !!on; }

	resetAutoCalibration() {
		this.autoCalibrated = false;
		this._stableSince = 0;
	}

	calibrate(now = performance.now()) {
		this.neutral.x = this.filtered.x;
		this.neutral.y = this.filtered.y;
		this.neutral.eye = this.filtered.eye;

		this.autoCalibrated = true;
		this._lastAutoCalibAt = now;
	}

	update(tracking, { strength, smoothing }, now) {
		this.#updateFiltered(tracking, smoothing, now);
		this.#autoRecenterIfStable(now);

		this.#applyOrbit(tracking, { strength, smoothing }, now);
		this.roomGrid?.updateOpenFace(this.camera, this.target);
	}

	debugString(tracking, { strength, smoothing }) {
		return `tracking_fps=throttled
strength=${strength.toFixed(2)} smooth=${smoothing.toFixed(2)}
baseR=${this.baseR.toFixed(2)} r=${this.orbit.r.toFixed(2)}

raw:
  hasFace=${!!tracking?.hasFace}
  x=${(tracking?.x ?? 0).toFixed(3)} y=${(tracking?.y ?? 0).toFixed(3)} eye=${(tracking?.eyeDist ?? 0).toFixed(4)}

filtered:
  x=${this.filtered.x.toFixed(3)} y=${this.filtered.y.toFixed(3)} eye=${this.filtered.eye.toFixed(4)}
neutral:
  x=${this.neutral.x.toFixed(3)} y=${this.neutral.y.toFixed(3)} eye=${this.neutral.eye.toFixed(4)}

orbit:
  yaw=${this.orbit.yaw.toFixed(3)} pitch=${this.orbit.pitch.toFixed(3)}
`;
	}

	#updateFiltered(tracking, hold, now) {
		if (!tracking?.hasFace) return;

		this.lastSeenAt = now;

		this.filtered.x = ema(this.filtered.x, tracking.x, hold);
		this.filtered.y = ema(this.filtered.y, tracking.y, hold);

		// eyeDist is a bit "jittery" so we filter it more strongly
		const eyeHold = clamp(hold + 0.15, 0, 0.97);
		this.filtered.eye = ema(this.filtered.eye, tracking.eyeDist, eyeHold);

		// first lock = auto neutral
		if (!this.autoCalibrated) {
			this.neutral.x = this.filtered.x;
			this.neutral.y = this.filtered.y;
			this.neutral.eye = this.filtered.eye;
			this.autoCalibrated = true;
			this._lastAutoCalibAt = now;
		}
	}

	#autoRecenterIfStable(now) {
		// stability conditions (tune)
		const EPS_POS = 0.004; // how much it can "jitter"
		const EPS_EYE = 0.0025;
		const STABLE_MS = 1400;
		const COOLDOWN_MS = 2200;

		const dx = Math.abs(this.filtered.x - this._prev.x);
		const dy = Math.abs(this.filtered.y - this._prev.y);
		const de = Math.abs(this.filtered.eye - this._prev.eye);

		const stable = dx < EPS_POS && dy < EPS_POS && de < EPS_EYE;

		this._prev.x = this.filtered.x;
		this._prev.y = this.filtered.y;
		this._prev.eye = this.filtered.eye;

		if (!stable) {
			this._stableSince = 0;
			return;
		}

		if (!this._stableSince) this._stableSince = now;

		const stableFor = now - this._stableSince;
		const cooldownOk = (now - this._lastAutoCalibAt) > COOLDOWN_MS;

		if (stableFor >= STABLE_MS && cooldownOk) {
			this.calibrate(now);
			this._stableSince = 0;
		}
	}

	#applyOrbit(tracking, { strength, smoothing }, now) {
		const unseenMs = now - (this.lastSeenAt || 0);
		const lost = unseenMs > 350;

		const dx = lost ? 0 : (this.filtered.x - this.neutral.x);
		const dy = lost ? 0 : (this.filtered.y - this.neutral.y);

		const yawTarget = clamp((-dx) * strength * 1.15, -1.05, 1.05);
		const pitchTarget = clamp((-dy) * strength * 0.85, -0.75, 0.75);

		this.orbit.yaw = ema(this.orbit.yaw, yawTarget, smoothing);
		this.orbit.pitch = ema(this.orbit.pitch, pitchTarget, smoothing);

		// auto zoom: neutralEye / currentEye
		const zoomPower = 1.25;
		let r = this.baseR;

		if (this.autoZoomOn && !lost && this.neutral.eye > 1e-6 && this.filtered.eye > 1e-6) {
			const factor = Math.pow(this.neutral.eye / this.filtered.eye, zoomPower);
			r = this.baseR * clamp(factor, 0.70, 1.55);
		}

		// clamp + smooth radius
		r = clamp(r, 2.2, 12.0);
		this.orbit.r = ema(this.orbit.r, r, clamp(smoothing + 0.10, 0, 0.97));

		const cy = Math.cos(this.orbit.yaw);
		const sy = Math.sin(this.orbit.yaw);
		const cp = Math.cos(this.orbit.pitch);
		const sp = Math.sin(this.orbit.pitch);

		const x = this.target.x + this.orbit.r * sy * cp;
		const z = this.target.z + this.orbit.r * cy * cp;
		const y = this.target.y + this.orbit.r * sp + 0.10;

		this.camera.position.set(x, y, z);
		this.camera.lookAt(this.target);
	}
}
