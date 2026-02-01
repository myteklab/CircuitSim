/**
 * SaveLoadManager - Handles saving and loading circuit projects.
 *
 * When running standalone, save/load operates via local JSON file export/import.
 * When running inside a platform wrapper, the platform bridge handles persistence
 * through postMessage — this class just provides the serialization interface.
 */
class SaveLoadManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDirty = false;
    }

    markDirty() {
        this.isDirty = true;
    }

    markClean() {
        this.isDirty = false;
    }

    hasUnsavedChanges() {
        return this.isDirty;
    }

    /**
     * Get serialized circuit data.
     */
    getData() {
        return this.canvas.toJSON();
    }

    /**
     * Load circuit data into the canvas.
     */
    loadData(circuitData) {
        if (circuitData && circuitData.components) {
            this.canvas.fromJSON(circuitData);
            return true;
        }
        return false;
    }

    /**
     * Get project name (from title or default).
     */
    getProjectName() {
        return document.title.includes('CircuitSim') ? 'My Circuit' : document.title;
    }

    /**
     * Export circuit as JSON file (download).
     */
    exportToFile() {
        const circuitData = this.canvas.toJSON();
        const jsonString = JSON.stringify(circuitData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `circuit_${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Import circuit from JSON file.
     */
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const circuitData = JSON.parse(e.target.result);
                    this.canvas.fromJSON(circuitData);
                    resolve({ success: true });
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }
}
