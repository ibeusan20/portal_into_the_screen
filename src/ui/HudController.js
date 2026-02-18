import { Emitter } from '../utils/emitter.js';

export class HudController extends Emitter {
	constructor(doc) {
		super();

		this.hud = doc.getElementById('hud');
		this.statusEl = doc.getElementById('status');
		this.debugEl = doc.getElementById('debug');

		this.btnStart = doc.getElementById('btnStart');
		this.btnCalibrate = doc.getElementById('btnCalibrate');
		this.btnToggleDebug = doc.getElementById('btnToggleDebug');
		this.btnCollapse = doc.getElementById('btnCollapse');
		this.btnToggleCamView = doc.getElementById('btnToggleCamView');
		this.toggleAutoZoom = doc.getElementById('toggleAutoZoom');

		this.sceneSelect = doc.getElementById('sceneSelect');
		this.strengthSlider = doc.getElementById('parallax');
		this.smoothingSlider = doc.getElementById('smoothing');
		this.camDist = doc.getElementById('camDist');

		this.posX = doc.getElementById('posX');
		this.posY = doc.getElementById('posY');
		this.posZ = doc.getElementById('posZ');

		this.targetX = doc.getElementById('targetX');
		this.targetY = doc.getElementById('targetY');
		this.targetZ = doc.getElementById('targetZ');


		this.roomW = doc.getElementById('roomW');
		this.roomH = doc.getElementById('roomH');
		this.roomD = doc.getElementById('roomD');
		this.gridDiv = doc.getElementById('gridDiv');

		this.toggleAxes = doc.getElementById('toggleAxes');

		this._debugOn = false;
		this._camViewOn = false;

		// default UI state
		this.hud.classList.add('collapsed');
		this.btnCollapse.textContent = 'Show menu';
		this.btnToggleDebug.textContent = 'Debug: OFF';
		this.btnToggleCamView.textContent = 'Show camera';
		this.debugEl.style.display = 'none';

		this.#wire(doc);
	}

	#wire(doc) {
		this.btnStart.addEventListener('click', () => this.emit('startStop'));
		this.btnCalibrate.addEventListener('click', () => this.emit('calibrate'));

		doc.defaultView.addEventListener('keydown', (e) => {
			if (e.code === 'Space') this.emit('calibrate');
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
			this.btnToggleCamView.textContent = this._camViewOn ? 'Hide camera' : 'Show camera';
			this.emit('camViewToggle', this._camViewOn);
		});

		this.sceneSelect.addEventListener('change', () => {
			this.emit('sceneChange', this.sceneSelect.value);
		});

		this.toggleAxes.addEventListener('change', () => {
			this.emit('axesToggle', this.toggleAxes.checked);
		});

		this.toggleAutoZoom.addEventListener('change', () => {
			this.emit('autoZoomToggle', this.toggleAutoZoom.checked);
		});

		const emitPos = () => this.emit('posChange', this.getPos());
		this.posX.addEventListener('input', emitPos);
		this.posY.addEventListener('input', emitPos);
		this.posZ.addEventListener('input', emitPos);

		this.camDist.addEventListener('input', () => {
			this.emit('camDistChange', this.getCamDistance());
		});

		const emitTarget = () => this.emit('targetChange', this.getTarget());

		this.targetX.addEventListener('input', emitTarget);
		this.targetY.addEventListener('input', emitTarget);
		this.targetZ.addEventListener('input', emitTarget);


		const emitRoom = () => this.emit('roomChange', this.getRoomParams());
		const emitRoomCommit = () => this.emit('roomChangeCommit', this.getRoomParams());

		this.roomW.addEventListener('input', emitRoom);
		this.roomH.addEventListener('input', emitRoom);
		this.roomD.addEventListener('input', emitRoom);
		this.gridDiv.addEventListener('input', emitRoom);

		this.roomW.addEventListener('change', emitRoomCommit);
		this.roomH.addEventListener('change', emitRoomCommit);
		this.roomD.addEventListener('change', emitRoomCommit);
		this.gridDiv.addEventListener('change', emitRoomCommit);
	}

	// getters
	getScene() { return this.sceneSelect.value; }
	getStrength() { return parseFloat(this.strengthSlider.value); }
	getSmoothing() { return parseFloat(this.smoothingSlider.value); }
	getCamDistance() { return parseFloat(this.camDist.value); }
	isDebugOn() { return this._debugOn; }
	isCamViewOn() { return this._camViewOn; }
	areAxesOn() { return this.toggleAxes.checked; }
	isAutoZoomOn() { return this.toggleAutoZoom.checked; }

	getPos() {
		return {
			x: parseFloat(this.posX.value),
			y: parseFloat(this.posY.value),
			z: parseFloat(this.posZ.value),
		};
	}

	getTarget() {
		return {
			x: parseFloat(this.targetX.value),
			y: parseFloat(this.targetY.value),
			z: parseFloat(this.targetZ.value),
		};
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
	setDebugText(text) { if (this._debugOn) this.debugEl.textContent = text; }
}
