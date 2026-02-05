import * as THREE from 'three';

export const HemisphereScene = {
	id: 'hemisphere',
	async build({ subject, stage }) {
		const dome = new THREE.Mesh(
			new THREE.SphereGeometry(8, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
			new THREE.MeshStandardMaterial({ color: 0x121a2f, roughness: 1.0, metalness: 0.0, side: THREE.BackSide })
		);
		stage.add(dome);

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
		const starsMat = new THREE.PointsMaterial({ color: 0x9fb7ff, size: 0.03, sizeAttenuation: true });
		const stars = new THREE.Points(pts, starsMat);
		stage.add(stars);

		const icosa = new THREE.Mesh(
			new THREE.IcosahedronGeometry(0.9, 1),
			new THREE.MeshStandardMaterial({ color: 0x6dff9c, roughness: 0.35, metalness: 0.1 })
		);
		icosa.position.set(0, 1.1, 0);
		icosa.castShadow = true;
		subject.add(icosa);

		return {
			dispose() {
				dome.geometry.dispose(); dome.material.dispose();
				pts.dispose(); starsMat.dispose();
				icosa.geometry.dispose(); icosa.material.dispose();
			}
		};
	}
};
