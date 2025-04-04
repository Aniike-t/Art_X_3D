// --- Toolbar.jsx ---
import React, { useState } from 'react';
import '../styles/toolbar.css';
import ShapeButton from './toolbar/ShapeButton';
import LightButton from './toolbar/LightButton'; // Import LightButton
import { FaUndo, FaRedo } from 'react-icons/fa'; //  Remove FaSave
// import axios from "axios";  // REMOVE: No axios calls in Toolbar


const basicShapes = ['cube', 'sphere']; // Basic shapes always visible
const advancedShapes = [
    'cylinder',
    'cone',
    'torus',
    'plane',
    'ring',
    'dodecahedron',
    'tetrahedron',
    'octahedron',
    'icosahedron',
    'capsule',
    'lathe',
];

const lightTypes = ['pointLight', 'spotLight', 'directionalLight'];


const Toolbar = ({
  onAddModel,
  onAddLight,
  selectedObjects,
  onUndo,
  onRedo,
  undoDisabled,
  redoDisabled,
  // currentSceneId,     // REMOVE: No longer needed here
  // currentSceneName,   // REMOVE: No longer needed here
  // setCurrentSceneName, // REMOVE: No longer needed here
}) => {
    const [showShapes, setShowShapes] = useState(false);
    const [showLights, setShowLights] = useState(false);


    const toggleShapes = () => {
        setShowShapes(!showShapes);
    };

    const toggleLights = () => {
        setShowLights(!showLights);
    }

    // REMOVE: handleSave is completely removed from Toolbar

    return (
        <div className="toolbar">
            <div className="undo-redo-buttons">
            <button
                    onClick={onUndo}
                    disabled={undoDisabled}
                    className={`undo-redo-buttons ${undoDisabled ? 'disabled' : 'enabled'}`}
                >
                    <FaUndo />
                </button>
                <button
                    onClick={onRedo}
                    disabled={redoDisabled}
                    className={`undo-redo-buttons ${redoDisabled ? 'disabled' : 'enabled'}`}
                >
                    <FaRedo />
                </button>
            </div>
            <hr className='vertical-line'></hr>

            {/* Edit Mode Button with Conditional Styling */}
            {selectedObjects.length > 0 ? (
                <button className="edit-mode-button enabled">Edit Mode</button>
            ) : (
                <button className="edit-mode-button disabled">Edit Mode</button>
            )}
            {/* REMOVED Save button:  <hr className='vertical-line'></hr> */}
             {/* REMOVED Save button: <button onClick={handleSave} title="Save Scene" className='save-button'>
                <FaSave />
            </button> */}
              <hr className='vertical-line'></hr>
            {/* Basic shapes always visible */}
            <div className="basic-shapes">
                {basicShapes.map((shape) => (
                    <ShapeButton key={shape} shape={shape} onAddModel={onAddModel} />
                ))}
            </div>

            <hr className='vertical-line'></hr>

            <div className="toolbar-section" onClick={toggleShapes}>
                <span className="toolbar-section-title">
                    {showShapes ? '▾' : '▸'} More Shapes
                </span>
                {showShapes && (
                    <div className="advanced-shape-buttons">
                        <div className="advanced-shapes-scroll">
                            {advancedShapes.map((shape) => (
                                <ShapeButton
                                    key={shape}
                                    shape={shape}
                                    onAddModel={onAddModel}
                                    isAdvancedShape={true}
                                />
                            ))}

                            <hr className='style-six'></hr>

                            {lightTypes.map((type) => (
                                <LightButton key={type} type={type} onAddLight={onAddLight} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

    );
};

export default Toolbar;