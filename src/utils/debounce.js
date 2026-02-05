export function debounce(fn, ms = 120) {
	let t = 0;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn(...args), ms);
	};
}
