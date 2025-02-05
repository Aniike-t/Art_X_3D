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
import UndoRedo from './components/EditorManagerComponents/undoredo.jsx';
import KeyboardShortcuts from './components/EditorManagerComponents/keyshortcuts.jsx';
import CopyPaste from "./components/EditorManagerComponents/copypaste.jsx";

const EditorManager = () => {
    const [sceneObjects, setSceneObjects] = useState([]);
    const [selectedObjects, setSelectedObjects] = useState([]);
    const [copiedObjects, setCopiedObjects] = useState([]);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [isMoving, setIsMoving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
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
    const sceneRef = useRef(new THREE.Scene());

    const { undo, redo, saveToUndoStack, undoStack, redoStack } = UndoRedo({
        sceneObjects,
        setSceneObjects,
        sceneSettings,
        setSceneSettings,
        selectedObjects,
        setSelectedObjects
    });

    const { copySelectedObjects, pasteCopiedObjects, undoPaste, redoPaste } = CopyPaste({
        sceneObjects,
        selectedObjects,
        setSceneObjects,
        saveToUndoStack
    });

    const deleteSelectedObjects = () => {
        if (selectedObjects.length > 0) {
            saveToUndoStack([...sceneObjects], { ...sceneSettings });

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
        }
    };

    const handleDeleteObject = (objectId) => {
        saveToUndoStack([...sceneObjects], { ...sceneSettings });
        setSceneObjects((prevObjects) => prevObjects.filter((obj) => obj.id !== objectId));
        setSelectedObjects((prevSelected) => prevSelected.filter((id) => id !== objectId));
    };

    const handleArrowKeyMovement = (event) => {
        if (selectedObjects.length > 0) {
            const step = 0.5;
            const movement = { x: 0, y: 0, z: 0 };
            if (event.key === 'ArrowUp') movement.y = step;
            if (event.key === 'ArrowDown') movement.y = -step;
            if (event.key === 'ArrowLeft') movement.x = -step;
            if (event.key === 'ArrowRight') movement.x = step;
            saveToUndoStack([...sceneObjects], { ...sceneSettings });
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
        saveToUndoStack([...sceneObjects], { ...sceneSettings });
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
        saveToUndoStack();
        setSelectedObjects(objectIds);
        setCameraEnabled(objectIds.length === 0);
    };

    const updateObject = (objectId, newProps) => {
        if (objectId === 'scene') {
            saveToUndoStack([...sceneObjects], { ...sceneSettings });
            setSceneSettings(prevSettings => ({
                ...prevSettings,
                ...newProps
            }));
        } else {
            saveToUndoStack([...sceneObjects], { ...sceneSettings });
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
        saveToUndoStack([...sceneObjects], { ...sceneSettings });
        const sceneGroup = loadedScene.scene || loadedScene;
        const boundingBox = new THREE.Box3().setFromObject(sceneGroup);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const importedObject = {
            id: Date.now() + Math.random(),
            type: sceneGroup.name || "ImportedModel",
            mesh: sceneGroup,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            material: 'standard',
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
                        onObjectDelete={handleDeleteObject}
                        scene={sceneRef.current}
                    />
                    <PropertiesPanel
                        selectedObjects={selectedObjects ?? []}
                        sceneObjects={sceneObjects ?? []}
                        updateObject={updateObject}
                        sceneSettings={sceneSettings}
                    />
                </div>
                <div className="viewport">
                    <Canvas
                        camera={{ position: [0, 5, 10], fov: 45 }}
                        style={{ backgroundColor: sceneSettings?.backgroundColor || "#000000" }}
                    >
                        <SceneContent
                            sceneSettings={sceneSettings}
                            sceneRef={sceneRef}
                            sceneObjects={sceneObjects}
                            selectedObjects={selectedObjects}
                            setCameraEnabled={setCameraEnabled}
                            updateObject={updateObject}
                            handleObjectSelect={handleObjectSelect}
                        />
                        <CameraControls
                            enabled={cameraEnabled}
                            selectedObjects={selectedObjects}
                        />
                    </Canvas>
                </div>
            </div>
            <KeyboardShortcuts
                selectedObjects={selectedObjects}
                deleteSelectedObjects={deleteSelectedObjects}
                undo={() => { undo(); undoPaste(); }} // Include undoPaste in main undo
                redo={() => { redo(); redoPaste(); }} // Include redoPaste in main redo
                copySelectedObjects={copySelectedObjects}
                pasteCopiedObjects={pasteCopiedObjects}
                handleArrowKeyMovement={handleArrowKeyMovement}
            />
        </div>
    );
};

function SceneContent({ sceneSettings, sceneRef, sceneObjects, selectedObjects, setCameraEnabled, updateObject, handleObjectSelect }) {
    const { gl } = useThree();
    useEffect(() => {

        if (gl && sceneSettings.backgroundColor) {
            gl.setClearColor(sceneSettings.backgroundColor);
        }
    }, [sceneSettings.backgroundColor, gl]);

    return (
        <>
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
        </>
    );
}

export default EditorManager;