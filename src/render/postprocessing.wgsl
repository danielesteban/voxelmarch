@group(0) @binding(0) var colorTexture: texture_2d<f32>;
@group(0) @binding(1) var dataTexture: texture_2d<f32>;

const edgeColor : vec3<f32> = vec3<f32>(0, 0, 0);
const edgeIntensity : f32 = 0.3;
const depthScale : f32 = 0.3;
const normalScale : f32 = 0.3;
const offset : vec3<i32> = vec3<i32>(1, 1, 0);

fn getEdge(pixel : vec2<i32>) -> f32 {
  let pixelCenter : vec4<f32> = textureLoad(dataTexture, pixel, 0);
  let pixelLeft : vec4<f32> = textureLoad(dataTexture, pixel - offset.xz, 0);
  let pixelRight : vec4<f32> = textureLoad(dataTexture, pixel + offset.xz, 0);
  let pixelUp : vec4<f32> = textureLoad(dataTexture, pixel + offset.zy, 0);
  let pixelDown : vec4<f32> = textureLoad(dataTexture, pixel - offset.zy, 0);
  let edge : vec4<f32> = (
    abs(pixelLeft    - pixelCenter)
    + abs(pixelRight - pixelCenter) 
    + abs(pixelUp    - pixelCenter) 
    + abs(pixelDown  - pixelCenter)
  );
  return clamp(max((edge.x + edge.y + edge.z) * normalScale, edge.w * depthScale), 0, 1);
}

fn linearTosRGB(linear: vec3<f32>) -> vec3<f32> {
  if (all(linear <= vec3<f32>(0.0031308))) {
    return linear * 12.92;
  }
  return (pow(abs(linear), vec3<f32>(1.0/2.4)) * 1.055) - vec3<f32>(0.055);
}

@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4<f32> {
  const quad = array(
    vec2<f32>( 1,  1),
    vec2<f32>( 1, -1),
    vec2<f32>(-1, -1),
    vec2<f32>( 1,  1),
    vec2<f32>(-1, -1),
    vec2<f32>(-1,  1)
  );

  return vec4<f32>(quad[index], 0, 1);
}

@fragment fn fragmentMain(@builtin(position) uv: vec4<f32>) -> @location(0) vec4<f32> {
  let pixel = vec2<i32>(floor(uv.xy));
  let color = textureLoad(colorTexture, pixel, 0).xyz;
  let depth = textureLoad(dataTexture, pixel, 0).w;
  return vec4<f32>(linearTosRGB(
    mix(color, edgeColor, getEdge(pixel) * edgeIntensity)
  ), 1);
}
