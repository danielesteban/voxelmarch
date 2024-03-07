struct Bounds {
  min: vec3<f32>,
  max: vec3<f32>,
}

struct Camera {
  projection: mat4x4<f32>,
  view: mat4x4<f32>,
}

fn getVoxel(pos: vec3<u32>) -> u32 {
  let u32Size = vec3<u32>(size.x / 4, size.yz);
  return (data[pos.z * u32Size.x * u32Size.y + pos.y * u32Size.x + (pos.x / 4)] >> ((pos.x % 4) * 8)) & 0xFF;
}

fn rayBoxIntersection(
  bounds: Bounds,
  rayOrigin: vec3<f32>,
  rayDirection: vec3<f32>,
  normal: ptr<function, vec3<f32>>,
  tMin: ptr<function, f32>,
  tMax: ptr<function, f32>
) -> bool {
  var tYMin: f32;
  var tYMax: f32;
  var tZMin: f32;
  var tZMax: f32;

  let xInvDir = 1 / rayDirection.x;
  if (xInvDir >= 0) {
    *tMin = (bounds.min.x - rayOrigin.x) * xInvDir;
    *tMax = (bounds.max.x - rayOrigin.x) * xInvDir;
    *normal = vec3<f32>(-1, 0, 0);
  } else {
    *tMin = (bounds.max.x - rayOrigin.x) * xInvDir;
    *tMax = (bounds.min.x - rayOrigin.x) * xInvDir;
  }

  *normal = vec3<f32>(1, 0, 0);
  if (xInvDir >= 0) { *normal *= -1; }

  let yInvDir = 1 / rayDirection.y;
  if (yInvDir >= 0) {
    tYMin = (bounds.min.y - rayOrigin.y) * yInvDir;
    tYMax = (bounds.max.y - rayOrigin.y) * yInvDir;
  } else {
    tYMin = (bounds.max.y - rayOrigin.y) * yInvDir;
    tYMax = (bounds.min.y - rayOrigin.y) * yInvDir;
  }

  if (*tMin > tYMax || tYMin > *tMax) { return false; }
  if (tYMin > *tMin) {
    *tMin = tYMin;
    *normal = vec3<f32>(0, 1, 0);
    if (yInvDir >= 0) { *normal *= -1; }
  }
  if (tYMax < *tMax) { *tMax = tYMax; }

  let zInvDir = 1 / rayDirection.z;
  if (zInvDir >= 0) {
    tZMin = (bounds.min.z - rayOrigin.z) * zInvDir;
    tZMax = (bounds.max.z - rayOrigin.z) * zInvDir;
  } else {
    tZMin = (bounds.max.z - rayOrigin.z) * zInvDir;
    tZMax = (bounds.min.z - rayOrigin.z) * zInvDir;
  }

  if (*tMin > tZMax || tZMin > *tMax) { return false; }
  if (tZMin > *tMin) {
    *tMin = tZMin;
    *normal = vec3<f32>(0, 0, 1);
    if (zInvDir >= 0) { *normal *= -1; }
  }
  if (tZMax < *tMax) { *tMax = tZMax; }

  return (*tMin < 1 && *tMax > 0);
}

fn rayVoxelIntersection(
  rayOrigin: vec3<f32>,
  rayDirection: vec3<f32>,
  position: ptr<function, vec3<f32>>,
  normal: ptr<function, vec3<f32>>,
  voxel: ptr<function, vec3<u32>>,
  value: ptr<function, u32>
) -> bool {
  let bounds = Bounds(
    vec3<f32>(size) * -0.5,
    vec3<f32>(size) * 0.5
  );

  var tMin: f32 = 0;
  var tMax: f32 = 0;
  let rayIntersectsVolume = rayBoxIntersection(
    bounds,
    rayOrigin,
    rayDirection,
    normal,
    &tMin,
    &tMax
  );
  if (!rayIntersectsVolume) {
    return false;
  }

  tMin = max(tMin, 0);
  tMax = min(tMax, 1);
  let rayStart = rayOrigin + rayDirection * tMin;
  let rayEnd = rayOrigin + rayDirection * tMax;
  let rayLen = rayEnd - rayStart;

  var currentX: i32 = max(1, i32(ceil(rayStart.x - bounds.min.x)));
  let endX = max(1, i32(ceil(rayEnd.x - bounds.min.x)));
  var stepX: i32;
  var tDeltaX: f32;
  var tMaxX: f32;
  if (rayDirection.x > 0) {
    stepX = 1;
    tDeltaX = 1 / rayDirection.x;
    tMaxX = tMin + (bounds.min.x + f32(currentX) - rayStart.x) / rayDirection.x;
  } else if (rayDirection.x < 0) {
    stepX = -1;
    tDeltaX = 1 / -rayDirection.x;
    let previousX = currentX - 1;
    tMaxX = tMin + (bounds.min.x + f32(previousX) - rayStart.x) / rayDirection.x;
  } else {
    stepX = 0;
    tDeltaX = tMax;
    tMaxX = tMax;
  }

  var currentY: i32 = max(1, i32(ceil(rayStart.y - bounds.min.y)));
  let endY = max(1, i32(ceil(rayEnd.y - bounds.min.y)));
  var stepY: i32;
  var tDeltaY: f32;
  var tMaxY: f32;
  if (rayDirection.y > 0) {
    stepY = 1;
    tDeltaY = 1 / rayDirection.y;
    tMaxY = tMin + (bounds.min.y + f32(currentY) - rayStart.y) / rayDirection.y;
  } else if (rayDirection.y < 0) {
    stepY= -1;
    tDeltaY = 1 / -rayDirection.y;
    let previousY = currentY - 1;
    tMaxY = tMin + (bounds.min.y + f32(previousY) - rayStart.y) / rayDirection.y;
  } else {
    stepY = 0;
    tDeltaY = tMax;
    tMaxY = tMax;
  }

  var currentZ: i32 = max(1, i32(ceil(rayStart.z - bounds.min.z)));
  let endZ = max(1, i32(ceil(rayEnd.z - bounds.min.z)));
  var stepZ: i32;
  var tDeltaZ: f32;
  var tMaxZ: f32;
  if (rayDirection.z > 0) {
    stepZ = 1;
    tDeltaZ = 1 / rayDirection.z;
    tMaxZ = tMin + (bounds.min.z + f32(currentZ) - rayStart.z) / rayDirection.z;
  } else if (rayDirection.z < 0) {
    stepZ = -1;
    tDeltaZ = 1 / -rayDirection.z;
    let previousZ = currentZ - 1;
    tMaxZ = tMin + (bounds.min.z + f32(previousZ) - rayStart.z) / rayDirection.z;
  } else {
    stepZ = 0;
    tDeltaZ = tMax;
    tMaxZ = tMax;
  }

  *position = rayStart;
  var iterations: u32;
  while (
    currentX != endX
    || currentY != endY
    || currentZ != endZ
  ) {
    iterations++;
    if (iterations > 1000) {
      return false;
    }
    *voxel = vec3<u32>(
      u32(currentX - 1),
      u32(currentY - 1),
      u32(currentZ - 1)
    );
    *value = getVoxel(*voxel);
    if (*value > 0) {
      return true;
    }

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      var v = currentX - 1;
      if (stepX > 0) {
        v += 1;
      }
      *position = rayStart + rayLen * ((bounds.min.x + f32(v) - rayStart.x) / rayLen.x);
      *normal = vec3<f32>(f32(-stepX), 0, 0);

      currentX += stepX;
      tMaxX += tDeltaX;
    } else if (tMaxY < tMaxZ) {
      var v = currentY - 1;
      if (stepY > 0) {
        v += 1;
      }
      *position = rayStart + rayLen * ((bounds.min.y + f32(v) - rayStart.y) / rayLen.y);
      *normal = vec3<f32>(0, f32(-stepY), 0);

      currentY += stepY;
      tMaxY += tDeltaY;
    } else {
      var v = currentZ - 1;
      if (stepZ > 0) {
        v += 1;
      }
      *position = rayStart + rayLen * ((bounds.min.z + f32(v) - rayStart.z) / rayLen.z);
      *normal = vec3<f32>(0, 0, f32(-stepZ));

      currentZ += stepZ;
      tMaxZ += tDeltaZ;
    }
  }

  return false;
}
