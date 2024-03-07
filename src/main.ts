import './main.css';
import Input, { Action } from './compute/input';
import Marcher from './render/marcher';
import Renderer from './render/renderer';
import Volume from './compute/volume';

const Main = (device: GPUDevice) => {
  const dom = document.getElementById('app');
  if (!dom) {
    throw new Error("Couldn't get app DOM node");
  }
  const renderer = new Renderer(device);
  const input = new Input(renderer.getCanvas());
  const volume = new Volume(
    renderer.getDevice(),
    renderer.getCamera().getBuffer(),
    new Uint32Array([256, 384, 256])
  );
  volume.generate();
  const marcher = new Marcher(
    renderer.getDevice(),
    renderer.getCamera().getBuffer(),
    volume.getData(),
    volume.getPalette(),
    volume.getSize()
  );
  renderer.add(marcher);
  renderer.setAnimationLoop((command, delta) => {
    if (input.update(delta)) {
      const view = input.getView();
      renderer.getCamera().setOrbit(view.phi, view.theta, view.radius);
    }
    if (input.getAction() === Action.paint) {
      volume.update(command, input.getPointer(), 12, 0);
    }
  });
  renderer.setFPS(document.getElementById('fps'));
  dom.appendChild(renderer.getCanvas());
};

const GPU = async () => {
  if (!navigator.gpu) {
    throw new Error("Couldn't load WebGPU");
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("Couldn't load WebGPU adapter");
  }
  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error("Couldn't load WebGPU device");
  }
  return device;
};

const prevent = (e: Event) => e.preventDefault();
window.addEventListener('contextmenu', prevent);
window.addEventListener('keydown', (e) => (
  e.key === ' '
  && !['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase())
  && prevent(e)
));
window.addEventListener('touchstart', prevent);
window.addEventListener('wheel', (e) => e.ctrlKey && prevent(e), { passive: false });

GPU()
  .then(Main)
  .catch((e) => {
    document.getElementById('error')!.innerText = e.message;
    document.getElementById('support')!.classList.remove('hidden');
  })
  .finally(() => document.getElementById('loading')!.classList.add('hidden'));
