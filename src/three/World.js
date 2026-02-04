import * as THREE from 'three';

export class World {
	constructor(canvas) {
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(window.innerWidth, window.innerHeight, false);
		this.renderer.shadowMap.enabled = true;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x0b0d12);

		this.camera = new THREE.PerspectiveCamera(
			55,
			window.innerWidth / window.innerHeight,
			0.05,
			200
		);

		// lights
		this.scene.add(new THREE.HemisphereLight(0xdde7ff, 0x223355, 0.65));

		const dir = new THREE.DirectionalLight(0xffffff, 1.15);
		dir.position.set(3.5, 6.0, 3.0);
		dir.castShadow = true;
		dir.shadow.mapSize.set(2048, 2048);
		dir.shadow.camera.near = 0.1;
		dir.shadow.camera.far = 30;
		dir.shadow.camera.left = -8;
		dir.shadow.camera.right = 8;
		dir.shadow.camera.top = 8;
		dir.shadow.camera.bottom = -8;
		this.scene.add(dir);

		// floor
		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(40, 40),
			new THREE.MeshStandardMaterial({ color: 0x101522, roughness: 0.9, metalness: 0.0 })
		);
		floor.rotation.x = -Math.PI / 2;
		floor.position.y = 0;
		floor.receiveShadow = true;
		this.scene.add(floor);

		// content group
		this.content = new THREE.Group();
		this.scene.add(this.content);

		// target for orbit
		this.target = new THREE.Vector3(0, 1.0, 0);
	}

	resize() {
		this.renderer.setSize(window.innerWidth, window.innerHeight, false);
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
	}

	render() {
		this.renderer.render(this.scene, this.camera);
	}

	clearContent() {
		while (this.content.children.length) {
			const obj = this.content.children.pop();
			obj.traverse?.((n) => {
				if (n.geometry) n.geometry.dispose?.();
				if (n.material) {
					if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose?.());
					else n.material.dispose?.();
				}
			});
		}
	}
}
