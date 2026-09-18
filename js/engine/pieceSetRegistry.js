/**
 * CONTINENTAL - Piece Set Registry & Dynamic Discovery Engine
 * Automatically discovers folders in 'Imagenes de las piezas', categorizes them
 * based on a classification list, and places uncategorized/custom sets first (after default).
 */

const PieceSetRegistry = {
    // Classification categories
    categories: [
        {
            name: "🎨 Ficticios / Fantasía",
            sets: [
                { id: "medieval_real", label: "Medieval Realista (Personas)" },
                { id: "pixel_fantasy", label: "Pixel Art Fantasía" },
                { id: "pixel_retro", label: "Pixel Art Retro (8-bits)" },
                { id: "crystal_jewel", label: "Cuarzo, Bronce & Amatista" },
                { id: "anime", label: "Estilo Anime" },
                { id: "scifi", label: "Sci-Fi Futuro" },
                { id: "steampunk", label: "Steampunk" },
                { id: "cyborg", label: "Cyborgs & Neón" }
            ]
        },
        {
            name: "🏛️ Históricos / Culturales",
            sets: [
                { id: "colonizers_natives", label: "Colonizadores vs Nativos" },
                { id: "aztec_maya", label: "Aztecas vs Mayas" },
                { id: "pirates_royal", label: "Piratas vs Flota Real" },
                { id: "medieval_uk_fr", label: "Medieval Inglés vs Francés" },
                { id: "reconquista", label: "Reconquista Española" },
                { id: "samurai_ninja", label: "Samuráis & Ninjas" },
                { id: "gauchos", label: "Gauchos Tradicionales" },
                { id: "roman", label: "Imperio Romano" },
                { id: "mongol", label: "Imperio Mongol" },
                { id: "indian", label: "Cultura India Antigua" },
                { id: "african", label: "Arte Tribal Africano" },
                { id: "inuit_polar", label: "Inuit & Polo Norte" },
                { id: "sparta_athens", label: "Esparta vs Atenas" },
                { id: "macedon_persia", label: "Macedonia vs Persia" },
                { id: "ww2", label: "Segunda Guerra Mundial" },
                { id: "coldwar", label: "Guerra Fría (EEUU vs URSS)" }
            ]
        }
    ],

    // Default fallback discovered folder IDs
    discoveredFolderIds: [
        "default", "medieval_real", "pixel_fantasy", "pixel_retro", "crystal_jewel",
        "anime", "scifi", "steampunk", "cyborg", "colonizers_natives", "aztec_maya",
        "pirates_royal", "medieval_uk_fr", "reconquista", "samurai_ninja", "gauchos",
        "roman", "mongol", "indian", "african", "inuit_polar", "sparta_athens",
        "macedon_persia", "ww2", "coldwar"
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
