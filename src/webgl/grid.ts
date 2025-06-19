// 3D Grid system for CAD
import { Mat4, Vec3 } from '../utils/math';

export interface GridSettings {
  size: number;
  divisions: number;
  opacity: number;
  visible: boolean;
  snapEnabled: boolean;
  color: Vec3;
}

export class GridRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private settings: GridSettings;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.settings = {
      size: 10,
      divisions: 20,
      opacity: 0.3,
      visible: true,
      snapEnabled: true,
      color: new Vec3(0.5, 0.5, 0.5)
    };
    this.initializeShaders();
    this.generateGrid();
  }

  private initializeShaders(): void {
    const vertexShaderSource = `
      attribute vec3 a_position;
      uniform mat4 u_mvpMatrix;
      uniform vec3 u_color;
      uniform float u_opacity;
      varying vec4 v_color;

      void main() {
        gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
        v_color = vec4(u_color, u_opacity);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec4 v_color;

      void main() {
        gl_FragColor = v_color;
      }
    `;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (vertexShader && fragmentShader) {
      this.program = this.createProgram(vertexShader, fragmentShader);
    }
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Grid shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Grid program linking error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  private generateGrid(): void {
    const vertices: number[] = [];
    const { size, divisions } = this.settings;
    const step = (size * 2) / divisions;
    const start = -size;
    const end = size;

    // Generate grid lines parallel to X-axis
    for (let i = 0; i <= divisions; i++) {
      const z = start + i * step;
      vertices.push(start, 0, z, end, 0, z);
    }

    // Generate grid lines parallel to Z-axis
    for (let i = 0; i <= divisions; i++) {
      const x = start + i * step;
      vertices.push(x, 0, start, x, 0, end);
    }

    // Add axis lines with different colors
    // X-axis (red)
    vertices.push(-size, 0, 0, size, 0, 0);
    // Z-axis (blue)
    vertices.push(0, 0, -size, 0, 0, size);

    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
  }

  render(viewMatrix: Mat4, projectionMatrix: Mat4): void {
    if (!this.settings.visible || !this.program || !this.vertexBuffer) return;

    const gl = this.gl;
    
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    // Set up attributes
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    // Set up uniforms
    const mvpMatrix = projectionMatrix.multiply(viewMatrix);
    const mvpLocation = gl.getUniformLocation(this.program, 'u_mvpMatrix');
    const colorLocation = gl.getUniformLocation(this.program, 'u_color');
    const opacityLocation = gl.getUniformLocation(this.program, 'u_opacity');

    gl.uniformMatrix4fv(mvpLocation, false, mvpMatrix.elements);
    gl.uniform3f(colorLocation, this.settings.color.x, this.settings.color.y, this.settings.color.z);
    gl.uniform1f(opacityLocation, this.settings.opacity);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Disable depth writing for grid
    gl.depthMask(false);

    // Draw grid lines
    const gridLineCount = (this.settings.divisions + 1) * 4;
    gl.drawArrays(gl.LINES, 0, gridLineCount);

    // Draw axis lines with different colors
    // X-axis (red)
    gl.uniform3f(colorLocation, 1.0, 0.3, 0.3);
    gl.drawArrays(gl.LINES, gridLineCount, 2);

    // Z-axis (blue)
    gl.uniform3f(colorLocation, 0.3, 0.3, 1.0);
    gl.drawArrays(gl.LINES, gridLineCount + 2, 2);

    // Restore depth writing
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  updateSettings(newSettings: Partial<GridSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.size !== undefined || newSettings.divisions !== undefined) {
      this.generateGrid();
    }
  }

  getSettings(): GridSettings {
    return { ...this.settings };
  }

  snapToGrid(point: Vec3): Vec3 {
    if (!this.settings.snapEnabled) return point;

    const { size, divisions } = this.settings;
    const step = (size * 2) / divisions;

    return new Vec3(
      Math.round(point.x / step) * step,
      point.y, // Don't snap Y to maintain object height
      Math.round(point.z / step) * step
    );
  }
}