struct VertexInput {
  @builtin(vertex_index) index: u32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) ray: vec3<f32>,
}

struct FragmentInput {
  @location(0) ray: vec3<f32>,
}

struct FragmentOutput {
  @location(0) color: vec4<f32>,
  @location(1) data: vec4<f32>,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> data: array<u32>;
@group(0) @binding(2) var irradianceMap: texture_cube<f32>;
@group(0) @binding(3) var irradianceSampler: sampler;
@group(0) @binding(4) var<storage, read> palette: array<u32>;
@group(0) @binding(5) var<uniform> size: vec3<u32>;

fn getColor(id: u32) -> vec3<f32> {
  let color = palette[id];
  let srgb = vec3<f32>(
    f32((color >> 16) & 0xFF) / 0xFF,
    f32((color >> 8) & 0xFF) / 0xFF,
    f32(color & 0xFF) / 0xFF
  );
  if (all(srgb <= vec3<f32>(0.04045))) {
    return srgb * 0.0773993808;
  }
  return pow(srgb * 0.9478672986 + 0.0521327014, vec3<f32>(2.4));
}

@vertex fn vertexMain(vertex: VertexInput) -> VertexOutput {
  const quad = array(
    vec2<f32>( 1,  1),
    vec2<f32>( 1, -1),
    vec2<f32>(-1, -1),
    vec2<f32>( 1,  1),
    vec2<f32>(-1, -1),
    vec2<f32>(-1,  1)
  );

  var out: VertexOutput;
  out.position = vec4<f32>(quad[vertex.index], 0, 1);
  out.ray = normalize(
    (camera.view * camera.projection * vec4<f32>(out.position.xy, 1, 1)).xyz
  );
  return out;
}

@fragment fn fragmentMain(fragment: FragmentInput) -> FragmentOutput {
  let rayOrigin = vec3<f32>(
    camera.view[3][0],
    camera.view[3][1],
    camera.view[3][2]
  );
  let rayDirection = normalize(fragment.ray) * 10000;

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

  var output: FragmentOutput;
  output.color = vec4<f32>(0.24228, 0.61721, 0.83077, 1);
  output.data = vec4<f32>(0, 0, 0, 10000);

  if (rayIntersectsVoxel) {
    output.color = vec4<f32>(getColor(value), 1);
    output.data = vec4<f32>(
      normal,
      distance(position, rayOrigin)
    );

    let sun = normalize(vec3<f32>(0, 1, 0.5)) * 1000;
    var light = (
      vec3<f32>(0.3)
      + 0.3 * textureSampleLevel(irradianceMap, irradianceSampler, normal, 0.0).rgb
      + vec3<f32>(0.6) * max(dot(normal, normalize(sun)), 0.0)
    );
    if (
      rayVoxelIntersection(
        position + normal * 0.001,
        normalize(sun - position) * 10000,
        &position,
        &normal,
        &voxel,
        &value
      )
    ) {
      light *= 0.6;
    }
    output.color = vec4(output.color.rgb * light, output.color.a);
  }

  return output;
}
