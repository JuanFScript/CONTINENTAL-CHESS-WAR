/**
 * CONTINENTAL - Piece Registry
 * Central registry for standard and custom war pieces.
 * Engineered for maximum modularity to allow adding custom pieces easily.
 */

class PieceRegistry {
    static registry = new Map();

    /**
     * Register a new piece type in the CONTINENTAL engine.
     * @param {string} type - Unique identifier for the piece (e.g., 'p', 'n', 'b', 'r', 'q', 'k', 'assassin')
     * @param {Object} definition - Piece definition metadata and move logic generator
     */
    static register(type, definition) {
        this.registry.set(type.toLowerCase(), {
            type: type.toLowerCase(),
            name: definition.name || { es: type, en: type },
            symbol: definition.symbol || '?',
            value: definition.value || 1,
            svg: definition.svg || null,
            category: definition.category || 'standard',
            tier: definition.tier || 'standard',
            tags: definition.tags || [],
            octogonal: !!definition.octogonal,
            moveSummary: definition.moveSummary || null,
            description: definition.description || { es: '', en: '' },
            getMoves: definition.getMoves || (() => []),
            ...definition
        });
    }

    /**
     * Get definition for a piece type
     */
    static get(type) {
        if (!type) return null;
        return this.registry.get(type.toLowerCase()) || null;
    }

    /**
     * Check if a piece type is registered
     */
    static has(type) {
        return this.registry.has(type.toLowerCase());
    }

    /**
     * Get all registered piece definitions
     */
    static getAll() {
        return Array.from(this.registry.values());
    }
}
