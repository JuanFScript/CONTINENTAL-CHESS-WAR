/**
 * CONTINENTAL - Piece Set Registry & Dynamic Discovery Engine
 * Automatically discovers folders in 'Imagenes de las piezas', categorizes them
 * based on a classification list, and places uncategorized/custom sets first (after default).
 */

const PieceSetRegistry = {
    // Classification categories
    categories: [
        {
            name: "🎨 Sets Disponibles",
            sets: [
                { id: "medieval_real", label: "Medieval Realista (Personas)" }
            ]
        }
    ],

    // Default fallback discovered folder IDs
    discoveredFolderIds: [
        "default", "medieval_real"
    ],

    isLoaded: false,

    /**
     * Asynchronously loads manifest.json from 'Imagenes de las piezas/manifest.json'
     */
    async init() {
        try {
            const response = await fetch('Imagenes de las piezas/manifest.json?v=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.sets) && data.sets.length > 0) {
                    this.discoveredFolderIds = data.sets;
                }
            }
        } catch (e) {
            console.warn('[PieceSetRegistry] Could not fetch manifest.json, using built-in fallback folder list.', e);
        }
        this.isLoaded = true;
    },

    /**
     * Converts a folder ID into a human-readable title
     * e.g., "mi_nuevo_set" -> "Mi Nuevo Set"
     */
    formatUncategorizedLabel(id) {
        if (!id) return '';
        return id.split(/[_-\s]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    },

    /**
     * Generates the complete ordered list of piece styles for UI rendering:
     * 1. Hardcoded 'default' piece set at top.
     * 2. Uncategorized / Custom discovered folders (placed BEFORE categories).
     * 3. Categorized groups (Fantasía, Históricos, etc.).
     */
    getStructuredPieceStyles() {
        const result = [];

        // 1. Hardcoded default set (Always first)
        result.push({ id: 'default', label: 'Default (Oficial)', group: null });

        // Build a set of all categorized IDs (including default)
        const classifiedIds = new Set(['default']);
        this.categories.forEach(cat => {
            cat.sets.forEach(s => classifiedIds.add(s.id));
        });

        // 2. Unclassified / Custom discovered folders
        const unclassifiedSets = this.discoveredFolderIds.filter(id => !classifiedIds.has(id));
        if (unclassifiedSets.length > 0) {
            result.push({ label: '⭐ Sets Personalizados / Nuevos', isGroup: true });
            unclassifiedSets.forEach(id => {
                result.push({
                    id: id,
                    label: this.formatUncategorizedLabel(id)
                });
            });
        }

        // 3. Categorized groups
        this.categories.forEach(cat => {
            const availableSets = cat.sets.filter(s => this.discoveredFolderIds.includes(s.id));
            if (availableSets.length > 0) {
                result.push({ label: cat.name, isGroup: true });
                availableSets.forEach(s => {
                    result.push({
                        id: s.id,
                        label: s.label
                    });
                });
            }
        });

        return result;
    }
};

// Auto-initialize manifest fetch on script load
if (typeof window !== 'undefined') {
    PieceSetRegistry.init();
}
