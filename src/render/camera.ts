import { glMatrix, mat4, vec3 } from 'gl-matrix';

class Camera {
  private static readonly offset = vec3.create();
  private static readonly worldUp = vec3.fromValues(0, 1, 0);

  private aspect: number;
  private fov: number;
  private near: number;
  private far: number;

  private readonly position = vec3.create();
  private readonly target = vec3.create();

  private readonly projectionMatrix = mat4.create();
  private readonly inverseProjectionMatrix = mat4.create();
  private readonly viewMatrix = mat4.create();
  private readonly inverseViewMatrix = mat4.create();

  private readonly buffer: GPUBuffer;
  private readonly data = new Float32Array(16 * 2);
  private readonly device: GPUDevice;

  constructor(
    device: GPUDevice,
    aspect = 1,
    fov = 75,
    near = 0.1,
    far = 10000
  ) {
    this.aspect = aspect;
    this.fov = fov;
    this.near = near;
    this.far = far;

    this.buffer = device.createBuffer({
      size: this.data.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    this.device = device;
  }

  getBuffer() {
    return this.buffer;
  }

  setAspect(aspect: number) {
    this.aspect = aspect;
    this.updateProjection();
  }

  setOrbit(phi: number, theta: number, radius: number) {
    const { offset } = Camera;
    const { position, target } = this;
    const sinPhiRadius = Math.sin(phi) * radius;
    vec3.add(
      position,
      target,
      vec3.set(
        offset,
        sinPhiRadius * Math.sin(theta),
        Math.cos(phi) * radius,
        sinPhiRadius * Math.cos(theta)
      )
    );
    this.updateView();
  }

  private updateProjection() {
    const { projectionMatrix, inverseProjectionMatrix, aspect, fov, near, far } = this;
    mat4.perspective(projectionMatrix, glMatrix.toRadian(fov), aspect, near, far);
    mat4.invert(inverseProjectionMatrix, projectionMatrix);
    this.updateBuffer();
  }

  private updateView() {
    const { worldUp } = Camera;
    const { viewMatrix, inverseViewMatrix, position, target } = this;
    mat4.lookAt(viewMatrix, position, target, worldUp);
    mat4.invert(inverseViewMatrix, viewMatrix);
    this.updateBuffer();
  }

  private updateBuffer() {
    const { device, buffer, data, inverseProjectionMatrix, inverseViewMatrix } = this;
    data.set(inverseProjectionMatrix, 0);
    data.set(inverseViewMatrix, 16);
    device.queue.writeBuffer(buffer, 0, data);
  }
}

export default Camera;
