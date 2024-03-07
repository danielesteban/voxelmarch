import Program from './postprocessing.wgsl';

class Postprocessing {
  private bindings: GPUBindGroup | undefined;
  private readonly descriptor: GPURenderPassDescriptor;
  private readonly device: GPUDevice;
  private readonly pipeline: GPURenderPipeline;

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat
  ) {
    this.descriptor = {
      colorAttachments: [{
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
        view: undefined as unknown as GPUTextureView,
      }],
    };
    this.device = device;
    const module = device.createShaderModule({
      code: Program,
    });
    this.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        entryPoint: 'vertexMain',
        module,
      },
      fragment: {
        entryPoint: 'fragmentMain',
        module,
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  setTextures(color: GPUTextureView, data: GPUTextureView) {
    const { device, pipeline } = this;
    this.bindings = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: color,
        },
        {
          binding: 1,
          resource: data,
        },
      ],
    });
  }

  render(command: GPUCommandEncoder, output: GPUTextureView) {
    const { bindings, descriptor, pipeline } = this;
    if (!bindings) {
      throw new Error('Trying to render postprocessing without textures');
    }
    (descriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = output;
    const pass = command.beginRenderPass(descriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindings);
    pass.draw(6);
    pass.end();
  }
}

export default Postprocessing;
