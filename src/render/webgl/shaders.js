export const SDF_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_unit;
in vec2 a_center;
in vec2 a_axisX;
in vec2 a_axisY;
in vec2 a_halfSize;
in float a_radius;
in float a_shape;
in vec4 a_fill;
in vec4 a_stroke;
in float a_strokeWidth;
in float a_opacity;
in vec2 a_reserved;

uniform vec2 u_resolution;

out vec2 v_unit;
out vec2 v_halfSize;
out float v_radius;
out float v_shape;
out vec4 v_fill;
out vec4 v_stroke;
out float v_strokeWidth;

void main() {
  vec2 screen = a_center + a_axisX * a_unit.x + a_axisY * a_unit.y;
  vec2 zeroToOne = screen / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_unit = a_unit;
  v_halfSize = a_halfSize;
  v_radius = a_radius;
  v_shape = a_shape;
  v_fill = vec4(a_fill.rgb, a_fill.a * a_opacity);
  v_stroke = vec4(a_stroke.rgb, a_stroke.a * a_opacity);
  v_strokeWidth = a_strokeWidth;
}`;

export const SDF_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_unit;
in vec2 v_halfSize;
in float v_radius;
in float v_shape;
in vec4 v_fill;
in vec4 v_stroke;
in float v_strokeWidth;

out vec4 outColor;

float roundedBoxSdf(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = v_unit * v_halfSize;
  float dist;
  if (v_shape > 0.5) {
    vec2 q = p / max(v_halfSize, vec2(0.0001));
    dist = (length(q) - 1.0) * min(v_halfSize.x, v_halfSize.y);
  } else {
    dist = roundedBoxSdf(p, v_halfSize, v_radius);
  }

  float aa = max(1.0, fwidth(dist));
  float fillAlpha = 1.0 - smoothstep(-aa, aa, dist);
  float strokeAlpha = 1.0 - smoothstep(v_strokeWidth - aa, v_strokeWidth + aa, abs(dist));
  vec4 color = v_fill * fillAlpha;
  if (v_stroke.a > 0.0 && v_strokeWidth > 0.0) {
    color = mix(color, v_stroke, strokeAlpha);
  }
  if (color.a <= 0.001) discard;
  outColor = color;
}`;

export const SOLID_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec4 a_color;

uniform vec2 u_resolution;

out vec4 v_color;

void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_color = a_color;
}`;

export const SOLID_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 outColor;

void main() {
  outColor = v_color;
}`;
