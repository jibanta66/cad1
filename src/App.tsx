import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Viewport3D } from './components/Viewport3D';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { SceneHierarchy } from './components/SceneHierarchy';
import { AdvancedSketchPanel } from './components/AdvancedSketchPanel';
import { LightingPanel } from './components/LightingPanel';
import { GridPanel } from './components/GridPanel';
import { MeasurementPanel } from './components/MeasurementPanel';
import { ContextToolbar } from './components/ContextToolbar';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { RenderObject, LightSettings, GridSettings } from './three/ThreeRenderer';
import { createCubeGeometry, createSphereGeometry, createCylinderGeometry } from './three/primitives';
import { ExtrusionEngine } from './three/extrusion';
import { OffsetEngine } from './three/OffsetEngine';
import { SketchShape3D } from './utils/sketch3d';
import { MeasurementEngine, Measurement } from './utils/measurement';
import { Vec3 } from './utils/math';
import { Save, Download, Settings, Layers, Upload, ChevronDown, Ruler, Lightbulb, Grid, ClipboardList, Package, PanelRightOpen, PanelRightClose } from 'lucide-react';
import * as THREE from 'three';
import { FileImport, ImportedFile } from './components/FileImport';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { CollapsiblePanel } from './components/CollapsiblePanel';

function App() {
  const [objects, setObjects] = useState<RenderObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState('select');
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');

  const [sketchPanelOpen, setSketchPanelOpen] = useState(false);
  const [fileImportOpen, setFileImportOpen] = useState(false);
  const [lightingPanelOpen, setLightingPanelOpen] = useState(true);
  const [gridPanelOpen, setGridPanelOpen] = useState(false);
  const [measurementPanelOpen, setMeasurementPanelOpen] = useState(true);
  const [sceneHierarchyOpen, setSceneHierarchyOpen] = useState(true);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const [sketchMode, setSketchMode] = useState(false);
  const [sketchTool, setSketchTool] = useState('line');
  const [sketchModeType, setSketchModeType] = useState<'surface' | 'plane' | 'free'>('surface');
  const [sketchSettings, setSketchSettings] = useState({
    snapToGrid: true,
    gridSize: 0.5,
    workplaneVisible: true
  });
  const [sketchShapes, setSketchShapes] = useState<SketchShape3D[]>([]);

  const [measurementEngine] = useState(() => new MeasurementEngine());
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  const [lightSettings, setLightSettings] = useState<LightSettings>({
    ambient: { intensity: 0.2, color: [1, 1, 1] },
    directional: { intensity: 0.8, color: [1, 1, 1], position: [10, 10, 10] },
    point: { intensity: 0.5, color: [1, 1, 1], position: [5, 5, 5] }
  });

  const [gridSettings, setGridSettings] = useState<GridSettings>({
    size: 10,
    divisions: 20,
    opacity: 0.3,
    visible: true,
    snapEnabled: true,
    color: new Vec3(0.5, 0.5, 0.5)
  });

  const [sketchEngineRef, setSketchEngineRef] = useState<any>(null);

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(256);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState('json');

  const mainContentRef = useRef<HTMLDivElement>(null);

  // This useEffect now combines ResizeObserver with a direct dimension update
  // triggered by layout-affecting state changes.
  useEffect(() => {
    if (viewportRef.current) {
      const updateViewportDimensions = () => {
        if (viewportRef.current) {
          const width = viewportRef.current.offsetWidth;
          const height = viewportRef.current.offsetHeight;
          setViewportDimensions({ width, height });
          console.log(`App: Viewport dimensions updated to ${width}x${height}`); // Debug log
        }
      };

      // 1. Setup ResizeObserver
      const observer = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.contentBoxSize) {
            const { width, height } = entry.contentRect;
            setViewportDimensions({ width, height });
            console.log(`App: ResizeObserver triggered: ${width}x${height}`); // Debug log
          }
        }
      });

      observer.observe(viewportRef.current);

      // 2. Initial update and update on dependency change
      // This ensures dimensions are calculated when the component mounts
      // or when relevant sidebar/layout state changes,
      // providing a fallback if ResizeObserver has a slight delay.
      updateViewportDimensions();

      return () => {
        observer.disconnect();
      };
    }
  }, [leftSidebarWidth, rightSidebarWidth, isRightSidebarOpen]); // Dependencies ensure this effect re-runs when layout changes

  const generateId = (type: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  };

  const getRandomColor = (): Vec3 => {
    return new Vec3(
      0.3 + Math.random() * 0.7,
      0.3 + Math.random() * 0.7,
      0.3 + Math.random() * 0.7
    );
  };

  const addPrimitive = useCallback((type: string) => {
    let geometry: THREE.BufferGeometry;

    switch (type) {
      case 'cube':
        geometry = createCubeGeometry(2);
        break;
      case 'sphere':
        geometry = createSphereGeometry(1, 32);
        break;
      case 'cylinder':
        geometry = createCylinderGeometry(1, 2, 32);
        break;
      default:
        return;
    }

    const color = getRandomColor();
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color.x, color.y, color.z)
    });

    const mesh = new THREE.Mesh(geometry, material);

    const existingCount = objects.filter(obj => obj.id.startsWith(type)).length;
    const offset = existingCount * 0.5;

    const newObject: RenderObject = {
      id: generateId(type),
      mesh,
      position: new Vec3(offset, offset, offset),
      rotation: new Vec3(0, 0, 0),
      scale: new Vec3(1, 1, 1),
      color,
      selected: false,
      visible: true
    };

    setObjects(prev => [...prev, newObject]);
    setSelectedObjectId(newObject.id);
  }, [objects]);

  const handleFilesImported = useCallback((importedFiles: ImportedFile[]) => {
    const newObjects: RenderObject[] = [];

    importedFiles.forEach((file, index) => {
      const color = getRandomColor();
      const material = file.material || new THREE.MeshPhongMaterial({
        color: new THREE.Color(color.x, color.y, color.z),
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(file.geometry, material);

      const gridSize = Math.ceil(Math.sqrt(importedFiles.length));
      const x = (index % gridSize) * 3 - (gridSize - 1) * 1.5;
      const z = Math.floor(index / gridSize) * 3 - (Math.floor((importedFiles.length - 1) / gridSize)) * 1.5;

      const newObject: RenderObject = {
        id: generateId('imported'),
        mesh,
        position: new Vec3(x, 0, z),
        rotation: new Vec3(0, 0, 0),
        scale: new Vec3(1, 1, 1),
        color,
        selected: false,
        visible: true
      };

      newObjects.push(newObject);
    });

    setObjects(prev => [...prev, ...newObjects]);

    if (newObjects.length > 0) {
      setSelectedObjectId(newObjects[0].id);
    }

    setFileImportOpen(false);
  }, []);

  const handleSketchExtrude = useCallback((shapes: SketchShape3D[]) => {
    console.log('Extrude called with shapes:', shapes);

    if (shapes.length === 0) {
      console.warn('No shapes to extrude');
      return;
    }

    const extrusionSettings = {
      depth: 2,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3
    };

    try {
      const geometry = ExtrusionEngine.extrudeSketch(shapes, extrusionSettings);
      const color = getRandomColor();
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color.x, color.y, color.z)
      });

      const mesh = new THREE.Mesh(geometry, material);

      const newObject: RenderObject = {
        id: generateId('extruded'),
        mesh,
        position: new Vec3(0, 0, 0),
        rotation: new Vec3(0, 0, 0),
        scale: new Vec3(1, 1, 1),
        color,
        selected: false,
        visible: true
      };

      setObjects(prev => [...prev, newObject]);
      setSelectedObjectId(newObject.id);
      setSketchMode(false);
      setSketchPanelOpen(false);

      if (sketchEngineRef) {
        sketchEngineRef.clear();
      }

      console.log('Extrusion successful, object created:', newObject.id);
    } catch (error) {
      console.error('Failed to extrude sketch:', error);
    }
  }, [sketchEngineRef]);

  const deleteSelected = useCallback(() => {
    if (selectedObjectId) {
      setObjects(prev => prev.filter(obj => obj.id !== selectedObjectId));
      setSelectedObjectId(null);
    }
  }, [selectedObjectId]);

  const duplicateSelected = useCallback(() => {
    if (!selectedObjectId) return;

    const selectedObj = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObj) return;

    const newId = generateId(selectedObj.id.split('-')[0]);
    const newGeometry = selectedObj.mesh.geometry.clone();
    const newMaterial = (selectedObj.mesh.material as THREE.Material).clone();
    const newMesh = new THREE.Mesh(newGeometry, newMaterial);

    const newObject: RenderObject = {
      id: newId,
      mesh: newMesh,
      position: new Vec3(selectedObj.position.x + 1, selectedObj.position.y, selectedObj.position.z + 1),
      rotation: selectedObj.rotation,
      scale: selectedObj.scale,
      color: selectedObj.color,
      selected: false,
      visible: true
    };

    setObjects(prev => [...prev, newObject]);
    setSelectedObjectId(newId);
  }, [selectedObjectId, objects]);

  const toggleSelectedVisibility = useCallback(() => {
    if (!selectedObjectId) return;

    setObjects(prev => prev.map(obj =>
      obj.id === selectedObjectId
        ? { ...obj, visible: !obj.visible }
        : obj
    ));
  }, [selectedObjectId]);

  const handleOffsetFace = useCallback(() => {
    if (!selectedObjectId) return;

    setObjects(prev => prev.map(obj => {
      if (obj.id === selectedObjectId) {
        obj.mesh.geometry.dispose();

        const newGeometry = OffsetEngine.offsetFace(obj.mesh.geometry, 0, 0.2);

        const newMesh = new THREE.Mesh(newGeometry, obj.mesh.material);
        newMesh.castShadow = true;
        newMesh.receiveShadow = true;
        newMesh.userData = { id: obj.id };

        return { ...obj, mesh: newMesh };
      }
      return obj;
    }));
  }, [selectedObjectId]);

  const handleOffsetBody = useCallback(() => {
    if (!selectedObjectId) return;

    setObjects(prev => prev.map(obj => {
      if (obj.id === selectedObjectId) {
        obj.mesh.geometry.dispose();

        const newGeometry = OffsetEngine.offsetBody(obj.mesh.geometry, 0.1);

        const newMesh = new THREE.Mesh(newGeometry, obj.mesh.material);
        newMesh.castShadow = true;
        newMesh.receiveShadow = true;
        newMesh.userData = { id: obj.id };

        return { ...obj, mesh: newMesh };
      }
      return obj;
    }));
  }, [selectedObjectId]);

  const handleMirror = useCallback((axis: 'x' | 'y' | 'z') => {
    if (!selectedObjectId) return;

    setObjects(prev => prev.map(obj => {
      if (obj.id === selectedObjectId) {
        const newScale = { ...obj.scale };
        newScale[axis] *= -1;
        return { ...obj, scale: newScale };
      }
      return obj;
    }));
  }, [selectedObjectId]);

  const handleResetTransform = useCallback(() => {
    if (!selectedObjectId) return;

    setObjects(prev => prev.map(obj =>
      obj.id === selectedObjectId
        ? {
            ...obj,
            position: new Vec3(0, 0, 0),
            rotation: new Vec3(0, 0, 0),
            scale: new Vec3(1, 1, 1) // Corrected from 'to' to 'scale'
          }
        : obj
    ));
  }, [selectedObjectId]);

  const selectAllObjects = useCallback(() => {
    if (objects.length > 0) {
      setSelectedObjectId(objects[0].id);
    }
  }, [objects]);

  const deselectAll = useCallback(() => {
    setSelectedObjectId(null);
  }, []);

  const updateObject = useCallback((id: string, updates: Partial<RenderObject>) => {
    setObjects(prev => prev.map(obj =>
      obj.id === id ? { ...obj, ...updates } : obj
    ));
  }, []);

  const handleObjectTransform = useCallback((id: string, transform: { position?: Vec3; rotation?: Vec3; scale?: Vec3 }) => {
    updateObject(id, transform);
  }, [updateObject]);

  const selectObject = useCallback((id: string | null) => {
    setSelectedObjectId(id);
  }, []);

  const handleObjectVisibilityToggle = useCallback((id: string) => {
    setObjects(prev => prev.map(obj =>
      obj.id === id ? { ...obj, visible: !obj.visible } : obj
    ));
  }, []);

  const handleMeasurementToolChange = useCallback((tool: string | null) => {
    measurementEngine.setActiveTool(tool);
  }, [measurementEngine]);

  const handleMeasurementPoint = useCallback((point: Vec3) => {
    const measurement = measurementEngine.addPoint(point);
    if (measurement) {
      setMeasurements(measurementEngine.getMeasurements());
    }
  }, [measurementEngine]);

  const handleDeleteMeasurement = useCallback((id: string) => {
    measurementEngine.deleteMeasurement(id);
    setMeasurements(measurementEngine.getMeasurements());
  }, [measurementEngine]);

  const handleClearMeasurements = useCallback(() => {
    measurementEngine.clearAll();
    setMeasurements([]);
  }, [measurementEngine]);

  const handleOpenSketch = useCallback(() => {
    setSketchMode(true);
    setSketchPanelOpen(true);
  }, []);

  const handleCloseSketch = useCallback(() => {
    setSketchMode(false);
    setSketchPanelOpen(false);
    if (sketchEngineRef) {
      sketchEngineRef.clear();
    }
  }, [sketchEngineRef]);

  const handleSketchSettingsChange = useCallback((settings: any) => {
    if (settings.snapToGrid !== undefined) {
      setSketchSettings(prev => ({ ...prev, snapToGrid: settings.snapToGrid }));
    }
    if (settings.gridSize !== undefined) {
      setSketchSettings(prev => ({ ...prev, gridSize: settings.gridSize }));
    }
    if (settings.workplaneVisible !== undefined) {
      setSketchSettings(prev => ({ ...prev, workplaneVisible: settings.workplaneVisible }));
    }
    if (settings.clearSketch && sketchEngineRef) {
      sketchEngineRef.clear();
      setSketchShapes([]);
    }
    if (settings.finishSketch && sketchEngineRef) {
      sketchEngineRef.finishSketch();

      if (sketchEngineRef.getShapes) {
        const newShapes = sketchEngineRef.getShapes();
        setSketchShapes(newShapes);
        console.log('Updated sketch shapes:', newShapes);
      }
    }

    if (settings.getShapes) {
      setSketchEngineRef({
        clear: settings.clear,
        finishSketch: settings.finishSketch,
        getShapes: settings.getShapes
      });
    }
  }, [sketchEngineRef]);

  const selectedObject = useMemo(() =>
    selectedObjectId ? objects.find(obj => obj.id === selectedObjectId) || null : null,
    [selectedObjectId, objects]
  );

  const exportScene = useCallback((format: string) => {
    let data: string | null = null;
    let filename = '';
    let mimeType = '';

    const sceneToExport = new THREE.Scene();

    objects.forEach(obj => {
      const meshClone = obj.mesh.clone();
      meshClone.position.set(obj.position.x, obj.position.y, obj.position.z);
      meshClone.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
      meshClone.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
      sceneToExport.add(meshClone);
    });

    try {
      switch (format) {
        case 'json':
          const sceneData = {
            objects: objects.map(obj => ({
              id: obj.id,
              type: obj.id.split('-')[0],
              position: obj.position,
              rotation: obj.rotation,
              scale: obj.scale,
              color: obj.color,
              visible: obj.visible,
            })),
            lighting: lightSettings,
            grid: gridSettings,
            measurements: measurements,
            metadata: {
              exportedAt: new Date().toISOString(),
              version: '3.0',
              renderer: 'Three.js'
            }
          };
          data = JSON.stringify(sceneData, null, 2);
          filename = 'threejs-cad-scene.json';
          mimeType = 'application/json';
          break;

        case 'obj':
          const objExporter = new OBJExporter();
          data = objExporter.parse(sceneToExport);
          filename = 'threejs-cad-scene.obj';
          mimeType = 'text/plain';
          break;

        case 'stl':
          const stlExporter = new STLExporter();
          data = stlExporter.parse(sceneToExport, { binary: false });
          filename = 'threejs-cad-scene.stl';
          mimeType = 'application/vnd.ms-pki.stl';
          break;

        default:
          console.warn('Unsupported export format:', format);
          return;
      }

      if (data) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      alert(`Failed to export scene to ${format}. Check console for details.`);
    }
  }, [objects, lightSettings, gridSettings, measurements]);

  const handleMouseDownLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMoveLeft);
    document.addEventListener('mouseup', handleMouseUpLeft);
  }, []);

  const handleMouseMoveLeft = useCallback((e: MouseEvent) => {
    const newWidth = e.clientX;
    setLeftSidebarWidth(Math.max(200, Math.min(400, newWidth)));
  }, []);

  const handleMouseUpLeft = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMoveLeft);
    document.removeEventListener('mouseup', handleMouseUpLeft);
  }, []);

  const handleMouseDownRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMoveRight);
    document.addEventListener('mouseup', handleMouseUpRight);
  }, []);

  const handleMouseMoveRight = useCallback((e: MouseEvent) => {
    const newWidth = window.innerWidth - e.clientX;
    setRightSidebarWidth(Math.max(200, Math.min(400, newWidth)));
  }, []);

  const handleMouseUpRight = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMoveRight);
    document.removeEventListener('mouseup', handleMouseUpRight);
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-white flex flex-col">
      <KeyboardShortcuts
        onTransformModeChange={setTransformMode}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        onSelectAll={selectAllObjects}
        onDeselect={deselectAll}
        selectedObjectId={selectedObjectId}
      />

      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              WebGL CAD Studio Pro
            </h1>
            <div className="text-sm text-gray-400">
              Professional 3D modeling with face selection & measurement
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-900 bg-opacity-50 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-green-300">Three.js Renderer</span>
            </div>
            {sketchMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-900 bg-opacity-50 rounded-full">
                <Layers size={12} />
                <span className="text-xs text-purple-300">3D Sketch Mode</span>
              </div>
            )}
            {activeTool === 'face-select' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-900 bg-opacity-50 rounded-full">
                <span className="text-xs text-blue-300">Face Selection Mode</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFileImportOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
            >
              <Upload size={16} /> Import 3D File
            </button>

            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm"
              >
                <Download size={16} />
                Export Scene <ChevronDown size={16} className={`ml-1 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => { exportScene('json'); setExportDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 rounded-t-lg"
                  >
                    Export as .json
                  </button>
                  <button
                    onClick={() => { exportScene('obj'); setExportDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600"
                  >
                    Export as .obj
                  </button>
                  <button
                    onClick={() => { exportScene('stl'); setExportDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 rounded-b-lg"
                  >
                    Export as .stl
                  </button>
                </div>
              )}
            </div>

            <button className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm">
              <Save size={16} />
              Save Project
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm">
              <Settings size={16} />
              Settings
            </button>
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
              title={isRightSidebarOpen ? 'Minimize Right Panels' : 'Maximize Right Panels'}
            >
              {isRightSidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main content area: Left sidebar, Viewport, Right sidebar */}
      {/* Added 'relative' to make it the positioning context for absolute children */}
      <div ref={mainContentRef} className="flex-1 flex overflow-hidden relative">
        {/* Left sidebar */}
        <div
          className="border-r border-gray-700 bg-gray-800 flex-shrink-0 h-full overflow-y-auto"
          style={{ width: leftSidebarWidth }}
        >
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onAddPrimitive={addPrimitive}
            onDeleteSelected={deleteSelected}
            onOpenSketch={handleOpenSketch}
            onOpenImport={() => setFileImportOpen(true)}
            onToggleMeasurement={() => setMeasurementPanelOpen(!measurementPanelOpen)}
            onToggleLighting={() => setLightingPanelOpen(!lightingPanelOpen)}
            onToggleGrid={() => setGridPanelOpen(!gridPanelOpen)}
            hasSelection={selectedObjectId !== null}
            measurementActive={measurementPanelOpen}
            lightingPanelOpen={lightingPanelOpen}
            gridPanelOpen={gridPanelOpen}
            sketchMode={sketchMode}
          />
        </div>
        <div
          className="w-2 bg-gray-700 cursor-ew-resize hover:bg-gray-600 flex-shrink-0 h-full"
          onMouseDown={handleMouseDownLeft}
        />

        {/* Viewport takes all available space */}
        <div ref={viewportRef} className="flex-1 relative h-full">
          <Viewport3D
            objects={objects}
            selectedObjectId={selectedObjectId}
            onObjectSelect={setSelectedObjectId}
            lightSettings={lightSettings}
            gridSettings={gridSettings}
            onMeasurementPoint={handleMeasurementPoint}
            measurementActive={measurementEngine.getActiveTool() !== null}
            transformMode={transformMode}
            onObjectTransform={handleObjectTransform}
            sketchMode={sketchMode}
            onSketchComplete={handleSketchExtrude}
            sketchTool={sketchTool}
            sketchModeType={sketchModeType}
            sketchSettings={sketchSettings}
            onSketchSettingsChange={handleSketchSettingsChange}
            viewportWidth={viewportDimensions.width}
            viewportHeight={viewportDimensions.height}
            activeTool={activeTool}
          />
        </div>

        {/* Right resizer - only visible if sidebar is OPEN */}
        {isRightSidebarOpen && (
          <div
            className="w-2 bg-gray-700 cursor-ew-resize hover:bg-gray-600 flex-shrink-0 h-full"
            onMouseDown={handleMouseDownRight}
          />
        )}

        {/* Right sidebar container */}
        <div
          className={`border-l border-gray-700 flex flex-col bg-gray-800 transition-all duration-300 ease-in-out ${
            isRightSidebarOpen
              ? 'flex-shrink-0 h-full' // When open, behaves as a flex item and takes up space
              : 'absolute top-0 right-0 h-full z-50 group overflow-hidden' // When minimized, absolute, takes no flex space
          }`}
          style={{ width: isRightSidebarOpen ? rightSidebarWidth : '50px' }}
        >
          {isRightSidebarOpen ? (
            /* Full Sidebar Content when Open */
            <div className="flex-1 overflow-y-auto h-full">
              <CollapsiblePanel
                title="Measurement"
                isOpen={measurementPanelOpen}
                onToggle={() => setMeasurementPanelOpen(!measurementPanelOpen)}
                minimizedIcon={<Ruler size={18} className="text-gray-400" />}
              >
                <MeasurementPanel
                  measurements={measurements}
                  activeTool={measurementEngine.getActiveTool()}
                  onToolChange={handleMeasurementToolChange}
                  onDeleteMeasurement={handleDeleteMeasurement}
                  onClearAll={handleClearMeasurements}
                  tempPoints={measurementEngine.getTempPoints().length}
                />
              </CollapsiblePanel>

              <CollapsiblePanel
                title="Lighting"
                isOpen={lightingPanelOpen}
                onToggle={() => setLightingPanelOpen(!lightingPanelOpen)}
                minimizedIcon={<Lightbulb size={18} className="text-gray-400" />}
              >
                <LightingPanel
                  settings={lightSettings}
                  onSettingsChange={setLightSettings}
                />
              </CollapsiblePanel>

              <CollapsiblePanel
                title="Grid"
                isOpen={gridPanelOpen}
                onToggle={() => setGridPanelOpen(!gridPanelOpen)}
                minimizedIcon={<Grid size={18} className="text-gray-400" />}
              >
                <GridPanel
                  settings={gridSettings}
                  onSettingsChange={setGridSettings}
                />
              </CollapsiblePanel>

              <CollapsiblePanel
                title="Scene Hierarchy"
                isOpen={sceneHierarchyOpen}
                onToggle={() => setSceneHierarchyOpen(!sceneHierarchyOpen)}
                minimizedIcon={<Layers size={18} className="text-gray-400" />}
              >
                <SceneHierarchy
                  objects={objects}
                  selectedObjectId={selectedObjectId}
                  onObjectSelect={selectObject}
                  onObjectVisibilityToggle={handleObjectVisibilityToggle}
                />
              </CollapsiblePanel>
              <CollapsiblePanel
                title="Properties"
                isOpen={propertiesPanelOpen}
                onToggle={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
                minimizedIcon={<ClipboardList size={18} className="text-gray-400" />}
              >
                <PropertiesPanel
                  selectedObject={selectedObject}
                  onObjectUpdate={updateObject}
                />
              </CollapsiblePanel>
            </div>
          ) : (
            /* Minimized Sidebar Content (Icons + Hover Expand) */
            <div className="flex flex-col items-center gap-4 py-4 w-full h-full transition-all duration-300 ease-in-out group-hover:w-[320px] group-hover:items-start group-hover:pl-4 group-hover:pr-2 group-hover:bg-gray-700">
              <button
                onClick={() => { setIsRightSidebarOpen(true); setMeasurementPanelOpen(!measurementPanelOpen); }}
                className="p-2 rounded-lg hover:bg-gray-600 text-gray-400 relative group-hover:w-full group-hover:flex group-hover:items-center group-hover:justify-start"
                title="Measurement"
              >
                <Ruler size={18} />
                <span className="hidden group-hover:inline-block ml-2 text-sm text-gray-200">Measurement</span>
              </button>
              <button
                onClick={() => { setIsRightSidebarOpen(true); setLightingPanelOpen(!lightingPanelOpen); }}
                className="p-2 rounded-lg hover:bg-gray-600 text-gray-400 relative group-hover:w-full group-hover:flex group-hover:items-center group-hover:justify-start"
                title="Lighting"
              >
                <Lightbulb size={18} />
                <span className="hidden group-hover:inline-block ml-2 text-sm text-gray-200">Lighting</span>
              </button>
              <button
                onClick={() => { setIsRightSidebarOpen(true); setGridPanelOpen(!gridPanelOpen); }}
                className="p-2 rounded-lg hover:bg-gray-600 text-gray-400 relative group-hover:w-full group-hover:flex group-hover:items-center group-hover:justify-start"
                title="Grid"
              >
                <Grid size={18} />
                <span className="hidden group-hover:inline-block ml-2 text-sm text-gray-200">Grid</span>
              </button>
              <button
                onClick={() => { setIsRightSidebarOpen(true); setSceneHierarchyOpen(!sceneHierarchyOpen); }}
                className="p-2 rounded-lg hover:bg-gray-600 text-gray-400 relative group-hover:w-full group-hover:flex group-hover:items-center group-hover:justify-start"
                title="Scene Hierarchy"
              >
                <Layers size={18} />
                <span className="hidden group-hover:inline-block ml-2 text-sm text-gray-200">Scene Hierarchy</span>
              </button>
              <button
                onClick={() => { setIsRightSidebarOpen(true); setPropertiesPanelOpen(!propertiesPanelOpen); }}
                className="p-2 rounded-lg hover:bg-gray-600 text-gray-400 relative group-hover:w-full group-hover:flex group-hover:items-center group-hover:justify-start"
                title="Properties"
              >
                <ClipboardList size={18} />
                <span className="hidden group-hover:inline-block ml-2 text-sm text-gray-200">Properties</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <FileImport
        isOpen={fileImportOpen}
        onClose={() => setFileImportOpen(false)}
        onFilesImported={handleFilesImported}
      />
      {!sketchMode && activeTool !== 'face-select' && (
        <ContextToolbar
          selectedObjectId={selectedObjectId}
          transformMode={transformMode}
          onTransformModeChange={setTransformMode}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onToggleVisibility={toggleSelectedVisibility}
          onOffsetFace={handleOffsetFace}
          onOffsetBody={handleOffsetBody}
          onMirrorX={() => handleMirror('x')}
          onMirrorY={() => handleMirror('y')}
          onMirrorZ={() => handleMirror('z')}
          onResetTransform={handleResetTransform}
          isVisible={selectedObject?.visible ?? true}
        />
      )}

      <div className="bg-gray-800 border-t border-gray-700 px-6 py-2 text-sm text-gray-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span>Objects: {objects.length}</span>
            <span>Selected: {selectedObject ? selectedObject.id.split('-')[0] : 'None'}</span>
            <span>Tool: {activeTool}</span>
            <span>Transform: {transformMode.toUpperCase()}</span>
            <span>Measurements: {measurements.length}</span>
            {sketchMode && <span className="text-purple-400 font-medium">3D SKETCH MODE</span>}
            {activeTool === 'face-select' && <span className="text-blue-400 font-medium">FACE SELECTION MODE</span>}
          </div>
          <div className="flex items-center gap-4">
            <span>Grid: {gridSettings.visible ? 'On' : 'Off'}</span>
            <span>Snap: {gridSettings.snapEnabled ? 'On' : 'Off'}</span>
            <span>Three.js Renderer: Active</span>
            <span>Hardware Acceleration: Enabled</span>
          </div>
        </div>
      </div>

      <AdvancedSketchPanel
        isOpen={sketchPanelOpen}
        onClose={handleCloseSketch}
        onExtrude={handleSketchExtrude}
        onToolChange={setSketchTool}
        onModeChange={setSketchModeType}
        onSettingsChange={handleSketchSettingsChange}
        activeTool={sketchTool}
        sketchMode={sketchModeType}
        snapToGrid={sketchSettings.snapToGrid}
        gridSize={sketchSettings.gridSize}
        workplaneVisible={sketchSettings.workplaneVisible}
        currentShapes={sketchEngineRef ? sketchEngineRef.getShapes() : []}
      />

      {sketchShapes.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-sm">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Current Sketch Shapes:</h3>
          <div className="text-xs text-gray-400 space-y-1 max-h-32 overflow-y-auto">
            {sketchShapes.map(shape => (
              <div key={shape.id} className="flex justify-between">
                <span>{shape.type.toUpperCase()}</span>
                <span>{shape.points.length} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;