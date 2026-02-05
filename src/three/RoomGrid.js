import * as THREE from 'three';

export class RoomGrid {
	constructor() {
		this.group = new THREE.Group();

		this.faces = null;
		this._tmp = new THREE.Vector3();

		this._div = 16;
		this._gridGeo = null;

		this._mat = new THREE.LineBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.28,
			depthWrite: false
		});
	}

	build({ width = 8, height = 4, depth = 8, div = 16 } = {}) {
		// (re)build shared geometry only if divisions changed
		if (!this._gridGeo || div !== this._div) {
			this._div = div;
			this._gridGeo?.dispose?.();
			this._gridGeo = this.#makeUnitGridGeometry(div);
			this.#recreateFaces(); // faces share geometry
		}

		this.#applyRoomDimensions(width, height, depth);
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

		// geometry & material
		this._gridGeo?.dispose?.();
		this._mat?.dispose?.();
	}

	#recreateFaces() {
		// wipe old faces
		while (this.group.children.length) {
			this.group.remove(this.group.children[0]);
		}

		const makeFace = () => new THREE.LineSegments(this._gridGeo, this._mat);

		const floor = makeFace();
		floor.rotation.x = Math.PI / 2;

		const ceil = makeFace();
		ceil.rotation.x = Math.PI / 2;

		const back = makeFace();
		const front = makeFace();

		const left = makeFace();
		left.rotation.y = Math.PI / 2;

		const right = makeFace();
		right.rotation.y = Math.PI / 2;

		this.group.add(floor, ceil, back, front, left, right);
		this.faces = { floor, ceil, front, back, left, right };
	}

	#applyRoomDimensions(width, height, depth) {
		const f = this.faces;
		if (!f) return;

		// unit grid is in XY plane [0..1] centered at origin, so scale sets size
		// floor/ceil: scaleX=width, scaleY=depth (because rotated)
		f.floor.scale.set(width, depth, 1);
		f.floor.position.set(0, 0, 0);

		f.ceil.scale.set(width, depth, 1);
		f.ceil.position.set(0, height, 0);

		// back/front: width x height
		f.back.scale.set(width, height, 1);
		f.back.position.set(0, height / 2, -depth / 2);

		f.front.scale.set(width, height, 1);
		f.front.position.set(0, height / 2, depth / 2);

		// left/right: depth x height
		f.left.scale.set(depth, height, 1);
		f.left.position.set(-width / 2, height / 2, 0);

		f.right.scale.set(depth, height, 1);
		f.right.position.set(width / 2, height / 2, 0);
	}

	#makeUnitGridGeometry(div) {
		// grid in XY centered at origin, spanning [-0.5..0.5]
		const verts = [];
		const step = 1 / div;

		// vertical lines
		for (let i = 0; i <= div; i++) {
			const x = -0.5 + i * step;
			verts.push(x, -0.5, 0, x, 0.5, 0);
		}

		// horizontal lines
		for (let j = 0; j <= div; j++) {
			const y = -0.5 + j * step;
			verts.push(-0.5, y, 0, 0.5, y, 0);
		}

		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
		return geo;
	}
}
