import * as THREE from 'three';

function proceduralHouse() {
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
		emissiveIntensity: 0.5,
		transparent: true,
		opacity: 0.65,
		depthWrite: false
	});

	const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.05), winMat);
	w1.position.set(-0.65, 0.85, 1.03);
	const w2 = w1.clone(); w2.position.x = 0.65;
	house.add(w1, w2);

	return house;
}

export const HouseScene = {
	id: 'house',
	async build({ subject, assets }) {
		const base = new THREE.Mesh(
			new THREE.CylinderGeometry(3.2, 3.2, 0.18, 40),
			new THREE.MeshStandardMaterial({ color: 0x1a2442, roughness: 0.95 })
		);
		base.receiveShadow = true;
		base.position.set(0, 0.09, 0);
		subject.add(base);

		const url = '/models/house.glb';

		let model = null;
		try {
			model = await assets.loadGLTF(url, {
				postprocess(scene) {
					scene.traverse((n) => {
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
				}
			});

			model.position.set(0, 0.18, 0);
			subject.add(model);
		} catch {
			model = proceduralHouse();
			model.position.set(0, 0.18, 0);
			subject.add(model);
		}

		return {
			dispose() {
				base.geometry.dispose();
				base.material.dispose();

				// glTF/procedural cleanup: do not touch cache, but instance materials/geometries may be shared.
				// For "200% safe", don't manually dispose models from cache.
				// Just remove from scene; Three/GC will handle it, cache remains.
			}
		};
	}
};
