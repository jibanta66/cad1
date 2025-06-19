import { Mat4, Vec3 } from '../utils/math';
import { createShader, createProgram, vertexShaderSource, fragmentShaderSource } from './shaders';
import { MeshData } from './primitives';
import { GridRenderer, GridSettings } from './grid';

export interface RenderObject {
  id: string;
  meshData: MeshData;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: Vec3;
  selected: boolean;
}

export interface LightSettings {
  ambient: {
    intensity: number;
    color: [number, number, number];
  };
  directional: {
    intensity: number;
    color: [number, number, number];
    position: [number, number, number];
  };
  point: {
    intensity: number;
    color: [number, number, number];
    position: [number, number, number];
  };
}

export class WebGLRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private objects: RenderObject[] = [];
  private gridRenderer: GridRenderer;
  private camera: {
    position: Vec3;
    target: Vec3;
    up: Vec3;
    fov: number;
    near: number;
    far: number;
  };
  private lightSettings: LightSettings;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this.gl = gl;

    // Initialize shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to create shaders');
    }

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Failed to create shader program');
    }
    this.program = program;

    // Initialize grid renderer
    this.gridRenderer = new GridRenderer(gl);

    // Initialize camera
    this.camera = {
      position: new Vec3(5, 5, 5),
      target: new Vec3(0, 0, 0),
      up: new Vec3(0, 1, 0),
      fov: Math.PI / 4,
      near: 0.1,
      far: 100
    };

    // Initialize lighting
    this.lightSettings = {
      ambient: { intensity: 0.2, color: [1, 1, 1] },
      directional: { intensity: 0.8, color: [1, 1, 1], position: [10, 10, 10] },
      point: { intensity: 0.5, color: [1, 1, 1], position: [5, 5, 5] }
    };

    // Enable depth testing and face culling
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    
    // Set clear color to dark theme
    gl.clearColor(0.1, 0.1, 0.12, 1.0);
  }

  addObject(object: RenderObject): void {
    this.objects.push(object);
  }

  removeObject(id: string): void {
    this.objects = this.objects.filter(obj => obj.id !== id);
  }

  selectObject(id: string): void {
    this.objects.forEach(obj => {
      obj.selected = obj.id === id;
    });
  }

  updateCamera(position: Vec3, target: Vec3): void {
    this.camera.position = position;
    this.camera.target = target;
  }

  updateLighting(settings: LightSettings): void {
    this.lightSettings = settings;
  }

  updateGridSettings(settings: GridSettings): void {
    this.gridRenderer.updateSettings(settings);
  }

  getGridSettings(): GridSettings {
    return this.gridRenderer.getSettings();
  }

  snapToGrid(point: Vec3): Vec3 {
    return this.gridRenderer.snapToGrid(point);
  }

  render(): void {
    const gl = this.gl;
    
    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Set up projection matrix
    const aspect = gl.canvas.width / gl.canvas.height;
    const projectionMatrix = Mat4.perspective(this.camera.fov, aspect, this.camera.near, this.camera.far);
    
    // Set up view matrix
    const viewMatrix = Mat4.lookAt(this.camera.position, this.camera.target, this.camera.up);

    // Render grid first (behind objects)
    this.gridRenderer.render(viewMatrix, projectionMatrix);

    // Use our shader program for objects
    gl.useProgram(this.program);

    // Get uniform locations
    const projectionLocation = gl.getUniformLocation(this.program, 'u_projectionMatrix');
    const viewLocation = gl.getUniformLocation(this.program, 'u_viewMatrix');
    const modelLocation = gl.getUniformLocation(this.program, 'u_modelMatrix');
    const normalLocation = gl.getUniformLocation(this.program, 'u_normalMatrix');
    const cameraPosLocation = gl.getUniformLocation(this.program, 'u_cameraPosition');
    const materialColorLocation = gl.getUniformLocation(this.program, 'u_materialColor');
    const shininessLocation = gl.getUniformLocation(this.program, 'u_shininess');
    const selectedLocation = gl.getUniformLocation(this.program, 'u_selected');

    // Lighting uniforms
    const ambientIntensityLocation = gl.getUniformLocation(this.program, 'u_ambientIntensity');
    const ambientColorLocation = gl.getUniformLocation(this.program, 'u_ambientColor');
    const dirLightIntensityLocation = gl.getUniformLocation(this.program, 'u_dirLightIntensity');
    const dirLightColorLocation = gl.getUniformLocation(this.program, 'u_dirLightColor');
    const dirLightPositionLocation = gl.getUniformLocation(this.program, 'u_dirLightPosition');
    const pointLightIntensityLocation = gl.getUniformLocation(this.program, 'u_pointLightIntensity');
    const pointLightColorLocation = gl.getUniformLocation(this.program, 'u_pointLightColor');
    const pointLightPositionLocation = gl.getUniformLocation(this.program, 'u_pointLightPosition');

    // Set global uniforms
    gl.uniformMatrix4fv(projectionLocation, false, projectionMatrix.elements);
    gl.uniformMatrix4fv(viewLocation, false, viewMatrix.elements);
    gl.uniform3f(cameraPosLocation, this.camera.position.x, this.camera.position.y, this.camera.position.z);
    gl.uniform1f(shininessLocation, 32);

    // Set lighting uniforms
    gl.uniform1f(ambientIntensityLocation, this.lightSettings.ambient.intensity);
    gl.uniform3f(ambientColorLocation, ...this.lightSettings.ambient.color);
    gl.uniform1f(dirLightIntensityLocation, this.lightSettings.directional.intensity);
    gl.uniform3f(dirLightColorLocation, ...this.lightSettings.directional.color);
    gl.uniform3f(dirLightPositionLocation, ...this.lightSettings.directional.position);
    gl.uniform1f(pointLightIntensityLocation, this.lightSettings.point.intensity);
    gl.uniform3f(pointLightColorLocation, ...this.lightSettings.point.color);
    gl.uniform3f(pointLightPositionLocation, ...this.lightSettings.point.position);

    // Render each object
    this.objects.forEach(obj => {
      this.renderObject(obj, modelLocation, normalLocation, materialColorLocation, selectedLocation);
    });
  }

  private renderObject(
    obj: RenderObject, 
    modelLocation: WebGLUniformLocation | null,
    normalLocation: WebGLUniformLocation | null,
    materialColorLocation: WebGLUniformLocation | null,
    selectedLocation: WebGLUniformLocation | null
  ): void {
    const gl = this.gl;

    // Create model matrix
    const modelMatrix = Mat4.translate(obj.position.x, obj.position.y, obj.position.z)
      .multiply(Mat4.rotateX(obj.rotation.x))
      .multiply(Mat4.rotateY(obj.rotation.y))
      .multiply(Mat4.scale(obj.scale.x, obj.scale.y, obj.scale.z));

    // Set uniforms
    gl.uniformMatrix4fv(modelLocation, false, modelMatrix.elements);
    gl.uniformMatrix4fv(normalLocation, false, modelMatrix.elements); // Simplified normal matrix
    gl.uniform3f(materialColorLocation, obj.color.x, obj.color.y, obj.color.z);
    gl.uniform1i(selectedLocation, obj.selected ? 1 : 0);

    // Create buffers
    const vertexBuffer = gl.createBuffer();
    const normalBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, obj.meshData.vertices, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, obj.meshData.normals, gl.STATIC_DRAW);
    const normalAttribLocation = gl.getAttribLocation(this.program, 'a_normal');
    gl.enableVertexAttribArray(normalAttribLocation);
    gl.vertexAttribPointer(normalAttribLocation, 3, gl.FLOAT, false, 0, 0);

    // Bind texture coordinate buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, obj.meshData.texCoords, gl.STATIC_DRAW);
    const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Bind index buffer and draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, obj.meshData.indices, gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, obj.meshData.indices.length, gl.UNSIGNED_SHORT, 0);

    // Clean up buffers
    gl.deleteBuffer(vertexBuffer);
    gl.deleteBuffer(normalBuffer);
    gl.deleteBuffer(texCoordBuffer);
    gl.deleteBuffer(indexBuffer);
  }

  resize(width: number, height: number): void {
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  getLightSettings(): LightSettings {
    return { ...this.lightSettings };
  }
}