/**
 * CONTINENTAL - Tutorial Tab UI Component
 * Provides step-by-step interactive tutorials with LIVE interactive sandbox boards
 * for both Classic Chess and Continental mode.
 */

const TutorialTab = {
    selectedTutorial: null, // null | 'ajedrez' | 'continental'
    currentStep: 0,
    activeBoardEngine: null,
    activeBoardRenderer: null,
    selectedSquare: null,
    validMoves: [],

    tutorials: {
        ajedrez: {
            title: "Ajedrez Clásico",
            subtitle: "Reglas oficiales del ajedrez internacional",
            icon: "♟️",
            steps: [
                {
                    title: "1. El Objetivo del Juego",
                    icon: "👑",
                    summary: "El Rey es la pieza más valiosa. El objetivo principal es acorralar al Rey enemigo en Jaque Mate.",
                    details: [
                        "Cada jugador empieza con 16 piezas: 8 Peones, 2 Torres, 2 Caballos, 2 Alfiles, 1 Reina y 1 Rey.",
                        "¡No se puede capturar al Rey directamente! Se le acorrala hasta que no tenga escapatoria.",
                        "Ganas inmediatamente al lograr el Jaque Mate."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Victoria", value: "Jaque Mate al Rey" },
                        { label: "Tablero", value: "8x8 Casillas" },
                        { label: "Turnos", value: "Alternados (Blancas inician)" }
                    ],
                    setup: (b) => {
                        b.clear();
                        b.setPiece(7, 4, { type: 'k', color: 'w', moved: false });
                        b.setPiece(6, 5, { type: 'q', color: 'w', moved: false });
                        b.setPiece(7, 0, { type: 'r', color: 'w', moved: false });
                        b.setPiece(0, 4, { type: 'k', color: 'b', moved: false });
                    }
                },
                {
                    title: "2. Peones, Torres y Alfiles",
                    icon: "♜",
                    summary: "Aprende el avance de la infantería y el movimiento lineal de Torres y Alfiles.",
                    details: [
                        "<strong>Peón (♟️):</strong> Avanza 1 casilla al frente (o 2 en su 1er movimiento). Captura en diagonal 1 casilla.",
                        "<strong>Torre (♜):</strong> Se desplaza en filas y columnas rectas sin límite de casillas libres.",
                        "<strong>Alfil (♝):</strong> Se desplaza en diagonales del mismo color de su casilla inicial."
                    ],
                    visualType: "piece_grid",
                    pieces: [
                        { name: "Peón", glyph: "♟", desc: "Avanza recto, captura diagonal" },
                        { name: "Torre", glyph: "♜", desc: "Líneas rectas (filas y columnas)" },
                        { name: "Alfil", glyph: "♝", desc: "Líneas diagonales" }
                    ],
                    setup: (b) => {
                        b.clear();
                        b.setPiece(6, 3, { type: 'p', color: 'w', moved: false });
                        b.setPiece(6, 4, { type: 'p', color: 'w', moved: false });
                        b.setPiece(7, 0, { type: 'r', color: 'w', moved: false });
                        b.setPiece(7, 2, { type: 'b', color: 'w', moved: false });
                        b.setPiece(1, 3, { type: 'p', color: 'b', moved: false });
                        b.setPiece(1, 4, { type: 'p', color: 'b', moved: false });
                        b.setPiece(0, 7, { type: 'r', color: 'b', moved: false });
                        b.setPiece(0, 5, { type: 'b', color: 'b', moved: false });
                    }
                },
                {
                    title: "3. Caballo, Reina y Rey",
                    icon: "♛",
                    summary: "Maneja las piezas de ataque táctico y la pieza comandante.",
                    details: [
                        "<strong>Caballo (♞):</strong> Salta en 'L' (2 casillas en una dirección y 1 a 90°). ¡La ÚNICA pieza que salta sobre otras!",
                        "<strong>Reina (♛):</strong> Combina el poder de la Torre y el Alfil (rectas y diagonales).",
                        "<strong>Rey (♚):</strong> Se mueve 1 casilla en cualquier dirección. Debe mantenerse protegido."
                    ],
                    visualType: "piece_grid",
                    pieces: [
                        { name: "Caballo", glyph: "♞", desc: "Salto en 'L' (único que salta)" },
                        { name: "Reina", glyph: "♛", desc: "Rectas y diagonales" },
                        { name: "Rey", glyph: "♚", desc: "1 casilla a cualquier lado" }
                    ],
                    setup: (b) => {
                        b.clear();
                        b.setPiece(7, 1, { type: 'n', color: 'w', moved: false });
                        b.setPiece(7, 3, { type: 'q', color: 'w', moved: false });
                        b.setPiece(7, 4, { type: 'k', color: 'w', moved: false });
                        b.setPiece(6, 0, { type: 'p', color: 'w', moved: false });
                        b.setPiece(6, 1, { type: 'p', color: 'w', moved: false });
                        b.setPiece(6, 2, { type: 'p', color: 'w', moved: false });
                        b.setPiece(0, 4, { type: 'k', color: 'b', moved: false });
                    }
                },
                {
                    title: "4. Jaque, Jaque Mate y Enroque",
                    isVictorySlide: true,
                    icon: "🛡️",
                    summary: "Defensa especial y condiciones de finalización de partida.",
                    details: [
                        "<strong>Jaque:</strong> El Rey está amenazado. Es OBLIGATORIO moverlo, bloquear o capturar al atacante.",
                        "<strong>Jaque Mate:</strong> El Rey está amenazado y NO hay defensa legal posible = Fin del juego.",
                        "<strong>Enroque:</strong> Movimiento defensivo simultáneo del Rey y la Torre."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Jaque", value: "Rey bajo amenaza directa" },
                        { label: "Jaque Mate", value: "Sin escape legal = Fin" },
                        { label: "Enroque", value: "Protección Rey + Torre" }
                    ],
                    setup: (b) => {
                        b.clear();
                        b.setPiece(7, 4, { type: 'k', color: 'w', moved: false });
                        b.setPiece(7, 7, { type: 'r', color: 'w', moved: false });
                        b.setPiece(3, 7, { type: 'q', color: 'b', moved: true });
                        b.setPiece(0, 4, { type: 'k', color: 'b', moved: false });
                    }
                }
            ]
        },
        continental: {
            title: "Continental",
            subtitle: "Ajedrez táctico de guerra en tablero 7x7",
            icon: "⚔️",
            steps: [
                {
                    title: "1. Concepto Fundamental y Tablero 7x7",
                    icon: "🗺️",
                    summary: "Continental es un modo de guerra en tablero 7x7 donde NO hay Jaque Mate y el Rey se captura directamente.",
                    details: [
                        "<strong>Tablero 7x7:</strong> Filas 'a' a 'g' y columnas 1 a 7 con casilla central d4 sombreada.",
                        "<strong>Sin Jaque Mate:</strong> El Rey se come como cualquier pieza ordinaria.",
                        "<strong>Sin avance doble ni enroque:</strong> Los peones avanzan solo 1 casilla al inicio."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Tablero", value: "7x7 (Casilla d4 en el centro)" },
                        { label: "Rey", value: "Se captura directamente" },
                        { label: "Apertura", value: "Avance de 1 casilla" }
                    ],
                    setup: (b) => {
                        b.clear();
                        b.setPiece(6, 3, { type: 'c_rey', color: 'w', facing: 0 });
                        b.setPiece(5, 3, { type: 'c_peon', color: 'w', facing: 0 });
                        b.setPiece(0, 3, { type: 'c_rey', color: 'b', facing: 180 });
                        b.setPiece(1, 3, { type: 'c_peon', color: 'b', facing: 180 });
                    }
                },
                {
                    title: "2. Reclutamiento de Ejército (Drafting)",
                    icon: "📜",
                    summary: "Al inicio, Blancas y Negras alternan 12 turnos para conformar su ejército personalizado.",
                    details: [
                        "<strong>Peones (5 unidades):</strong> Elige entre Peones, Damas, Lobos, Escuderos o Guardias.",
                        "<strong>Élites (4 unidades):</strong> Selecciona 4 tropas élite de entre 10 opciones de combate.",
                        "<strong>Comandante (1 unidad):</strong> Elige tu líder (Rey, Reina, Dragón, Gigante o Mago)."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Peones", value: "5 Unidades" },
                        { label: "Élites", value: "4 Unidades" },
                        { label: "Comandante", value: "1 Unidad" }
                    ],
                    setup: (b) => {
                        b.clear();
                        // White army (4 elites + 1 commander)
                        [1,2,3,4,5].forEach(c => b.setPiece(5, c, { type: 'c_escudero', color: 'w', facing: 0 }));
                        b.setPiece(6, 1, { type: 'c_soldado', color: 'w', facing: 0 });
                        b.setPiece(6, 2, { type: 'c_arquero', color: 'w', facing: 0 });
                        b.setPiece(6, 3, { type: 'c_dragon', color: 'w', facing: 0 });
                        b.setPiece(6, 4, { type: 'c_canon', color: 'w', facing: 0 });
                        b.setPiece(6, 5, { type: 'c_defensor', color: 'w', facing: 0 });
                        // Black army (4 elites + 1 commander)
                        [1,2,3,4,5].forEach(c => b.setPiece(1, c, { type: 'c_lobo', color: 'b', facing: 180 }));
                        b.setPiece(0, 1, { type: 'c_mercenario', color: 'b', facing: 180 });
                        b.setPiece(0, 2, { type: 'c_piquetero', color: 'b', facing: 180 });
                        b.setPiece(0, 3, { type: 'c_gigante', color: 'b', facing: 180 });
                        b.setPiece(0, 4, { type: 'c_elefante', color: 'b', facing: 180 });
                        b.setPiece(0, 5, { type: 'c_arquero', color: 'b', facing: 180 });
                    }
                },
                {
                    title: "3. Puntuación y Condición de Victoria",
                    isVictorySlide: true,
                    icon: "🏆",
                    summary: "Ganas iniciando tu turno con 6 o más puntos en el tablero frente a 5 o menos del enemigo.",
                    details: [
                        "<strong>Puntos:</strong> Peón = 1 pt | Élite = 2 pts | Comandante = 3 pts (Rey = 6 pts).",
                        "<strong>Objetivo Principal:</strong> Acumular $\\ge 6$ puntos mientras tu oponente posee $\\le 5$.",
                        "<strong>Objetivo Secundario:</strong> Aniquilar totalmente el ejército rival."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Peón", value: "1 Punto" },
                        { label: "Élite", value: "2 Puntos" },
                        { label: "Comandante", value: "3 Pts (Rey = 6 Pts)" }
                    ],
                    setup: (b) => {
                        b.clear();
                        // White has 7 pts: Dragón (3 pts) + Soldado (2 pts) + Torre (2 pts)
                        b.setPiece(6, 3, { type: 'c_dragon', color: 'w', facing: 0 });
                        b.setPiece(6, 1, { type: 'c_soldado', color: 'w', facing: 0 });
                        b.setPiece(6, 5, { type: 'c_torre', color: 'w', facing: 0 });
                        // Black has 4 pts: 2 Lobos (2 pts) + Mercenario (2 pts)
                        b.setPiece(0, 2, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(0, 4, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(0, 3, { type: 'c_mercenario', color: 'b', facing: 180 });
                    }
                },
                {
                    title: "4. Orientación y Piezas Octogonales",
                    icon: "🧭",
                    summary: "Piezas octogonales (Cañón, Defensor, Dragón) apuntan en 8 direcciones a 45°.",
                    details: [
                        "<strong>Flechas Giratorias:</strong> Solo giran las flechitas flotantes; el dibujo de la pieza se mantiene erguido.",
                        "<strong>Selector de Brújula:</strong> Tras mover o atacar, orientas tu pieza hacia la dirección elegida.",
                        "<strong>Pasar y Rotar:</strong> Puedes renunciar a tu movimiento para reorientar una pieza."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Giro", value: "45° (8 Direcciones)" },
                        { label: "Textura", value: "Siempre erguida" },
                        { label: "Acción", value: "Pasar y Rotar" }
                    ],
                    setup: (b) => {
                        b.clear();
                        b.setPiece(5, 3, { type: 'c_canon', color: 'w', facing: 0 });
                        b.setPiece(6, 2, { type: 'c_defensor', color: 'w', facing: 0 });
                        b.setPiece(6, 4, { type: 'c_dragon', color: 'w', facing: 0 });
                        
                        b.setPiece(1, 2, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(1, 3, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(1, 4, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(0, 3, { type: 'c_mercenario', color: 'b', facing: 180 });
                        b.setPiece(0, 4, { type: 'c_arquero', color: 'b', facing: 180 });
                    }
                },
                {
                    title: "5. Habilidades Especiales de Guerra",
                    icon: "💥",
                    summary: "Prueba el rayo devastador del Cañón, los disparos del Arquero/Mago y los lanzamientos del Gigante.",
                    details: [
                        "<strong>Cañón (💣):</strong> Dispara un rayo de 3 casillas destruyendo a TODAS las piezas en la línea. (1 turno de enfriamiento).",
                        "<strong>Arquero (🏹):</strong> Dispara SIEMPRE a distancia sin moverse de su casilla.",
                        "<strong>Mago (🧙):</strong> Permite <em>Disparar</em> o <em>Comer</em> y cambia entre Forma Soldado y Mercenario.",
                        "<strong>Gigante (🧌):</strong> Permite <em>Comer</em>, <em>Intercambiar</em> o <em>Arrojar</em> piezas a 1 casilla alrededor sin moverse."
                    ],
                    visualType: "piece_grid",
                    pieces: [
                        { name: "Cañón", glyph: "💣", desc: "Rayo multi-baja en línea" },
                        { name: "Arquero", glyph: "🏹", desc: "Disparo a distancia (NUNCA avanza)" },
                        { name: "Gigante", glyph: "🧌", desc: "Arroja, Come o Intercambia" }
                    ],
                    setup: (b) => {
                        b.clear();
                        b.setPiece(5, 1, { type: 'c_arquero', color: 'w', facing: 0 });
                        b.setPiece(5, 2, { type: 'c_mago', color: 'w', facing: 0 });
                        b.setPiece(5, 3, { type: 'c_canon', color: 'w', facing: 0 });
                        b.setPiece(5, 4, { type: 'c_gigante', color: 'w', facing: 0 });
                        // Targets and extra enemies
                        b.setPiece(3, 1, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(2, 3, { type: 'c_soldado', color: 'b', facing: 180 });
                        b.setPiece(1, 3, { type: 'c_soldado', color: 'b', facing: 180 });
                        b.setPiece(0, 3, { type: 'c_soldado', color: 'b', facing: 180 });
                        b.setPiece(5, 5, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(1, 2, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(1, 4, { type: 'c_lobo', color: 'b', facing: 180 });
                    }
                },
                {
                    title: "6. Tablas y Refuerzos",
                    icon: "🪖",
                    summary: "En caso de empate, ambos bandos subastan y despliegan puntos de refuerzo.",
                    details: [
                        "<strong>Subasta:</strong> Ante 3 repeticiones, se negocian 1–8 puntos en 4 rondas de ofertas.",
                        "<strong>Despliegue:</strong> Se colocan refuerzos en la fila 'a' (Blancas) y fila 'g' (Negras).",
                        "<strong>Banco de Reserva:</strong> Los puntos no usados quedan guardados para invocar tropas al vaciar casillas."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Subasta", value: "1 a 8 Puntos (4 rondas)" },
                        { label: "Despliegue", value: "Fila 'a' (Bl) / Fila 'g' (Ng)" },
                        { label: "Reserva", value: "Invocación al vaciar fila" }
                    ],
                    setup: (b) => {
                        b.clear();
                        b.setPiece(6, 2, { type: 'c_peon', color: 'w', facing: 0 });
                        b.setPiece(6, 4, { type: 'c_soldado', color: 'w', facing: 0 });
                        b.setPiece(0, 1, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(0, 5, { type: 'c_piquetero', color: 'b', facing: 180 });
                    }
                }
            ]
        }
    },

    render(container) {
        if (!container) return;

        if (this.selectedTutorial === null) {
            this.renderSelector(container);
        } else {
            this.renderStepView(container);
        }
    },

    renderSelector(container) {
        const html = `
            <div class="tutorial-container animate-fade-in">
                <header class="tab-header text-center">
                    <h1 class="tab-title" data-i18n="tutorialTitle">${I18n.get('tutorialTitle') || 'Tutoriales'}</h1>
                    <p class="tab-desc" data-i18n="tutorialSelectDesc">${I18n.get('tutorialSelectDesc') || 'Elige la modalidad que deseas aprender:'}</p>
                </header>

                <div class="tutorial-cards-grid">
                    <!-- Card 1: Ajedrez Clásico -->
                    <div class="tutorial-select-card glass-panel" id="card-tut-ajedrez">
                        <div class="tut-card-badge">Principiantes</div>
                        <div class="tut-card-icon">♟️</div>
                        <h2 class="tut-card-title">Ajedrez Clásico</h2>
                        <p class="tut-card-desc">Aprende los movimientos de cada pieza, la importancia del Rey, Jaque, Jaque Mate y Enroque.</p>
                        <button class="action-btn primary-btn btn-start-tut" data-mode="ajedrez">
                            ▶️ Iniciar Tutorial
                        </button>
                    </div>

                    <!-- Card 2: Continental -->
                    <div class="tutorial-select-card glass-panel" id="card-tut-continental">
                        <div class="tut-card-badge badge-war">Modo Táctico</div>
                        <div class="tut-card-icon">⚔️</div>
                        <h2 class="tut-card-title">Continental</h2>
                        <p class="tut-card-desc">Aprende el Reclutamiento inicial, el tablero 7x7, la rotación octogonal, habilidades únicas y victoria por puntos.</p>
                        <button class="action-btn primary-btn btn-start-tut btn-war" data-mode="continental">
                            ▶️ Iniciar Tutorial
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.bindSelectorEvents(container);
    },

    bindSelectorEvents(container) {
        container.querySelectorAll('.btn-start-tut').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.getAttribute('data-mode');
                if (mode && this.tutorials[mode]) {
                    this.selectedTutorial = mode;
                    this.currentStep = 0;
                    this.renderStepView(container);
                }
            });
        });
    },

    renderStepView(container) {
        const tutData = this.tutorials[this.selectedTutorial];
        if (!tutData) {
            this.selectedTutorial = null;
            this.renderSelector(container);
            return;
        }

        const step = tutData.steps[this.currentStep];
        const totalSteps = tutData.steps.length;
        const progressPercent = Math.round(((this.currentStep + 1) / totalSteps) * 100);

        let visualHtml = '';
        if (step.visualType === 'badge_box') {
            visualHtml = `
                <div class="tut-badges-container">
                    ${step.badges.map(b => `
                        <div class="tut-badge-item">
                            <span class="tut-b-label">${b.label}</span>
                            <span class="tut-b-val">${b.value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (step.visualType === 'piece_grid') {
            visualHtml = `
                <div class="tut-piece-grid">
                    ${step.pieces.map(p => `
                        <div class="tut-piece-card">
                            <div class="tut-p-glyph">${p.glyph}</div>
                            <div class="tut-p-name">${p.name}</div>
                            <div class="tut-p-desc">${p.desc}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const html = `
            <div class="tutorial-step-view animate-fade-in">
                <!-- Navigation Top Bar -->
                <div class="tut-nav-bar">
                    <button class="action-btn secondary-btn" id="btn-tut-change-mode">
                        ↩️ Cambiar Tutorial
                    </button>
                    <div class="tut-mode-badge">${tutData.icon} ${tutData.title}</div>
                </div>

                <!-- Progress Header -->
                <div class="tut-progress-wrapper glass-panel">
                    <div class="tut-progress-header">
                        <span>Paso ${this.currentStep + 1} de ${totalSteps}</span>
                        <span>${progressPercent}% completado</span>
                    </div>
                    <div class="tut-progress-bar">
                        <div class="tut-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>

                <!-- Main Step Card -->
                <div class="tut-step-card glass-panel">
                    <div class="tut-step-header">
                        <span class="tut-step-icon">${step.icon}</span>
                        <h2 class="tut-step-title">${step.title}</h2>
                    </div>

                    <p class="tut-step-summary">${step.summary}</p>

                    <!-- Details Bullet Points -->
                    <div class="tut-step-details">
                        <ul>
                            ${step.details.map(d => `<li>${d}</li>`).join('')}
                        </ul>
                    </div>

                    <!-- Visual Box Diagram -->
                    ${visualHtml}
                </div>

                <!-- Interactive Sandbox Board (Live Practical Board) -->
                <div class="tut-sandbox-panel glass-panel">
                    <div class="tut-sandbox-header">
                        <span class="tut-sb-title">🎮 Práctica Interactiva en Vivo</span>
                        <button class="action-btn secondary-btn small-btn" id="btn-tut-reset-board">🔄 Reiniciar Posición</button>
                    </div>
                    <div class="board-outer-wrapper">
                        <div id="tut-board-container" class="board-frame"></div>
                    </div>
                </div>

                <!-- Bottom Step Navigation Buttons -->
                <div class="tut-bottom-controls">
                    <button class="action-btn secondary-btn" id="btn-tut-prev" ${this.currentStep === 0 ? 'disabled style="opacity:0.4; pointer-events:none;"' : ''}>
                        ⬅️ Anterior
                    </button>

                    ${this.currentStep < totalSteps - 1 ? `
                        <button class="action-btn primary-btn" id="btn-tut-next">
                            Siguiente ➡️
                        </button>
                    ` : `
                        <button class="action-btn primary-btn btn-war" id="btn-tut-play">
                            🎮 ¡Jugar Ahora!
                        </button>
                    `}
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.initStepBoard(step);
        this.bindStepEvents(container);
    },

    initStepBoard(step) {
        const boardEl = document.getElementById('tut-board-container');
        if (!boardEl) return;

        const isContinental = (this.selectedTutorial === 'continental');
        
        const dummyHud = document.createElement('div');
        this.sandboxController = new GameController(boardEl, dummyHud);
        
        // Manually configure the controller for Sandbox mode
        this.sandboxController.matchOptions = { 
            mode: 'local', 
            gameType: isContinental ? 'continental_sandbox' : 'classic_sandbox',
            disableVictory: !step.isVictorySlide
        };
        
        const rows = isContinental ? 7 : 8;
        const cols = isContinental ? 7 : 8;
        this.sandboxController.boardEngine = new BoardEngine(rows, cols);
        this.sandboxController.rulesEngine = new RulesEngine(this.sandboxController.boardEngine, { isContinental });
        
        this.sandboxController.boardRenderer = new BoardRenderer(boardEl, this.sandboxController.boardEngine, {
            onSquareClick: (r, c) => {
                this.sandboxController.handleSquareClick(r, c);
            }
        });

        if (step && typeof step.setup === 'function') {
            step.setup(this.sandboxController.boardEngine);
        }

        // Initialize controller state properly
        this.sandboxController.selectedSquare = null;
        this.sandboxController.selectedLegalMoves = [];
        this.sandboxController.boardRenderer.render();
    },

    bindStepEvents(container) {
        document.getElementById('btn-tut-change-mode')?.addEventListener('click', () => {
            this.selectedTutorial = null;
            this.currentStep = 0;
            this.renderSelector(container);
        });

        document.getElementById('btn-tut-reset-board')?.addEventListener('click', () => {
            const tutData = this.tutorials[this.selectedTutorial];
            if (tutData) {
                const step = tutData.steps[this.currentStep];
                this.initStepBoard(step);
            }
        });

        document.getElementById('btn-tut-prev')?.addEventListener('click', () => {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.renderStepView(container);
            }
        });

        document.getElementById('btn-tut-next')?.addEventListener('click', () => {
            const tutData = this.tutorials[this.selectedTutorial];
            if (tutData && this.currentStep < tutData.steps.length - 1) {
                this.currentStep++;
                this.renderStepView(container);
            }
        });

        document.getElementById('btn-tut-play')?.addEventListener('click', () => {
            if (typeof MatchSetupModal !== 'undefined') {
                MatchSetupModal.open();
            }
        });
    }
};
