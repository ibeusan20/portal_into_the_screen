import * as THREE from 'three';

export const PyramidScene = {
	id: 'pyramid',
	async build({ subject }) {
		const mesh = new THREE.Mesh(
			new THREE.ConeGeometry(0.75, 1.4, 4, 1),
			new THREE.MeshStandardMaterial({ color: 0x9cff6d, roughness: 0.45, metalness: 0.05 })
		);
		mesh.castShadow = true;
		mesh.position.set(0, 0.9, 0);
		mesh.rotation.y = Math.PI / 4;

		const base = new THREE.Mesh(
			new THREE.BoxGeometry(1.7, 0.08, 1.7),
			new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.9, metalness: 0.0 })
		);
		base.receiveShadow = true;
		base.position.set(0, 0.04, 0);

		subject.add(mesh, base);

		return {
			dispose() {
				mesh.geometry.dispose(); mesh.material.dispose();
				base.geometry.dispose(); base.material.dispose();
			}
		};
	}
};
