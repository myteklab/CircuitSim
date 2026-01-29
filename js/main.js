/**
 * main.js - Initialize and run CircuitSim application
 */

// Global application state
let circuitCanvas;
let circuitSimulator;
let saveLoadManager;
let uiManager;

/**
 * Initialize the application
 */
function init() {
    // Create canvas
    circuitCanvas = new CircuitCanvas('circuit-canvas');

    // Expose globally for components to access visual effects
    window.circuitCanvas = circuitCanvas;

    // Create simulator
    circuitSimulator = new CircuitSimulator(circuitCanvas.components, circuitCanvas.wires);

    // Expose simulator globally for animate loop
    window.circuitSimulator = circuitSimulator;

    // Create save/load manager
    saveLoadManager = new SaveLoadManager(circuitCanvas);

    // Create UI manager
    uiManager = new UIManager(circuitCanvas, circuitSimulator, saveLoadManager);

    // Expose uiManager globally for canvas to trigger updates
    window.uiManager = uiManager;

    // Create robot wiring validator
    const robotWiringValidator = new RobotWiringValidator(circuitCanvas);
    window.robotWiringValidator = robotWiringValidator;

    // Create history manager for undo/redo
    const historyManager = new HistoryManager(circuitCanvas, 50); // 50 state limit
    window.historyManager = historyManager;

    // Load initial data from PHP (already in window.circuitApp.initialData)
    if (window.circuitApp.initialData && window.circuitApp.initialData.components) {
        circuitCanvas.fromJSON(window.circuitApp.initialData);
        // Clear history and start fresh with loaded circuit
        historyManager.clear();
    }

    // Start simulation loop
    startSimulationLoop();

    // Enable auto-save (every 60 seconds)
    if (window.circuitApp.projectId && window.circuitApp.projectId !== '') {
        saveLoadManager.enableAutoSave(60);
    }

    // Make saveLoadManager available globally for markDirty calls
    window.saveLoadManager = saveLoadManager;
}

/**
 * Simulation loop - just updates UI display
 * (Actual simulation now runs in CircuitCanvas.animate())
 */
function startSimulationLoop() {
    function loop() {
        // Always update UI display (insights work when simulation is on OR off)
        uiManager.updateSimulationDisplay();

        // Continue loop
        requestAnimationFrame(loop);
    }

    loop();
}

/**
 * Window load event
 */
window.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure DOM is fully ready
    setTimeout(init, 100);
});

/**
 * Before unload - warn about unsaved changes
 */
window.addEventListener('beforeunload', (e) => {
    if (saveLoadManager && saveLoadManager.hasUnsavedChanges()) {
        // Only warn if there are unsaved changes
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
});

/**
 * Export for debugging in console
 */
window.CircuitSimDebug = {
    getCanvas: () => circuitCanvas,
    getSimulator: () => circuitSimulator,
    getSaveManager: () => saveLoadManager,
    getUIManager: () => uiManager,
    analyze: () => circuitSimulator.analyzeCircuit(),
    exportJSON: () => circuitCanvas.toJSON(),
    importJSON: (data) => circuitCanvas.fromJSON(data)
};
