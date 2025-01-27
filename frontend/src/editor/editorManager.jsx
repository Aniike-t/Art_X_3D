import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Toolbar from './components/Toolbar';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import PropertiesPanel from './components/PropertiesPanel';
import CameraControls from './components/CameraControls';
import GroundPlane from './components/GroundPlane';
import Model from './components/Model';
import './styles/editorManager.css';
import * as THREE from "three";

const EditorManager = () => {
    const [sceneObjects, setSceneObjects] = useState([]);
    const [selectedObjects, setSelectedObjects] = useState([]);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [isMoving, setIsMoving] = useState(false);
    const [sceneSettings, setSceneSettings] = useState({
        backgroundColor: '#2D2E32',
        effectsEnabled: false,
        fogEnabled: false,
        fogColor: '#ffffff',
        fogNear: 1,
        fogFar: 100,
        ambientShadowsEnabled: false,
        ambientIntensity: 0,
        lightColor: '#ffffff',
        lightIntensity: 50,
        lightX: 0,
        lightY: 0,
        lightZ: 0,
        lightShadows: false,
    });
    const sceneRef = useRef();

    // Undo and redo stacks
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);



    const saveToUndoStack = (newScene) => {
        setUndoStack((prevStack) => [...prevStack, newScene]);
        setRedoStack([]); // Clear redo stack on new action
    };

    const undo = () => {
        if (undoStack.length > 0) {
            const previousState = undoStack.pop();
            setRedoStack((prevStack) => [sceneObjects, ...prevStack]);
            setSceneObjects(previousState);
            setUndoStack([...undoStack]); // Update undo stack
        }
    };

    const redo = () => {
        if (redoStack.length > 0) {
            const nextState = redoStack.shift();
            setUndoStack((prevStack) => [...prevStack, sceneObjects]);
            setSceneObjects(nextState);
            setRedoStack([...redoStack]); // Update redo stack
        }
    };


    const deleteSelectedObjects = () => {
        saveToUndoStack([...sceneObjects]); // Save current state before deleting
        setSceneObjects((prevObjects) =>
            prevObjects.filter((obj) => {
                if (selectedObjects.includes(obj.id)) {
                    const object3D = sceneRef.current.getObjectById(obj.id);
                    if (object3D) {
                        object3D.traverse((child) => {
                            if (child.isMesh) {
                                if (child.geometry) child.geometry.dispose();
                                if (child.material) child.material.dispose();
                            }
                        });
                        sceneRef.current.remove(object3D);
                    }
                    return false;
                }
                return true;
            })
        );
        setSelectedObjects([]);
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Delete' && selectedObjects.length > 0) {
                deleteSelectedObjects();
            } else if (event.ctrlKey && event.key === 'z') {
                undo();
            } else if (event.ctrlKey && event.key === 'y') {
                redo();
            } else if (
                event.key === 'ArrowUp' ||
                event.key === 'ArrowDown' ||
                event.key === 'ArrowLeft' ||
                event.key === 'ArrowRight'
            ) {
                handleArrowKeyMovement(event); // Move the object by 0.5 on each press
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedObjects, sceneObjects, undoStack, redoStack]);

    const handleArrowKeyMovement = (event) => {
        if (selectedObjects.length > 0) {
            const step = 0.5;
            const movement = { x: 0, y: 0, z: 0 };
            if (event.key === 'ArrowUp') movement.y = step;
            if (event.key === 'ArrowDown') movement.y = -step;
            if (event.key === 'ArrowLeft') movement.x = -step;
            if (event.key === 'ArrowRight') movement.x = step;
            saveToUndoStack([...sceneObjects]);
            setSceneObjects((prevObjects) => {
                const updatedObjects = prevObjects.map((obj) => {
                    if (selectedObjects.includes(obj.id)) {
                        return {
                            ...obj,
                            position: [
                                obj.position[0] + movement.x,
                                obj.position[1] + movement.y,
                                obj.position[2] + movement.z,
                            ],
                        };
                    }
                    return obj;
                });
                return updatedObjects;
            });
        }
    };



    const addModel = (type) => {
        saveToUndoStack([...sceneObjects]); // Save current state before adding
        const newObject = {
            id: Date.now(),
            type,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            material: {
                color: '#ffffff',
                metalness: 0,
                roughness: 0.5,
            },
            children: [],
        };
        setSceneObjects((prevObjects) => [...prevObjects, newObject]);
    };

    const handleObjectSelect = (objectIds) => {
        setSelectedObjects(objectIds);
        setCameraEnabled(objectIds.length === 0);
    };

    const updateObject = (objectId, newProps) => {
        if (objectId === 'scene') {
            setSceneSettings(prevSettings => ({
                ...prevSettings,
                ...newProps
            }));
        } else {
            saveToUndoStack([...sceneObjects]); // Save current state before updating
            setSceneObjects((prevObjects) =>
                prevObjects.map((obj) =>
                    obj.id === objectId ? { ...obj, ...newProps } : obj
                )
            );
        }
    };

    const deselectAllObjects = (event) => {
        if (
            event.type === 'click' &&
            (event.target.closest('.edit-mode-button') ||
                event.target.closest('.hierarchy-panel'))
        ) {
            setSelectedObjects([]);
            setCameraEnabled(true);
        }
    };

    const onImportScene = (loadedScene) => {
        const sceneGroup = loadedScene.scene || loadedScene;
        const boundingBox = new THREE.Box3().setFromObject(sceneGroup);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const importedObject = {
            id: Date.now() + Math.random(),
            type: sceneGroup.name || "ImportedModel",
            mesh: sceneGroup, // Store the entire scene group
            position: [0,0,0], // Reset position to origin, can adjust if needed
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            material: 'standard', // Default material, can be updated in properties panel
            boundingBox: {
                min: [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z],
                max: [boundingBox.max.x, boundingBox.max.y, boundingBox.max.z],
                center: [center.x, center.y, center.z],
                size: [size.x, size.y, size.z],
            },
            children: [],
        };
        setSceneObjects((prevObjects) => [...prevObjects, importedObject]);
    };



    return (
        <div className="editor-container" onClick={deselectAllObjects}>
            <Toolbar
                onAddModel={addModel}
                onUndo={undo}
                onRedo={redo}
                undoDisabled={undoStack.length === 0}
                redoDisabled={redoStack.length === 0}
                selectedObjects={selectedObjects}
            />
            <div className="main-area">
                <div className="sidebar">
                    <HierarchyPanel
                        sceneObjects={sceneObjects}
                        onObjectSelect={handleObjectSelect}
                        selectedObjects={selectedObjects}
                        onImportScene={onImportScene}
                    />

                    <PropertiesPanel
                        selectedObjects={selectedObjects}
                        sceneObjects={sceneObjects}
                        updateObject={updateObject}
                    />
                </div>
                <div className="viewport">
                    <Canvas
                         camera={{ position: [0, 5, 10], fov: 45 }}
                         onCreated={({ gl }) => {
                            gl.setClearColor(sceneSettings.backgroundColor);
                        }}
                        style={{ backgroundColor: sceneSettings.backgroundColor }}
                    >
                         <ambientLight intensity={sceneSettings.ambientShadowsEnabled ? sceneSettings.ambientIntensity : 0} />
                         {sceneSettings.lightShadows ? (
                            <pointLight
                                 position={[sceneSettings.lightX, sceneSettings.lightY, sceneSettings.lightZ]}
                                 intensity={sceneSettings.lightIntensity}
                                 color={sceneSettings.lightColor}
                                castShadow={true}
                               />
                        ) : null}
                        {sceneSettings.fogEnabled && <fog attach="fog" args={[sceneSettings.fogColor, sceneSettings.fogNear, sceneSettings.fogFar]} />}
                        <gridHelper args={[10, 10]} />
                        <GroundPlane receiveShadow={true} />
                        <group ref={sceneRef}>
                            {sceneObjects.map((object) => (
                                <Model
                                    key={object.id}
                                    object={object}
                                    isSelected={selectedObjects.includes(object.id)}
                                    setCameraEnabled={setCameraEnabled}
                                    onSelect={handleObjectSelect}
                                    onUpdateObject={updateObject}
                                />
                            ))}
                        </group>
                        <CameraControls
                            enabled={cameraEnabled}
                            selectedObjects={selectedObjects}
                        />
                    </Canvas>
                </div>
            </div>
        </div>
    );
};

export default EditorManager;