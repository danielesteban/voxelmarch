struct Update {
  pointer: vec2<f32>,
  radius: i32,
  value: u32,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read_write> data: array<u32>;
@group(0) @binding(2) var<uniform> size: vec3<u32>;
@group(0) @binding(3) var<uniform> update: Update;

@workgroup_size(1) @compute fn main() {
  let rayOrigin = vec3<f32>(
    camera.view[3][0],
    camera.view[3][1],
    camera.view[3][2]
  );
  let rayDirection = normalize(
    (camera.view * camera.projection * vec4<f32>(update.pointer, 1, 1)).xyz
  ) * 10000;

  var position: vec3<f32>;
  var normal: vec3<f32>;
  var voxel: vec3<u32>;
  var value: u32;
  let rayIntersectsVoxel = rayVoxelIntersection(
    rayOrigin,
    rayDirection,
    &position,
    &normal,
    &voxel,
    &value
  );

  if (rayIntersectsVoxel) {
    let u32Size = vec3<u32>(size.x / 4, size.yz);
    for (var z = -update.radius; z <= update.radius; z++) {
      for (var y = -update.radius; y <= update.radius; y++) {
        for (var x = -update.radius; x <= update.radius; x++) {
          if (distance(vec3<f32>(f32(x), f32(y), f32(z)), vec3<f32>(0, 0, 0)) >= f32(update.radius)) {
            continue;
          }
          let pos = vec3<u32>(
            vec3<i32>(voxel) + vec3<i32>(x, y, z)
          );
          if (any(pos >= size)) {
            continue;
          }
          let i = pos.z * u32Size.x * u32Size.y + pos.y * u32Size.x + (pos.x / 4);
          let b = (pos.x % 4) * 8;
          data[i] &= ~u32(0xFF << b);
          data[i] |= (update.value << b);
        }
      }
    }
  }
}
