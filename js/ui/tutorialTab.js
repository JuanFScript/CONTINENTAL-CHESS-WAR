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
                        // White army (5 pawns + 4 elites + 1 commander)
                        [1,2,3,4,5].forEach(c => b.setPiece(5, c, { type: 'c_escudero', color: 'w', facing: 0 }));
                        b.setPiece(6, 1, { type: 'c_soldado', color: 'w', facing: 0 });
                        b.setPiece(6, 2, { type: 'c_arquero', color: 'w', facing: 0 });
                        b.setPiece(6, 3, { type: 'c_dragon', color: 'w', facing: 0 });
                        b.setPiece(6, 4, { type: 'c_canon', color: 'w', facing: 0 });
                        b.setPiece(6, 5, { type: 'c_defensor', color: 'w', facing: 0 });
                        // Black army (5 pawns + 4 elites + 1 commander)
                        [1,2,3,4,5].forEach(c => b.setPiece(1, c, { type: 'c_lobo', color: 'b', facing: 180 }));
                        b.setPiece(0, 1, { type: 'c_mercenario', color: 'b', facing: 180 });
                        b.setPiece(0, 2, { type: 'c_piquetero', color: 'b', facing: 180 });
                        b.setPiece(0, 3, { type: 'c_gigante', color: 'b', facing: 180 });
                        b.setPiece(0, 4, { type: 'c_elefante', color: 'b', facing: 180 });
                        b.setPiece(0, 5, { type: 'c_arquero', color: 'b', facing: 180 });
                    }
                },
                {
                    title: "2. Reclutamiento de Ejército",
                    icon: "📜",
                    summary: "Antes de mover en el tablero, cada bando selecciona las unidades que conformarán sus filas.",
                    details: [
                        "<strong>Peones (5 unidades):</strong> Elige entre Peones, Damas, Lobos, Escuderos o Guardias.",
                        "<strong>Élites (4 unidades):</strong> Selecciona 4 tropas élite de entre 10 opciones de combate para tus flancos.",
                        "<strong>Comandante (1 unidad):</strong> Elige a tu líder supremo (Rey, Reina, Dragón, Gigante o Mago).",
                        "<strong>¡Prueba en Vivo!:</strong> Juega la fase de elección con Blancas contra el Bot y arma tu ejército."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Peones", value: "5 Unidades" },
                        { label: "Élites", value: "4 Unidades" },
                        { label: "Comandante", value: "1 Unidad" }
                    ],
                    mode: 'ai',
                    playerSide: 'w',
                    customInit: (ctrl) => {
                        ctrl.matchOptions.isTutorial = true;
                        ctrl.matchOptions.mode = 'ai';
                        ctrl.matchOptions.playerSide = 'w';
                        ctrl.boardEngine.setupContinentalDraft();
                        ctrl.boardRenderer.render();
                        ctrl.startContinentalDraft();
                    }
                },
                {
                    title: "3. Puntuación y Condición de Victoria",
                    isVictorySlide: true,
                    showPoints: true,
                    icon: "🏆",
                    summary: "Ganas iniciando tu turno con 6 o más puntos en el tablero frente a 5 o menos del enemigo.",
                    details: [
                        "<strong>Puntos:</strong> Peón = 1 pt | Élite = 2 pts | Comandante = 3 pts (Rey = 6 pts).",
                        "<strong>Objetivo Principal:</strong> Iniciar tu turno acumulando $\\ge 6$ puntos mientras tu oponente posee $\\le 5$.",
                        "<strong>Objetivo Secundario:</strong> Aniquilar totalmente el ejército rival.",
                        "<strong>Contador de Puntos:</strong> Mira el panel superior de práctica para ver los puntos en tiempo real."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Peón", value: "1 Punto" },
                        { label: "Élite", value: "2 Puntos" },
                        { label: "Comandante", value: "3 Pts (Rey = 6 Pts)" }
                    ],
                    setup: (b) => {
                        b.clear();
                        // White has 6 pts: Dama (3 pts) + Soldado (2 pts) + Escudero (1 pt)
                        b.setPiece(6, 3, { type: 'c_reina', color: 'w', facing: 0 });
                        b.setPiece(6, 1, { type: 'c_soldado', color: 'w', facing: 0 });
                        b.setPiece(6, 5, { type: 'c_escudero', color: 'w', facing: 0 });
                        // Black has 6 pts: 1 Lobo (1 pt) + Mercenario (2 pts) + General/Reina (3 pts)
                        b.setPiece(0, 2, { type: 'c_lobo', color: 'b', facing: 180 });
                        b.setPiece(0, 4, { type: 'c_reina', color: 'b', facing: 180 });
                        b.setPiece(0, 3, { type: 'c_mercenario', color: 'b', facing: 180 });
                    }
                },
                {
                    title: "4. Orientación y Piezas Octogonales",
                    icon: "🧭",
                    summary: "Piezas octogonales (Cañón, Defensor, Dragón, Mago) apuntan en 8 direcciones a 45°.",
                    details: [
                        "<strong>Flechas Giratorias:</strong> Solo giran las flechitas flotantes; el dibujo de la pieza se mantiene erguido.",
                        "<strong>Selector de Brújula:</strong> Tras mover o atacar, orientas tu pieza hacia la dirección elegida.",
                        "<strong>Pasar Turno y Rotar:</strong> Puedes pulsar el botón <em>'Pasar y Rotar'</em> en el HUD si deseas reorientar una pieza octogonal sin moverla, o simplemente pasar tu turno."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "Giro", value: "45° (8 Direcciones)" },
                        { label: "Textura", value: "Siempre erguida" },
                        { label: "Acción", value: "Pasar y Rotar" }
                    ],
                    setup: (b) => {
                        b.clear();
                        // White army: Cañón, Defensor, Dragón, Mago
                        b.setPiece(5, 3, { type: 'c_canon', color: 'w', facing: 0 });
                        b.setPiece(6, 2, { type: 'c_defensor', color: 'w', facing: 0 });
                        b.setPiece(6, 4, { type: 'c_dragon', color: 'w', facing: 0 });
                        b.setPiece(6, 3, { type: 'c_mago', color: 'w', facing: 0 });
                        
                        // Black army: exact same pieces mirrored
                        b.setPiece(1, 3, { type: 'c_canon', color: 'b', facing: 180 });
                        b.setPiece(0, 4, { type: 'c_defensor', color: 'b', facing: 180 });
                        b.setPiece(0, 2, { type: 'c_dragon', color: 'b', facing: 180 });
                        b.setPiece(0, 3, { type: 'c_mago', color: 'b', facing: 180 });
                    }
                },
                {
                    title: "5. Habilidades Especiales de Guerra",
                    icon: "💥",
                    summary: "Prueba el rayo devastador del Cañón, los disparos del Arquero/Mago y los lanzamientos del Gigante.",
                    details: [
                        "<strong>Cañón (💣):</strong> Dispara un rayo frontal de 3 casillas destruyendo a TODAS las piezas en la línea. ¡Destruye a los 3 soldados enemigos en fila!",
                        "<strong>Arquero (🏹) y Mago (🧙):</strong> Disparan a distancia sin moverse de su casilla. El Mago puede cambiar entre Forma Soldado y Mercenario.",
                        "<strong>Gigante (🧌):</strong> Puede <em>Devorar</em> o <em>Arrojar</em> piezas adyacentes a 1 casilla de distancia. Si arroja una pieza sobre otra, ¡ambas mueren aplastadas!",
                        "<strong>Rey (♚):</strong> Vale 6 puntos, lo que te permite sacrificar a todo tu ejército y ganar. En modos sin puntuación (como Captura el Centro), otorga 4 Puntos de Refuerzo adicionales.",
                        "<strong>Lobos (🐺), Escuderos (🛡️) y Defensor (🔰):</strong> Los Lobos avanzan en manada tras mover; los Escuderos aplican Retribución al frente y a los lados; el Defensor es inmune a ser comido por las 3 casillas a donde apuntan sus flechas.",
                        "<strong>¡Turno Libre!:</strong> En esta práctica puedes mover libremente con Blancas para probar todas las habilidades."
                    ],
                    visualType: "piece_grid",
                    pieces: [
                        { name: "Cañón", glyph: "💣", desc: "Rayo multi-baja de 3 casillas" },
                        { name: "Arquero / Mago", glyph: "🏹", desc: "Disparo a distancia sin moverse" },
                        { name: "Gigante", glyph: "🧌", desc: "Arroja (impacto mutuo) o Come" }
                    ],
                    alwaysWhiteTurn: true,
                    setup: (b) => {
                        b.clear();
                        b.setPiece(5, 1, { type: 'c_arquero', color: 'w', facing: 0 });
                        b.setPiece(5, 2, { type: 'c_mago', color: 'w', facing: 0 });
                        b.setPiece(5, 3, { type: 'c_canon', color: 'w', facing: 0 });
                        b.setPiece(5, 4, { type: 'c_gigante', color: 'w', facing: 0 });
                        b.setPiece(6, 3, { type: 'c_rey', color: 'w', facing: 0 });
                        b.setPiece(6, 2, { type: 'c_escudero', color: 'w', facing: 0 });
                        b.setPiece(6, 4, { type: 'c_defensor', color: 'w', facing: 0 });

                        // Enemy targets:
                        // 3 soldiers in front of Cannon (moved 2 blocks down)
                        b.setPiece(4, 3, { type: 'c_soldado', color: 'b', facing: 180 });
                        b.setPiece(3, 3, { type: 'c_soldado', color: 'b', facing: 180 });
                        b.setPiece(2, 3, { type: 'c_soldado', color: 'b', facing: 180 });

                        // Wolves:
                        b.setPiece(3, 1, { type: 'c_lobo', color: 'b', facing: 180 }); // 1st wolf
                        b.setPiece(3, 2, { type: 'c_lobo', color: 'b', facing: 180 }); // 2nd wolf (2 blocks down)
                        b.setPiece(3, 4, { type: 'c_lobo', color: 'b', facing: 180 }); // 3rd wolf (2 blocks down)
                        b.setPiece(4, 5, { type: 'c_lobo', color: 'b', facing: 180 }); // 4th wolf (1 block up)
                    }
                },
                {
                    title: "6. Tablas y Refuerzos",
                    icon: "🪖",
                    summary: "En caso de empate, ambos bandos subastan y despliegan puntos de refuerzo para continuar la batalla.",
                    details: [
                        "<strong>Subasta Interactiva:</strong> Juega con Blancas contra el Bot para negociar cuántos puntos de refuerzo recibirá cada bando.",
                        "<strong>Botón 'Ver Tablero' (👁️):</strong> Puedes hacer clic en 'Ver Tablero' dentro del menú para inspeccionar la posición antes de ofertar.",
                        "<strong>Límite de 2 Subastas:</strong> Los refuerzos solo pueden solicitarse hasta 2 veces por partida. A la 3ª ocasión la partida concluye en Tablas Definitivas.",
                        "<strong>Límites y Valores por Defecto:</strong>",
                        "• <em>1ª Subasta:</em> Se oferta de 1 a 8 puntos (si no hay acuerdo tras 4 rondas, se otorgan <strong>4 puntos</strong> por defecto).",
                        "• <em>2ª Subasta:</em> Se oferta de 1 a 4 puntos (si no hay acuerdo, se otorgan <strong>2 puntos</strong> por defecto).",
                        "<strong>Banco de Reserva:</strong> Los puntos no gastados quedan guardados y se invocarán apenas se libere espacio en tu fila inicial (fila 'a' para Blancas, fila 'g' para Negras)."
                    ],
                    visualType: "badge_box",
                    badges: [
                        { label: "1ª Subasta", value: "1 a 8 Pts (4 por defecto)" },
                        { label: "2ª Subasta", value: "1 a 4 Pts (2 por defecto)" },
                        { label: "Límite", value: "Máx 2 Veces por Partida" }
                    ],
                    mode: 'ai',
                    playerSide: 'w',
                    customInit: (ctrl) => {
                        ctrl.matchOptions.isTutorial = true;
                        ctrl.matchOptions.mode = 'ai';
                        ctrl.matchOptions.playerSide = 'w';
                        ctrl.boardEngine.clear();
                        ctrl.boardEngine.setPiece(6, 2, { type: 'c_peon', color: 'w', facing: 0 });
                        ctrl.boardEngine.setPiece(6, 4, { type: 'c_soldado', color: 'w', facing: 0 });
                        ctrl.boardEngine.setPiece(0, 1, { type: 'c_lobo', color: 'b', facing: 180 });
                        ctrl.boardEngine.setPiece(0, 5, { type: 'c_piquetero', color: 'b', facing: 180 });
                        ctrl.boardRenderer.render();
                        setTimeout(() => {
                            ctrl.openDrawNegotiationModal();
                        }, 150);
                    }
                }
            ]
        }
    },

    reset() {
        document.querySelectorAll('.floating-popup-wrapper, #modal-draft-choice, #modal-board-inspection-bar, #modal-board-inspection-blocker, .modal-overlay').forEach(el => el.remove());
        this.selectedTutorial = null;
        this.currentStep = 0;
        this.sandboxController = null;
    },

    render(container) {
        if (!container) return;

        if (this.selectedTutorial === null) {
            this.reset();
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
                    <div class="tutorial-select-card glass-panel" id="card-tut-ajedrez" data-mode="ajedrez">
                        <div class="tut-card-badge">Principiantes</div>
                        <div class="tut-card-icon">♟️</div>
                        <h2 class="tut-card-title">Ajedrez Clásico</h2>
                        <p class="tut-card-desc">Aprende los movimientos de cada pieza, la importancia del Rey, Jaque, Jaque Mate y Enroque.</p>
                        <button class="action-btn primary-btn btn-start-tut" data-mode="ajedrez">
                            ▶️ Iniciar Tutorial
                        </button>
                    </div>

                    <!-- Card 2: Continental -->
                    <div class="tutorial-select-card glass-panel" id="card-tut-continental" data-mode="continental">
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
        container.querySelectorAll('.tutorial-select-card, .btn-start-tut').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.currentTarget.closest('.tutorial-select-card') || e.currentTarget;
                const mode = card ? card.getAttribute('data-mode') : e.currentTarget.getAttribute('data-mode');
                if (mode && this.tutorials[mode]) {
                    document.querySelectorAll('.floating-popup-wrapper, #modal-draft-choice, #modal-board-inspection-bar, #modal-board-inspection-blocker, .modal-overlay').forEach(popup => popup.remove());
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

        const isContinental = (this.selectedTutorial === 'continental');
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
                <div class="tut-sandbox-panel glass-panel" style="position: relative;">
                    <div class="tut-sandbox-header">
                        <span class="tut-sb-title">🎮 Práctica Interactiva en Vivo</span>
                        ${isContinental ? `
                            <div id="tut-points-hud" style="font-size: 0.85rem; font-weight: bold; background: rgba(0,0,0,0.45); padding: 4px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); display: flex; gap: 10px; align-items: center;">
                                <span>⚪ Blancas: <span id="tut-score-w" style="color: #60a5fa;">0</span> pts</span>
                                <span>⚫ Negras: <span id="tut-score-b" style="color: #f87171;">0</span> pts</span>
                            </div>
                        ` : ''}
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

        // Cleanup any leftover popups or modals from previous tutorial step / resets
        document.querySelectorAll('.floating-popup-wrapper, #modal-draft-choice, #modal-board-inspection-bar, #modal-board-inspection-blocker, .modal-overlay').forEach(el => el.remove());

        const isContinental = (this.selectedTutorial === 'continental');
        
        const dummyHud = document.createElement('div');
        this.sandboxController = new GameController(boardEl, dummyHud);
        
        // Configure controller for Sandbox tutorial mode
        this.sandboxController.matchOptions = { 
            mode: step.mode || 'local', 
            playerSide: step.playerSide || 'w',
            gameType: isContinental ? 'continental_sandbox' : 'classic_sandbox',
            disableVictory: !step.isVictorySlide,
            isTutorial: true,
            alwaysWhiteTurn: !!step.alwaysWhiteTurn
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

        // Live Points HUD updater
        const updatePointsHud = () => {
            const wScoreEl = document.getElementById('tut-score-w');
            const bScoreEl = document.getElementById('tut-score-b');
            if (wScoreEl && bScoreEl && isContinental && this.sandboxController?.rulesEngine) {
                const wPts = this.sandboxController.rulesEngine.getArmyPoints('w');
                const bPts = this.sandboxController.rulesEngine.getArmyPoints('b');
                wScoreEl.textContent = wPts;
                bScoreEl.textContent = bPts;
            }
        };

        const origRender = this.sandboxController.boardRenderer.render.bind(this.sandboxController.boardRenderer);
        this.sandboxController.boardRenderer.render = () => {
            origRender();
            updatePointsHud();
        };

        if (step && typeof step.customInit === 'function') {
            step.customInit(this.sandboxController);
        } else if (step && typeof step.setup === 'function') {
            step.setup(this.sandboxController.boardEngine);
        }

        // Initialize controller state properly
        this.sandboxController.selectedSquare = null;
        this.sandboxController.selectedLegalMoves = [];
        this.sandboxController.boardRenderer.render();
        updatePointsHud();
    },

    bindStepEvents(container) {
        document.getElementById('btn-tut-change-mode')?.addEventListener('click', () => {
            document.querySelectorAll('.floating-popup-wrapper, #modal-draft-choice, #modal-board-inspection-bar, #modal-board-inspection-blocker, .modal-overlay').forEach(el => el.remove());
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
            document.querySelectorAll('.floating-popup-wrapper, #modal-draft-choice, #modal-board-inspection-bar, #modal-board-inspection-blocker, .modal-overlay').forEach(el => el.remove());
            if (this.currentStep > 0) {
                this.currentStep--;
                this.renderStepView(container);
            }
        });

        document.getElementById('btn-tut-next')?.addEventListener('click', () => {
            document.querySelectorAll('.floating-popup-wrapper, #modal-draft-choice, #modal-board-inspection-bar, #modal-board-inspection-blocker, .modal-overlay').forEach(el => el.remove());
            const tutData = this.tutorials[this.selectedTutorial];
            if (tutData && this.currentStep < tutData.steps.length - 1) {
                this.currentStep++;
                this.renderStepView(container);
            }
        });

        document.getElementById('btn-tut-play')?.addEventListener('click', () => {
            document.querySelectorAll('.floating-popup-wrapper, #modal-draft-choice, #modal-board-inspection-bar, #modal-board-inspection-blocker, .modal-overlay').forEach(el => el.remove());
            if (typeof MatchSetupModal !== 'undefined') {
                MatchSetupModal.open();
            }
        });
    }
};
