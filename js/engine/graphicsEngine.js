/**
 * CONTINENTAL - Graphics & Theme Engine
 * Clean folder-based graphics manager for piece skins, texture packs, instant fallbacks,
 * preloading caches, themed directional arrows (Dragon, Mago, Cañón, Defensor, Arquero),
 * and board/menu visual themes.
 */

const GraphicsEngine = {
    // Current piece style folders
    currentPieceStyle: 'default',
    currentPieceStyleWhite: localStorage.getItem('continental_piece_style_white') || localStorage.getItem('continental_piece_style') || 'default',
    currentPieceStyleBlack: localStorage.getItem('continental_piece_style_black') || localStorage.getItem('continental_piece_style') || 'default',

    // Specific PNG asset overrides if present in set folders
    customPngOverrides: {
        'gauchos/caballo_blanco': 'png',
        'pixel_fantasy/peon_blanco': 'png',
        'crystal_jewel/rey_blanco': 'png',
        'crystal_jewel/rey_negro': 'png',
        'scifi/torre_blanca': 'png'
    },

    // Cache to memorize resolved URL objects and prevent re-evaluations
    resolvedUrlCache: new Map(),

    /**
     * Get clean normalized Spanish filename for any piece type and color
     * Examples: ('k', 'w') -> 'rey_blanco', ('c_dama', 'b') -> 'dama_negra', ('c_canon', 'w') -> 'canon_blanco'
     */
    getSpanishName(type, color) {
        if (!type) return `${color === 'w' ? 'peon_blanco' : 'peon_negro'}`;
        const cleanType = String(type).toLowerCase().trim();

        const stdMap = {
            'k': 'rey', 'q': 'reina', 'r': 'torre', 'b': 'alfil', 'n': 'caballo', 'p': 'peon',
            'rey': 'rey', 'reina': 'reina', 'torre': 'torre', 'alfil': 'alfil', 'caballo': 'caballo', 'peon': 'peon'
        };

        let baseName = stdMap[cleanType] || cleanType.replace(/^c_/, '');
        const isFem = (baseName === 'reina' || baseName === 'dama' || baseName === 'torre');
        const colorSuffix = (color === 'w') ? (isFem ? 'blanca' : 'blanco') : (isFem ? 'negra' : 'negro');

        return `${baseName}_${colorSuffix}`;
    },

    /**
     * Resolve the optimal image URL for a piece synchronously using clean folder structure.
     * Searches in: Imagenes de las piezas/${currentPieceStyle}/${pieceName}.svg (or .png)
     * Fallback:   Imagenes de las piezas/default/${pieceName}.svg
     */
    getPieceTexture(type, color, requestedStyle = null) {
        let style = requestedStyle;
        if (!style) {
            style = (color === 'w')
                ? (this.currentPieceStyleWhite || localStorage.getItem('continental_piece_style_white') || this.currentPieceStyle || 'default')
                : (this.currentPieceStyleBlack || localStorage.getItem('continental_piece_style_black') || this.currentPieceStyle || 'default');
        }
        const esName = this.getSpanishName(type, color);
        const cacheKey = `${style}/${esName}`;

        if (this.resolvedUrlCache.has(cacheKey)) {
            return this.resolvedUrlCache.get(cacheKey);
        }

        const pngKey = `${style}/${esName}`;
        const ext = (style === 'default') ? 'svg' : (this.customPngOverrides[pngKey] || 'png');
        const primaryUrl = `Imagenes de las piezas/${style}/${esName}.${ext}?v=84`;
        const fallbackUrl = `Imagenes de las piezas/default/${esName}.svg?v=84`;

        const result = {
            src: primaryUrl,
            fallbackSrc: fallbackUrl,
            symbolFallback: (typeof PieceRegistry !== 'undefined' && PieceRegistry.get(type)) 
                ? PieceRegistry.get(type).symbol 
                : (type || '')
        };

        this.resolvedUrlCache.set(cacheKey, result);
        return result;
    },

    /**
     * Preload all pieces of the active style into memory Image objects
     * to eliminate visual latency and flickering when opening the Armory or starting games.
     */
    preloadActiveSet() {
        const styles = [this.currentPieceStyleWhite || 'default', this.currentPieceStyleBlack || 'default'];
        const pieceList = [
            'rey', 'reina', 'torre', 'alfil', 'caballo', 'peon',
            'dama', 'lobo', 'escudero', 'guardia', 'soldado', 'mercenario',
            'elefante', 'piquetero', 'arquero', 'defensor', 'canon', 'dragon', 'gigante', 'mago'
        ];

        styles.forEach(style => {
            pieceList.forEach(p => {
                const isFem = (p === 'reina' || p === 'dama' || p === 'torre');
                const wName = isFem ? `${p}_blanca` : `${p}_blanco`;
                const bName = isFem ? `${p}_negra` : `${p}_negro`;

                const ext = (style === 'default') ? 'svg' : 'png';
                const imgW = new Image();
                imgW.src = `Imagenes de las piezas/${style}/${wName}.${ext}?v=84`;
                const imgB = new Image();
                imgB.src = `Imagenes de las piezas/${style}/${bName}.${ext}?v=84`;
            });
        });
    },

    /**
     * Update active piece style folder dynamically
     */
    setPieceStyle(styleKey, targetColor = 'both') {
        const style = styleKey || 'default';
        if (targetColor === 'w' || targetColor === 'both') {
            this.currentPieceStyleWhite = style;
            localStorage.setItem('continental_piece_style_white', style);
        }
        if (targetColor === 'b' || targetColor === 'both') {
            this.currentPieceStyleBlack = style;
            localStorage.setItem('continental_piece_style_black', style);
        }
        this.currentPieceStyle = style;
        localStorage.setItem('continental_piece_style', style);
        this.resolvedUrlCache.clear();
        this.preloadActiveSet();
    },

    // =========================================================================
    // THEMED DIRECTIONAL ARROWS FOR OCTOGONAL PIECES
    // (Dragon, Mago, Cañón, Defensor, Arquero)
    // =========================================================================

    /**
     * Render directional SVG overlay directly inside the piece's square element
     */
    renderArrowSvg(piece, squareEl, flipped = false) {
        if (!piece || typeof PieceRegistry === 'undefined') return;
        const reg = PieceRegistry.get(piece.type);
        if (!reg) return;

        const isOcto = reg.octogonal || (reg.tags && reg.tags.some(t => String(t).toLowerCase().includes('octo'))) ||
            (typeof window !== 'undefined' && window.CONTINENTAL_TEST_MODE && piece.type === 'c_arquero');
        if (!isOcto) return;

        const isWhite = piece.color === 'w';
        const facing = (piece.facing !== undefined) ? piece.facing : (isWhite ? 0 : 180);
        const renderFacing = facing;
        const style = this.currentPieceStyle || localStorage.getItem('continental_piece_style') || 'default';

        // Remove any preexisting arrow overlay in this square
        squareEl.querySelectorAll('.octo-arrow-overlay').forEach(el => el.remove());

        // Color palette resolution - STRICT COMPLIANCE
        let mainColor = '#f59e0b'; // Amber default
        let glowColor = 'rgba(245, 158, 11, 0.6)';

        if (piece.type === 'c_canon') {
            // CAÑÓN SIEMPRE DEBE TENER 3 COLORES OBLIGATORIOS: GRIS, AMARILLO Y ROJO
            if (piece.justFired) {
                mainColor = '#6b7280'; // Gris: recién disparado
                glowColor = 'rgba(107, 114, 128, 0.4)';
            } else if (piece.cooldownActive) {
                mainColor = '#f59e0b'; // Amarillo: recargando / turno previo
                glowColor = 'rgba(245, 158, 11, 0.6)';
            } else {
                mainColor = '#ef4444'; // Rojo: listo para disparar
                glowColor = 'rgba(239, 68, 68, 0.8)';
            }
        } else if (piece.type === 'c_defensor') {
            mainColor = '#3b82f6'; // Azul: escudo protector
            glowColor = 'rgba(59, 130, 246, 0.8)';
        } else if (piece.type === 'c_dragon') {
            mainColor = '#f97316'; // Naranja: llamarada
            glowColor = 'rgba(249, 115, 22, 0.8)';
        } else if (piece.type === 'c_mago') {
            mainColor = '#a855f7'; // Violeta: magia arcana
            glowColor = 'rgba(168, 85, 247, 0.8)';
        } else if (piece.type === 'c_arquero') {
            mainColor = '#10b981'; // Verde: arco táctico
            glowColor = 'rgba(16, 185, 129, 0.8)';
        }

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `octo-arrow-overlay arrow-style-${style}`);
        svg.setAttribute('viewBox', '0 0 45 45');

        let innerContent = '';

        if (piece.type === 'c_defensor') {
            innerContent = this.generateDefensorFanSvg(style, mainColor, glowColor, renderFacing);
        } else if (piece.type === 'c_mago') {
            const isMercenary = piece.stance === 'mercenary';
            innerContent = this.generateMagoStarSvg(style, mainColor, glowColor, renderFacing, isMercenary);
        } else {
            innerContent = this.generateForwardArrowSvg(style, mainColor, glowColor, renderFacing, piece.type);
        }

        svg.innerHTML = innerContent;
        squareEl.appendChild(svg);
    },

    /**
     * Single forward pointer (Dragon, Cañón, Arquero)
     */
    generateForwardArrowSvg(style, color, glow, angle, pieceType) {
        // 1. Pixel Art (Fantasy & Retro)
        if (style === 'pixel_fantasy' || style === 'pixel_retro') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 2px ${glow})">
                    <rect x="21" y="2" width="3" height="3" fill="${color}" />
                    <rect x="18" y="5" width="3" height="3" fill="${color}" />
                    <rect x="24" y="5" width="3" height="3" fill="${color}" />
                    <rect x="15" y="8" width="3" height="3" fill="${color}" />
                    <rect x="27" y="8" width="3" height="3" fill="${color}" />
                    <rect x="21" y="8" width="3" height="7" fill="${color}" />
                    <rect x="19.5" y="11" width="6" height="2" fill="${color}" />
                </g>
            `;
        }

        // 2. Sci-Fi Futuro & Neón
        if (style === 'scifi' || style === 'neon') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 4px ${glow})">
                    <polygon points="22.5,1 27,6 24,6 24,12 21,12 21,6 18,6" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <line x1="22.5" y1="3" x2="22.5" y2="11" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
                    <circle cx="22.5" cy="14" r="1.5" fill="${color}" />
                </g>
            `;
        }

        // 3. Cyborg & Neón (HUD hexagonal)
        if (style === 'cyborg') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                    <polygon points="22.5,2 26,5 26,10 22.5,13 19,10 19,5" fill="none" stroke="${color}" stroke-width="1.2" />
                    <polygon points="22.5,4 24.5,6.5 22.5,9 20.5,6.5" fill="${color}" />
                    <line x1="22.5" y1="13" x2="22.5" y2="16" stroke="${color}" stroke-width="1.5" />
                </g>
            `;
        }

        // 4. Cuarzo, Bronce & Amatista (Cristal)
        if (style === 'crystal_jewel') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                    <polygon points="22.5,1.5 27,7 22.5,14 18,7" fill="${color}" fill-opacity="0.88" stroke="#ffffff" stroke-width="1" />
                    <line x1="22.5" y1="1.5" x2="22.5" y2="14" stroke="#ffffff" stroke-width="0.8" />
                    <polygon points="22.5,4 25,7 22.5,10 20,7" fill="#ffffff" fill-opacity="0.4" />
                </g>
            `;
        }

        // 5. Steampunk
        if (style === 'steampunk') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))">
                    <circle cx="22.5" cy="13" r="3.5" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="2,1.5" />
                    <path d="M 22.5,2 L 25.5,8 L 23.5,8 L 23.5,13 L 21.5,13 L 21.5,8 L 19.5,8 Z" fill="${color}" stroke="#451a03" stroke-width="0.8" />
                    <circle cx="22.5" cy="13" r="1.2" fill="#fbbf24" />
                </g>
            `;
        }

        // 6. Samuráis & Ninjas
        if (style === 'samurai_ninja') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                    <polygon points="22.5,1 26,7 23.5,9 23.5,13 21.5,13 21.5,9 19,7" fill="${color}" stroke="#ffffff" stroke-width="0.7" />
                    <line x1="22.5" y1="2" x2="22.5" y2="9" stroke="#ffffff" stroke-width="1" />
                    <circle cx="22.5" cy="15" r="1.8" fill="none" stroke="${color}" stroke-width="1.2" />
                </g>
            `;
        }

        // 7. Aztecas vs Mayas (Obsidiana)
        if (style === 'aztec_maya') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                    <polygon points="22.5,1 26,5 24,7 26.5,10 23.5,11 23.5,14 21.5,14 21.5,11 18.5,10 21,7 19,5" fill="${color}" stroke="#1c1917" stroke-width="1" />
                    <polygon points="22.5,4 24,6 22.5,8 21,6" fill="#fef08a" />
                </g>
            `;
        }

        // 8. Piratas vs Flota Real (Sable / Brújula)
        if (style === 'pirates_royal') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                    <path d="M 22.5,1.5 C 24,4 26,8 25,12 L 23.5,12 L 23.5,14 L 21.5,14 L 21.5,12 L 20,12 C 19,8 21,4 22.5,1.5 Z" fill="${color}" stroke="#fef08a" stroke-width="0.8" />
                    <circle cx="22.5" cy="14" r="2" fill="none" stroke="${color}" stroke-width="1" />
                </g>
            `;
        }

        // 9. Gauchos Tradicionales (Facón Criollo)
        if (style === 'gauchos') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 2px ${glow})">
                    <polygon points="22.5,1.5 25,6 23.5,7 23.5,12 21.5,12 21.5,7 20,6" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <line x1="19" y1="12" x2="26" y2="12" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
                    <line x1="22.5" y1="12" x2="22.5" y2="15" stroke="${color}" stroke-width="1.8" />
                </g>
            `;
        }

        // 10. Imperio Romano, Esparta & Macedonia
        if (style === 'roman' || style === 'sparta_athens' || style === 'macedon_persia') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                    <polygon points="22.5,1 25.5,5 24,9 24,13 21,13 21,9 19.5,5" fill="${color}" stroke="#fef08a" stroke-width="0.9" />
                    <line x1="22.5" y1="2" x2="22.5" y2="13" stroke="#ffffff" stroke-width="1" />
                </g>
            `;
        }

        // 11. Medieval Real, Francés & Reconquista
        if (style === 'medieval_real' || style === 'medieval_uk_fr' || style === 'reconquista') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.8))">
                    <polygon points="22.5,1.5 26,7 23.5,7 23.5,12 21.5,12 21.5,7 19,7" fill="${color}" stroke="#1f2937" stroke-width="1" />
                    <line x1="19" y1="12" x2="26" y2="12" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
                    <circle cx="22.5" cy="14.5" r="1.2" fill="${color}" />
                </g>
            `;
        }

        // 12. Segunda Guerra Mundial & Guerra Fría (Balística / Radar)
        if (style === 'ww2' || style === 'coldwar') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                    <path d="M 18,7 L 22.5,2 L 27,7 L 25,7 L 22.5,4 L 20,7 Z" fill="${color}" />
                    <line x1="22.5" y1="4" x2="22.5" y2="13" stroke="${color}" stroke-width="1.8" stroke-dasharray="2,1" />
                    <circle cx="22.5" cy="14" r="1.5" fill="${color}" />
                </g>
            `;
        }

        // 13. Mongol, Indio, Africano, Inuit, Colonizadores
        if (['mongol', 'indian', 'african', 'inuit_polar', 'colonizers_natives'].includes(style)) {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                    <polygon points="22.5,1 26,6 23.5,6 24,12 21,12 21.5,6 19,6" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <line x1="22.5" y1="2" x2="22.5" y2="12" stroke="#ffffff" stroke-width="0.8" />
                </g>
            `;
        }

        // 14. Anime
        if (style === 'anime') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 4px ${glow})">
                    <polygon points="22.5,1 27,7 23,6 23,12 22,12 22,6 18,7" fill="${color}" stroke="#ffffff" stroke-width="1" />
                    <line x1="22.5" y1="1" x2="22.5" y2="8" stroke="#ffffff" stroke-width="1.5" />
                    <polygon points="22.5,14 24,12 22.5,10 21,12" fill="${color}" />
                </g>
            `;
        }

        // Default: Smooth high-visibility chevron and tactical line
        return `
            <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                <path d="M 19,6.5 L 22.5,2 L 26,6.5" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <line x1="22.5" y1="2" x2="22.5" y2="12" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>
            </g>
        `;
    },

    /**
     * 3-Direction Defensor Shield Fan (North, North-East, North-West)
     */
    generateDefensorFanSvg(style, color, glow, angle) {
        if (style === 'pixel_fantasy' || style === 'pixel_retro') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 2px ${glow})">
                    <rect x="20" y="2" width="5" height="4" fill="${color}" />
                    <rect x="21.5" y="6" width="2" height="3" fill="${color}" />
                    <rect x="34" y="5" width="4" height="4" fill="${color}" />
                    <rect x="7" y="5" width="4" height="4" fill="${color}" />
                    <path d="M 10,7 Q 22.5,4 35,7" stroke="${color}" stroke-width="1.5" stroke-dasharray="2,2" fill="none" />
                </g>
            `;
        }

        if (style === 'scifi' || style === 'neon' || style === 'cyborg') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 4px ${glow})">
                    <path d="M 7,10 Q 22.5,2 38,10" stroke="${color}" stroke-width="2.5" stroke-linecap="round" fill="none" />
                    <path d="M 10,12 Q 22.5,5 35,12" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" fill="none" />
                    <circle cx="22.5" cy="3.5" r="2" fill="#ffffff" />
                    <circle cx="9" cy="11" r="1.5" fill="#ffffff" />
                    <circle cx="36" cy="11" r="1.5" fill="#ffffff" />
                </g>
            `;
        }

        if (style === 'crystal_jewel') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                    <polygon points="22.5,2 26,6 22.5,10 19,6" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <polygon points="36,7 39,10 36,14 33,10" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <polygon points="9,7 12,10 9,14 6,10" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <path d="M 9,10 Q 22.5,4 36,10" stroke="${color}" stroke-width="1.2" fill="none" />
                </g>
            `;
        }

        if (style === 'steampunk') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))">
                    <path d="M 8,11 Q 22.5,4 37,11" stroke="${color}" stroke-width="2" fill="none" />
                    <circle cx="22.5" cy="4.5" r="2.5" fill="${color}" stroke="#451a03" stroke-width="0.8" />
                    <circle cx="9" cy="11" r="2" fill="${color}" stroke="#451a03" stroke-width="0.8" />
                    <circle cx="36" cy="11" r="2" fill="${color}" stroke="#451a03" stroke-width="0.8" />
                </g>
            `;
        }

        // Default & Tactical: Triple shield chevron fan
        return `
            <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                <path d="M 19.5,6 L 22.5,2 L 25.5,6" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <path d="M 36,9 L 39,5.5 L 38,11" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <path d="M 9,9 L 6,5.5 L 7,11" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <path d="M 9,8 Q 22.5,3 36,8" stroke="${color}" stroke-width="1.4" stroke-dasharray="3,2" fill="none" opacity="0.85" />
            </g>
        `;
    },

    /**
     * Mago 4-Way Spellcasting Star / Arcane Ring
     */
    generateMagoStarSvg(style, color, glow, angle, isMercenary) {
        const rot = isMercenary ? (angle + 45) : angle;

        if (style === 'pixel_fantasy' || style === 'pixel_retro') {
            return `
                <g transform="rotate(${rot} 22.5 22.5)" filter="drop-shadow(0 0 2px ${glow})">
                    <rect x="21" y="2" width="3" height="3" fill="${color}" />
                    <rect x="21" y="40" width="3" height="3" fill="${color}" />
                    <rect x="2" y="21" width="3" height="3" fill="${color}" />
                    <rect x="40" y="21" width="3" height="3" fill="${color}" />
                    <circle cx="22.5" cy="22.5" r="1.5" fill="${color}" />
                </g>
            `;
        }

        if (style === 'scifi' || style === 'neon' || style === 'cyborg') {
            return `
                <g transform="rotate(${rot} 22.5 22.5)" filter="drop-shadow(0 0 4px ${glow})">
                    <circle cx="22.5" cy="22.5" r="16" stroke="${color}" stroke-width="1.2" stroke-dasharray="4,4" fill="none" />
                    <line x1="22.5" y1="2" x2="22.5" y2="7" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
                    <line x1="22.5" y1="38" x2="22.5" y2="43" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
                    <line x1="2" y1="22.5" x2="7" y2="22.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
                    <line x1="38" y1="22.5" x2="43" y2="22.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
                </g>
            `;
        }

        if (style === 'crystal_jewel') {
            return `
                <g transform="rotate(${rot} 22.5 22.5)" filter="drop-shadow(0 0 4px ${glow})">
                    <polygon points="22.5,2 25,6 22.5,9 20,6" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <polygon points="22.5,43 25,39 22.5,36 20,39" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <polygon points="2,22.5 6,25 9,22.5 6,20" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <polygon points="43,22.5 39,25 36,22.5 39,20" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
                    <circle cx="22.5" cy="22.5" r="14" stroke="${color}" stroke-width="1" stroke-dasharray="2,3" fill="none" opacity="0.75" />
                </g>
            `;
        }

        // Default & Other styles: Arcane Star Cross
        return `
            <g transform="rotate(${rot} 22.5 22.5)" filter="drop-shadow(0 0 3px ${glow})">
                <path d="M 19.5,5.5 L 22.5,2 L 25.5,5.5" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <path d="M 19.5,39.5 L 22.5,43 L 25.5,39.5" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <path d="M 5.5,19.5 L 2,22.5 L 5.5,25.5" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <path d="M 39.5,19.5 L 43,22.5 L 39.5,25.5" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <circle cx="22.5" cy="22.5" r="14" stroke="${color}" stroke-width="1" stroke-dasharray="2,3" fill="none" opacity="0.65" />
            </g>
        `;
    },

    // =========================================================================
    // BOARD & MENU THEME MANAGEMENT
    // =========================================================================

    themeDefinitions: {
        'war': {
            name: 'Guerra Continental (Esmeralda)',
            bodyClass: 'theme-war',
            sqLight: '#eeedd5',
            sqDark: '#769656',
            bgGradient: 'linear-gradient(135deg, #091c15 0%, #0d2a20 50%, #05120d 100%)',
            panelBg: 'rgba(16, 42, 32, 0.85)',
            panelBorder: 'rgba(52, 211, 153, 0.3)',
            accentPrimary: '#10b981',
            textPrimary: '#f0fdf4'
        },
        'classic': {
            name: 'Ajedrez Clásico (Madera)',
            bodyClass: 'theme-classic',
            sqLight: '#f0d9b5',
            sqDark: '#b58863',
            bgGradient: 'linear-gradient(135deg, #2c1810 0%, #3d2317 50%, #1a0d08 100%)',
            panelBg: 'rgba(61, 35, 23, 0.88)',
            panelBorder: 'rgba(217, 119, 6, 0.35)',
            accentPrimary: '#d97706',
            textPrimary: '#fffbeb'
        },
        'neon': {
            name: 'Cyberpunk Neón',
            bodyClass: 'theme-neon',
            sqLight: '#e0f2fe',
            sqDark: '#0284c7',
            bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)',
            panelBg: 'rgba(30, 27, 75, 0.88)',
            panelBorder: 'rgba(168, 85, 247, 0.45)',
            accentPrimary: '#a855f7',
            textPrimary: '#faf5ff'
        },
        'dark': {
            name: 'Medianoche Oscuro',
            bodyClass: 'theme-dark',
            sqLight: '#cbd5e1',
            sqDark: '#334155',
            bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%)',
            panelBg: 'rgba(30, 41, 59, 0.88)',
            panelBorder: 'rgba(148, 163, 184, 0.35)',
            accentPrimary: '#38bdf8',
            textPrimary: '#f8fafc'
        },
        'crystal': {
            name: 'Cuarzo & Amatista Místico',
            bodyClass: 'theme-crystal',
            sqLight: '#f3e8ff',
            sqDark: '#7e22ce',
            bgGradient: 'linear-gradient(135deg, #2e1065 0%, #3b0764 50%, #170326 100%)',
            panelBg: 'rgba(59, 7, 100, 0.88)',
            panelBorder: 'rgba(216, 180, 254, 0.4)',
            accentPrimary: '#c084fc',
            textPrimary: '#faf5ff'
        }
    },

    /**
     * Apply board and menu theme across entire application
     */
    applyTheme(themeKey) {
        const targetTheme = this.themeDefinitions[themeKey] || this.themeDefinitions['war'];
        localStorage.setItem('continental_theme', themeKey);

        document.body.className = targetTheme.bodyClass;

        const root = document.documentElement;
        if (targetTheme.sqLight) root.style.setProperty('--sq-light', targetTheme.sqLight);
        if (targetTheme.sqDark) root.style.setProperty('--sq-dark', targetTheme.sqDark);
        if (targetTheme.bgGradient) root.style.setProperty('--bg-gradient', targetTheme.bgGradient);
        if (targetTheme.panelBg) root.style.setProperty('--panel-bg', targetTheme.panelBg);
        if (targetTheme.panelBorder) root.style.setProperty('--panel-border', targetTheme.panelBorder);
        if (targetTheme.accentPrimary) root.style.setProperty('--accent-primary', targetTheme.accentPrimary);
        if (targetTheme.textPrimary) root.style.setProperty('--text-primary', targetTheme.textPrimary);
    },

    /**
     * Initialize engine on application boot
     */
    init() {
        const savedTheme = localStorage.getItem('continental_theme') || 'war';
        this.applyTheme(savedTheme);

        this.currentPieceStyle = localStorage.getItem('continental_piece_style') || 'default';
        this.preloadActiveSet();
    }
};

if (typeof window !== 'undefined') {
    window.GraphicsEngine = GraphicsEngine;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphicsEngine;
}
