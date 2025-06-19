import React, { useState, useCallback } from 'react';
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
import { Save, Download, Settings, Layers } from 'lucide-react';
import * as THREE from 'three';

function App() {
  const [objects, setObjects] = useState<RenderObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState('select');
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  
  // Panel states
  const [sketchPanelOpen, setSketchPanelOpen] = useState(false);
  const [lightingPanelOpen, setLightingPanelOpen] = useState(false);
  const [gridPanelOpen, setGridPanelOpen] = useState(false);
  const [measurementPanelOpen, setMeasurementPanelOpen] = useState(false);

  // Sketch mode state
  const [sketchMode, setSketchMode] = useState(false);
  const [sketchTool, setSketchTool] = useState('line');
  const [sketchModeType, setSketchModeType] = useState<'surface' | 'plane' | 'free'>('surface');
  const [sketchSettings, setSketchSettings] = useState({
    snapToGrid: true,
    gridSize: 0.5,
    workplaneVisible: true
  });
  const [sketchShapes, setSketchShapes] = useState<SketchShape3D[]>([]);

  // Measurement system
  const [measurementEngine] = useState(() => new MeasurementEngine());
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // Lighting settings
  const [lightSettings, setLightSettings] = useState<LightSettings>({
    ambient: { intensity: 0.2, color: [1, 1, 1] },
    directional: { intensity: 0.8, color: [1, 1, 1], position: [10, 10, 10] },
    point: { intensity: 0.5, color: [1, 1, 1], position: [5, 5, 5] }
  });

  // Grid settings
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    size: 10,
    divisions: 20,
    opacity: 0.3,
    visible: true,
    snapEnabled: true,
    color: new Vec3(0.5, 0.5, 0.5)
  });

  // Sketch engine reference
  const [sketchEngineRef, setSketchEngineRef] = useState<any>(null);

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

    const newObject: RenderObject = {
      id: generateId(type),
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
  }, []);

  const handleSketchExtrude = useCallback((shapes: SketchShape3D[]) => {
    const extrusionSettings = {
      depth: 2,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3
    };

    // Convert 3D sketch shapes to 2D for extrusion
    const sketch2D = shapes.map(shape => ({
      type: shape.type,
      points: shape.points.map(p => ({ x: p.position.x * 50, y: p.position.z * 50, id: p.id })),
      id: shape.id,
      closed: shape.closed
    }));

    const geometry = ExtrusionEngine.extrudeSketch(sketch2D, extrusionSettings);
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
  }, []);

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
    
    const selectedObj = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObj) return;

    const newGeometry = OffsetEngine.offsetFace(selectedObj.mesh.geometry, 0, 0.2);
    selectedObj.mesh.geometry.dispose();
    selectedObj.mesh.geometry = newGeometry;

    setObjects(prev => [...prev]);
  }, [selectedObjectId, objects]);

  const handleOffsetBody = useCallback(() => {
    if (!selectedObjectId) return;
    
    const selectedObj = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObj) return;

    const newGeometry = OffsetEngine.offsetBody(selectedObj.mesh.geometry, 0.1);
    selectedObj.mesh.geometry.dispose();
    selectedObj.mesh.geometry = newGeometry;

    setObjects(prev => [...prev]);
  }, [selectedObjectId, objects]);

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
            scale: new Vec3(1, 1, 1)
          }
        : obj
    ));
  }, [selectedObjectId]);

  const selectAllObjects = useCallback(() => {
    if (objects.length > 0) {
      setSelectedObjectId(objects[0].id); // For simplicity, select first object
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
    }
    if (settings.getShapes) {
      // Store reference to sketch engine methods
      setSketchEngineRef({
        clear: settings.clear,
        finishSketch: settings.finishSketch,
        getShapes: settings.getShapes
      });
    }
  }, [sketchEngineRef]);

  const selectedObject = selectedObjectId ? objects.find(obj => obj.id === selectedObjectId) || null : null;

  const exportScene = useCallback(() => {
    const sceneData = {
      objects: objects.map(obj => ({
        id: obj.id,
        type: obj.id.split('-')[0],
        position: obj.position,
        rotation: obj.rotation,
        scale: obj.scale,
        color: obj.color,
        visible: obj.visible
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

    const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'threejs-cad-scene.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [objects, lightSettings, gridSettings, measurements]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Keyboard Shortcuts Handler */}
      <KeyboardShortcuts
        onTransformModeChange={setTransformMode}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        onSelectAll={selectAllObjects}
        onDeselect={deselectAll}
        selectedObjectId={selectedObjectId}
      />

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              WebGL CAD Studio Pro
            </h1>
            <div className="text-sm text-gray-400">
              Professional 3D modeling with advanced sketching
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
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={exportScene}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm"
            >
              <Download size={16} />
              Export Scene
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm">
              <Save size={16} />
              Save Project
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm">
              <Settings size={16} />
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Tools */}
        <div className="w-64 border-r border-gray-700 bg-gray-800">
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onAddPrimitive={addPrimitive}
            onDeleteSelected={deleteSelected}
            onOpenSketch={handleOpenSketch}
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

        {/* Center - 3D Viewport */}
        <div className="flex-1 relative">
          <Viewport3D
            objects={objects}
            selectedObjectId={selectedObjectId}
            onObjectSelect={selectObject}
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
          />
        </div>

        {/* Right sidebar - Properties and Panels */}
        <div className="w-80 border-l border-gray-700 flex flex-col">
          {/* Dynamic panel based on active tool */}
          {measurementPanelOpen && (
            <div className="h-1/2 border-b border-gray-700">
              <MeasurementPanel
                measurements={measurements}
                activeTool={measurementEngine.getActiveTool()}
                onToolChange={handleMeasurementToolChange}
                onDeleteMeasurement={handleDeleteMeasurement}
                onClearAll={handleClearMeasurements}
                tempPoints={measurementEngine.getTempPoints().length}
              />
            </div>
          )}

          {lightingPanelOpen && (
            <div className="h-1/2 border-b border-gray-700">
              <LightingPanel
                settings={lightSettings}
                onSettingsChange={setLightSettings}
              />
            </div>
          )}

          {gridPanelOpen && (
            <div className="h-1/2 border-b border-gray-700">
              <GridPanel
                settings={gridSettings}
                onSettingsChange={setGridSettings}
              />
            </div>
          )}

          {/* Scene Hierarchy */}
          <div className={`${measurementPanelOpen || lightingPanelOpen || gridPanelOpen ? 'h-1/2' : 'h-1/2'} border-b border-gray-700`}>
            <SceneHierarchy
              objects={objects}
              selectedObjectId={selectedObjectId}
              onObjectSelect={selectObject}
              onObjectVisibilityToggle={handleObjectVisibilityToggle}
            />
          </div>
          
          {/* Properties Panel */}
          <div className={`${measurementPanelOpen || lightingPanelOpen || gridPanelOpen ? 'h-1/2' : 'h-1/2'}`}>
            <PropertiesPanel
              selectedObject={selectedObject}
              onObjectUpdate={updateObject}
            />
          </div>
        </div>
      </div>

      {/* Context Toolbar */}
      {!sketchMode && (
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

      {/* Status bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-2 text-sm text-gray-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span>Objects: {objects.length}</span>
            <span>Selected: {selectedObject ? selectedObject.id.split('-')[0] : 'None'}</span>
            <span>Tool: {activeTool}</span>
            <span>Transform: {transformMode.toUpperCase()}</span>
            <span>Measurements: {measurements.length}</span>
            {sketchMode && <span className="text-purple-400 font-medium">3D SKETCH MODE</span>}
          </div>
          <div className="flex items-center gap-4">
            <span>Grid: {gridSettings.visible ? 'On' : 'Off'}</span>
            <span>Snap: {gridSettings.snapEnabled ? 'On' : 'Off'}</span>
            <span>Three.js Renderer: Active</span>
            <span>Hardware Acceleration: Enabled</span>
          </div>
        </div>
      </div>

      {/* Advanced Sketch Panel */}
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
    </div>
  );
}

export default App;