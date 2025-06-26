import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ThreeRenderer, RenderObject, LightSettings, GridSettings } from '../three/ThreeRenderer';
import { TransformGizmo } from './TransformGizmo';
import { SketchEngine3D, SketchShape3D } from '../utils/sketch3d';
import { Vec3 } from '../utils/math';
import * as THREE from 'three'; // Import THREE for Object3D type

interface Viewport3DProps {
    objects: RenderObject[];
    selectedObjectId: string | null;
    onObjectSelect: (id: string | null) => void;
    onCameraUpdate?: (position: Vec3, target: Vec3) => void;
    lightSettings: LightSettings;
    gridSettings: GridSettings;
    onMeasurementPoint?: (point: Vec3) => void;
    measurementActive?: boolean;
    transformMode: 'translate' | 'rotate' | 'scale';
    onObjectTransform?: (id: string, transform: { position?: Vec3; rotation?: Vec3; scale?: Vec3 }) => void;
    sketchMode?: boolean;
    onSketchComplete?: (shapes: SketchShape3D[]) => void;
    sketchTool?: string;
    sketchModeType?: 'surface' | 'plane' | 'free';
    sketchSettings?: {
        snapToGrid: boolean;
        gridSize: number;
        workplaneVisible: boolean;
    };
    onSketchSettingsChange?: (settings: any) => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
    objects,
    selectedObjectId,
    onObjectSelect,
    onCameraUpdate,
    lightSettings,
    gridSettings,
    onMeasurementPoint,
    measurementActive = false,
    transformMode,
    onObjectTransform,
    sketchMode = false,
    onSketchComplete,
    sketchTool = 'line',
    sketchModeType = 'surface',
    sketchSettings = { snapToGrid: true, gridSize: 0.5, workplaneVisible: true },
    onSketchSettingsChange
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<ThreeRenderer | null>(null);
    const sketchEngineRef = useRef<SketchEngine3D | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [cameraControlsEnabled, setCameraControlsEnabled] = useState(true);
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());


    const cameraRef = useRef({
        distance: 15,
        azimuth: 0,
        elevation: Math.PI / 4,
        target: new Vec3(0, 0, 0),
        orbiting: false, // Replaces isDragging
        panning: false,  // Replaces isPanning
        lastMouseX: 0,
        lastMouseY: 0,
        movementSpeed: 5.0, // Base movement speed (units per second)
        shiftMultiplier: 3.0, // Speed multiplier for Shift key
    });

    const renderOnce = useCallback(() => {
        if (rendererRef.current) {
            rendererRef.current.render();
        }
    }, []);

    const updateCamera = useCallback(() => {
        const camera = cameraRef.current;
        const position = new Vec3(
            camera.target.x + camera.distance * Math.cos(camera.elevation) * Math.cos(camera.azimuth),
            camera.target.y + camera.distance * Math.sin(camera.elevation),
            camera.target.z + camera.distance * Math.cos(camera.elevation) * Math.sin(camera.azimuth)
        );
        rendererRef.current?.updateCamera(position, camera.target);
        onCameraUpdate?.(position, camera.target);
        renderOnce();
    }, [onCameraUpdate, renderOnce]);

    // Keyboard event listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only capture if camera controls are enabled and not in sketch/measurement mode
            if (cameraControlsEnabled && !sketchMode && !measurementActive) {
                setPressedKeys((prev) => new Set(prev).add(e.key.toLowerCase()));
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            setPressedKeys((prev) => {
                const newKeys = new Set(prev);
                newKeys.delete(e.key.toLowerCase());
                return newKeys;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [cameraControlsEnabled, sketchMode, measurementActive]); // Depend on relevant modes

    // Animation loop for continuous camera movement
    useEffect(() => {
        let animationFrameId: number;
        let lastTime = performance.now();

        const animate = (currentTime: number) => {
            if (rendererRef.current && cameraControlsEnabled) {
                const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
                lastTime = currentTime;

                const camera = cameraRef.current;
                let currentSpeed = camera.movementSpeed;

                if (pressedKeys.has('shift')) {
                    currentSpeed *= camera.shiftMultiplier;
                }

                const moveAmount = currentSpeed * deltaTime;

                // Calculate forward and right vectors based on camera's current orientation
                // For WASD, we typically want movement relative to the camera's horizontal gaze,
                // so the 'forward' vector's Y component is based on elevation,
                // but the 'right' vector is purely horizontal.
                const forward = new Vec3(
                    Math.cos(camera.azimuth),
                    0, // Y component set to 0 for horizontal movement on WASD
                    Math.sin(camera.azimuth)
                ).normalize();

                const right = new Vec3(
                    Math.cos(camera.azimuth + Math.PI / 2),
                    0,
                    Math.sin(camera.azimuth + Math.PI / 2)
                ).normalize();

                const newTarget = camera.target.clone();
                let positionChanged = false;

                if (pressedKeys.has('s')) {
                    newTarget.add(forward.multiplyScalar(moveAmount));
                    positionChanged = true;
                }
                if (pressedKeys.has('w')) {
                    newTarget.subtract(forward.multiplyScalar(moveAmount));
                    positionChanged = true;
                }
                if (pressedKeys.has('d')) {
                    newTarget.subtract(right.multiplyScalar(moveAmount));
                    positionChanged = true;
                }
                if (pressedKeys.has('a')) {
                    newTarget.add(right.multiplyScalar(moveAmount));
                    positionChanged = true;
                }
                if (pressedKeys.has('q')) { // Move camera up (global Y)
                    newTarget.y += moveAmount;
                    positionChanged = true;
                }
                if (pressedKeys.has('e')) { // Move camera down (global Y)
                    newTarget.y -= moveAmount;
                    positionChanged = true;
                }

                if (positionChanged) {
                    camera.target.copy(newTarget);
                    // Recalculate camera position based on new target, distance, azimuth, and elevation
                    const newPosition = new Vec3(
                        camera.target.x + camera.distance * Math.cos(camera.elevation) * Math.cos(camera.azimuth),
                        camera.target.y + camera.distance * Math.sin(camera.elevation),
                        camera.target.z + camera.distance * Math.cos(camera.elevation) * Math.sin(camera.azimuth)
                    );
                    rendererRef.current?.updateCamera(newPosition, camera.target);
                    onCameraUpdate?.(newPosition, camera.target);
                    renderOnce();
                }
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [pressedKeys, cameraControlsEnabled, updateCamera, onCameraUpdate, renderOnce]); // Depend on pressedKeys

    useEffect(() => {
        if (selectedObjectId) {
            setCameraControlsEnabled(false);
        } else {
            setCameraControlsEnabled(true);
        }
    }, [selectedObjectId]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Handle sketch events first
        if (sketchMode && sketchEngineRef.current) {
            if (sketchEngineRef.current.handleMouseDown(e.nativeEvent)) {
                setCameraControlsEnabled(false); // Disable camera controls if sketch engine handles event
                renderOnce();
                return;
            }
        }

        // Then check camera controls
        if (!cameraControlsEnabled) return;
        if (measurementActive) return;

        if (e.button === 0) cameraRef.current.orbiting = true;
        else if (e.button === 2) cameraRef.current.panning = true;

        cameraRef.current.lastMouseX = e.clientX;
        cameraRef.current.lastMouseY = e.clientY;
    }, [cameraControlsEnabled, measurementActive, sketchMode, renderOnce]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        // Handle sketch events FIRST, before checking camera controls
        if (sketchMode && sketchEngineRef.current && sketchEngineRef.current.handleMouseMove(e.nativeEvent)) {
            renderOnce();
            return;
        }

        // Then check camera controls
        if (!cameraControlsEnabled) return;
        if (measurementActive) return;

        if ((!cameraRef.current.orbiting && !cameraRef.current.panning)) return;

        const deltaX = e.clientX - cameraRef.current.lastMouseX;
        const deltaY = e.clientY - cameraRef.current.lastMouseY;

        if (cameraRef.current.orbiting) {
            cameraRef.current.azimuth -= deltaX * 0.01;
            cameraRef.current.elevation = Math.max(
                -Math.PI / 2 + 0.1,
                Math.min(Math.PI / 2 - 0.1, cameraRef.current.elevation - deltaY * 0.01)
            );
        } else if (cameraRef.current.panning) {
            // Pan speed now scales with camera distance for a more intuitive feel
            const panSpeed = 0.01 * cameraRef.current.distance;
            // Calculate right vector relative to current camera azimuth (horizontal movement)
            const right = new Vec3(Math.cos(cameraRef.current.azimuth + Math.PI / 2), 0, Math.sin(cameraRef.current.azimuth + Math.PI / 2));
            const up = new Vec3(0, 1, 0); // Global up vector for vertical pan

            cameraRef.current.target.x -= right.x * deltaX * panSpeed;
            cameraRef.current.target.z -= right.z * deltaX * panSpeed;
            cameraRef.current.target.y += up.y * deltaY * panSpeed; // Global Y pan
        }

        cameraRef.current.lastMouseX = e.clientX;
        cameraRef.current.lastMouseY = e.clientY;
        updateCamera();
    }, [updateCamera, measurementActive, sketchMode, renderOnce]);


    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (sketchMode && sketchEngineRef.current && sketchEngineRef.current.handleMouseUp(e.nativeEvent)) {
            setCameraControlsEnabled(true);
            renderOnce();
            return;
        }
        cameraRef.current.orbiting = false;
        cameraRef.current.panning = false;
        // setCameraControlsEnabled(true); // Re-enable camera controls after mouse up (unless sketch mode took over)
        // This is now handled by the selectedObjectId useEffect, or can be explicitly set here if no object is selected.
    }, [sketchMode, renderOnce]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        // Allow zooming much closer (0.1) and much farther (2000)
        cameraRef.current.distance = Math.max(0.1, Math.min(2000, cameraRef.current.distance + e.deltaY * 0.01));
        updateCamera();
    }, [updateCamera]);

    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        // Only trigger click logic if no camera movement was in progress
        if (cameraRef.current.orbiting || cameraRef.current.panning || !rendererRef.current) return;
        
        if (sketchMode && sketchEngineRef.current && sketchEngineRef.current.handleClick(e.nativeEvent)) {
            renderOnce();
            return;
        }

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (measurementActive && onMeasurementPoint) {
            const worldPoint = rendererRef.current.getIntersectionPoint(x, y);
            if (worldPoint) {
                const snappedPoint = rendererRef.current.snapToGrid(worldPoint);
                onMeasurementPoint(snappedPoint);
                renderOnce();
            }
        } else if (!sketchMode) {
            // Only allow object selection if not in sketch mode
            const objectId = rendererRef.current.getObjectAtPoint(x, y);
            onObjectSelect(objectId);
            renderOnce();
        }
    }, [measurementActive, sketchMode, onMeasurementPoint, onObjectSelect, renderOnce]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if (sketchMode && sketchEngineRef.current) {
            sketchEngineRef.current.handleDoubleClick(e.nativeEvent);
            renderOnce();
        }
    }, [sketchMode, renderOnce]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); // Prevent default right-click context menu
    }, []);


    const handleTransformStart = useCallback(() => {
        setCameraControlsEnabled(false); // Disable camera controls when gizmo is active
    }, []);

    const handleTransformEnd = useCallback(() => {
        if (!selectedObjectId) {
            setCameraControlsEnabled(true); // Re-enable camera controls if no object is selected
        }
    }, [selectedObjectId]);

    const handleTransform = useCallback((object: THREE.Object3D) => {
        if (!selectedObjectId || !onObjectTransform) return;

        const position = new Vec3(object.position.x, object.position.y, object.position.z);
        const rotation = new Vec3(object.rotation.x, object.rotation.y, object.rotation.z);
        const scale = new Vec3(object.scale.x, object.scale.y, object.scale.z);

        // This must trigger a state update in the parent component
        onObjectTransform(selectedObjectId, { position, rotation, scale });
    }, [selectedObjectId, onObjectTransform]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            rendererRef.current = new ThreeRenderer(canvas);
            // SketchEngine3D also needs the renderer instance to get intersections
            sketchEngineRef.current = new SketchEngine3D(rendererRef.current.getScene(), rendererRef.current.getCamera(), rendererRef.current.getRenderer());
            updateCamera();
            setIsInitialized(true);
            renderOnce();
        } catch (error) {
            console.error('Failed to initialize Three.js:', error);
        }

        // Cleanup function for when the component unmounts
        return () => {
            rendererRef.current?.dispose();
            sketchEngineRef.current?.dispose();
        };
    }, [updateCamera, renderOnce]); // Dependencies: updateCamera and renderOnce to ensure proper initialization

    useEffect(() => {
        if (sketchEngineRef.current && isInitialized) {
            // Update sketch engine settings whenever relevant props change
            sketchEngineRef.current.setTool(sketchTool);
            sketchEngineRef.current.setSketchMode(sketchModeType);
            sketchEngineRef.current.setSnapToGrid(sketchSettings.snapToGrid);
            sketchEngineRef.current.setGridSize(sketchSettings.gridSize);
            sketchEngineRef.current.setWorkplaneVisible(sketchSettings.workplaneVisible);
            renderOnce();
        }
    }, [sketchTool, sketchModeType, sketchSettings, isInitialized, renderOnce]);

    useEffect(() => {
        // Expose SketchEngine API to parent component via onSketchSettingsChange prop
        if (onSketchSettingsChange && sketchEngineRef.current && isInitialized) {
            const sketchAPI = {
                getShapes: () => sketchEngineRef.current?.getShapes() || [],
                clear: () => sketchEngineRef.current?.clear(),
                finishSketch: () => sketchEngineRef.current?.finishCurrentSketch()
            };
            onSketchSettingsChange(sketchAPI);
        }
        // Only run once when initialized to provide the API
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialized]);


    const prevObjectsRef = useRef<Map<string, RenderObject>>(new Map());

    useEffect(() => {
        if (!rendererRef.current || !isInitialized) return;

        const prevObjects = prevObjectsRef.current;
        const currentIds = new Set(objects.map(o => o.id));

        // Remove deleted objects: Iterate through previously rendered objects.
        // If an object's ID is no longer in the current `objects` prop, remove it from the scene.
        for (const [id] of prevObjects) {
            if (!currentIds.has(id)) {
                rendererRef.current.removeObject(id);
                prevObjects.delete(id);
            }
        }

        // Add or update current objects: Iterate through current `objects` prop.
        for (const obj of objects) {
            const prev = prevObjects.get(obj.id);

            // If object is new, add it to the scene
            if (!prev) {
                if (obj.mesh && obj.mesh.geometry) {
                    rendererRef.current.addObject(obj.id, obj.mesh.geometry, obj.color);
                }
            }

            // Always update transformation and selection state, even for existing objects
            rendererRef.current.updateObject(obj.id, {
                position: obj.position,
                rotation: obj.rotation,
                scale: obj.scale,
                color: obj.color,
                selected: obj.id === selectedObjectId, // Set selected state based on prop
                visible: obj.visible,
            });

            // Update the ref map with the current object state
            prevObjects.set(obj.id, obj);
        }

        renderOnce(); // Re-render the scene after object changes
    }, [objects, selectedObjectId, isInitialized, renderOnce]); // Dependencies: `objects` and `selectedObjectId` trigger updates

    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (canvas && rendererRef.current) {
                const rect = canvas.getBoundingClientRect();
                rendererRef.current.resize(rect.width, rect.height);
                renderOnce();
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Call once initially to set correct size
        return () => window.removeEventListener('resize', handleResize);
    }, [renderOnce]);

    const getCursorStyle = () => {
        if (measurementActive || sketchMode) return 'cursor-crosshair';
        if (cameraRef.current.orbiting) return 'cursor-grabbing';
        if (cameraRef.current.panning) return 'cursor-move';
        if (!cameraControlsEnabled) return 'cursor-default';
        return 'cursor-grab';
    };

    const selectedMesh = rendererRef.current?.getSelectedMesh() || null;
    return (
        <div className="w-full h-full relative bg-gray-900">
            <canvas
                ref={canvasRef}
                className={`w-full h-full ${getCursorStyle()}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} // Important: Ensures camera state resets if mouse leaves canvas while dragging
                onWheel={handleWheel}
                onClick={handleCanvasClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
            />

            {isInitialized && rendererRef.current && selectedMesh && (
                <TransformGizmo
                    scene={rendererRef.current.getScene()}
                    camera={rendererRef.current.getCamera()}
                    renderer={rendererRef.current.getRenderer()}
                    selectedObject={selectedMesh}
                    mode={transformMode}
                    onTransformStart={handleTransformStart}
                    onTransformEnd={handleTransformEnd}
                    onTransform={handleTransform}
                />
            )}

            {/* Viewport controls overlay */}
            <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-3 text-white text-sm">
                <div className="font-semibold mb-2">
                    {sketchMode
                        ? '3D Sketch Mode'
                        : measurementActive
                            ? 'Measurement Mode'
                            : `Transform: ${transformMode.toUpperCase()}`}
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                    {sketchMode ? (
                        <>
                            <div>• Click surfaces to create workplanes</div>
                            <div>• Draw directly on surfaces</div>
                            <div>• Double-click to finish polygons</div>
                            <div>• Right-click: Pan • Scroll: Zoom</div>
                        </>
                    ) : measurementActive ? (
                        <>
                            <div>• Click points to measure</div>
                            <div>• Grid snap: {gridSettings.snapEnabled ? 'On' : 'Off'}</div>
                        </>
                    ) : (
                        // Updated controls for Unity-like movement
                        <>
                            <div>• W/A/S/D: Move Camera (Forward/Left/Backward/Right)</div>
                            <div>• Q/E: Move Camera (Up/Down)</div>
                            <div>• Shift: Speed Up Movement</div>
                            <div>• Left-drag: Orbit Camera • Right-drag: Pan Camera</div>
                            <div>• Scroll: Zoom In/Out • Click: Select Object</div>
                            <div>• G: Move • R: Rotate • S: Scale (Selected Object)</div>
                        </>
                    )}
                </div>
            </div>

            {/* Grid info */}
            {gridSettings.visible && (
                <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-2 text-white text-xs">
                    <div>Grid: {gridSettings.size}×{gridSettings.size}</div>
                    <div>Snap: {gridSettings.snapEnabled ? 'On' : 'Off'}</div>
                </div>
            )}

            {/* Three.js indicator */}
            <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 rounded-lg p-2 text-white text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Three.js Renderer</span>
                </div>
                <div className="text-gray-400">Hardware Accelerated</div>
            </div>

            {/* Lighting indicator */}
            <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 rounded-lg p-2 text-white text-xs">
                <div>Lights: {Object.values(lightSettings).filter(light => light.intensity > 0).length}</div>
                <div className="text-gray-400">PBR Lighting</div>
            </div>

            {/* Sketch mode banner */}
            {sketchMode && (
                <div className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-green-900 bg-opacity-95 rounded-lg p-3 text-white text-sm border border-green-600">
                    <div className="font-semibold mb-1 text-green-300">🎨 3D Sketch Mode Active</div>
                    <div className="text-green-200 text-xs space-y-1">
                        <div>• Click on any surface to start sketching</div>
                        <div>• Create workplanes at any angle</div>
                        <div>• Draw lines, rectangles, circles, polygons</div>
                        <div>• Double-click to finish polygons</div>
                        <div>• Use Extrude button to create 3D objects</div>
                    </div>
                </div>
            )}

            {/* Transform mode banner */}
            {selectedObjectId && !sketchMode && (
                <div className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-blue-900 bg-opacity-95 rounded-lg p-3 text-white text-sm border border-blue-600">
                    <div className="font-semibold mb-1 text-blue-300">🎯 Transform Mode</div>
                    <div className="text-blue-200 text-xs space-y-1">
                        <div className={transformMode === 'translate' ? 'text-blue-300 font-bold' : ''}>G - Move Object</div>
                        <div className={transformMode === 'rotate' ? 'text-blue-300 font-bold' : ''}>R - Rotate Object</div>
                        <div className={transformMode === 'scale' ? 'text-blue-300 font-bold' : ''}>S - Scale Object</div>
                        <div className="text-blue-400 mt-2">Use gizmo handles to transform</div>
                    </div>
                </div>
            )}

            {/* Sketch tool help box */}

            {sketchMode && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-95 rounded-lg p-3 text-white text-sm border border-gray-600">
                    <div className="text-center">
                        <div className="font-semibold text-green-400 mb-1">
                            Tool: {sketchTool.charAt(0).toUpperCase() + sketchTool.slice(1)}
                        </div>
                        <div className="text-xs text-gray-300">
                            {sketchTool === 'polygon'
                                ? 'Click points, double-click to finish'
                                : sketchTool === 'line'
                                    ? 'Click start and end points'
                                    : sketchTool === 'rectangle'
                                        ? 'Click and drag to create rectangle'
                                        : sketchTool === 'circle'
                                            ? 'Click center, then drag to edge'
                                            : 'Click to add points'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}