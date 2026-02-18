import * as THREE from 'three';
import { SceneRegistry } from './SceneRegistry.js';

export class SceneManager {
	constructor(world, assets) {
		this.world = world;
		this.assets = assets;

		this.axes = new THREE.AxesHelper(1.4);
		this.axes.position.copy(world.target);
		world.helpers.add(this.axes);

		this.designTarget = world.target.clone(); // initial (0,1,0)
		this.subjectOffset = new THREE.Vector3(0, 0, 0); // posX/Y/Z slider values
		this._tmpShift = new THREE.Vector3();


		this._current = null;
		this._cleanup = null;
	}

	setAxesVisible(on) { this.axes.visible = !!on; }

	setSubjectOffset(x, y, z) {
		this.subjectOffset.set(x, y, z);
		this.#applyAnchor();
	}


	async setScene(kind) {
		// Clear subject and stage (scene extras), but do not touch the room
		this.world.clearGroup(this.world.subject);
		this.world.clearGroup(this.world.stage);

		// Build
		const scene = SceneRegistry[kind] ?? SceneRegistry.cube;

		// Call dispose of the old one
		this._cleanup?.dispose?.();
		this._cleanup = null;

		this._current = scene.id;
		this._cleanup = await scene.build({
			subject: this.world.subject,
			stage: this.world.stage,
			assets: this.assets,
			world: this.world
		});

		this.#applyAnchor();
	}

	setTargetPoint(x, y, z) {
		this.world.target.set(x, y, z);
		this.#applyAnchor();
	}

	#applyAnchor() {
		// shift = target - initialDesignTarget
		this._tmpShift.subVectors(this.world.target, this.designTarget);

		// subject tracks target + additonal offset (posX/Y/Z)
		this.world.subject.position.copy(this._tmpShift).add(this.subjectOffset);

		// stage (dome/stars) follows target to stay anchored to the world
		this.world.stage.position.copy(this._tmpShift);

		// axes directly on target
		this.axes.position.copy(this.world.target);
	}
}
