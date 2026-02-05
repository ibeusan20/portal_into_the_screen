import * as THREE from 'three';

export const CubeScene = {
	id: 'cube',
	async build({ subject }) {
		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshStandardMaterial({ color: 0x6dd2ff, roughness: 0.35, metalness: 0.1 })
		);
		mesh.castShadow = true;
		mesh.position.set(0, 1.0, 0);
		subject.add(mesh);

		return {
			dispose() {
				mesh.geometry.dispose();
				mesh.material.dispose();
			}
		};
	}
};
