const LoadingScreen = {
    show(title = "Cargando CONTINENTAL...", subtitle = "Preparando texturas") {
        let overlay = document.getElementById('app-loading-screen');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'app-loading-screen';
            overlay.className = 'loading-screen-overlay';
            overlay.innerHTML = `
                <div class="loading-card glass-panel animate-fade-in">
                    <div class="loading-icon-spinner">⚔️</div>
                    <h2 id="loading-title" class="loading-title">Cargando CONTINENTAL...</h2>
                    <p id="loading-subtitle" class="loading-subtitle">Preparando texturas y piezas</p>
                    <div class="loading-progress-bar-container">
                        <div id="loading-progress-fill" class="loading-progress-fill" style="width: 0%;"></div>
                    </div>
                    <span id="loading-percentage" class="loading-percentage">0%</span>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const titleEl = document.getElementById('loading-title');
        const subEl = document.getElementById('loading-subtitle');
        const fillEl = document.getElementById('loading-progress-fill');
        const percentEl = document.getElementById('loading-percentage');

        if (titleEl) titleEl.textContent = title;
        if (subEl) subEl.textContent = subtitle;
        if (fillEl) fillEl.style.width = '0%';
        if (percentEl) percentEl.textContent = '0%';

        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');
    },

    update(percent, subtitle = null) {
        const fillEl = document.getElementById('loading-progress-fill');
        const percentEl = document.getElementById('loading-percentage');
        const subEl = document.getElementById('loading-subtitle');

        const clamped = Math.min(100, Math.max(0, Math.round(percent)));
        if (fillEl) fillEl.style.width = `${clamped}%`;
        if (percentEl) percentEl.textContent = `${clamped}%`;
        if (subtitle && subEl) subEl.textContent = subtitle;
    },

    hide() {
        const overlay = document.getElementById('app-loading-screen');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => {
                if (overlay.classList.contains('hidden')) {
                    overlay.style.display = 'none';
                }
            }, 300);
        }
    }
};

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

    loadedSetsMap: new Map(),
    isBackgroundPreloading: false,

    init() {
        const savedTheme = localStorage.getItem('continental_theme') || 'war';
        this.applyTheme(savedTheme);
        this.initStartupPreload();
    },

    applyTheme(theme) {
        localStorage.setItem('continental_theme', theme);
        document.body.className = `theme-${theme}`;
    },

    async initStartupPreload() {
        const whiteStyle = this.currentPieceStyleWhite || 'default';
        const blackStyle = this.currentPieceStyleBlack || 'default';
        const activeStyles = Array.from(new Set([whiteStyle, blackStyle]));

        if (typeof LoadingScreen !== 'undefined') {
            LoadingScreen.show("Cargando CONTINENTAL...", "Cargando texturas y piezas activas");
        }

        let totalStyles = activeStyles.length;
        let completedStyles = 0;

        for (const styleKey of activeStyles) {
            await this.preloadSetPromise(styleKey, (percent) => {
                if (typeof LoadingScreen !== 'undefined') {
                    const overallPercent = Math.floor((completedStyles / totalStyles) * 100 + (percent / totalStyles));
                    LoadingScreen.update(overallPercent, `Cargando set (${styleKey})... ${percent}%`);
                }
            });
            completedStyles++;
        }

        if (typeof LoadingScreen !== 'undefined') {
            LoadingScreen.update(100, "¡Listo!");
            setTimeout(() => {
                LoadingScreen.hide();
                this.startBackgroundPreloadQueue();
            }, 200);
        } else {
            this.startBackgroundPreloadQueue();
        }
    },

    preloadSetPromise(styleKey, progressCallback) {
        if (this.loadedSetsMap.get(styleKey) === true) {
            if (progressCallback) progressCallback(100);
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const pieceList = [
                'rey', 'reina', 'torre', 'alfil', 'caballo', 'peon',
                'dama', 'lobo', 'escudero', 'guardia', 'soldado', 'mercenario',
                'elefante', 'piquetero', 'arquero', 'defensor', 'canon', 'dragon', 'gigante', 'mago'
            ];

            const imageUrls = [];
            const ext = (styleKey === 'default') ? 'svg' : 'png';

            pieceList.forEach(p => {
                const isFem = (p === 'reina' || p === 'dama' || p === 'torre');
                const wName = isFem ? `${p}_blanca` : `${p}_blanco`;
                const bName = isFem ? `${p}_negra` : `${p}_negro`;

                imageUrls.push(`Imagenes de las piezas/${styleKey}/${wName}.${ext}?v=84`);
                imageUrls.push(`Imagenes de las piezas/${styleKey}/${bName}.${ext}?v=84`);
            });

            let loadedCount = 0;
            const total = imageUrls.length;

            if (total === 0) {
                this.loadedSetsMap.set(styleKey, true);
                if (progressCallback) progressCallback(100);
                resolve();
                return;
            }

            const checkDone = () => {
                loadedCount++;
                const percent = Math.min(100, Math.floor((loadedCount / total) * 100));
                if (progressCallback) progressCallback(percent);

                if (loadedCount >= total) {
                    this.loadedSetsMap.set(styleKey, true);
                    resolve();
                }
            };

            imageUrls.forEach(url => {
                const img = new Image();
                img.onload = checkDone;
                img.onerror = checkDone;
                img.src = url;
            });
        });
    },

    async ensureSetLoaded(styleKey, labelName = null) {
        if (this.loadedSetsMap.get(styleKey) === true) {
            return Promise.resolve();
        }

        const displayName = labelName || (typeof PieceSetRegistry !== 'undefined' ? PieceSetRegistry.formatUncategorizedLabel(styleKey) : styleKey);
        if (typeof LoadingScreen !== 'undefined') {
            LoadingScreen.show(`Cargando Set: ${displayName}`, "Priorizando descarga de texturas...");
        }

        await this.preloadSetPromise(styleKey, (percent) => {
            if (typeof LoadingScreen !== 'undefined') {
                LoadingScreen.update(percent, `Descargando imágenes... ${percent}%`);
            }
        });

        if (typeof LoadingScreen !== 'undefined') {
            LoadingScreen.update(100, "¡Completado!");
            await new Promise(r => setTimeout(r, 150));
            LoadingScreen.hide();
        }
    },

    async setPieceStyle(styleKey, targetColor = 'both') {
        const style = styleKey || 'default';
        const labelName = (typeof PieceSetRegistry !== 'undefined') ? PieceSetRegistry.formatUncategorizedLabel(styleKey) : styleKey;
        
        await this.ensureSetLoaded(style, labelName);

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

        if (typeof window !== 'undefined' && window.gameController && window.gameController.renderer) {
            window.gameController.renderer.render();
        }
    },

    async startBackgroundPreloadQueue() {
        if (this.isBackgroundPreloading) return;
        this.isBackgroundPreloading = true;

        const allFolders = (typeof PieceSetRegistry !== 'undefined' && PieceSetRegistry.discoveredFolderIds)
            ? PieceSetRegistry.discoveredFolderIds
            : ['default', 'medieval_real'];

        const unselectedFolders = allFolders.filter(id => !this.loadedSetsMap.get(id));

        for (const styleKey of unselectedFolders) {
            if (this.loadedSetsMap.get(styleKey) === true) continue;
            await this.preloadSetPromise(styleKey, null);
            await new Promise(r => setTimeout(r, 100));
        }

        this.isBackgroundPreloading = false;
    },

    preloadActiveSet() {
        this.initStartupPreload();
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
        const renderFacing = flipped ? (facing + 180) % 360 : facing;
        const style = this.currentPieceStyle || localStorage.getItem('continental_piece_style') || 'default';

        // Remove any preexisting arrow overlay in this square
        squareEl.querySelectorAll('.octo-arrow-overlay').forEach(el => el.remove());

        // Color palette resolution - STRICT COMPLIANCE
        let mainColor = '#f59e0b'; // Amber default
        let glowColor = 'rgba(245, 158, 11, 0.6)';

        if (piece.type === 'c_canon') {
            const isOnCooldown = piece.justFired || piece.cooldownActive || piece.usedBeamLastTurn || (piece.beamCooldown && piece.beamCooldown > 0);
            
            // CAÑÓN SIEMPRE DEBE TENER 3 COLORES OBLIGATORIOS: GRIS, AMARILLO Y ROJO
            if (piece.justFired) {
                mainColor = '#6b7280'; // Gris: recién disparado
                glowColor = 'rgba(107, 114, 128, 0.4)';
            } else if (isOnCooldown) {
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
        // 11. Medieval Real
        if (style === 'medieval_real') {
            return `
                <g transform="rotate(${angle} 22.5 22.5)" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.8))">
                    <polygon points="22.5,1.5 26,7 23.5,7 23.5,12 21.5,12 21.5,7 19,7" fill="${color}" stroke="#1f2937" stroke-width="1" />
                    <line x1="19" y1="12" x2="26" y2="12" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
                    <circle cx="22.5" cy="14.5" r="1.2" fill="${color}" />
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
