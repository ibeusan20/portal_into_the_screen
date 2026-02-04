export class HudController {
	constructor(doc) {
		this.hud = doc.getElementById('hud');
		this.statusEl = doc.getElementById('status');
		this.debugEl = doc.getElementById('debug');

		this.btnStart = doc.getElementById('btnStart');
		this.btnCalibrate = doc.getElementById('btnCalibrate');
		this.btnToggleDebug = doc.getElementById('btnToggleDebug');
		this.btnCollapse = doc.getElementById('btnCollapse');
		this.btnToggleCamView = doc.getElementById('btnToggleCamView');

		this.sceneSelect = doc.getElementById('sceneSelect');
		this.strengthSlider = doc.getElementById('parallax');
		this.smoothingSlider = doc.getElementById('smoothing');
		this.toggleAxes = doc.getElementById('toggleAxes');
		this.camDist = doc.getElementById('camDist');
		this.roomW = doc.getElementById('roomW');
		this.roomH = doc.getElementById('roomH');
		this.roomD = doc.getElementById('roomD');
		this.gridDiv = doc.getElementById('gridDiv');

		this._listeners = {
			startStop: [],
			calibrate: [],
			sceneChange: [],
			camViewToggle: [],
			axesToggle: [],
			posChange: [],
			camDistChange: [],
			roomChange: []
		};

		this._debugOn = false;
		this._camViewOn = false;

		// start: menu collapsed + debug off
		this.hud.classList.add('collapsed');
		this.btnCollapse.textContent = 'Show menu';
		this.btnToggleDebug.textContent = 'Debug: OFF';
		this.btnToggleCamView.textContent = 'Show Camera';
		this.debugEl.style.display = 'none';
		this.posX = doc.getElementById('posX');
		this.posY = doc.getElementById('posY');
		this.posZ = doc.getElementById('posZ');

		this._wireEvents(doc);
	}

	_wireEvents(doc) {
		this.btnStart.addEventListener('click', () => this._emit('startStop'));
		this.btnCalibrate.addEventListener('click', () => this._emit('calibrate'));

		doc.defaultView.addEventListener('keydown', (e) => {
			if (e.code === 'Space') this._emit('calibrate');
		});

		this.btnToggleDebug.addEventListener('click', () => {
			this._debugOn = !this._debugOn;
			this.btnToggleDebug.textContent = this._debugOn ? 'Debug: ON' : 'Debug: OFF';
			this.debugEl.style.display = this._debugOn ? 'block' : 'none';
			if (!this._debugOn) this.debugEl.textContent = '';
		});

		this.btnCollapse.addEventListener('click', () => {
			const collapsed = this.hud.classList.toggle('collapsed');
			this.btnCollapse.textContent = collapsed ? 'Show menu' : 'Hide menu';
		});

		this.btnToggleCamView.addEventListener('click', () => {
			this._camViewOn = !this._camViewOn;
			this.btnToggleCamView.textContent = this._camViewOn ? 'Hide Camera' : 'Show Camera';
			this._emit('camViewToggle', this._camViewOn);
		});

		this.sceneSelect.addEventListener('change', () => {
			this._emit('sceneChange', this.sceneSelect.value);
		});

		this.toggleAxes.addEventListener('change', () => {
			this._emit('axesToggle', this.toggleAxes.checked);
		});

		const emitPos = () => {
			this._emit('posChange', {
				x: parseFloat(this.posX.value),
				y: parseFloat(this.posY.value),
				z: parseFloat(this.posZ.value),
			});
		};

		this.posX.addEventListener('input', emitPos);
		this.posY.addEventListener('input', emitPos);
		this.posZ.addEventListener('input', emitPos);

		const emitCamDist = () => {
			this._emit('camDistChange', parseFloat(this.camDist.value));
		};

		const emitRoom = () => {
			this._emit('roomChange', {
				width: parseFloat(this.roomW.value),
				height: parseFloat(this.roomH.value),
				depth: parseFloat(this.roomD.value),
				div: parseInt(this.gridDiv.value, 10),
			});
		};

		this.camDist.addEventListener('input', emitCamDist);

		this.roomW.addEventListener('input', emitRoom);
		this.roomH.addEventListener('input', emitRoom);
		this.roomD.addEventListener('input', emitRoom);
		this.gridDiv.addEventListener('input', emitRoom);

	}

	on(eventName, cb) {
		this._listeners[eventName]?.push(cb);
	}

	_emit(eventName, payload) {
		const list = this._listeners[eventName] || [];
		for (const cb of list) cb(payload);
	}

	// getters
	getScene() { return this.sceneSelect.value; }
	getStrength() { return parseFloat(this.strengthSlider.value); }
	getSmoothing() { return parseFloat(this.smoothingSlider.value); }
	isDebugOn() { return this._debugOn; }
	isCamViewOn() { return this._camViewOn; }
	areAxesOn() { return this.toggleAxes.checked; }
	getPos() {
		return {
			x: parseFloat(this.posX.value),
			y: parseFloat(this.posY.value),
			z: parseFloat(this.posZ.value),
		};
	}
	getCamDistance() {
		return parseFloat(this.camDist.value);
	}

	getRoomParams() {
		return {
			width: parseFloat(this.roomW.value),
			height: parseFloat(this.roomH.value),
			depth: parseFloat(this.roomD.value),
			div: parseInt(this.gridDiv.value, 10),
		};
	}


	// UI updates
	setStatus(text) { this.statusEl.textContent = text; }
	setRunning(running) { this.btnStart.textContent = running ? 'Stop camera' : 'Start camera'; }
	setDebugText(text) {
		if (!this._debugOn) return;
		this.debugEl.textContent = text;
	}
}
