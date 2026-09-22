/**
 * CONTINENTAL - Internationalization (i18n) Module
 * Handles Spanish and English language presets and dynamic UI localization.
 */

const I18n = {
    currentLang: 'es',

    translations: {
        es: {
            appTitle: "CONTINENTAL",
            appSubtitle: "Ajedrez en Guerra",
            appFullTitle: "CONTINENTAL (Ajedrez en Guerra)",
            
            // Initial Lang Modal
            selectLangTitle: "Selecciona tu Idioma / Select Language",
            selectLangSub: "Elige tu experiencia / Choose your experience",
            langSpanish: "Español (Ajedrez en Guerra)",
            langEnglish: "English (Chess on War)",
            confirmLang: "Continuar",

            // Vertical Main Menu Buttons (Matches User Mockup)
            menuJugar: "Jugar",
            menuOpciones: "Opciones",
            menuArmeria: "Armeria (piezas)",
            menuReglas: "Reglas",
            menuTutorial: "Tutorial",
            armoryTagline: "Aquí verás cómo se mueven las piezas",
            tutorialTagline: "Aprende las mecánicas paso a paso",
            btnBackMenu: "⬅️ Volver al Menú",

            // Tutorial View
            tutorialTitle: "Tutoriales",
            tutorialSelectDesc: "Elige la modalidad que deseas aprender:",

            // Match Setup Modal (Chess.com style)
            setupMatchTitle: "Configurar Partida",
            gameModeLabel: "Elige el Juego",
            gameContinental: "Continental",
            gameContinentalDesc: "Guerra táctica y modos especiales",
            gameClassic: "Ajedrez",
            gameClassicDesc: "Ajedrez clásico internacional",

            submodeLabel: "Sub-modo / Variante",
            submodeNormal: "Clásico (Normal)",
            submodeNormalDesc: "Reglas estándar oficiales",
            submodeCapturaCentro: "Captura el Centro",
            submodeCapturaCentroDesc: "Domina el centro (d4, d5, e4, e5) durante 3 turnos para ganar",
            submodeGranEjercito: "Gran Ejército",
            submodeGranEjercitoDesc: "Empieza con 4 puntos de refuerzo iniciales sin despliegue de comandantes",
            submodeAjedrez360: "Ajedrez 360 (Fischer Random)",
            submodeAjedrez360Desc: "Disposición inicial barajada al azar entre 960 combinaciones",

            timeControlLabel: "Control de Tiempo",
            tcRapid: "Rápida (10 min)",
            tcBlitz5: "Blitz (5 min)",
            tcBlitz3: "Blitz (3 min)",
            tcBullet: "Bala (1 min)",
            tcUnlimited: "Sin Tiempo (Infinito)",

            sideLabel: "Jugar con",
            sideWhite: "Blancas",
            sideBlack: "Negras",
            sideRandom: "Aleatorio",

            modeLabel: "Modo de Juego",
            modeVsAi: "Contra IA / Bot",
            modeAI: "Contra IA / Bot",
            modePassPlay: "2 Jugadores (Local)",
            modeLan: "Multijugador LAN / Wi-Fi",

            aiDifficultyLabel: "Dificultad de la IA",
            aiNovice: "Principiante",
            aiIntermediate: "Intermedio",
            aiMaster: "Maestro",

            lanRoomLabel: "Código de Sala LAN",
            lanHostBtn: "Crear Sala",
            lanJoinBtn: "Unirse a Sala",
            lanConnected: "¡Conectado a la sala!",
            lanWaiting: "Esperando oponente en la red local...",

            startGameBtn: "¡A Jugar!",
            btnStartMatch: "¡A Jugar!",

            // In-Game UI
            whitePlayer: "Blancas",
            blackPlayer: "Negras",
            turnText: "Turno de",
            checkNotice: "¡JAQUE!",
            checkmateNotice: "¡JAQUE MATE!",
            stalemateNotice: "¡TABLAS / EMPATE!",
            timeoutNotice: "¡TIEMPO AGOTADO!",
            winText: "¡Ganan las",
            drawText: "Empate técnico",
            
            btnResign: "Rendirse",
            btnOfferDraw: "Tablas / Refuerzos",
            btnRematch: "Revancha",
            btnViewBoard: "👁️ Mirar Tablero",
            btnMenu: "Menú Principal",

            // Pawn Promotion
            promotionTitle: "Promoción de Peón",
            choosePiece: "Elige una pieza:",
            queen: "Reina",
            rook: "Torre",
            bishop: "Alfil",
            knight: "Caballo",

            // Armory Tab
            armoryTitle: "Armería y Próximas Piezas",
            armoryDesc: "Aquí verás cómo se mueven las piezas clásicas y las nuevas piezas de guerra preparadas para Continental.",
            clickPieceToTest: "Haz clic en cualquier pieza para probar su patrón de movimiento en el tablero interactivo.",
            pieceCategoryStandard: "Piezas Estándar",
            pieceCategoryWar: "Piezas Especiales de Guerra",
            pieceMovementDetails: "Patrón de Movimiento",

            // Rules Tab
            // Rules Tab
            rulesTitle: "Reglas Oficiales: CONTINENTAL (Chess on War)",
            rulesContent: `
                <div class="continental-rules-sheet">
                    <section class="rules-section">
                        <h3>🎯 Objetivo del Juego</h3>
                        <p><strong>Objetivo Principal:</strong> Iniciar un turno propio con <strong>6 o más puntos</strong> en el tablero, teniendo el oponente <strong>5 puntos o menos</strong> al mismo tiempo.</p>
                        <div class="rules-points-box" style="background: rgba(255,255,255,0.06); padding: 10px; border-radius: 8px; margin: 8px 0;">
                            <strong>Sistema de Puntos de Ejército:</strong>
                            <ul style="margin: 4px 0 0 18px;">
                                <li><strong>Peón vivo:</strong> 1 punto</li>
                                <li><strong>Élite vivo:</strong> 2 puntos</li>
                                <li><strong>Comandante vivo:</strong> 3 puntos <em>(Excepto el Rey, que otorga 6 puntos)</em></li>
                            </ul>
                        </div>
                        <p><strong>Objetivo Secundario:</strong> Aniquilar / eliminar a todas las tropas del enemigo.</p>
                    </section>

                    <section class="rules-section">
                        <h3>⚠️ Reglas Fundamentales</h3>
                        <ul>
                            <li><strong>¡NO EXISTE EL JAQUE MATE!</strong> El Rey puede ser comido en combate como cualquier otra pieza.</li>
                            <li><strong>SIN AVANCE DOBLE:</strong> Los peones no avanzan 2 casillas en su primer turno.</li>
                            <li><strong>SIN ENROQUE:</strong> La maniobra de enroque no existe en Continental.</li>
                            <li><strong>PEÓN AL PASO:</strong> SÍ se encuentra habilitado para situaciones aplicables.</li>
                            <li><strong>SIN MOVIMIENTOS DISPONIBLES (PASE AUTO / EMPATE):</strong> Si un jugador no tiene movimientos legales en su turno, su turno se pasa automáticamente al oponente. Si NINGUNO de los dos jugadores tiene movimientos legales, la partida termina inmediatamente en EMPATE.</li>
                            <li><strong>PAUSA DE RELOJ:</strong> Siempre que surge un pop-up o menú de decisión táctica, el tiempo se congela hasta por un máximo de 5 segundos.</li>
                        </ul>
                    </section>

                    <section class="rules-section">
                        <h3>🗺️ Tablero 7x7 y Coordenadas</h3>
                        <p>El tablero continental mide 7x7. Las letras van de abajo hacia arriba de la <strong>'a'</strong> a la <strong>'g'</strong>. Las columnas van de izquierda a derecha del <strong>1</strong> al <strong>7</strong>.</p>
                        <ul>
                            <li><strong>Blancas (Fila Base 'a'):</strong> Comandante en <code>a4</code>. Élites en <code>a2, a3, a5, a6</code>. Casillas <code>a1</code> y <code>a7</code> vacías al inicio.</li>
                            <li><strong>Blancas (Fila de Vanguardia 'b'):</strong> Peones en <code>b2, b3, b4, b5, b6</code>.</li>
                            <li><strong>Negras (Fila Base 'g'):</strong> Comandante en <code>g4</code>. Élites en <code>g2, g3, g5, g6</code>. Casillas <code>g1</code> y <code>g7</code> vacías al inicio.</li>
                            <li><strong>Negras (Fila de Vanguardia 'f'):</strong> Peones en <code>f2, f3, f4, f5, f6</code>.</li>
                            <li><strong>Casilla Central:</strong> <code>d4</code> con sombreado ámbar táctico.</li>
                        </ul>
                    </section>

                    <section class="rules-section">
                        <h3>⚔️ Inicio de la Partida: Reclutamiento (Draft)</h3>
                        <p>Al iniciar la partida, aparece un sistema interactivo de reclutamiento por turnos:</p>
                        <ol style="margin-left: 18px;">
                            <li>Blancas eligen su tipo de Peón (entre 5 opciones: Peón, Damas, Lobos, Escuderos, Guardias) y se posicionan sus 5 peones.</li>
                            <li>Negras eligen su tipo de Peón.</li>
                            <li>Blancas eligen el Élite a la derecha del comandante (<code>a5</code>, entre 10 opciones).</li>
                            <li>Negras eligen su Élite a la derecha del comandante (<code>g3</code>).</li>
                            <li>Blancas eligen el Élite a la izquierda del comandante (<code>a3</code>).</li>
                            <li>Negras eligen su Élite a la izquierda del comandante (<code>g5</code>).</li>
                            <li>Blancas eligen el Élite 2 casillas a la derecha (<code>a6</code>).</li>
                            <li>Negras eligen su Élite 2 casillas a la derecha (<code>g2</code>).</li>
                            <li>Blancas eligen el Élite 2 casillas a la izquierda (<code>a2</code>).</li>
                            <li>Negras eligen su Élite 2 casillas a la izquierda (<code>g6</code>).</li>
                            <li>Blancas eligen su Comandante (entre 5 opciones: Rey, Reina, Dragón, Gigante, Mago) en <code>a4</code>.</li>
                            <li>Negras eligen su Comandante en <code>g4</code>.</li>
                        </ol>
                        <p>Comienza la partida con el turno de las Blancas.</p>
                    </section>

                    <section class="rules-section">
                        <h3>🕹️ Acciones de Turno y Habilidades</h3>
                        <p>En su turno, cada jugador puede realizar una de las siguientes acciones:</p>
                        <ul>
                            <li><strong>Mover y Rotar:</strong> Desplazar una pieza y elegir hacia dónde apuntará en 8 direcciones si es Octogonal.</li>
                            <li><strong>Pasar Turno o Pasar y Rotar:</strong> Puedes ceder la iniciativa directamente, o rotar cualquier pieza octogonal propia a elección antes de pasar el turno (incluso si no tienes piezas octogonales, puedes pasar el turno sin problemas). Si no tienes movimientos posibles, el turno se pasa automáticamente.</li>
                            <li><strong>Usar Habilidad y Rotar:</strong> Activar la habilidad especial de una unidad (sólo si hay un objetivo válido) y luego rotarla.</li>
                        </ul>
                        <p><strong>Mecánicas Especiales de Unidades:</strong></p>
                        <ul>
                            <li><strong>Rey (♚) y Promoción a Rey:</strong> Vale 6 puntos en el conteo de ejército (ya sea el Rey inicial o un peón que promocione a Rey). Además, en el modo <em>Captura el Centro</em> (modo sin victoria por puntos), tanto al iniciar con un Rey como al promocionar un peón a Rey, se otorgan 4 Puntos de Refuerzo adicionales al bando.</li>
                            <li><strong>Cañón (💣):</strong> Destruye simultáneamente a TODAS las piezas (aliadas o enemigas) en su línea frontal de hasta 3 casillas. Tiene un cooldown de 1 turno (flecha roja lista en tu turno, gris tras disparar, amarilla en recarga/advertencia de peligro).</li>
                            <li><strong>Mago (🧙):</strong> Puede rotar entre Postura de Soldado y Postura de Mercenario. Al atacar una pieza enemiga, un pop-up permite elegir entre <em>Disparar Hechizo</em> (a distancia sin moverse) o <em>Comer</em> (desplazándose a la casilla).</li>
                            <li><strong>Gigante (🗿):</strong> Al interactuar con una pieza adyacente (aliada o enemiga), puede elegir entre <em>Devorarla</em> o <em>Arrojarla</em> por el aire a 1 casilla alrededor sin moverse. Si arroja una pieza sobre otra, ambas mueren aplastadas.</li>
                            <li><strong>Defensor (🔰):</strong> Su escudo invulnerable lo protege de ser comido por piezas enemigas adyacentes ubicadas en las 3 direcciones hacia donde apuntan sus flechas. Puede comer piezas enemigas en cualquiera de las 5 casillas adyacentes restantes (a sus lados y atrás).</li>
                            <li><strong>Dragón (🐉):</strong> Vuela a 7 posiciones frontales relativas a hacia dónde apunta.</li>
                        </ul>
                    </section>

                    <section class="rules-section">
                        <h3>🤝 Tablas y Refuerzos</h3>
                        <p>Si la partida llega a posición de tablas (por ejemplo, repetición de 3 jugadas en los últimos 6 turnos o acuerdo):</p>
                        <ul>
                            <li>Se inicia una <strong>negociación de hasta 4 rondas</strong> para pactar los puntos de refuerzo (del 1 al 8). Si no se ponen de acuerdo, se otorgan <strong>4 puntos</strong> por defecto.</li>
                            <li><strong>Despliegue:</strong> Blancas gastan sus puntos reclutando Peones (1 pt) o Élites (2 pts) en casillas vacías de la fila <code>a</code>. Luego Negras hacen lo propio en la fila <code>g</code>.</li>
                            <li><strong>Banco de Reserva:</strong> Los puntos no gastados quedan guardados. Apenas se libere una casilla en la fila correspondiente durante la partida, el jugador debe reclutar refuerzos hasta agotar su reserva.</li>
                            <li>Una segunda situación de tablas negocia de 1 a 4 puntos (2 por defecto). A la tercera ocasión, la partida concluye en Tablas Definitivas.</li>
                        </ul>
                    </section>
                </div>
            `,

            // Options Tab
            optionsTitle: "Opciones del Juego",
            langSettingLabel: "Idioma Preset",
            soundFxLabel: "Efectos de Sonido (Audio FX)",
            vibrationLabel: "Vibración Háptica (Móvil)",
            boardThemeLabel: "Estilo del Tablero",
            themeClassic: "Madera Clásica",
            themeNeon: "Neón Futurista",
            themeWar: "Guerra Esmeralda",
            themeDark: "Pizarra Oscura",
            saveSettingsBtn: "Guardar Preferencias",
            savedNotice: "¡Opciones guardadas correctamente!"
        },

        en: {
            appTitle: "CONTINENTAL",
            appSubtitle: "Chess on War",
            appFullTitle: "CONTINENTAL (Chess on War)",
            
            // Initial Lang Modal
            selectLangTitle: "Select Language / Selecciona tu Idioma",
            selectLangSub: "Choose your experience / Elige tu experiencia",
            langSpanish: "Español (Ajedrez en Guerra)",
            langEnglish: "English (Chess on War)",
            confirmLang: "Continue",

            // Vertical Main Menu Buttons
            menuJugar: "Play",
            menuOpciones: "Options",
            menuArmeria: "Armory (pieces)",
            menuReglas: "Rules",
            menuTutorial: "Tutorial",
            armoryTagline: "Here you will see how pieces move",
            tutorialTagline: "Learn step-by-step game mechanics",
            btnBackMenu: "⬅️ Back to Menu",

            // Tutorial View
            tutorialTitle: "Tutorials",
            tutorialSelectDesc: "Select the game mode you want to learn:",

            // Match Setup Modal (Chess.com style)
            setupMatchTitle: "Game Setup",
            gameModeLabel: "Choose Game",
            gameContinental: "Continental",
            gameContinentalDesc: "Tactical war & special modes",
            gameClassic: "Chess",
            gameClassicDesc: "Classic international chess",

            submodeLabel: "Sub-mode / Variant",
            submodeNormal: "Classic (Normal)",
            submodeNormalDesc: "Official standard rules",
            submodeCapturaCentro: "Center Capture",
            submodeCapturaCentroDesc: "Control the center (d4, d5, e4, e5) for 3 turns to win",
            submodeGranEjercito: "Grand Army",
            submodeGranEjercitoDesc: "Starts with 4 initial reinforcement points and no commander deployment",
            submodeAjedrez360: "Chess 360 (Fischer Random)",
            submodeAjedrez360Desc: "Shuffled starting rank among 960 unique positions",

            timeControlLabel: "Time Control",
            tcRapid: "Rapid (10 min)",
            tcBlitz5: "Blitz (5 min)",
            tcBlitz3: "Blitz (3 min)",
            tcBullet: "Bullet (1 min)",
            tcUnlimited: "Unlimited (No Clock)",

            sideLabel: "Play as",
            sideWhite: "White",
            sideBlack: "Black",
            sideRandom: "Random",

            modeLabel: "Game Mode",
            modeVsAi: "VS AI / Bot",
            modeAI: "VS AI / Bot",
            modePassPlay: "2 Players (Local Pass & Play)",
            modeLan: "LAN / Wi-Fi Multiplayer",

            aiDifficultyLabel: "AI Difficulty",
            aiNovice: "Novice",
            aiIntermediate: "Intermediate",
            aiMaster: "Master",

            lanRoomLabel: "LAN Room Code",
            lanHostBtn: "Create Room",
            lanJoinBtn: "Join Room",
            lanConnected: "Connected to room!",
            lanWaiting: "Waiting for local network opponent...",

            startGameBtn: "Play Match!",
            btnStartMatch: "Play Match!",

            // In-Game UI
            whitePlayer: "White",
            blackPlayer: "Black",
            turnText: "Turn:",
            checkNotice: "CHECK!",
            checkmateNotice: "CHECKMATE!",
            stalemateNotice: "STALEMATE!",
            timeoutNotice: "TIME OUT!",
            winText: "Wins:",
            drawText: "Technical Draw",
            
            btnResign: "Resign",
            btnOfferDraw: "Draw / Reinforcements",
            btnRematch: "Rematch",
            btnViewBoard: "👁️ View Board",
            btnMenu: "Main Menu",

            // Pawn Promotion
            promotionTitle: "Pawn Promotion",
            choosePiece: "Choose a piece:",
            queen: "Queen",
            rook: "Rook",
            bishop: "Bishop",
            knight: "Knight",

            // Armory Tab
            armoryTitle: "Armory & Upcoming Pieces",
            armoryDesc: "Here you will see how classic pieces and new war pieces engineered for Continental move.",
            clickPieceToTest: "Click on any piece to preview its movement pattern on the interactive sandbox board.",
            pieceCategoryStandard: "Standard Pieces",
            pieceCategoryWar: "Special War Pieces",
            pieceMovementDetails: "Movement Pattern",

            // Rules Tab
            rulesTitle: "Official Rules: CONTINENTAL (Chess on War)",
            rulesContent: `
                <div class="continental-rules-sheet">
                    <section class="rules-section">
                        <h3>🎯 Game Objective</h3>
                        <p><strong>Primary Objective:</strong> Start your turn with <strong>6 or more army points</strong> on the board while your opponent has <strong>5 or fewer points</strong> simultaneously.</p>
                        <div class="rules-points-box" style="background: rgba(255,255,255,0.06); padding: 10px; border-radius: 8px; margin: 8px 0;">
                            <strong>Army Point System:</strong>
                            <ul style="margin: 4px 0 0 18px;">
                                <li><strong>Alive Pawn:</strong> 1 point</li>
                                <li><strong>Alive Elite:</strong> 2 points</li>
                                <li><strong>Alive Commander:</strong> 3 points <em>(Except King, who grants 6 points)</em></li>
                            </ul>
                        </div>
                        <p><strong>Secondary Objective:</strong> Eliminate all enemy units.</p>
                    </section>

                    <section class="rules-section">
                        <h3>⚠️ Core Rules to Remember</h3>
                        <ul>
                            <li><strong>NO CHECKMATE!</strong> The King can be captured in combat just like any other piece.</li>
                            <li><strong>NO DOUBLE PAWN PUSH:</strong> Pawns cannot advance 2 squares on their first turn.</li>
                            <li><strong>NO CASTLING:</strong> Castling does not exist in Continental.</li>
                            <li><strong>EN PASSANT:</strong> Enabled where applicable.</li>
                            <li><strong>TIMER PAUSE:</strong> Whenever a popup or tactical decision modal appears, the game clock freezes for up to 5 seconds.</li>
                        </ul>
                    </section>

                    <section class="rules-section">
                        <h3>🗺️ 7x7 Board & Coordinates</h3>
                        <p>The Continental board is 7x7. Ranks are labeled from bottom to top from <strong>'a'</strong> to <strong>'g'</strong>. Files are labeled from left to right from <strong>1</strong> to <strong>7</strong>.</p>
                        <ul>
                            <li><strong>White (Base Rank 'a'):</strong> Commander at <code>a4</code>. Elites at <code>a2, a3, a5, a6</code>. Squares <code>a1</code> and <code>a7</code> start empty.</li>
                            <li><strong>White (Vanguard Rank 'b'):</strong> Pawns at <code>b2, b3, b4, b5, b6</code>.</li>
                            <li><strong>Black (Base Rank 'g'):</strong> Commander at <code>g4</code>. Elites at <code>g2, g3, g5, g6</code>. Squares <code>g1</code> and <code>g7</code> start empty.</li>
                            <li><strong>Black (Vanguard Rank 'f'):</strong> Pawns at <code>f2, f3, f4, f5, f6</code>.</li>
                            <li><strong>Center Square:</strong> <code>d4</code> highlighted in tactical amber.</li>
                        </ul>
                    </section>

                    <section class="rules-section">
                        <h3>⚔️ Match Start: Recruitment Phase (Draft)</h3>
                        <p>At the start of the match, an interactive turn-by-turn recruitment draft takes place:</p>
                        <ol style="margin-left: 18px;">
                            <li>White picks their Pawn type (among 5 choices) -> sets 5 white pawns.</li>
                            <li>Black picks their Pawn type -> sets 5 black pawns.</li>
                            <li>White picks Elite #1 (right of commander: <code>a5</code>).</li>
                            <li>Black picks Elite #1 (right of commander: <code>g3</code>).</li>
                            <li>White picks Elite #2 (left of commander: <code>a3</code>).</li>
                            <li>Black picks Elite #2 (left of commander: <code>g5</code>).</li>
                            <li>White picks Elite #3 (2 squares right of commander: <code>a6</code>).</li>
                            <li>Black picks Elite #3 (2 squares right of commander: <code>g2</code>).</li>
                            <li>White picks Elite #4 (2 squares left of commander: <code>a2</code>).</li>
                            <li>Black picks Elite #4 (2 squares left of commander: <code>g6</code>).</li>
                            <li>White picks Commander (<code>a4</code>, among 5 choices).</li>
                            <li>Black picks Commander (<code>g4</code>).</li>
                        </ol>
                        <p>Match begins with White to move.</p>
                    </section>

                    <section class="rules-section">
                        <h3>🕹️ Turn Actions & Special Abilities</h3>
                        <p>On your turn, you can take one of the following actions:</p>
                        <ul>
                            <li><strong>Move and Rotate:</strong> Move a piece and choose its 8-direction orientation if Octogonal.</li>
                            <li><strong>Pass Turn or Pass and Rotate:</strong> Forfeit your turn directly, or rotate any of your Octogonal units before passing (you can pass freely even without octogonal pieces).</li>
                            <li><strong>Use Ability and Rotate:</strong> Fire a unit's special power (only if a valid target exists) and then rotate.</li>
                        </ul>
                        <p><strong>Unit Special Mechanics:</strong></p>
                        <ul>
                            <li><strong>King (♚):</strong> Worth 6 points instead of 3. This means you can sacrifice your entire army (except the King) and still have 6 points to win. Also, in modes without point victory (like Center Capture), starting with a King grants you 4 Reinforcement Points from turn 1.</li>
                            <li><strong>Cannon (💣):</strong> Obliterates ALL units (friendly or enemy) in its forward line of sight up to 3 squares simultaneously. 1-turn cooldown (red arrow ready on your turn, gray after firing, yellow during cooldown/danger warning).</li>
                            <li><strong>Mage (🧙):</strong> Stance switches between Soldier and Mercenary. When capturing, a popup allows choosing between <em>Shoot Spell</em> (at range without moving) or <em>Eat</em> (moving to the square).</li>
                            <li><strong>Giant (🗿):</strong> When targeting adjacent units (friendly or enemy), choose between <em>Devour</em> or <em>Throw</em> 1 square away around the grabbed piece without moving. If thrown onto another piece, both are destroyed.</li>
                            <li><strong>Defender (🔰):</strong> Its invulnerable shield protects it from being captured by adjacent enemies in the 3 directions of its arrows. Can capture adjacent enemy units in any direction except those 3 shield directions.</li>
                            <li><strong>Dragon (🐉):</strong> Leaps over any obstacle to 7 forward positions relative to its facing.</li>
                        </ul>
                    </section>

                    <section class="rules-section">
                        <h3>🤝 Draws & Reinforcements</h3>
                        <p>When a draw condition occurs (e.g. threefold repetition or agreement):</p>
                        <ul>
                            <li>Players enter a <strong>4-round negotiation</strong> to agree on reinforcement points (1 to 8). If no agreement is reached, <strong>4 points</strong> are granted by default.</li>
                            <li><strong>Deployment:</strong> White places Pawns (1 pt) or Elites (2 pts) on empty squares in rank <code>a</code>. Black does the same on rank <code>g</code>.</li>
                            <li><strong>Reserve Bank:</strong> Remaining unspent points are banked. Whenever a square on rank <code>a</code> or <code>g</code> is vacated during the game, reinforcements must be recruited until points run out.</li>
                            <li>A second draw negotiates 1 to 4 points (default 2). A third occurrence ends in an instant Draw.</li>
                        </ul>
                    </section>
                </div>
            `,

            // Options Tab
            optionsTitle: "Game Options",
            langSettingLabel: "Language Preset",
            soundFxLabel: "Sound FX",
            vibrationLabel: "Haptic Vibration (Mobile)",
            boardThemeLabel: "Board Theme",
            themeClassic: "Classic Wood",
            themeNeon: "Futuristic Neon",
            themeWar: "Emerald War",
            themeDark: "Dark Slate",
            saveSettingsBtn: "Save Preferences",
            savedNotice: "Options saved successfully!"
        }
    },

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('continental_lang', lang);
            this.updateDOM();
        }
    },

    get(key) {
        return this.translations[this.currentLang][key] || key;
    },

    init() {
        const savedLang = localStorage.getItem('continental_lang');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        }
    },

    updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(elem => {
            const key = elem.getAttribute('data-i18n');
            const text = this.get(key);
            if (text) {
                if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                    elem.placeholder = text;
                } else {
                    elem.textContent = text;
                }
            }
        });

        document.title = this.get('appFullTitle');

        if (window.onLanguageChanged) {
            window.onLanguageChanged(this.currentLang);
        }
    }
};

I18n.init();
