import { vec2 } from 'gl-matrix';

export enum Action {
  none,
  paint,
  view,
}

class Input {
  private static readonly sensitivity = {
    view: 0.001,
    zoom: 0.0001,
  };
  private static readonly minPhi = 0.01;
  private static readonly maxPhi = Math.PI - 0.01;
  private static readonly minZoom = Math.log(1);
  private static readonly maxZoom = Math.log(400);
  private static readonly zoomRange = Input.maxZoom - Input.minZoom;

  private action: Action = Action.none; 
  private readonly pointer = {
    movement: vec2.create(),
    position: vec2.create(),
  };
  private readonly view = {
    state: vec2.fromValues(Math.PI * 0.3 - 0.001, Math.PI * 0.125 - 0.001),
    target: vec2.fromValues(Math.PI * 0.3, Math.PI * 0.125),
  };
  private readonly zoom = {
    state: 350 - 0.001,
    target: 350,
  };

  constructor(target: HTMLElement) {
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);

    target.addEventListener('pointerdown', this.onPointerDown);
    target.addEventListener('wheel', this.onWheel);
  }

  update(delta: number) {
    const { minPhi, maxPhi } = Input;
    const { action, pointer, view, zoom } = this;

    let hasUpdated = false;

    if (
      action === Action.view
      && (pointer.movement[0] !== 0 || pointer.movement[1] !== 0)
    ) {
      view.target[1] += pointer.movement[0];
      view.target[0] = Math.min(Math.max(view.target[0] + pointer.movement[1], minPhi), maxPhi);
      vec2.set(pointer.movement, 0, 0);
    }

    const damp = 1 - Math.exp(-10 * delta);
    if (Math.max(Math.abs(view.state[0] - view.target[0]), Math.abs(view.state[1] - view.target[1])) > 0.001) {
      vec2.lerp(view.state, view.state, view.target, damp);
      hasUpdated = true;
    }
    if (Math.abs(zoom.state - zoom.target) > 0.001) {
      zoom.state = zoom.state * (1 - damp) + zoom.target * damp;
      hasUpdated = true;
    }

    return hasUpdated;
  }

  getAction() {
    return this.action;
  }

  getPointer() {
    return this.pointer.position as Float32Array;
  }

  getView() {
    const { view, zoom } = this;
    return {
      phi: view.state[0],
      theta: view.state[1],
      radius: zoom.state,
    };
  }

  private onPointerDown(e: PointerEvent) {
    switch (e.button) {
      case 0:
        this.action = Action.paint;
        break;
      case 2:
        this.action = Action.view;
        break;
      default:
        return;
    }
    this.onPointerMove(e);
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.addEventListener('lostpointercapture', this.onPointerUp);
    target.addEventListener('pointermove', this.onPointerMove);
    target.addEventListener('pointerup', this.onPointerUp);
    target.style.cursor = this.action === Action.view ? 'grabbing' : 'crosshair';
  }

  private onPointerMove({ clientX, clientY, movementX, movementY }: PointerEvent) {
    const { sensitivity } = Input;
    const { pointer } = this;
    vec2.set(
      pointer.movement,
      -movementX * sensitivity.view,
      -movementY * sensitivity.view
    );
    vec2.set(
      pointer.position,
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
  }

  private onPointerUp(e: PointerEvent) {
    this.action = Action.none;
    const target = e.target as HTMLElement;
    target.removeEventListener('lostpointercapture', this.onPointerUp);
    target.removeEventListener('pointermove', this.onPointerMove);
    target.removeEventListener('pointerup', this.onPointerUp);
    target.releasePointerCapture(e.pointerId);
    target.style.cursor = '';
  }

  private onWheel(e: WheelEvent) {
    const { sensitivity, minZoom, zoomRange } = Input;
    const { zoom } = this;
    const logZoom = Math.min(
      Math.max(
        ((Math.log(zoom.target) - minZoom) / zoomRange) + (e.deltaY * sensitivity.zoom),
        0
      ),
      1
    );
    zoom.target = Math.exp(minZoom + logZoom * zoomRange);
  }
}

export default Input;
