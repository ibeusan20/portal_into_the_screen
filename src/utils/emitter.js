export class Emitter {
	#map = new Map();

	on(name, fn) {
		if (!this.#map.has(name)) this.#map.set(name, []);
		this.#map.get(name).push(fn);
	}

	emit(name, payload) {
		const list = this.#map.get(name);
		if (!list) return;
		for (const fn of list) fn(payload);
	}
}
