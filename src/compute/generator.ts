import Noise from './noise.wgsl';
import Program from './generator.wgsl';

class Generator {
  private readonly data: GPUBuffer;
  private readonly device: GPUDevice;
  private readonly bindings: GPUBindGroup;
  private readonly pipeline: GPUComputePipeline;
  private readonly workgroups: Uint32Array;

  constructor(
    device: GPUDevice,
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
          code: Noise + Program,
        }),
      },
    });
    const seed = device.createBuffer({
      size: 3 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM,
      mappedAtCreation: true,
    });
    new Float32Array(seed.getMappedRange()).set([
      Math.random() * 1337,
      Math.random() * 1337,
      Math.random() * 1337,
    ]);
    seed.unmap();
    this.bindings = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.data },
        },
        {
          binding: 1,
          resource: { buffer: size.gpu },
        },
        {
          binding: 2,
          resource: { buffer: seed },
        },
      ],
    });
    this.workgroups = new Uint32Array([
      Math.ceil(size.cpu[0] / 2 / 4),
      Math.ceil(size.cpu[1] / 16),
      Math.ceil(size.cpu[2] / 8)
    ]);
  }

  compute() {
    const { bindings, device, pipeline, workgroups } = this;
    const command = device.createCommandEncoder();
    const pass = command.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindings);
    pass.dispatchWorkgroups(workgroups[0], workgroups[1], workgroups[2]);
    pass.end();
    device.queue.submit([command.finish()]);
  }
}

export default Generator;
