@group(0) @binding(0) var<storage, read_write> data: array<u32>;
@group(0) @binding(1) var<uniform> size: vec3<u32>;
@group(0) @binding(2) var<uniform> seed: vec3<f32>;

@workgroup_size(2, 16, 8) @compute fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let u32Size = vec3<u32>(size.x / 4, size.yz);
  if (any(id >= u32Size)) {
    return;
  }
  let center = vec2<f32>(size.xz) * 0.5;
  var value: u32 = 0;
  for (var i: u32 = 0; i < 4; i++) {
    let pos = vec3<u32>(id.x * 4 + i, id.yz);
    let voxel = vec3<f32>(pos) + seed;
    if (
      length(vec2<f32>(pos.xz) - center)
      >= 120 + FBM(voxel * 0.005) * 8
    ) {
      continue;
    }
    if (FBM(voxel * 0.006) > 0) {
      value |= (u32((FBM(voxel * vec3<f32>(0.005, 0.01, 0.005)) * 0.5 + 0.5) * 256) & 0xFF) << (i * 8);
    }
  }
  data[id.z * u32Size.x * u32Size.y + id.y * u32Size.x + id.x] = value;
}
