const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`

const fragmentSource = `
precision highp float;
uniform sampler2D photo;
uniform vec2 size;
uniform vec2 crop;
uniform float time;
uniform float amount;
varying vec2 uv;
vec4 readPhoto(vec2 p) {
  vec2 coord = clamp(p / size, vec2(0.0001), vec2(0.9999));
  return texture2D(photo, (coord - 0.5) * crop + 0.5);
}
void main() {
  vec2 p = uv * (size + 48.0) - 24.0;
  vec2 d = min(p, size - p);
  float band = min(44.0, min(size.x, size.y) * 0.16);
  vec2 edge = 1.0 - smoothstep(vec2(0.0), vec2(band), d);
  vec2 outward = sign(p - size * 0.5);
  float reach = min(band * 2.0, min(size.x, size.y) * 0.23);
  vec2 cornerFade = 1.0 - smoothstep(vec2(0.0), vec2(reach), d);
  float corner = cornerFade.x * cornerFade.y;
  vec2 wave = vec2(sin(p.y / size.y * 12.0 + time * 0.85),
                   sin(p.x / size.x * 13.0 - time * 0.73));
  vec2 q = p - outward * edge * edge * band * corner * (0.32 + 0.18 * wave) * amount;
  float strength = max(edge.x, edge.y);
  vec2 split = outward * edge * edge * band * (0.035 + 0.025 * sin(time * 0.9)) * amount;
  float blur = strength * strength * band * (0.055 + 0.025 * sin(time * 0.7)) * amount;
  vec4 center = readPhoto(q);
  vec4 red = readPhoto(q + split);
  vec4 blue = readPhoto(q - split);
  vec4 soft = (readPhoto(q + vec2(blur, blur)) + readPhoto(q + vec2(-blur, blur))
             + readPhoto(q + vec2(blur, -blur)) + readPhoto(q - vec2(blur, blur))) * 0.25;
  vec4 color = mix(vec4(red.r, center.g, blue.b, center.a), soft, strength * 0.45 * amount);
  float distance = max(min(d.x, d.y), 0.0) - length(max(-d, vec2(0.0)));
  float feather = smoothstep(-band * 0.38, band * 0.32, distance);
  float alpha = mix(step(0.0, min(d.x, d.y)), feather, amount) * color.a;
  gl_FragColor = vec4(color.rgb * alpha, alpha);
}`

export function createMemoryRenderer(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false })
  if (!gl) {
    throw new Error('WebGL unavailable')
  }
  const shaders: WebGLShader[] = []
  const program = gl.createProgram()
  const texture = gl.createTexture()
  const buffer = gl.createBuffer()
  const dispose = () => {
    gl.deleteTexture(texture)
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    shaders.forEach(shader => gl.deleteShader(shader))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  try {
    if (!program || !texture || !buffer) {
      throw new Error('WebGL allocation failed')
    }
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = gl.createShader(type)
      if (!shader) {
        throw new Error('Shader allocation failed')
      }
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error('Shader compilation failed')
      }
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Shader linking failed')
    }
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    if (gl.getError() !== gl.NO_ERROR) {
      throw new Error('Texture upload failed')
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2, 1200 / Math.max(width + 48, height + 48))
    canvas.width = Math.max(1, Math.round((width + 48) * ratio))
    canvas.height = Math.max(1, Math.round((height + 48) * ratio))
    gl.viewport(0, 0, canvas.width, canvas.height)
    const imageAspect = image.naturalWidth / image.naturalHeight
    const viewAspect = width / height
    gl.uniform2f(gl.getUniformLocation(program, 'size'), width, height)
    gl.uniform2f(
      gl.getUniformLocation(program, 'crop'),
      Math.min(1, viewAspect / imageAspect),
      Math.min(1, imageAspect / viewAspect),
    )
    const timeLocation = gl.getUniformLocation(program, 'time')
    const amountLocation = gl.getUniformLocation(program, 'amount')
    return {
      draw(time: number, amount: number) {
        gl.uniform1f(timeLocation, time)
        gl.uniform1f(amountLocation, amount)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      },
      dispose,
    }
  }
  catch (error) {
    dispose()
    throw error
  }
}
