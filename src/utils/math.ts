// 3D Math utilities for WebGL
export class Vec3 {
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}

  // --- Static methods ---
  static add(a: Vec3, b: Vec3): Vec3 {
    return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  static subtract(a: Vec3, b: Vec3): Vec3 {
    return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static scale(v: Vec3, s: number): Vec3 {
    return new Vec3(v.x * s, v.y * s, v.z * s);
  }

  static normalize(v: Vec3): Vec3 {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return length > 0 ? new Vec3(v.x / length, v.y / length, v.z / length) : new Vec3();
  }

  static cross(a: Vec3, b: Vec3): Vec3 {
    return new Vec3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }

  static dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  // --- Instance methods (used for in-place modifications and cloning) ---

  // Create a new Vec3 instance with the same values
  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  // Copy values from another Vec3 into this instance
  copy(other: Vec3): this {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    return this;
  }

  // Mutate this vector by adding another vector (in-place)
  add(other: Vec3): this {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  // Mutate this vector by subtracting another vector (in-place)
  subtract(other: Vec3): this {
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
  }

  // Mutate this vector by scaling it (in-place)
  multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  // Mutate this vector by normalizing it (in-place)
  normalize(): this {
    const length = this.length();
    if (length > 0) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
    }
    return this;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
}

export class Mat4 {
  constructor(public elements: Float32Array = new Float32Array(16)) {
    if (elements.length === 16) {
      this.elements = elements;
    } else {
      this.identity();
    }
  }

  identity(): Mat4 {
    this.elements.fill(0);
    this.elements[0] = this.elements[5] = this.elements[10] = this.elements[15] = 1;
    return this;
  }

  static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);

    return new Mat4(new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]));
  }

  static lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
    const f = Vec3.normalize(Vec3.subtract(center, eye));
    const s = Vec3.normalize(Vec3.cross(f, up));
    const u = Vec3.cross(s, f);

    return new Mat4(new Float32Array([
      s.x, u.x, -f.x, 0,
      s.y, u.y, -f.y, 0,
      s.z, u.z, -f.z, 0,
      -Vec3.dot(s, eye), -Vec3.dot(u, eye), Vec3.dot(f, eye), 1
    ]));
  }

  static translate(x: number, y: number, z: number): Mat4 {
    return new Mat4(new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    ]));
  }

  static rotateX(angle: number): Mat4 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Mat4(new Float32Array([
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ]));
  }

  static rotateY(angle: number): Mat4 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Mat4(new Float32Array([
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ]));
  }

  static scale(x: number, y: number, z: number): Mat4 {
    return new Mat4(new Float32Array([
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1
    ]));
  }

  multiply(other: Mat4): Mat4 {
    const a = this.elements;
    const b = other.elements;
    const result = new Float32Array(16);

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] =
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }

    return new Mat4(result);
  }
}