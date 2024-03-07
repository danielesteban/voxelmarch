import Intersection from '../compute/intersection.wgsl';
import Irradiance from '../compute/irradiance';
import Program from './marcher.wgsl';

class Marcher {
  private readonly bindings: GPUBindGroup;
  private readonly pipeline: GPURenderPipeline;

  constructor(
    device: GPUDevice,
    camera: GPUBuffer,
    data: GPUBuffer,
    palette: GPUBuffer,
    size: GPUBuffer
  ) {
    const irradiance = new Irradiance(device);
    const module = device.createShaderModule({
      code: Intersection + Program,
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
        targets: [
          { format: 'rgba16float' },
          { format: 'rgba16float' },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
    this.bindings = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: camera },
        },
        {
          binding: 1,
          resource: { buffer: data },
        },
        {
          binding: 2,
          resource: irradiance.getTexture(),
        },
        {
          binding: 3,
          resource: device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
          }),
        },
        {
          binding: 4,
          resource: { buffer: palette },
        },
        {
          binding: 5,
          resource: { buffer: size },
        },
      ],
    });
  }

  render(pass: GPURenderPassEncoder) {
    const { bindings, pipeline } = this;
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindings);
    pass.draw(6);
  }
}

export default Marcher;
