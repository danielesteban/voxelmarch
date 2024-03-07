import Generator from './generator';
import HSL from './hsl';
import Updater from './updater';

class Volume {
  private readonly data: GPUBuffer;
  private readonly palette: GPUBuffer;
  private readonly size: {
    cpu: Uint32Array;
    gpu: GPUBuffer;
  };
  private readonly generator: Generator;
  private readonly updater: Updater;

  constructor(
    device: GPUDevice,
    camera: GPUBuffer,
    size: Uint32Array
  ) {
    this.data = device.createBuffer({
      size: size[0] * size[1] * size[2],
      usage: GPUBufferUsage.STORAGE,
    });
    {
      this.palette = device.createBuffer({
        size: 256 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true,
      });
      const colors = new Uint32Array(this.palette.getMappedRange());
      const hueRange = Math.floor(Math.random() * 720) - 360;
      const hueOffset = Math.floor(Math.random() * 360);
      const saturation = 0.4 + Math.random() * 0.3;
      const lightness = 0.6 + Math.random() * 0.3;
      for (let i = 0; i < 256; i++) {
        colors[i] = HSL(Math.abs(hueOffset + i / 255 * hueRange) % 360, saturation, lightness);
      }
      this.palette.unmap();
    }
    {
      this.size = {
        cpu: size,
        gpu: device.createBuffer({
          size: 3 * Uint32Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.UNIFORM,
          mappedAtCreation: true,
        }),
      };
      new Uint32Array(this.size.gpu.getMappedRange()).set(size);
      this.size.gpu.unmap();
    }
    this.generator = new Generator(device, this.data, this.size);
    this.updater = new Updater(device, camera, this.data, this.size);
  }

  generate() {
    this.generator.compute();
  }

  update(command: GPUCommandEncoder, pointer: Float32Array, radius: number, value: number) {
    this.updater.compute(command, pointer, radius, value);
  }

  getData() {
    return this.data;
  }

  getPalette() {
    return this.palette;
  }

  getSize() {
    return this.size.gpu;
  }
}

export default Volume;
