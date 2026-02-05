import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

THREE.Cache.enabled = true;

export class AssetCache {
	constructor() {
		this.gltfLoader = new GLTFLoader();
		this._gltf = new Map();
	}

	async loadGLTF(url, { postprocess } = {}) {
		if (!this._gltf.has(url)) {
			const gltf = await new Promise((resolve, reject) =>
				this.gltfLoader.load(url, resolve, undefined, reject)
			);

			const scene = gltf.scene;
			if (postprocess) postprocess(scene);

			this._gltf.set(url, scene);
		}

		// clone instance (ne mutiramo original)
		const base = this._gltf.get(url);
		return base.clone(true);
	}
}
