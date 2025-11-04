// shaders.js
export const vertexShaderSrc = `
  attribute vec2 aPos;
  attribute vec2 aUV;
  varying vec2 vUV;
  void main() {
    vUV = aUV;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

export const fragmentShaderSrc = `
  precision mediump float;

  uniform sampler2D uTex;
  uniform float uAspect;  // canvas.height / canvas.width
  uniform float uLat;     // pitch in degrees
  uniform float uLon;     // yaw in degrees

  varying vec2 vUV;

  const float PI = 3.141592653589793;
  const float HALF_HFOV = 45.0 * (PI / 180.0);

  mat3 rotateX(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
      1.0, 0.0, 0.0,
      0.0,   c,  -s,
      0.0,   s,   c
    );
  }

  mat3 rotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        c, 0.0,  s,
      0.0, 1.0, 0.0,
       -s, 0.0,  c
    );
  }

  void main() {
    float tanHalfHFOV = tan(HALF_HFOV);
    float tanHalfVFOV = tanHalfHFOV * uAspect;

    // NDC [-1, +1]
    float x = (vUV.x - 0.5) * 2.0;
    float y = (vUV.y - 0.5) * 2.0;

    // View ray from pinhole camera
    vec3 dir = normalize(vec3(
      x * tanHalfHFOV,
     -y * tanHalfVFOV,
      1.0
    ));

    float yaw   = radians(-uLon);
    float pitch = radians(-uLat);

    // Apply orientation
    dir = rotateY(yaw) * rotateX(pitch) * dir;

    // Convert direction to equirectangular
    float lon = atan(dir.x, dir.z);
    float lat = asin(dir.y);

    vec2 panoUV = vec2(
      lon / (2.0 * PI) + 0.5,
      0.5 - lat / PI
    );

    gl_FragColor = texture2D(uTex, panoUV);
  }
`;
