import Intersection from './intersection.wgsl';
import Program from './updater.wgsl';

class Updater {
  private readonly data: GPUBuffer;
  private readonly device: GPUDevice;
  private readonly bindings: GPUBindGroup;
  private readonly pipeline: GPUComputePipeline;
  private readonly update: {
    cpu: {
      buffer: ArrayBuffer;
      pointer: Float32Array;
      radius: Int32Array;
      value: Uint32Array;
    };
    gpu: GPUBuffer;
  };

  constructor(
    device: GPUDevice,
    camera: GPUBuffer,
    data: GPUBuffer,
    size: {
      cpu: Uint32Array;
      gpu: GPUBuffer;
    }
  ) {
    this.data = data;
    this.device = device;
    this.pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        entryPoint: 'main',
        module: device.createShaderModule({
          code: Intersection + Program,
        }),
      },
    });
    const updateBuffer = new ArrayBuffer(4 * Uint32Array.BYTES_PER_ELEMENT);
    this.update = {
      cpu: {
        buffer: updateBuffer,
        pointer: new Float32Array(updateBuffer, 0, 2),
        radius: new Int32Array(updateBuffer, 2 * Float32Array.BYTES_PER_ELEMENT, 1),
        value: new Uint32Array(updateBuffer, 2 * Float32Array.BYTES_PER_ELEMENT + 1 * Int32Array.BYTES_PER_ELEMENT, 1),
      },
      gpu: device.createBuffer({
        size: 4 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
      }),
    };
    this.bindings = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: camera },
        },
        {
          binding: 1,
          resource: { buffer: this.data },
        },
        {
          binding: 2,
          resource: { buffer: size.gpu },
        },
        {
          binding: 3,
          resource: { buffer: this.update.gpu },
        },
      ],
    });
  }

  compute(command: GPUCommandEncoder, pointer: Float32Array, radius: number, value: number) {
    const { bindings, device, pipeline, update } = this;
    update.cpu.pointer.set(pointer);
    update.cpu.radius.set([radius]);
    update.cpu.value.set([value]);
    device.queue.writeBuffer(update.gpu, 0, update.cpu.buffer);
    const pass = command.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindings);
    pass.dispatchWorkgroups(1);
    pass.end();
  }
}

export default Updater;
