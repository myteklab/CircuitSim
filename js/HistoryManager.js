/**
 * HistoryManager - Handles undo/redo functionality using state snapshots
 */
class HistoryManager {
    constructor(canvas, maxStates = 50) {
        this.canvas = canvas;
        this.history = [];
        this.currentIndex = -1;
        this.maxStates = maxStates;
        this.isUndoRedoAction = false; // Flag to prevent history capture during undo/redo

        // Capture initial empty state
        this.pushState();
    }

    /**
     * Capture current circuit state
     */
    pushState() {
        // Don't capture state during undo/redo operations
        if (this.isUndoRedoAction) {
            return;
        }

        // Remove all redo states if we're not at the tip
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Capture current state using existing toJSON serialization
        const state = this.canvas.toJSON();

        // Deep clone to prevent reference issues
        this.history.push(JSON.parse(JSON.stringify(state)));

        // Limit history size (FIFO - remove oldest if exceeds max)
        if (this.history.length > this.maxStates) {
            this.history.shift();
        } else {
            // Only increment if we didn't shift
            this.currentIndex++;
        }

        // Update UI button states
        this.updateUI();
    }

    /**
     * Undo last action
     */
    undo() {
        if (!this.canUndo()) {
            return false;
        }

        // Stop simulation before undo to prevent state mismatch
        if (window.circuitSimulator && window.circuitSimulator.running) {
            window.circuitSimulator.stop();
        }

        // Cancel any active wire drawing
        if (this.canvas.drawingWire) {
            this.canvas.cancelWireDrawing();
        }

        this.isUndoRedoAction = true;

        // Move back in history
        this.currentIndex--;

        // Restore previous state
        const state = this.history[this.currentIndex];
        this.canvas.fromJSON(state);

        // Clear selection to avoid confusion
        this.canvas.selectComponent(null);

        this.isUndoRedoAction = false;

        // Update UI
        this.updateUI();

        // Show feedback
        if (window.uiManager) {
            window.uiManager.showStatus('↶ Undo', 'info', 1000);
        }

        return true;
    }

    /**
     * Redo previously undone action
     */
    redo() {
        if (!this.canRedo()) {
            return false;
        }

        // Stop simulation before redo
        if (window.circuitSimulator && window.circuitSimulator.running) {
            window.circuitSimulator.stop();
        }

        this.isUndoRedoAction = true;

        // Move forward in history
        this.currentIndex++;

        // Restore next state
        const state = this.history[this.currentIndex];
        this.canvas.fromJSON(state);

        // Clear selection
        this.canvas.selectComponent(null);

        this.isUndoRedoAction = false;

        // Update UI
        this.updateUI();

        // Show feedback
        if (window.uiManager) {
            window.uiManager.showStatus('↷ Redo', 'info', 1000);
        }

        return true;
    }

    /**
     * Check if undo is possible
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * Check if redo is possible
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Update UI button states
     */
    updateUI() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');

        if (undoBtn) {
            if (this.canUndo()) {
                undoBtn.disabled = false;
                undoBtn.style.opacity = '1';
                undoBtn.style.cursor = 'pointer';
            } else {
                undoBtn.disabled = true;
                undoBtn.style.opacity = '0.4';
                undoBtn.style.cursor = 'not-allowed';
            }
        }

        if (redoBtn) {
            if (this.canRedo()) {
                redoBtn.disabled = false;
                redoBtn.style.opacity = '1';
                redoBtn.style.cursor = 'pointer';
            } else {
                redoBtn.disabled = true;
                redoBtn.style.opacity = '0.4';
                redoBtn.style.cursor = 'not-allowed';
            }
        }
    }

    /**
     * Clear all history (useful when loading a new project)
     */
    clear() {
        this.history = [];
        this.currentIndex = -1;
        this.pushState(); // Capture new initial state
    }

    /**
     * Get current history stats (for debugging)
     */
    getStats() {
        return {
            historySize: this.history.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            memoryUsage: JSON.stringify(this.history).length + ' bytes'
        };
    }
}
