/**
 * CONTINENTAL - Armería & Custom Content Sandbox (Armory Tab)
 * Displays standard chess pieces alongside the exclusive Continental pieces:
 * +PEONES, →ÉLITES, and #COMANDANTES.
 * Features categorized filter tabs and an interactive 7x7 / 8x8 sandbox demonstrating real movement,
 * attacks, promotion notifications, and configurable training formations.
 */

const ArmoryTab = {
    selectedCategory: 'peones', // 'peones', 'elites', 'comandantes', 'standard'
    selectedPieceType: 'c_peon',
    toggleFormation: false,     // Palanca 2: Formación Aliada
    toggleMirrored: false,      // Palanca 4: Piezas Enemigas Espejadas
    sandboxBoard: null,
    sandboxRenderer: null,
    selectedSquare: null,
    validMoves: [],
    bannerTimer: null,

    render(container) {
        const lang = I18n.currentLang;
        const allPieces = PieceRegistry.getAll();

        if (!PieceRegistry.has(this.selectedPieceType)) {
            this.selectedPieceType = 'c_peon';
        }

        const categoryCounts = {
            peones: allPieces.filter(p => p.tier === 'peones' || p.category === 'peones').length,
            elites: allPieces.filter(p => p.tier === 'elites' || p.category === 'elites').length,
            comandantes: allPieces.filter(p => p.tier === 'comandantes' || p.category === 'comandantes').length,
            standard: allPieces.filter(p => p.category === 'standard').length
        };

        const html = `
            <div class="armory-container animate-fade-in">
                <header class="tab-header text-center">
                    <h1 class="tab-title" data-i18n="armoryTitle">${I18n.get('armoryTitle')}</h1>
                    <p class="tab-tagline" data-i18n="armoryTagline">${I18n.get('armoryTagline')}</p>
                    <p class="tab-desc" data-i18n="armoryDesc">${I18n.get('armoryDesc')}</p>
                </header>

                <!-- Category Tabs Navigation -->
                <div class="armory-category-tabs">
                    <button class="armory-cat-btn ${this.selectedCategory === 'peones' ? 'cat-active' : ''}" data-cat="peones">
                        +PEONES <span class="cat-count">(${categoryCounts.peones})</span>
                    </button>
                    <button class="armory-cat-btn ${this.selectedCategory === 'elites' ? 'cat-active' : ''}" data-cat="elites">
                        →ÉLITES <span class="cat-count">(${categoryCounts.elites})</span>
                    </button>
                    <button class="armory-cat-btn ${this.selectedCategory === 'comandantes' ? 'cat-active' : ''}" data-cat="comandantes">
                        #COMANDANTES <span class="cat-count">(${categoryCounts.comandantes})</span>
                    </button>
                    <button class="armory-cat-btn ${this.selectedCategory === 'standard' ? 'cat-active' : ''}" data-cat="standard">
                        Estándar <span class="cat-count">(${categoryCounts.standard})</span>
                    </button>
                </div>

                <!-- Piece Chips Selector Bar -->
                <div class="piece-chips-bar glass-panel" id="armory-chips-container">
                    <!-- Injected dynamically -->
                </div>

                <!-- Main Display: Detail Card & Interactive Board -->
                <div class="armory-layout">
                    <!-- Selected Piece Details Card -->
                    <div id="armory-piece-card" class="piece-detail-card glass-panel">
                        <!-- Injected dynamically -->
                    </div>

                    <!-- Interactive Movement Sandbox Board -->
                    <div class="sandbox-panel glass-panel">
                        <div class="sandbox-header">
                            <h3 data-i18n="pieceMovementDetails">${I18n.get('pieceMovementDetails')}</h3>
                            <span class="sandbox-hint">Toca las casillas verdes/rojas para mover</span>
                        </div>

                        <!-- Sandbox Interactive Controls Bar -->
                        <div class="sandbox-controls-bar">
                            <button class="sandbox-ctrl-btn primary-btn" id="btn-sandbox-reset" title="Reiniciar tablero">
                                🔄 Reiniciar
                            </button>
                            <button class="sandbox-ctrl-btn secondary-btn" id="btn-sandbox-spawn-king" title="Aparecer Rey Enemigo">
                                👑 Rey Enemigo
                            </button>
                            <button class="sandbox-toggle-btn ${this.toggleFormation ? 'toggle-active' : ''}" id="btn-toggle-formation" title="Aplica al reiniciar">
                                ⚙️ Formación: <span>${this.toggleFormation ? 'SÍ' : 'NO'}</span>
                            </button>
                            <button class="sandbox-toggle-btn ${this.toggleMirrored ? 'toggle-active' : ''}" id="btn-toggle-mirrored" title="Aplica al reiniciar">
                                ⚔️ Espejados: <span>${this.toggleMirrored ? 'SÍ' : 'NO'}</span>
                            </button>
                        </div>

                        <!-- Board Outer Wrapper & Banner Overlay -->
                        <div class="board-outer-wrapper">
                            <div id="sandbox-banner-msg" class="sandbox-banner-overlay"></div>
                            <div id="sandbox-board-container" class="board-frame"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.renderChips();
        this.updateCard();
        this.initSandbox();
        this.bindEvents(container);
    },

    getFilteredPieces() {
        const all = PieceRegistry.getAll();
        if (this.selectedCategory === 'peones') {
            return all.filter(p => p.tier === 'peones' || p.category === 'peones');
        } else if (this.selectedCategory === 'elites') {
            return all.filter(p => p.tier === 'elites' || p.category === 'elites');
        } else if (this.selectedCategory === 'comandantes') {
            return all.filter(p => p.tier === 'comandantes' || p.category === 'comandantes');
        } else {
            return all.filter(p => p.category === 'standard');
        }
    },

    renderChips() {
        const container = document.getElementById('armory-chips-container');
        if (!container) return;

        const lang = I18n.currentLang;
        const pieces = this.getFilteredPieces();
        container.innerHTML = pieces.map(p => {
            const tex = (typeof GraphicsEngine !== 'undefined')
                ? GraphicsEngine.getPieceTexture(p.type, 'w')
                : { src: `Imagenes de las piezas/${p.type}_default.svg?v=82`, fallbackSrc: '', symbolFallback: p.symbol };

            const iconHtml = `<img src="${tex.src}" class="chip-img-icon" alt="${p.type}" onerror="if (!this.dataset.failed) { this.dataset.failed = 'true'; this.src = '${tex.fallbackSrc}'; } else { this.style.display = 'none'; }">`;
            const octoHtml = p.octogonal ? `<span class="chip-tag-octo">Octo</span>` : '';

            return `
                <button class="piece-chip ${p.type === this.selectedPieceType ? 'chip-active' : ''}" data-type="${p.type}">
                    ${iconHtml}
                    <span class="chip-name">${p.name[lang] || p.name.es}</span>
                    ${octoHtml}
                </button>
            `;
        }).join('');

        container.querySelectorAll('[data-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedPieceType = btn.dataset.type;
                container.querySelectorAll('[data-type]').forEach(b => b.classList.remove('chip-active'));
                btn.classList.add('chip-active');
                
                this.updateCard();
                this.initSandbox();
            });
        });
    },

    initSandbox() {
        const boardEl = document.getElementById('sandbox-board-container');
        if (!boardEl) return;

        const p = PieceRegistry.get(this.selectedPieceType);
        const isContinental = p ? (p.category === 'continental' || p.type.startsWith('c_')) : false;
        const dim = isContinental ? 7 : 8;

        const dummyHud = document.createElement('div');
        this.sandboxController = new GameController(boardEl, dummyHud);
        this.sandboxController.renderHUD = () => {}; // Neutralize HUD updates in Armory sandbox
        
        this.sandboxController.matchOptions = { 
            mode: 'local', 
            gameType: isContinental ? 'continental_sandbox' : 'classic_sandbox',
            disableVictory: true
        };
        
        this.sandboxController.boardEngine = new BoardEngine(dim, dim);
        this.sandboxController.rulesEngine = new RulesEngine(this.sandboxController.boardEngine, { isContinental });
        
        this.sandboxController.boardRenderer = new BoardRenderer(boardEl, this.sandboxController.boardEngine, {
            onSquareClick: (r, c) => {
                const clickedP = this.sandboxController.boardEngine.getPiece(r, c);
                // In armory, allow clicking any piece to move it by forcing activeColor
                if (clickedP && !this.sandboxController.selectedSquare) {
                    this.sandboxController.rulesEngine.activeColor = clickedP.color;
                }
                this.sandboxController.handleSquareClick(r, c);
            }
        });

        // Setup placement like before
        const mainRow = isContinental ? 5 : 6;
        const mainCol = 3;
        this.sandboxController.boardEngine.setPiece(mainRow, mainCol, { type: this.selectedPieceType, color: 'w', moved: false });

        if (this.toggleFormation && p) {
            if (p.type === 'c_lobo') {
                this.sandboxController.boardEngine.setPiece(4, 3, { type: 'c_lobo', color: 'w', moved: false });
                this.sandboxController.boardEngine.setPiece(5, 2, { type: 'c_lobo', color: 'w', moved: false });
                this.sandboxController.boardEngine.setPiece(5, 4, { type: 'c_lobo', color: 'w', moved: false });
                this.sandboxController.boardEngine.setPiece(6, 1, { type: 'c_lobo', color: 'w', moved: false });
                this.sandboxController.boardEngine.setPiece(6, 5, { type: 'c_lobo', color: 'w', moved: false });
            } else if (p.tier === 'peones' || p.category === 'peones') {
                const pawnType = (['c_dama', 'c_escudero', 'c_guardia'].includes(p.type)) ? p.type : 'c_peon';
                [1, 2, 3, 4, 5].forEach(col => {
                    this.sandboxController.boardEngine.setPiece(mainRow, col, { type: pawnType, color: 'w', moved: false });
                });
            } else if (p.category === 'standard' && p.type === 'p') {
                for (let col = 0; col < 8; col++) {
                    this.sandboxController.boardEngine.setPiece(6, col, { type: 'p', color: 'w', moved: false });
                }
            } else if (p.tier === 'elites' || p.category === 'elites') {
                [1, 2, 4, 5].forEach(col => {
                    this.sandboxController.boardEngine.setPiece(mainRow, col, { type: p.type, color: 'w', moved: false });
                });
            } else if (p.category === 'standard') {
                this.sandboxController.boardEngine.setPiece(7, 2, { type: p.type, color: 'w', moved: false });
                this.sandboxController.boardEngine.setPiece(7, 5, { type: p.type, color: 'w', moved: false });
            }
        }

        if (this.toggleMirrored && p) {
            const mirrorRow = 1;
            const isEscudero = (p.type === 'c_escudero');

            for (let c = 0; c < dim; c++) {
                const whiteP = this.sandboxController.boardEngine.getPiece(mainRow, c) || this.sandboxController.boardEngine.getPiece(4, c);
                if (whiteP && whiteP.color === 'w') {
                    const enemyType = isEscudero ? 'c_rey' : whiteP.type;
                    this.sandboxController.boardEngine.setPiece(mirrorRow, c, { 
                        type: enemyType, 
                        color: 'b', 
                        moved: false, 
                        capturedLastTurn: isEscudero 
                    });
                }
            }
        }

        this.sandboxController.selectedSquare = null;
        this.sandboxController.selectedLegalMoves = [];
        this.sandboxController.boardRenderer.render();

        document.querySelectorAll('.wolf-prompt-target').forEach(el => el.classList.remove('wolf-prompt-target'));
    },

    spawnEnemyKing() {
        if (!this.sandboxController || !this.sandboxController.boardEngine) return;
        const board = this.sandboxController.boardEngine;
        const dim = board.rows;
        let placed = false;

        for (let r = 1; r < dim - 1; r++) {
            for (let c = 0; c < dim; c++) {
                if (board.isEmpty(r, c)) {
                    // King spawned with capturedLastTurn: true so Escudero can immediately attack it
                    board.setPiece(r, c, { type: 'c_rey', color: 'b', moved: false, capturedLastTurn: true });
                    placed = true;
                    break;
                }
            }
            if (placed) break;
        }
        if (this.sandboxController.boardRenderer) this.sandboxController.boardRenderer.render();
    },

    showBanner(msg) {
        const banner = document.getElementById('sandbox-banner-msg');
        if (!banner) return;
        banner.textContent = msg;
        banner.classList.add('banner-visible');
        if (this.bannerTimer) clearTimeout(this.bannerTimer);
        this.bannerTimer = setTimeout(() => {
            banner.classList.remove('banner-visible');
        }, 3000);
    },

    updateCard() {
        const card = document.getElementById('armory-piece-card');
        if (!card) return;

        const lang = I18n.currentLang;
        const p = PieceRegistry.get(this.selectedPieceType);
        if (!p) return;

        const tex = (typeof GraphicsEngine !== 'undefined')
            ? GraphicsEngine.getPieceTexture(p.type, 'w')
            : { src: `Imagenes de las piezas/${p.type}_default.svg?v=82`, fallbackSrc: '', symbolFallback: p.symbol };

        const tierLabels = {
            'standard': 'Ajedrez Estándar',
            'peones': '+PEÓN (Continental)',
            'elites': '→ÉLITE (Continental)',
            'comandantes': '#COMANDANTE (Continental)'
        };
        const tierName = tierLabels[p.tier] || tierLabels[p.category] || 'Pieza';

        let moveBreakdownHtml = '';
        if (p.moveSummary) {
            moveBreakdownHtml = `
                <div class="move-breakdown-box">
                    ${p.moveSummary.m ? `<div class="move-spec-row"><span class="spec-badge spec-m">🟢 M (Mover)</span><span class="spec-text">${p.moveSummary.m}</span></div>` : ''}
                    ${p.moveSummary.a ? `<div class="move-spec-row"><span class="spec-badge spec-a">🔴 A (Ataque)</span><span class="spec-text">${p.moveSummary.a}</span></div>` : ''}
                    ${p.moveSummary.e ? `<div class="move-spec-row"><span class="spec-badge spec-e">⚡ E (Especial)</span><span class="spec-text">${p.moveSummary.e}</span></div>` : ''}
                </div>
            `;
        }

        const heroImgHtml = `<img src="${tex.src}" class="hero-piece-img" alt="${p.name.es}" onerror="if (!this.dataset.failed) { this.dataset.failed = 'true'; this.src = '${tex.fallbackSrc}'; } else { this.style.display = 'none'; }">`;

        card.innerHTML = `
            <div class="card-hero">
                <div class="hero-icon-container">
                    ${heroImgHtml}
                </div>
                <div class="hero-text">
                    <h2>${p.name[lang] || p.name.es}</h2>
                    <div class="hero-badges">
                        <span class="badge-tier badge-tier-${p.tier || p.category}">${tierName}</span>
                        <span class="badge-value">Valor: ${p.value} pts</span>
                        ${p.octogonal ? '<span class="badge-octo">🔄 Octogonal</span>' : ''}
                        ${p.tags ? p.tags.filter(t => t !== 'Continental' && t !== 'Octogonal').map(t => `<span class="badge-subtag">${t}</span>`).join('') : ''}
                    </div>
                </div>
            </div>
            ${moveBreakdownHtml}
            <p class="card-desc">${p.description[lang] || p.description.es}</p>
        `;
    },

    bindEvents(container) {
        // Category tab navigation clicks
        container.querySelectorAll('[data-cat]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedCategory = btn.dataset.cat;
                container.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('cat-active'));
                btn.classList.add('cat-active');
                
                this.renderChips();
                this.updateCard();
                this.initSandbox();
            });
        });

        // Botón 1: Reset Board
        document.getElementById('btn-sandbox-reset')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.initSandbox();
        });

        // Botón 3: Spawn Enemy King
        document.getElementById('btn-sandbox-spawn-king')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.spawnEnemyKing();
        });

        // Palanca 2: Formación Aliada Toggle
        document.getElementById('btn-toggle-formation')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFormation = !this.toggleFormation;
            const btn = document.getElementById('btn-toggle-formation');
            if (btn) {
                btn.classList.toggle('toggle-active', this.toggleFormation);
                const span = btn.querySelector('span');
                if (span) span.textContent = this.toggleFormation ? 'SÍ' : 'NO';
            }
        });

        // Palanca 4: Enemigos Espejados Toggle
        document.getElementById('btn-toggle-mirrored')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMirrored = !this.toggleMirrored;
            const btn = document.getElementById('btn-toggle-mirrored');
            if (btn) {
                btn.classList.toggle('toggle-active', this.toggleMirrored);
                const span = btn.querySelector('span');
                if (span) span.textContent = this.toggleMirrored ? 'SÍ' : 'NO';
            }
        });
    }
};
