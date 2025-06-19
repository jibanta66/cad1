// SketchPanel3D.tsx

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { X, Square, Circle, Minus, Hexagon as Polygon, Grid, Move, Download } from 'lucide-react';

interface SketchPoint3D {
  x: number;
  y: number;
  z: number;
  id: string;
}

interface SketchShape3D {
  type: 'line' | 'rectangle' | 'circle' | 'polygon';
  points: SketchPoint3D[];
  id: string;
  closed: boolean;
}

interface SketchPanel3DProps {
  isOpen: boolean;
  onClose: () => void;
  onExtrude: (shapes: SketchShape3D[]) => void;
}

export const SketchPanel: React.FC<SketchPanel3DProps> = ({ isOpen, onClose, onExtrude }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState('line');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(1);

  const [shapes, setShapes] = useState<SketchShape3D[]>([]);
  const [currentShape, setCurrentShape] = useState<SketchShape3D | null>(null);

  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!isOpen) return;

    const width = mountRef.current?.clientWidth || window.innerWidth;
    const height = mountRef.current?.clientHeight || window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current?.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Grid helper (3D grid)
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    // Axes helper for orientation
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Animate loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount or close
    return () => {
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [isOpen]);

  // Convert 2D mouse coordinates to 3D grid cell on plane y=0
  const getIntersectGridPoint = (event: React.MouseEvent) => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return null;

    const rect = mountRef.current.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);

    // Intersect with plane y=0
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();

    if (raycaster.current.ray.intersectPlane(plane, intersectPoint)) {
      // Snap to grid
      if (snapToGrid) {
        intersectPoint.x = Math.round(intersectPoint.x / gridSize) * gridSize;
        intersectPoint.y = 0;
        intersectPoint.z = Math.round(intersectPoint.z / gridSize) * gridSize;
      }

      return {
        x: intersectPoint.x,
        y: intersectPoint.y,
        z: intersectPoint.z,
        id: `point-${Date.now()}-${Math.random()}`
      };
    }

    return null;
  };

  // Draw points and lines as Three.js objects in scene
  const updateScene = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous shapes except helpers
    scene.children = scene.children.filter(
      child => child.type === 'GridHelper' || child.type === 'AxesHelper' || child.type === 'AmbientLight'
    );

    // Helper to create sphere at point
    const createPointSphere = (point: SketchPoint3D, color = 0x60a5fa) => {
      const geometry = new THREE.SphereGeometry(0.1);
      const material = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(point.x, point.y, point.z);
      return sphere;
    };

    // Helper to create line between two points
    const createLine = (start: SketchPoint3D, end: SketchPoint3D, color = 0x4ade80) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(start.x, start.y, start.z),
        new THREE.Vector3(end.x, end.y, end.z)
      ]);
      const material = new THREE.LineBasicMaterial({ color });
      return new THREE.Line(geometry, material);
    };

    // Draw all shapes
    shapes.forEach(shape => {
      // Draw points
      shape.points.forEach(pt => {
        const sphere = createPointSphere(pt);
        scene.add(sphere);
      });

      // Draw lines or edges
      switch (shape.type) {
        case 'line':
          if (shape.points.length >= 2) {
            const line = createLine(shape.points[0], shape.points[1]);
            scene.add(line);
          }
          break;

        case 'rectangle':
        case 'polygon':
          for (let i = 0; i < shape.points.length - 1; i++) {
            const line = createLine(shape.points[i], shape.points[i + 1]);
            scene.add(line);
          }
          if (shape.closed) {
            const line = createLine(shape.points[shape.points.length - 1], shape.points[0]);
            scene.add(line);
          }
          break;

        case 'circle':
          // For simplicity draw circle points connected (polygon approximation)
          if (shape.points.length >= 2) {
            const center = shape.points[0];
            const edge = shape.points[1];
            const radius = Math.sqrt(
              (edge.x - center.x) ** 2 +
                (edge.y - center.y) ** 2 +
                (edge.z - center.z) ** 2
            );

            const circlePoints = [];
            const segments = 32;
            for (let i = 0; i <= segments; i++) {
              const theta = (i / segments) * 2 * Math.PI;
              circlePoints.push(
                new THREE.Vector3(
                  center.x + radius * Math.cos(theta),
                  center.y,
                  center.z + radius * Math.sin(theta)
                )
              );
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(circlePoints);
            const material = new THREE.LineBasicMaterial({ color: 0x4ade80 });
            const circleLine = new THREE.LineLoop(geometry, material);
            scene.add(circleLine);

            // Also add center point
            scene.add(createPointSphere(center, 0xff0000));
          }
          break;
      }
    });

    // Draw currentShape in progress
    if (currentShape) {
      currentShape.points.forEach(pt => {
        const sphere = createPointSphere(pt, 0x60a5fa);
        scene.add(sphere);
      });

      for (let i = 0; i < currentShape.points.length - 1; i++) {
        const line = createLine(currentShape.points[i], currentShape.points[i + 1], 0x60a5fa);
        scene.add(line);
      }
    }
  };

  useEffect(() => {
    updateScene();
  }, [shapes, currentShape]);

  // Interaction handlers
  const handleClick = (event: React.MouseEvent) => {
    if (!isOpen) return;
    const point = getIntersectGridPoint(event);
    if (!point) return;

    if (activeTool === 'polygon') {
      if (!currentShape) {
        setCurrentShape({
          type: 'polygon',
          points: [point],
          id: `polygon-${Date.now()}`,
          closed: false,
        });
      } else {
        setCurrentShape(prev => {
          if (!prev) return null;
          return { ...prev, points: [...prev.points, point] };
        });
      }
    } else if (activeTool === 'line') {
      if (!currentShape) {
        setCurrentShape({
          type: 'line',
          points: [point],
          id: `line-${Date.now()}`,
          closed: false,
        });
      } else if (currentShape.points.length === 1) {
        setShapes(prev => [...prev, { ...currentShape, points: [...currentShape.points, point] }]);
        setCurrentShape(null);
      }
    } else if (activeTool === 'rectangle') {
      if (!currentShape) {
        setCurrentShape({
          type: 'rectangle',
          points: [point],
          id: `rect-${Date.now()}`,
          closed: true,
        });
      } else if (currentShape.points.length === 1) {
        // Calculate rectangle points in 3D grid (assuming flat on y=0 plane)
        const start = currentShape.points[0];
        const end = point;
        const rectPoints = [
          start,
          { x: end.x, y: 0, z: start.z, id: `point-${Date.now()}` },
          end,
          { x: start.x, y: 0, z: end.z, id: `point-${Date.now()}` },
        ];
        setShapes(prev => [...prev, { ...currentShape, points: rectPoints }]);
        setCurrentShape(null);
      }
    } else if (activeTool === 'circle') {
      if (!currentShape) {
        setCurrentShape({
          type: 'circle',
          points: [point],
          id: `circle-${Date.now()}`,
          closed: true,
        });
      } else if (currentShape.points.length === 1) {
        setShapes(prev => [...prev, { ...currentShape, points: [...currentShape.points, point] }]);
        setCurrentShape(null);
      }
    }
  };

  const finishPolygon = () => {
    if (currentShape && currentShape.type === 'polygon' && currentShape.points.length >= 3) {
      setShapes(prev => [...prev, { ...currentShape, closed: true }]);
      setCurrentShape(null);
    }
  };

  const handleClear = () => {
    setShapes([]);
    setCurrentShape(null);
  };

  const handleExtrude = () => {
    onExtrude(shapes);
    onClose();
  };

  const handleExport = () => {
    const exportData = {
      shapes,
      settings: { snapToGrid, gridSize },
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch3d.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const tools = [
    { id: 'line', icon: Minus, label: 'Line', description: 'Draw lines on grid' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', description: 'Draw rectangles on grid' },
    { id: 'circle', icon: Circle, label: 'Circle', description: 'Draw circles on grid' },
    { id: 'polygon', icon: Polygon, label: 'Polygon', description: 'Draw polygons on grid' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-white">3D Sketch Mode</h2>
          <p className="text-sm text-gray-400">Create 2D shapes on a 3D grid for extrusion</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded">
          <X size={24} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300 font-medium">Drawing Tools:</span>
          {tools.map(tool => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  activeTool === tool.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={tool.description}
              >
                <Icon size={16} />
                <span className="text-sm">{tool.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={e => setSnapToGrid(e.target.checked)}
              className="cursor-pointer"
            />
            Snap to Grid
          </label>
          <button
            onClick={finishPolygon}
            disabled={!(currentShape && currentShape.type === 'polygon')}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Finish Polygon
          </button>
          <button onClick={handleClear} className="bg-red-600 text-white px-4 py-2 rounded">
            Clear
          </button>
          <button onClick={handleExtrude} className="bg-blue-600 text-white px-4 py-2 rounded">
            Extrude
          </button>
          <button onClick={handleExport} className="bg-purple-600 text-white px-4 py-2 rounded">
            Export
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div
        ref={mountRef}
        onClick={handleClick}
        className="flex-1 w-full cursor-crosshair"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
