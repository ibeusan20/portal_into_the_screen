import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomGrid } from '../three/RoomGrid.js';

export class SceneFactory {
	constructor(world) {
		this.world = world;
		this.loader = new GLTFLoader();
		this.axes = null;
	}

	async setScene(kind) {
		this.world.clearContent();

		this._addAxes(1.4);

		const roomGrid = new RoomGrid().build({ width: 8, height: 4, depth: 8, div: 16 }).addTo(this.world.content);

		if (kind === 'cube') this._cube();
		else if (kind === 'pyramid') this._pyramid();
		else if (kind === 'hemisphere') this._hemisphere();
		else if (kind === 'house') await this._house();

		return roomGrid;
	}

	_addAxes(size = 1.2) {
		if (this.axes) {
			this.axes.removeFromParent?.();
			this.axes = null;
		}
		this.axes = new THREE.AxesHelper(size);
		this.axes.position.copy(this.world.target);
		this.world.content.add(this.axes);
	}

	setAxesVisible(on) {
		if (this.axes) this.axes.visible = !!on;
	}

	_cube() {
		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshStandardMaterial({ color: 0x6dd2ff, roughness: 0.35, metalness: 0.1 })
		);
		mesh.castShadow = true;
		mesh.position.set(0, 1.0, 0);
		this.world.content.add(mesh);
	}

	_pyramid() {
		const mesh = new THREE.Mesh(
			new THREE.ConeGeometry(0.75, 1.4, 4, 1),
			new THREE.MeshStandardMaterial({ color: 0x9cff6d, roughness: 0.45, metalness: 0.05 })
		);
		mesh.castShadow = true;
		mesh.position.set(0, 0.9, 0);
		mesh.rotation.y = Math.PI / 4;
		this.world.content.add(mesh);

		const base = new THREE.Mesh(
			new THREE.BoxGeometry(1.7, 0.08, 1.7),
			new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.9, metalness: 0.0 })
		);
		base.receiveShadow = true;
		base.position.set(0, 0.04, 0);
		this.world.content.add(base);
	}

	_hemisphere() {
		const dome = new THREE.Mesh(
			new THREE.SphereGeometry(8, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
			new THREE.MeshStandardMaterial({
				color: 0x121a2f,
				roughness: 1.0,
				metalness: 0.0,
				side: THREE.BackSide
			})
		);
		this.world.content.add(dome);

		// stars (Points)
		const pts = new THREE.BufferGeometry();
		const count = 500;
		const pos = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			const r = 7.5;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.random() * (Math.PI / 2);
			pos[i * 3 + 0] = r * Math.cos(theta) * Math.sin(phi);
			pos[i * 3 + 1] = r * Math.cos(phi) + 0.2;
			pos[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
		}
		pts.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		this.world.content.add(
			new THREE.Points(pts, new THREE.PointsMaterial({ color: 0x9fb7ff, size: 0.03, sizeAttenuation: true }))
		);

		const icosa = new THREE.Mesh(
			new THREE.IcosahedronGeometry(0.9, 1),
			new THREE.MeshStandardMaterial({ color: 0x6dff9c, roughness: 0.35, metalness: 0.1 })
		);
		icosa.position.set(0, 1.1, 0);
		icosa.castShadow = true;
		this.world.content.add(icosa);
	}

	_proceduralHouse() {
		const house = new THREE.Group();

		const wall = new THREE.Mesh(
			new THREE.BoxGeometry(2.2, 1.5, 2.0),
			new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.8 })
		);
		wall.castShadow = true;
		wall.receiveShadow = true;
		wall.position.set(0, 0.75, 0);
		house.add(wall);

		const roof = new THREE.Mesh(
			new THREE.ConeGeometry(1.75, 1.2, 4, 1),
			new THREE.MeshStandardMaterial({ color: 0x9b3d3d, roughness: 0.75 })
		);
		roof.castShadow = true;
		roof.position.set(0, 1.9, 0);
		roof.rotation.y = Math.PI / 4;
		house.add(roof);

		const door = new THREE.Mesh(
			new THREE.BoxGeometry(0.35, 0.7, 0.06),
			new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 })
		);
		door.position.set(0, 0.35, 1.03);
		door.castShadow = true;
		house.add(door);

		const winMat = new THREE.MeshStandardMaterial({
			name: 'window',
			color: 0x86b6ff,
			roughness: 0.2,
			metalness: 0.05,
			emissive: 0x0b1020,
			emissiveIntensity: 0.5
		});

		const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.05), winMat);
		w1.position.set(-0.65, 0.85, 1.03);
		const w2 = w1.clone(); w2.position.x = 0.65;

		house.add(w1, w2);
		return house;
	}

	async _house() {
		const base = new THREE.Mesh(
			new THREE.CylinderGeometry(3.2, 3.2, 0.18, 40),
			new THREE.MeshStandardMaterial({ color: 0x1a2442, roughness: 0.95 })
		);
		base.receiveShadow = true;
		base.position.set(0, 0.09, 0);
		this.world.content.add(base);

		const url = '/models/house.glb';

		try {
			const gltf = await new Promise((resolve, reject) => this.loader.load(url, resolve, undefined, reject));
			const model = gltf.scene;

			model.traverse((n) => {
				if (!n.isMesh) return;

				n.castShadow = true;
				n.receiveShadow = true;

				const mats = Array.isArray(n.material) ? n.material : [n.material];
				for (const m of mats) {
					if (!m) continue;
					m.side = THREE.DoubleSide;

					if (m.name === 'window') {
						m.transparent = true;
						m.opacity = 0.65;
						m.depthWrite = false;
					} else {
						m.transparent = false;
						m.opacity = 1.0;
						m.depthWrite = true;
					}
					m.needsUpdate = true;
				}
			});

			model.position.set(0, 0.18, 0);
			this.world.content.add(model);
		} catch {
			const house = this._proceduralHouse();
			house.position.set(0, 0.18, 0);
			this.world.content.add(house);
		}
	}
}
