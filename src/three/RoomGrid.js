import * as THREE from 'three';

export class RoomGrid {
	constructor() {
		this.group = new THREE.Group();
		this.faces = null;
		this._tmp = new THREE.Vector3();
	}

	build({ width = 8, height = 4, depth = 8, div = 16 } = {}) {
		const g = this.group;

		const floor = this.#gridPlane(width, depth, div, div);
		floor.rotation.x = Math.PI / 2;
		floor.position.set(0, 0, 0);
		g.add(floor);

		const ceil = this.#gridPlane(width, depth, div, div);
		ceil.rotation.x = Math.PI / 2;
		ceil.position.set(0, height, 0);
		g.add(ceil);

		const back = this.#gridPlane(width, height, div, Math.round(div * (height / width)));
		back.position.set(0, height / 2, -depth / 2);
		g.add(back);

		const front = this.#gridPlane(width, height, div, Math.round(div * (height / width)));
		front.position.set(0, height / 2, depth / 2);
		g.add(front);

		const left = this.#gridPlane(depth, height, div, Math.round(div * (height / depth)));
		left.rotation.y = Math.PI / 2;
		left.position.set(-width / 2, height / 2, 0);
		g.add(left);

		const right = this.#gridPlane(depth, height, div, Math.round(div * (height / depth)));
		right.rotation.y = Math.PI / 2;
		right.position.set(width / 2, height / 2, 0);
		g.add(right);

		this.faces = { floor, ceil, front, back, left, right };
		return this;
	}

	addTo(parent) {
		parent.add(this.group);
		return this;
	}

	updateOpenFace(camera, target) {
		if (!this.faces) return;

		const f = this.faces;
		Object.values(f).forEach(o => (o.visible = true));

		this._tmp.subVectors(camera.position, target);
		const ax = Math.abs(this._tmp.x);
		const az = Math.abs(this._tmp.z);

		if (ax > az) (this._tmp.x > 0 ? f.right : f.left).visible = false;
		else (this._tmp.z > 0 ? f.front : f.back).visible = false;
	}

	dispose() {
		if (this.group.parent) this.group.parent.remove(this.group);

		this.group.traverse?.((n) => {
			if (n.geometry?.dispose) n.geometry.dispose();
			if (n.material?.dispose) n.material.dispose();
		});
	}

	#gridPlane(width, height, divX, divY, opacity = 0.28) {
		const verts = [];
		const x0 = -width / 2, x1 = width / 2;
		const y0 = -height / 2, y1 = height / 2;

		for (let i = 0; i <= divX; i++) {
			const x = x0 + (width * i) / divX;
			verts.push(x, y0, 0, x, y1, 0);
		}
		for (let j = 0; j <= divY; j++) {
			const y = y0 + (height * j) / divY;
			verts.push(x0, y, 0, x1, y, 0);
		}

		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

		const mat = new THREE.LineBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity,
			depthWrite: false
		});

		return new THREE.LineSegments(geo, mat);
	}
}
