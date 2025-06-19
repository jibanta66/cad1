// Enhanced WebGL Shaders for advanced 3D rendering
export const vertexShaderSource = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_texCoord;

  uniform mat4 u_modelMatrix;
  uniform mat4 u_viewMatrix;
  uniform mat4 u_projectionMatrix;
  uniform mat4 u_normalMatrix;

  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_texCoord;

  void main() {
    vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
    gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
    
    v_normal = normalize((u_normalMatrix * vec4(a_normal, 0.0)).xyz);
    v_position = worldPosition.xyz;
    v_texCoord = a_texCoord;
  }
`;

export const fragmentShaderSource = `
  precision mediump float;

  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_texCoord;

  // Material properties
  uniform vec3 u_materialColor;
  uniform float u_shininess;
  uniform bool u_selected;
  uniform vec3 u_cameraPosition;

  // Ambient light
  uniform float u_ambientIntensity;
  uniform vec3 u_ambientColor;

  // Directional light
  uniform float u_dirLightIntensity;
  uniform vec3 u_dirLightColor;
  uniform vec3 u_dirLightPosition;

  // Point light
  uniform float u_pointLightIntensity;
  uniform vec3 u_pointLightColor;
  uniform vec3 u_pointLightPosition;

  void main() {
    vec3 normal = normalize(v_normal);
    vec3 viewDirection = normalize(u_cameraPosition - v_position);
    
    // Ambient lighting
    vec3 ambient = u_ambientIntensity * u_ambientColor;

    // Directional light
    vec3 dirLightDirection = normalize(u_dirLightPosition - v_position);
    float dirDiffuse = max(dot(normal, dirLightDirection), 0.0);
    vec3 dirReflectDirection = reflect(-dirLightDirection, normal);
    float dirSpecular = pow(max(dot(viewDirection, dirReflectDirection), 0.0), u_shininess);
    vec3 directional = u_dirLightIntensity * u_dirLightColor * (dirDiffuse + dirSpecular * 0.5);

    // Point light
    vec3 pointLightDirection = normalize(u_pointLightPosition - v_position);
    float pointDistance = length(u_pointLightPosition - v_position);
    float pointAttenuation = 1.0 / (1.0 + 0.1 * pointDistance + 0.01 * pointDistance * pointDistance);
    float pointDiffuse = max(dot(normal, pointLightDirection), 0.0);
    vec3 pointReflectDirection = reflect(-pointLightDirection, normal);
    float pointSpecular = pow(max(dot(viewDirection, pointReflectDirection), 0.0), u_shininess);
    vec3 point = u_pointLightIntensity * u_pointLightColor * pointAttenuation * (pointDiffuse + pointSpecular * 0.3);

    // Combine all lighting
    vec3 lighting = ambient + directional + point;
    vec3 color = u_materialColor * lighting;
    
    // Highlight if selected
    if (u_selected) {
      color = mix(color, vec3(0.2, 0.6, 1.0), 0.3);
      // Add selection outline effect
      float rim = 1.0 - max(dot(viewDirection, normal), 0.0);
      color += vec3(0.3, 0.7, 1.0) * pow(rim, 2.0) * 0.5;
    }

    // Add subtle fresnel effect for realism
    float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 2.0);
    color += vec3(0.1, 0.1, 0.2) * fresnel * 0.3;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}