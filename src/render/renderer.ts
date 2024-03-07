import Camera from './camera';
import Postprocessing from './postprocessing';

export type Renderable = {
  render: (pass: GPURenderPassEncoder) => void,
};

class Renderer {
  private readonly animation: {
    fps: {
      count: number;
      dom: HTMLElement | null;
      frame: number;
      tick: number;
    };  
    loop: (command: GPUCommandEncoder, delta: number, time: number) => void;
    request: number;
    time: number;
  };
  private readonly camera: Camera;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: GPUCanvasContext;
  private readonly descriptor: GPURenderPassDescriptor;
  private readonly device: GPUDevice;
  private readonly format: GPUTextureFormat;
  private readonly postprocessing: Postprocessing;
  private readonly renderables: Renderable[];
  private readonly textures: {
    attachment: GPURenderPassColorAttachment;
    texture: GPUTexture;
  }[];

  constructor(device: GPUDevice) {
    this.camera = new Camera(device);
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('webgpu');
    if (!context) {
      throw new Error("Couldn't get GPUCanvasContext");
    }
    this.context = context;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ alphaMode: 'opaque', device, format: this.format });
    this.postprocessing = new Postprocessing(device, this.format);
    this.textures = [
      {
        attachment: {
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
          view: undefined as unknown as GPUTextureView,
        },
        texture: undefined as unknown as GPUTexture,
      },
      {
        attachment: {
          clearValue: { r: 0, g: 0, b: 0, a: 10000 },
          loadOp: 'clear',
          storeOp: 'store',
          view: undefined as unknown as GPUTextureView,
        },
        texture: undefined as unknown as GPUTexture,
      },
    ];
    this.descriptor = {
      colorAttachments: [
        this.textures[0].attachment,
        this.textures[1].attachment,
      ],
    };
    
    this.device = device;
    this.renderables = [];

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    this.animate = this.animate.bind(this);
    this.animation = {
      fps: {
        count: 0,
        dom: null,
        frame: 0,
        tick: performance.now() / 1000,
      },    
      loop: () => {},
      request: requestAnimationFrame(this.animate),
      time: performance.now() / 1000,
    };
    this.visibilitychange = this.visibilitychange.bind(this);
    document.addEventListener('visibilitychange', this.visibilitychange);
  }

  add(renderable: Renderable) {
    this.renderables.push(renderable);
  }

  getCanvas() {
    return this.canvas;
  }

  getCamera() {
    return this.camera;
  }

  getDevice() {
    return this.device;
  }

  getFormat() {
    return this.format;
  }

  getFPS() {
    return this.animation.fps.count;
  }

  setAnimationLoop(loop: (command: GPUCommandEncoder, delta: number, time: number) => void) {
    this.animation.loop = loop;
  }

  setFPS(dom: HTMLElement | null) {
    this.animation.fps.dom = dom;
  }

  private animate() {
    const { animation, device } = this;
    const time = performance.now() / 1000;
    const delta = Math.min(time - animation.time, 0.1);
    animation.time = time;
    animation.fps.frame++;
    if (time >= animation.fps.tick + 1) {
      const count = Math.round(animation.fps.frame / (time - animation.fps.tick));
      if (animation.fps.count !== count) {
        animation.fps.count = count;
        if (animation.fps.dom) {
          animation.fps.dom.innerText = `${count}fps`;
        }
      }
      animation.fps.frame = 0;
      animation.fps.tick = time;
    }
    animation.request = requestAnimationFrame(this.animate);

    const command = device.createCommandEncoder();
    animation.loop(command, delta, time);
    this.render(command);
    device.queue.submit([command.finish()]);
  }

  private render(command: GPUCommandEncoder) {
    const { context, descriptor, postprocessing, renderables } = this;
    const pass = command.beginRenderPass(descriptor);
    renderables.forEach((renderable) => renderable.render(pass));
    pass.end();
    postprocessing.render(command, context.getCurrentTexture().createView());
  }

  private resize() {
    const { camera, canvas, device, postprocessing, textures } = this;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    const size = [Math.floor(width * pixelRatio), Math.floor(height * pixelRatio)];
    canvas.width = size[0];
    canvas.height = size[1];
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    camera.setAspect(width / height);
    postprocessing.setTextures(
      ...textures.map((texture) => {
        if (texture.texture) {
          texture.texture.destroy();
        }
        texture.texture = device.createTexture({
          format: 'rgba16float',
          size,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        return texture.attachment.view = texture.texture.createView();
      }) as [GPUTextureView, GPUTextureView]
    );
  }

  private visibilitychange() {
    const { animation } = this;
    cancelAnimationFrame(animation.request);
    if (document.visibilityState === 'visible') {
      animation.fps.frame = -1;
      animation.fps.tick = animation.time = performance.now() / 1000;
      animation.request = requestAnimationFrame(this.animate);
    }
  }
}

export default Renderer;
