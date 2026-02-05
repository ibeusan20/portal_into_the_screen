import * as THREE from 'three';
import { SceneRegistry } from './SceneRegistry.js';

export class SceneManager {
	constructor(world, assets) {
		this.world = world;
		this.assets = assets;

		this.axes = new THREE.AxesHelper(1.4);
		this.axes.position.copy(world.target);
		world.helpers.add(this.axes);

		this._current = null;
		this._cleanup = null;
	}

	setAxesVisible(on) { this.axes.visible = !!on; }

	setSubjectOffset(x, y, z) {
		this.world.subject.position.set(x, y, z);
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
	}
}
