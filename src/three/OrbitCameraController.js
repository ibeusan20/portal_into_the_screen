import { clamp, ema } from '../utils/math.js';

export class OrbitCameraController {
	constructor(camera, target) {
		this.camera = camera;
		this.target = target;

		this.filtered = { x: 0, y: 0 };
		this.neutral = { x: 0, y: 0 };
		this.orbit = { yaw: 0, pitch: 0, r: 5.2 };

		this.lastSeenAt = 0;
		this.autoCalibrated = false;

		this.roomGrid = null;
	}

	setRoomGrid(roomGrid) {
		this.roomGrid = roomGrid;
	}

	setRadius(r) {
		this.orbit.r = r;
	}

	resetAutoCalibration() {
		this.autoCalibrated = false;
	}

	calibrate() {
		this.neutral.x = this.filtered.x;
		this.neutral.y = this.filtered.y;
		this.autoCalibrated = true;
	}

	update(tracking, strength, hold, now) {
		// update filtered head position only when face exists
		if (tracking?.hasFace) {
			this.lastSeenAt = now;

			this.filtered.x = ema(this.filtered.x, tracking.x, hold);
			this.filtered.y = ema(this.filtered.y, tracking.y, hold);

			if (!this.autoCalibrated) {
				this.neutral.x = this.filtered.x;
				this.neutral.y = this.filtered.y;
				this.autoCalibrated = true;
			}
		}

		const unseenMs = now - (this.lastSeenAt || 0);
		const decay = unseenMs > 350;

		const dx = decay ? 0 : (this.filtered.x - this.neutral.x);
		const dy = decay ? 0 : (this.filtered.y - this.neutral.y);

		// head left (dx<0) -> camera right -> see right side
		const yawTarget = clamp((-dx) * strength * 1.15, -1.05, 1.05);
		// head up (dy<0) -> camera up -> see top
		const pitchTarget = clamp((-dy) * strength * 0.85, -0.75, 0.75);

		this.orbit.yaw = ema(this.orbit.yaw, yawTarget, hold);
		this.orbit.pitch = ema(this.orbit.pitch, pitchTarget, hold);

		const cy = Math.cos(this.orbit.yaw);
		const sy = Math.sin(this.orbit.yaw);
		const cp = Math.cos(this.orbit.pitch);
		const sp = Math.sin(this.orbit.pitch);

		const x = this.target.x + this.orbit.r * sy * cp;
		const z = this.target.z + this.orbit.r * cy * cp;
		const y = this.target.y + this.orbit.r * sp + 0.10;

		this.camera.position.set(x, y, z);
		this.camera.lookAt(this.target);

		this.roomGrid?.updateOpenFace(this.camera, this.target);
	}

	debugString(tracking, strength, hold) {
		const cx = tracking?.cx ?? 0;
		const cy = tracking?.cy ?? 0;

		return `head-orbit
strength=${strength.toFixed(2)} smooth=${hold.toFixed(2)}

raw:
  x=${(tracking?.x ?? 0).toFixed(3)} y=${(tracking?.y ?? 0).toFixed(3)}
  cx=${cx.toFixed(3)} cy=${cy.toFixed(3)} hasFace=${!!tracking?.hasFace}

filtered:
  x=${this.filtered.x.toFixed(3)} y=${this.filtered.y.toFixed(3)}
neutral:
  x=${this.neutral.x.toFixed(3)} y=${this.neutral.y.toFixed(3)}

orbit:
  yaw=${this.orbit.yaw.toFixed(3)} pitch=${this.orbit.pitch.toFixed(3)} r=${this.orbit.r.toFixed(2)}
`;
	}
}
