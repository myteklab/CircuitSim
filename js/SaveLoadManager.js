/**
 * SaveLoadManager - Handles saving and loading projects via MyTekOS API
 */
class SaveLoadManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.projectId = window.circuitApp.projectId;
        this.loginId = window.circuitApp.loginId;
        this.applicationId = window.circuitApp.applicationId;
        this.saveEndpoint = '/beta/applications/CircuitSim/save_project.php';
        this.isDirty = false; // Track unsaved changes
    }

    /**
     * Mark as having unsaved changes
     */
    markDirty() {
        this.isDirty = true;
    }

    /**
     * Mark as saved (no unsaved changes)
     */
    markClean() {
        this.isDirty = false;
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        return this.isDirty;
    }

    /**
     * Save current circuit to server
     */
    async save() {
        try {
            const circuitData = this.canvas.toJSON();
            const jsonString = JSON.stringify(circuitData);

            // Prepare form data
            const formData = new FormData();
            formData.append('circuit_data', jsonString);
            formData.append('name', this.getProjectName());

            // Add project ID if we have one
            if (this.projectId && this.projectId !== '') {
                formData.append('project_id', this.projectId);
            }

            // Save the circuit data
            const response = await fetch(this.saveEndpoint, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Save failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();

            if (result.success) {
                // Update project ID if it's a new project
                if (result.project_id && (!this.projectId || this.projectId === '')) {
                    this.projectId = result.project_id;
                    window.circuitApp.projectId = result.project_id;

                    // Update URL with project ID
                    const newUrl = window.location.pathname + '?id=' + result.project_id;
                    window.history.pushState({ projectId: result.project_id }, '', newUrl);
                }

                // Mark as clean after successful save
                this.markClean();

                return { success: true, projectId: result.project_id, action: result.action };
            } else {
                throw new Error(result.error || 'Unknown error');
            }

        } catch (error) {
            console.error('Save error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get project name (from title or default)
     */
    getProjectName() {
        // Try to get name from page title or use default
        return document.title.includes('CircuitSim') ? 'My Circuit' : document.title;
    }

    /**
     * Load circuit from server
     * Note: Initial load is handled by index.php, this is for reloading
     */
    async load(projectId) {
        try {
            // Circuit data is already loaded by index.php into window.circuitApp.initialData
            // This function is mainly for explicit reload operations

            if (window.circuitApp.initialData && window.circuitApp.initialData.components) {
                const circuitData = window.circuitApp.initialData;
                this.canvas.fromJSON(circuitData);
                return { success: true, data: circuitData };
            } else {
                // Empty circuit
                return { success: true, data: null };
            }

        } catch (error) {
            console.error('Load error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Auto-save functionality
     */
    enableAutoSave(intervalSeconds = 60) {
        setInterval(async () => {
            if (this.projectId && this.projectId !== '') {
                const result = await this.save();
                if (result.success) {
                    console.log('Auto-saved at', new Date().toLocaleTimeString());
                }
            }
        }, intervalSeconds * 1000);
    }

    /**
     * Export circuit as JSON file (download)
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
     * Import circuit from JSON file
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

    /**
     * Generate preview image for gallery
     */
    async generatePreview() {
        try {
            // Get canvas as data URL
            const canvas = document.getElementById('circuit-canvas');
            const dataUrl = canvas.toDataURL('image/png');

            // Send to server to save as preview
            const response = await fetch(`${this.apiBase}/projects/${this.projectId}/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    preview_data: dataUrl
                })
            });

            return response.ok;

        } catch (error) {
            console.error('Preview generation error:', error);
            return false;
        }
    }
}
