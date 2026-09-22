/**
 * CONTINENTAL - Match Setup Modal
 * Configures Game (Continental / Ajedrez), Sub-modes, Time Controls, Color, Game Mode (VS Bot, Pass&Play, LAN), and AI Difficulty.
 */

const MatchSetupModal = {
    selectedGame: 'continental',           // 'continental' or 'ajedrez'
    selectedSubmode: 'continental_normal', // 'continental_normal', 'continental_captura_centro', 'continental_gran_ejercito', 'ajedrez_normal', 'ajedrez_360'
    selectedTime: '10', // 10 min default
    selectedSide: 'w',  // 'w', 'b', 'random'
    selectedMode: 'pass', // 2 Jugadores default
    selectedDifficulty: 'intermediate',

    onStartMatch: null,
    container: null,

    init(container, onStartCallback) {
        this.container = container;
        this.onStartMatch = onStartCallback;

        if (typeof NetworkManager !== 'undefined') {
            NetworkManager.onMatchStart = (options) => {
                this.close();
                if (this.onStartMatch) {
                    this.onStartMatch(options);
                }
            };

            NetworkManager.onRoomSettingsReceived = (settings) => {
                this.applyHostRoomSettings(settings);
            };

            NetworkManager.onHostLeft = (data) => {
                this.handleHostLeft(data?.reason || 'El anfitrión abandonó la sala.');
            };

            NetworkManager.onStatusChange = (status, guestName) => {
                this.handleLanStatusChange(status, guestName);
            };
        }
    },

    open() {
        this.render();
        const modal = document.getElementById('match-setup-modal');
        if (modal) modal.classList.add('modal-active');
    },

    close() {
        const modal = document.getElementById('match-setup-modal');
        if (modal) modal.classList.remove('modal-active');
    },

    getSubmodesForGame(game) {
        if (game === 'continental') {
            return [
                { id: 'continental_normal', icon: '👑', titleKey: 'submodeNormal', descKey: 'submodeNormalDesc' },
                { id: 'continental_captura_centro', icon: '🎯', titleKey: 'submodeCapturaCentro', descKey: 'submodeCapturaCentroDesc' },
                { id: 'continental_gran_ejercito', icon: '🛡️', titleKey: 'submodeGranEjercito', descKey: 'submodeGranEjercitoDesc' }
            ];
        } else {
            return [
                { id: 'ajedrez_normal', icon: '♟️', titleKey: 'submodeNormal', descKey: 'submodeNormalDesc' },
                { id: 'ajedrez_360', icon: '🎲', titleKey: 'submodeAjedrez360', descKey: 'submodeAjedrez360Desc' }
            ];
        }
    },

    render() {
        const savedCenterTurns = localStorage.getItem('continental_center_turns') || '3';
        const predefinedTurns = ['3', '5', '7', '9', '11'];
        const centerTurns = predefinedTurns.includes(savedCenterTurns) ? savedCenterTurns : 'custom';
        const customCenterTurnsValue = centerTurns === 'custom' ? savedCenterTurns : '15';
        
        const centerConsecutive = localStorage.getItem('continental_center_consecutive') !== 'false';
        
        const customTimeMin = localStorage.getItem('continental_custom_time_min') || '3';
        const customTimeSec = localStorage.getItem('continental_custom_time_sec') || '30';
        const sandboxMode = false;

        const modalHtml = `
            <div id="match-setup-modal" class="modal-overlay modal-active">
                <div class="modal-card match-setup-card animate-pop-in">
                    <button class="action-btn secondary-btn small-btn btn-back-menu" id="btn-close-setup" style="margin-bottom: 15px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 10px;" data-i18n="btnBackMenu">
                        ${(typeof I18n !== 'undefined' ? I18n.get('btnBackMenu') : null) || '⬅️ Volver al Menú'}
                    </button>
                    
                    <h2 class="modal-title" data-i18n="setupMatchTitle">${(typeof I18n !== 'undefined' ? I18n.get('setupMatchTitle') : null) || 'Configurar Partida'}</h2>

                    <!-- 1. GAME MODE SELECTION -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="gameModeLabel">${(typeof I18n !== 'undefined' ? I18n.get('gameModeLabel') : null) || 'Elige el Juego'}</label>
                        <div class="game-cards-grid">
                            <button class="game-card ${this.selectedGame === 'continental' ? 'game-card-active' : ''}" data-game="continental">
                                <div class="game-card-icon">⚔️</div>
                                <div class="game-card-info">
                                    <div class="game-card-title" data-i18n="gameContinental">${(typeof I18n !== 'undefined' ? I18n.get('gameContinental') : null) || 'Continental'}</div>
                                    <div class="game-card-desc" data-i18n="gameContinentalDesc">${(typeof I18n !== 'undefined' ? I18n.get('gameContinentalDesc') : null) || 'Guerra táctica y modos especiales'}</div>
                                </div>
                            </button>
                            <button class="game-card ${this.selectedGame === 'ajedrez' ? 'game-card-active' : ''}" data-game="ajedrez">
                                <div class="game-card-icon">♟️</div>
                                <div class="game-card-info">
                                    <div class="game-card-title" data-i18n="gameClassic">${(typeof I18n !== 'undefined' ? I18n.get('gameClassic') : null) || 'Ajedrez'}</div>
                                    <div class="game-card-desc" data-i18n="gameClassicDesc">${(typeof I18n !== 'undefined' ? I18n.get('gameClassicDesc') : null) || 'Ajedrez clásico internacional'}</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <!-- 2. SUBMODES CAROUSEL / SELECTOR -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="submodeLabel">${(typeof I18n !== 'undefined' ? I18n.get('submodeLabel') : null) || 'SUB-MODO / VARIANTE'}</label>
                        <div class="submode-grid" id="submode-options-grid">
                            <!-- Dynamic submodes injected here -->
                        </div>
                    </div>

                    <!-- 2.1 CAPTURA DEL CENTRO SPECIAL RULES CONFIG -->
                    <div class="setup-group center-capture-config-panel glass-panel" id="center-capture-config" style="display: ${this.selectedSubmode === 'continental_captura_centro' ? 'block' : 'none'};">
                        <label class="setup-label" data-i18n="centerTurnsLabel">👑 Turnos en el Centro para Ganar</label>
                        <div class="center-turns-row">
                            <select id="modal-center-turns" class="select-center-turns">
                                <option value="3" ${centerTurns === '3' ? 'selected' : ''}>3 Turnos (Rápido)</option>
                                <option value="5" ${centerTurns === '5' ? 'selected' : ''}>5 Turnos (Estándar)</option>
                                <option value="7" ${centerTurns === '7' ? 'selected' : ''}>7 Turnos (Estratégico)</option>
                                <option value="9" ${centerTurns === '9' ? 'selected' : ''}>9 Turnos (Resistencia)</option>
                                <option value="11" ${centerTurns === '11' ? 'selected' : ''}>11 Turnos (Épico)</option>
                                <option value="custom" ${centerTurns === 'custom' ? 'selected' : ''}>⚙️ Personalizado...</option>
                            </select>
                            <input type="number" id="custom-center-turns-input" class="input-custom-turns" min="1" max="99" value="${customCenterTurnsValue}" style="display: ${centerTurns === 'custom' ? 'inline-block' : 'none'};">
                        </div>

                        <div class="center-consecutive-row" style="margin-top: 10px;">
                            <label class="setup-label" data-i18n="centerConsecutiveLabel" style="font-size: 0.75rem; color: #cbd5e1;">Racha en el Centro</label>
                            <select id="modal-center-consecutive" class="select-center-turns" style="margin-top: 4px;">
                                <option value="true" ${centerConsecutive ? 'selected' : ''}>🔥 Consecutivos (Si te sacan, vuelve a 0)</option>
                                <option value="false" ${!centerConsecutive ? 'selected' : ''}>📦 Acumulativos (Se suman los turnos)</option>
                            </select>
                        </div>
                    </div>

                    <!-- 3. TIME CONTROL SELECTOR -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="timeControlLabel">${(typeof I18n !== 'undefined' ? I18n.get('timeControlLabel') : null) || 'CONTROL DE TIEMPO'}</label>
                        <div class="pill-grid" id="time-pill-grid">
                            <button class="pill-btn ${this.selectedTime === '1' ? 'pill-active' : ''}" data-time="1" style="display:flex; flex-direction:column; line-height: 1.2;"><span>⚡ 1 min</span><span style="font-size: 0.75em; opacity: 0.8;">Bala</span></button>
                            <button class="pill-btn ${this.selectedTime === '3' ? 'pill-active' : ''}" data-time="3" style="display:flex; flex-direction:column; line-height: 1.2;"><span>🔥 3 min</span><span style="font-size: 0.75em; opacity: 0.8;">Blitz</span></button>
                            <button class="pill-btn ${this.selectedTime === '5' ? 'pill-active' : ''}" data-time="5" style="display:flex; flex-direction:column; line-height: 1.2;"><span>⏱️ 5 min</span><span style="font-size: 0.75em; opacity: 0.8;">Rápida</span></button>
                            <button class="pill-btn ${this.selectedTime === '10' ? 'pill-active' : ''}" data-time="10" style="display:flex; flex-direction:column; line-height: 1.2;"><span>🛡️ 10 min</span><span style="font-size: 0.75em; opacity: 0.8;">Normal</span></button>
                            <button class="pill-btn ${this.selectedTime === 'unlimited' ? 'pill-active' : ''}" data-time="unlimited" style="display:flex; flex-direction:column; line-height: 1.2;"><span>♾️ Sin límite</span><span style="font-size: 0.75em; opacity: 0.8;">Sin tiempo</span></button>
                            <button class="pill-btn ${this.selectedTime === 'custom' ? 'pill-active' : ''}" data-time="custom" style="grid-column: 1 / -1;">⚙️ Custom</button>
                        </div>
                        
                        <!-- CUSTOM TIME INPUTS -->
                        <div id="custom-time-inputs" class="custom-time-container" style="display: ${this.selectedTime === 'custom' ? 'flex' : 'none'};">
                            <div class="custom-time-group">
                                <label for="custom-min-input">Min</label>
                                <input type="number" id="custom-min-input" min="0" max="180" value="${customTimeMin}" class="custom-num-input" style="color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; background: rgba(0,0,0,0.6) !important; font-weight: bold; font-size: 1.1rem; text-align: center;">
                            </div>
                            <span class="custom-time-separator">:</span>
                            <div class="custom-time-group">
                                <label for="custom-sec-input">Seg</label>
                                <input type="number" id="custom-sec-input" min="0" max="59" value="${customTimeSec}" class="custom-num-input" style="color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; background: rgba(0,0,0,0.6) !important; font-weight: bold; font-size: 1.1rem; text-align: center;">
                            </div>
                        </div>
                    </div>

                    <!-- 4. SIDE / COLOR SELECTOR -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="sideLabel">${(typeof I18n !== 'undefined' ? I18n.get('sideLabel') : null) || 'JUGAR CON'}</label>
                        <div class="side-selector">
                            <button class="side-btn ${this.selectedSide === 'w' ? 'side-active' : ''}" data-side="w" title="Blancas">
                                <div class="side-circle side-white" style="font-size: 2em; line-height: 1;">♔</div>
                                <span data-i18n="sideWhite">${(typeof I18n !== 'undefined' ? I18n.get('sideWhite') : null) || 'Blancas'}</span>
                            </button>
                            <button class="side-btn ${this.selectedSide === 'random' ? 'side-active' : ''}" data-side="random" title="Aleatorio">
                                <div class="side-circle side-random" style="font-size: 2em; line-height: 1;">🎲</div>
                                <span data-i18n="sideRandom">${(typeof I18n !== 'undefined' ? I18n.get('sideRandom') : null) || 'Aleatorio'}</span>
                            </button>
                            <button class="side-btn ${this.selectedSide === 'b' ? 'side-active' : ''}" data-side="b" title="Negras">
                                <div class="side-circle side-black" style="font-size: 2em; line-height: 1;">♚</div>
                                <span data-i18n="sideBlack">${(typeof I18n !== 'undefined' ? I18n.get('sideBlack') : null) || 'Negras'}</span>
                            </button>
                        </div>
                    </div>

                    <!-- 5. OPPONENT / MODE (VS BOT, PASS & PLAY, LAN) -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="modeLabel">${(typeof I18n !== 'undefined' ? I18n.get('modeLabel') : null) || 'MODO DE JUEGO'}</label>
                        <div class="mode-grid">
                            <button class="mode-card ${this.selectedMode === 'pass' ? 'mode-active' : ''}" data-mode="pass">
                                <div class="mode-icon">👥</div>
                                <div>2 Jugadores (Local)</div>
                            </button>
                            <button class="mode-card ${this.selectedMode === 'ai' ? 'mode-active' : ''}" data-mode="ai">
                                <div class="mode-icon">🤖</div>
                                <div data-i18n="modeVsAi">${(typeof I18n !== 'undefined' ? (I18n.get('modeVsAi') || I18n.get('modeAI')) : null) || 'Contra IA / Bot'}</div>
                            </button>
                            <button class="mode-card ${this.selectedMode === 'lan' ? 'mode-active' : ''}" data-mode="lan">
                                <div class="mode-icon">📡</div>
                                <div data-i18n="modeLan">${(typeof I18n !== 'undefined' ? I18n.get('modeLan') : null) || 'Multijugador LAN / Wi-Fi'}</div>
                            </button>
                        </div>
                    </div>

                    <!-- AI DIFFICULTY -->
                    <div class="setup-group" id="group-ai-diff" style="display: ${this.selectedMode === 'ai' ? 'block' : 'none'};">
                        <label class="setup-label" data-i18n="aiDifficultyLabel">${(typeof I18n !== 'undefined' ? I18n.get('aiDifficultyLabel') : null) || 'Dificultad de la IA'}</label>
                        <div class="pill-grid" id="diff-pill-grid">
                            <button class="pill-btn ${this.selectedDifficulty === 'novice' ? 'pill-active' : ''}" data-diff="novice" data-i18n="aiNovice">${(typeof I18n !== 'undefined' ? I18n.get('aiNovice') : null) || 'Novato'}</button>
                            <button class="pill-btn ${this.selectedDifficulty === 'intermediate' ? 'pill-active' : ''}" data-diff="intermediate" data-i18n="aiIntermediate">${(typeof I18n !== 'undefined' ? I18n.get('aiIntermediate') : null) || 'Intermedio'}</button>
                            <button class="pill-btn ${this.selectedDifficulty === 'master' ? 'pill-active' : ''}" data-diff="master" data-i18n="aiMaster">${(typeof I18n !== 'undefined' ? I18n.get('aiMaster') : null) || 'Maestro'}</button>
                        </div>
                    </div>

                    <!-- LAN REAL PEERJS CONTROLS & LOBBY -->
                    <div class="setup-group lan-box glass-panel" id="group-lan-setup" style="display: ${this.selectedMode === 'lan' ? 'block' : 'none'}; padding: 12px; margin-top: 10px; border-radius: 8px; background: rgba(0,0,0,0.35); border: 1px solid rgba(59, 130, 246, 0.4);">
                        <label class="setup-label" style="color: #60a5fa; font-weight: bold; margin-bottom: 8px; display: block;">📡 Multijugador LAN / Wi-Fi (P2P)</label>
                        
                        <!-- Player Name Bar with Randomizer -->
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                            <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; white-space: nowrap;">Unirse como:</span>
                            <input type="text" id="lan-player-name-input" value="${(typeof NetworkManager !== 'undefined' ? NetworkManager.playerName : '') || 'Comandante_1'}" maxlength="18" style="flex: 1; min-width: 80px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: #fff; font-size: 0.85rem; font-weight: bold;">
                            <button id="btn-lan-random-name" title="Generar nombre aleatorio" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 4px 8px; color: #fff; cursor: pointer; font-size: 0.9rem;">🎲</button>
                        </div>

                        <!-- Create Room Button -->
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <button id="btn-lan-host" class="action-btn primary-btn" style="flex: 1; padding: 10px; font-weight: bold; background: linear-gradient(135deg, #2563eb, #1d4ed8);">
                                📡 Crear Sala
                            </button>
                        </div>

                        <!-- Discovered Rooms List (Lobby) -->
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-size: 0.8rem; font-weight: bold; color: #cbd5e1;">👥 Salas abiertas en la red:</span>
                                <span id="lan-discovery-indicator" style="font-size: 0.75rem; color: #34d399;">● Buscando...</span>
                            </div>
                            <div id="lan-discovered-rooms-list" style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.25); border-radius: 8px; padding: 6px; border: 1px solid rgba(255,255,255,0.08);">
                                <div style="font-size: 0.78rem; color: #94a3b8; text-align: center; padding: 10px;">No hay salas abiertas aún. ¡Crea una o ingresa por código!</div>
                            </div>
                        </div>

                        <!-- Direct Room Code Join -->
                        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                            <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 4px;">O unirse por código de sala directo:</span>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="lan-room-input" placeholder="CW-4892" maxlength="10" style="flex: 1; padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4); color: #fff; font-weight: bold; text-transform: uppercase;">
                                <button id="btn-lan-join" class="action-btn secondary-btn" style="padding: 8px 14px; font-weight: bold;">
                                    Unirse
                                </button>
                            </div>
                        </div>

                        <div id="lan-status-msg" style="font-size: 0.85rem; color: #fbbf24; margin-top: 8px; font-weight: bold; text-align: center;"></div>
                    </div>

                    <!-- MODO AMISTOSO / SANDBOX -->
                    <div class="setup-group" style="margin-top: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px;">
                            <div>
                                <strong style="display: block; font-size: 0.95rem; margin-bottom: 4px;">Modo Amistoso / Sandbox</strong>
                                <span style="font-size: 0.8rem; color: #aaa; display: block; line-height: 1.2;">Activa el botón para deshacer movimientos ilimitadamente (↩️ Deshacer) en partidas locales.</span>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="modal-sandbox-toggle" ${sandboxMode ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- START MATCH BUTTON -->
                    <button id="btn-start-match" class="action-btn primary-btn large-btn margin-top-md" data-i18n="startGameBtn">
                        ${(typeof I18n !== 'undefined' ? I18n.get('startGameBtn') : null) || '¡A Jugar!'}
                    </button>
                </div>
            </div>
        `;

        this.container.innerHTML = modalHtml;
        this.renderSubmodes();
        this.bindEvents();
        this.updateStartButtonForLanGuest();
    },

    renderSubmodes() {
        const grid = document.getElementById('submode-options-grid');
        if (!grid) return;

        const submodes = this.getSubmodesForGame(this.selectedGame);
        grid.innerHTML = submodes.map(sm => {
            const isSelected = this.selectedSubmode === sm.id;
            const title = (typeof I18n !== 'undefined' ? I18n.get(sm.titleKey) : null) || sm.id;
            const desc = (typeof I18n !== 'undefined' ? I18n.get(sm.descKey) : null) || '';
            return `
                <div class="submode-card ${isSelected ? 'submode-active' : ''}" data-submode="${sm.id}">
                    <div class="submode-icon">${sm.icon}</div>
                    <div class="submode-info">
                        <div class="submode-title">${title}</div>
                        <div class="submode-desc">${desc}</div>
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('[data-submode]').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedSubmode = card.dataset.submode;
                grid.querySelectorAll('[data-submode]').forEach(c => c.classList.remove('submode-active'));
                card.classList.add('submode-active');

                const centerPanel = document.getElementById('center-capture-config');
                if (centerPanel) {
                    centerPanel.style.display = this.selectedSubmode === 'continental_captura_centro' ? 'block' : 'none';
                }
                this.broadcastSettingsToGuest();
            });
        });
    },

    renderLanDiscoveredRooms(rooms) {
        const list = document.getElementById('lan-discovered-rooms-list');
        if (!list) return;

        if (!rooms || rooms.length === 0) {
            list.innerHTML = '<div style="font-size: 0.78rem; color: #94a3b8; text-align: center; padding: 10px;">No hay salas abiertas aún. ¡Crea una o ingresa por código!</div>';
            return;
        }

        list.innerHTML = rooms.map(room => {
            const isContinental = room.gameType === 'continental';
            const icon = isContinental ? '⚔️' : '♟️';

            // Detailed mode description
            let submodeName = '';
            if (isContinental) {
                if (room.submode === 'continental_captura_centro') {
                    const turns = room.centerTurns || 3;
                    const racha = room.centerConsecutive !== false ? 'Consecutivos' : 'Acumulativos';
                    submodeName = `Continental — Captura el Centro: ${turns} Turnos (${racha})`;
                } else if (room.submode === 'continental_gran_ejercito') {
                    submodeName = 'Continental — Gran Ejército';
                } else {
                    submodeName = 'Continental — Clásico';
                }
            } else {
                if (room.submode === 'ajedrez_360') {
                    submodeName = 'Ajedrez 360 (Fischer Random)';
                } else {
                    submodeName = 'Ajedrez Clásico';
                }
            }

            // Detailed time description
            let timeDesc = '';
            const tSec = room.timeSeconds !== undefined ? room.timeSeconds : ((room.timeMinutes || 10) * 60);
            if (room.timeType === 'unlimited' || tSec === 0) {
                timeDesc = '♾️ Sin Tiempo';
            } else if (room.timeType === 'custom') {
                const m = Math.floor(tSec / 60);
                const s = tSec % 60;
                timeDesc = `⏱️ Custom: ${m} m ${s} s`;
            } else {
                const m = room.timeMinutes || Math.floor(tSec / 60);
                const tag = m >= 10 ? 'Rápida' : (m >= 3 ? 'Blitz' : 'Bala');
                timeDesc = `⏱️ ${m} min (${tag})`;
            }

            const isFriendlyRoom = !!(room.isFriendly || room.sandboxMode);
            const friendlyBadge = isFriendlyRoom
                ? `<span style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7; border-radius: 4px; padding: 1px 6px; font-size: 0.68rem; font-weight: bold; margin-left: 6px;">🤝 Amistosa</span>`
                : '';

            return `
                <div class="lan-room-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 8px 12px; margin-bottom: 6px;">
                    <div style="flex: 1; min-width: 0; padding-right: 8px;">
                        <strong style="display: block; font-size: 0.85rem; color: #f0fdf4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${icon} Sala de ${room.hostName || 'Jugador'} ${friendlyBadge}
                        </strong>
                        <div style="font-size: 0.72rem; color: #60a5fa; font-weight: 600; margin-top: 2px;">
                            ${submodeName}
                        </div>
                        <div style="font-size: 0.7rem; color: #94a3b8; display: flex; gap: 8px; align-items: center; margin-top: 2px;">
                            <span>${timeDesc}</span>
                            <span>•</span>
                            <span>Código: <strong style="color: #34d399;">${room.code}</strong></span>
                        </div>
                    </div>
                    <button class="action-btn primary-btn small-btn btn-join-discovered" data-code="${room.code}" style="padding: 6px 12px; font-size: 0.78rem; font-weight: bold; white-space: nowrap;">
                        Unirse
                    </button>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.btn-join-discovered').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.dataset.code;
                const statusEl = document.getElementById('lan-status-msg');
                if (statusEl) {
                    statusEl.textContent = `Conectando a la sala ${code}...`;
                    statusEl.style.color = '#fbbf24';
                }

                const nameInput = document.getElementById('lan-player-name-input');
                if (nameInput && typeof NetworkManager !== 'undefined') {
                    NetworkManager.setPlayerName(nameInput.value);
                }

                if (typeof NetworkManager !== 'undefined') {
                    NetworkManager.joinRoom(code, (success, err, hostName) => {
                        if (success) {
                            if (statusEl) {
                                statusEl.textContent = `¡Aceptado por ${hostName || 'el anfitrión'}! Esperando inicio de partida...`;
                                statusEl.style.color = '#34d399';
                            }
                            this.updateStartButtonForLanGuest();
                        } else {
                            if (statusEl) {
                                statusEl.textContent = `Error: ${err || 'No se pudo conectar'}`;
                                statusEl.style.color = '#f87171';
                            }
                        }
                    });
                }
            });
        });
    },

    applyHostRoomSettings(settings) {
        if (!settings) return;
        if (settings.gameType) this.selectedGame = settings.gameType;
        if (settings.submode) this.selectedSubmode = settings.submode;
        if (settings.selectedTime) this.selectedTime = settings.selectedTime;
        else if (settings.timeMinutes !== undefined) this.selectedTime = String(settings.timeMinutes);

        this.render();
        const statusEl = document.getElementById('lan-status-msg');
        if (statusEl) {
            statusEl.textContent = '⚙️ Configuración sincronizada con el anfitrión. Esperando inicio...';
            statusEl.style.color = '#34d399';
        }
        this.updateStartButtonForLanGuest();
    },

    updateStartButtonForLanGuest() {
        const btnStart = document.getElementById('btn-start-match');
        if (!btnStart) return;

        if (this.selectedMode === 'lan' && typeof NetworkManager !== 'undefined' && NetworkManager.conn && !NetworkManager.isHost) {
            btnStart.disabled = true;
            btnStart.style.opacity = '0.6';
            btnStart.style.cursor = 'not-allowed';
            btnStart.textContent = '⏳ Esperando que el anfitrión inicie...';
        } else {
            btnStart.disabled = false;
            btnStart.style.opacity = '1';
            btnStart.style.cursor = 'pointer';
            btnStart.textContent = (typeof I18n !== 'undefined' ? (I18n.get('startGameBtn') || I18n.get('btnStartMatch')) : null) || '¡A Jugar!';
        }
    },

    handleHostLeft(reason) {
        if (typeof NetworkManager !== 'undefined') {
            NetworkManager.conn = null;
            NetworkManager.roomCode = null;
            NetworkManager.isHost = false;
        }
        const statusEl = document.getElementById('lan-status-msg');
        if (statusEl) {
            statusEl.textContent = '⚠️ ' + (reason || 'El anfitrión abandonó la sala.') + ' Puedes crear otra sala o unirte.';
            statusEl.style.color = '#f87171';
        }
        this.showToast('⚠️ ' + (reason || 'El anfitrión abandonó la sala.'));
        this.updateStartButtonForLanGuest();
        if (this.selectedMode === 'lan' && typeof NetworkManager !== 'undefined') {
            NetworkManager.startDiscovery((rooms) => this.renderLanDiscoveredRooms(rooms));
        }
    },

    setHostControlsLocked(locked, guestName = '') {
        const modal = document.getElementById('match-setup-modal');
        if (!modal) return;

        const elementsToToggle = modal.querySelectorAll('button:not(#btn-start-match):not(#btn-close-setup), input, select, .submode-card, .game-card, .pill-btn, .side-btn, .mode-card');
        elementsToToggle.forEach(el => {
            if (locked) {
                el.setAttribute('data-host-locked', 'true');
                if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                    el.disabled = true;
                }
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.45';
            } else {
                el.removeAttribute('data-host-locked');
                if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                    el.disabled = false;
                }
                el.style.pointerEvents = '';
                el.style.opacity = '';
            }
        });

        const statusEl = document.getElementById('lan-status-msg');
        if (statusEl) {
            if (locked) {
                statusEl.innerHTML = `🔒 ¡Rival conectado (${guestName || 'Jugador'})! Opciones bloqueadas.<br>Presiona <strong style="color: #34d399;">¡A Jugar!</strong> para iniciar.`;
                statusEl.style.color = '#34d399';
            } else {
                statusEl.innerHTML = '';
            }
        }
    },

    handleLanStatusChange(status, guestName) {
        if (status === 'connected') {
            if (typeof NetworkManager !== 'undefined' && NetworkManager.isHost) {
                this.setHostControlsLocked(true, guestName);
                setTimeout(() => this.broadcastSettingsToGuest(), 200);
            }
        } else if (status === 'disconnected') {
            if (typeof NetworkManager !== 'undefined' && NetworkManager.isHost) {
                this.setHostControlsLocked(false);
            }
            if (typeof NetworkManager !== 'undefined' && !NetworkManager.isHost && NetworkManager.conn) {
                this.handleHostLeft('El anfitrión se ha desconectado.');
            }
        }
    },

    showToast(msg) {
        const existing = document.getElementById('lan-setup-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'lan-setup-toast';
        toast.style.cssText = 'position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(239, 68, 68, 0.95); color: #fff; padding: 10px 20px; border-radius: 25px; font-weight: bold; font-size: 0.88rem; z-index: 99999; box-shadow: 0 8px 25px rgba(0,0,0,0.6); pointer-events: none;';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    broadcastSettingsToGuest() {
        let actualTimeSec = 0;
        let actualTimeMin = 0;
        if (this.selectedTime === 'custom') {
            const cMin = parseInt(document.getElementById('custom-min-input')?.value || '3', 10);
            const cSec = parseInt(document.getElementById('custom-sec-input')?.value || '0', 10);
            actualTimeSec = Math.max(0, cMin * 60 + cSec);
            actualTimeMin = Math.floor(actualTimeSec / 60);
        } else if (this.selectedTime === 'unlimited') {
            actualTimeMin = 0;
            actualTimeSec = 0;
        } else {
            actualTimeMin = parseInt(this.selectedTime, 10) || 0;
            actualTimeSec = actualTimeMin * 60;
        }

        const centerTurnsEl = document.getElementById('modal-center-turns');
        const customTurnsEl = document.getElementById('custom-center-turns-input');
        const centerTurnsVal = centerTurnsEl ? (centerTurnsEl.value === 'custom' ? (customTurnsEl?.value || '15') : centerTurnsEl.value) : '3';
        const centerConsecutiveVal = document.getElementById('modal-center-consecutive')?.value !== 'false';
        const isAmistosa = document.getElementById('modal-sandbox-toggle')?.checked || false;

        const updatedOpts = {
            gameType: this.selectedGame,
            submode: this.selectedSubmode,
            timeType: this.selectedTime,
            selectedTime: this.selectedTime,
            timeMinutes: actualTimeMin,
            timeSeconds: actualTimeSec,
            centerTurns: parseInt(centerTurnsVal, 10),
            centerConsecutive: centerConsecutiveVal,
            isFriendly: isAmistosa,
            sandboxMode: isAmistosa
        };

        if (typeof NetworkManager !== 'undefined') {
            NetworkManager.updateRoomOptions(updatedOpts);
            if (NetworkManager.conn && NetworkManager.conn.open && NetworkManager.isHost) {
                NetworkManager.sendRoomSettings(updatedOpts);
            }
        }
    },

    showJoinApprovalModal(request) {
        const existing = document.getElementById('modal-join-request');
        if (existing) existing.remove();

        const modalDiv = document.createElement('div');
        modalDiv.id = 'modal-join-request';
        modalDiv.className = 'modal-overlay modal-active';
        modalDiv.style.zIndex = '9999';
        modalDiv.innerHTML = `
            <div class="modal-card animate-pop-in" style="text-align: center; padding: 22px; max-width: 360px; background: rgba(16, 42, 32, 0.95); border: 2px solid #34d399; border-radius: 14px; box-shadow: 0 0 30px rgba(0,0,0,0.8);">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">⚔️</div>
                <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.2rem; margin-bottom: 6px;">Solicitud de Partida</h3>
                <p style="margin: 12px 0; font-size: 0.95rem; color: #a7f3d0; line-height: 1.4;">
                    <strong>${request.guestName}</strong> quiere unirse a tu partida en red.
                </p>
                <div style="display: flex; gap: 10px; margin-top: 16px;">
                    <button id="btn-accept-join" class="action-btn primary-btn" style="flex: 1; padding: 10px; font-weight: bold; background: linear-gradient(135deg, #10b981, #059669);">
                        ✅ Sí (Aceptar)
                    </button>
                    <button id="btn-reject-join" class="action-btn secondary-btn" style="flex: 1; padding: 10px; font-weight: bold; background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5;">
                        ❌ No (Rechazar)
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);

        modalDiv.querySelector('#btn-accept-join')?.addEventListener('click', () => {
            request.accept();
            modalDiv.remove();
            this.setHostControlsLocked(true, request.guestName);
            setTimeout(() => this.broadcastSettingsToGuest(), 200);
        });

        modalDiv.querySelector('#btn-reject-join')?.addEventListener('click', () => {
            request.reject('El anfitrión rechazó la solicitud.');
            modalDiv.remove();
            const statusEl = document.getElementById('lan-status-msg');
            if (statusEl) statusEl.textContent = `Rechazaste la solicitud de ${request.guestName}.`;
        });
    },

    bindEvents() {
        const modal = document.getElementById('match-setup-modal');
        if (!modal) return;

        // Close button (Volver al menú)
        document.getElementById('btn-close-setup')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setHostControlsLocked(false);
            if (typeof NetworkManager !== 'undefined') {
                NetworkManager.stopDiscovery();
                NetworkManager.disconnect();
            }
            this.close();
        });

        // Game Selection (Cards)
        modal.querySelectorAll('[data-game]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newGame = btn.dataset.game;
                this.selectedGame = newGame;

                if (newGame === 'continental' && !this.selectedSubmode.startsWith('continental_')) {
                    this.selectedSubmode = 'continental_normal';
                } else if (newGame === 'ajedrez' && !this.selectedSubmode.startsWith('ajedrez_')) {
                    this.selectedSubmode = 'ajedrez_normal';
                }

                modal.querySelectorAll('[data-game]').forEach(b => b.classList.remove('game-card-active'));
                btn.classList.add('game-card-active');

                this.renderSubmodes();
                this.broadcastSettingsToGuest();
            });
        });

        // Time Control Pill Clicks
        modal.querySelectorAll('[data-time]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedTime = btn.dataset.time;
                modal.querySelectorAll('[data-time]').forEach(b => b.classList.remove('pill-active'));
                btn.classList.add('pill-active');

                const customBox = document.getElementById('custom-time-inputs');
                if (customBox) {
                    customBox.style.display = this.selectedTime === 'custom' ? 'flex' : 'none';
                }
                this.broadcastSettingsToGuest();
            });
        });

        // Custom Time Inputs change
        ['input', 'change'].forEach(evtType => {
            document.getElementById('custom-min-input')?.addEventListener(evtType, () => this.broadcastSettingsToGuest());
            document.getElementById('custom-sec-input')?.addEventListener(evtType, () => this.broadcastSettingsToGuest());
        });

        // Center Turns Dropdown change
        const centerTurnsSelect = document.getElementById('modal-center-turns');
        if (centerTurnsSelect) {
            centerTurnsSelect.addEventListener('change', (e) => {
                const customTurnsBox = document.getElementById('custom-center-turns-input');
                if (customTurnsBox) {
                    customTurnsBox.style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
                }
                this.broadcastSettingsToGuest();
            });
        }

        // Custom Center Turns Input & Consecutive Dropdown change
        ['input', 'change'].forEach(evtType => {
            document.getElementById('custom-center-turns-input')?.addEventListener(evtType, () => this.broadcastSettingsToGuest());
        });
        document.getElementById('modal-center-consecutive')?.addEventListener('change', () => this.broadcastSettingsToGuest());

        // Friendly / Sandbox Mode Toggle change
        document.getElementById('modal-sandbox-toggle')?.addEventListener('change', () => this.broadcastSettingsToGuest());

        // Side Selection Clicks
        modal.querySelectorAll('[data-side]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedSide = btn.dataset.side;
                modal.querySelectorAll('[data-side]').forEach(b => b.classList.remove('side-active'));
                btn.classList.add('side-active');
            });
        });

        // Mode Clicks
        modal.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedMode = btn.dataset.mode;
                modal.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('mode-active'));
                btn.classList.add('mode-active');

                const aiGroup = document.getElementById('group-ai-diff');
                const lanGroup = document.getElementById('group-lan-setup');
                if (aiGroup) aiGroup.style.display = this.selectedMode === 'ai' ? 'block' : 'none';
                if (lanGroup) {
                    lanGroup.style.display = this.selectedMode === 'lan' ? 'block' : 'none';
                    if (this.selectedMode === 'lan' && typeof NetworkManager !== 'undefined') {
                        NetworkManager.startDiscovery((rooms) => this.renderLanDiscoveredRooms(rooms));
                    } else if (typeof NetworkManager !== 'undefined') {
                        NetworkManager.stopDiscovery();
                    }
                }
                this.updateStartButtonForLanGuest();
            });
        });

        // AI Difficulty Clicks
        modal.querySelectorAll('[data-diff]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedDifficulty = btn.dataset.diff;
                modal.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('pill-active'));
                btn.classList.add('pill-active');
            });
        });

        // Random Player Name button
        document.getElementById('btn-lan-random-name')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof NetworkManager !== 'undefined') {
                const newName = NetworkManager.generateRandomPlayerName();
                const nameInput = document.getElementById('lan-player-name-input');
                if (nameInput) nameInput.value = newName;
            }
            this.broadcastSettingsToGuest();
        });

        // Player Name input
        document.getElementById('lan-player-name-input')?.addEventListener('input', (e) => {
            if (typeof NetworkManager !== 'undefined') {
                NetworkManager.setPlayerName(e.target.value);
            }
            this.broadcastSettingsToGuest();
        });

        // REAL PeerJS Host Button
        document.getElementById('btn-lan-host')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const statusEl = document.getElementById('lan-status-msg');
            if (statusEl) statusEl.textContent = 'Iniciando servidor de sala P2P...';

            const nameInput = document.getElementById('lan-player-name-input');
            if (nameInput && typeof NetworkManager !== 'undefined') {
                NetworkManager.setPlayerName(nameInput.value);
            }

            if (typeof NetworkManager !== 'undefined') {
                let actualTimeSec = 0;
                let actualTimeMin = 0;
                if (this.selectedTime === 'custom') {
                    const cMin = parseInt(document.getElementById('custom-min-input')?.value || '3', 10);
                    const cSec = parseInt(document.getElementById('custom-sec-input')?.value || '0', 10);
                    actualTimeSec = Math.max(0, cMin * 60 + cSec);
                    actualTimeMin = Math.floor(actualTimeSec / 60);
                } else if (this.selectedTime === 'unlimited') {
                    actualTimeMin = 0;
                    actualTimeSec = 0;
                } else {
                    actualTimeMin = parseInt(this.selectedTime, 10) || 0;
                    actualTimeSec = actualTimeMin * 60;
                }

                const centerTurnsEl = document.getElementById('modal-center-turns');
                const customTurnsEl = document.getElementById('custom-center-turns-input');
                const centerTurnsVal = centerTurnsEl ? (centerTurnsEl.value === 'custom' ? (customTurnsEl?.value || '15') : centerTurnsEl.value) : '3';
                const centerConsecutiveVal = document.getElementById('modal-center-consecutive')?.value !== 'false';
                const isAmistosa = document.getElementById('modal-sandbox-toggle')?.checked || false;
                const roomOpts = {
                    gameType: this.selectedGame,
                    submode: this.selectedSubmode,
                    timeType: this.selectedTime,
                    selectedTime: this.selectedTime,
                    timeMinutes: actualTimeMin,
                    timeSeconds: actualTimeSec,
                    centerTurns: parseInt(centerTurnsVal, 10),
                    centerConsecutive: centerConsecutiveVal,
                    isFriendly: isAmistosa,
                    sandboxMode: isAmistosa
                };

                NetworkManager.onJoinRequest = (request) => {
                    this.showJoinApprovalModal(request);
                };

                NetworkManager.hostRoom(
                    roomOpts,
                    (roomCode) => {
                        if (statusEl) {
                            statusEl.textContent = `📡 Sala Creada: ${roomCode} (Esperando a que un jugador se una...)`;
                            statusEl.style.color = '#34d399';
                        }
                        this.updateStartButtonForLanGuest();
                    },
                    (err) => {
                        if (statusEl) {
                            statusEl.textContent = `Error al crear sala: ${err}`;
                            statusEl.style.color = '#f87171';
                        }
                    }
                );
            }
        });

        // REAL PeerJS Join Button (Direct Code)
        document.getElementById('btn-lan-join')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const input = document.getElementById('lan-room-input');
            const code = input ? input.value.trim() : '';
            const statusEl = document.getElementById('lan-status-msg');

            if (!code) {
                if (statusEl) {
                    statusEl.textContent = 'Ingresa un código válido (ej: CW-4892)';
                    statusEl.style.color = '#f87171';
                }
                return;
            }

            const nameInput = document.getElementById('lan-player-name-input');
            if (nameInput && typeof NetworkManager !== 'undefined') {
                NetworkManager.setPlayerName(nameInput.value);
            }

            if (statusEl) {
                statusEl.textContent = `Solicitando unirse a ${code}...`;
                statusEl.style.color = '#fbbf24';
            }

            if (typeof NetworkManager !== 'undefined') {
                NetworkManager.joinRoom(code, (success, err, hostName) => {
                    if (success) {
                        if (statusEl) {
                            statusEl.textContent = `¡Aceptado por ${hostName || 'el anfitrión'}! Esperando inicio de partida...`;
                            statusEl.style.color = '#34d399';
                        }
                        this.updateStartButtonForLanGuest();
                    } else {
                        if (statusEl) {
                            statusEl.textContent = `Error: ${err || 'No se pudo conectar'}`;
                            statusEl.style.color = '#f87171';
                        }
                    }
                });
            }
        });

        // Start Match Button
        document.getElementById('btn-start-match')?.addEventListener('click', (e) => {
            e.stopPropagation();

            if (this.selectedMode === 'lan' && typeof NetworkManager !== 'undefined') {
                if (NetworkManager.conn && !NetworkManager.isHost) {
                    alert('Solo el anfitrión de la sala puede iniciar la partida. Espera a que el anfitrión presione ¡A Jugar!.');
                    return;
                }
            }

            let actualTimeSec = 0;
            let actualTimeMin = 0;
            if (this.selectedTime === 'custom') {
                const cMin = parseInt(document.getElementById('custom-min-input')?.value || '3', 10);
                const cSec = parseInt(document.getElementById('custom-sec-input')?.value || '0', 10);
                actualTimeSec = Math.max(0, cMin * 60 + cSec);
                actualTimeMin = Math.floor(actualTimeSec / 60);
            } else if (this.selectedTime === 'unlimited') {
                actualTimeMin = 0;
                actualTimeSec = 0;
            } else {
                actualTimeMin = parseInt(this.selectedTime, 10) || 0;
                actualTimeSec = actualTimeMin * 60;
            }

            let modalCenterTurns = document.getElementById('modal-center-turns')?.value || localStorage.getItem('continental_center_turns') || '3';
            if (modalCenterTurns === 'custom') {
                const customInput = document.getElementById('custom-center-turns-input');
                if (customInput) modalCenterTurns = customInput.value;
            }
            const modalCenterConsecutive = document.getElementById('modal-center-consecutive') ? (document.getElementById('modal-center-consecutive').value === 'true') : (localStorage.getItem('continental_center_consecutive') !== 'false');

            localStorage.setItem('continental_center_turns', modalCenterTurns);
            localStorage.setItem('continental_center_consecutive', modalCenterConsecutive);

            let actualSide = this.selectedSide;
            if (actualSide === 'random') {
                actualSide = Math.random() > 0.5 ? 'w' : 'b';
            }

            const isAmistosa = document.getElementById('modal-sandbox-toggle')?.checked || false;
            const matchOptions = {
                gameType: this.selectedGame,
                submode: this.selectedSubmode,
                timeMinutes: actualTimeMin,
                timeSeconds: actualTimeSec,
                centerTurns: parseInt(modalCenterTurns, 10),
                centerConsecutive: modalCenterConsecutive,
                playerSide: actualSide,
                mode: this.selectedMode,
                difficulty: this.selectedDifficulty,
                isFriendly: isAmistosa,
                sandboxMode: isAmistosa,
                isSandbox: isAmistosa
            };

            // If LAN mode and Host, transmit start match options to Guest
            if (this.selectedMode === 'lan' && typeof NetworkManager !== 'undefined') {
                if (NetworkManager.isHost && NetworkManager.conn && NetworkManager.conn.open) {
                    // Send inverted color options to guest
                    const guestOptions = { ...matchOptions, playerSide: actualSide === 'w' ? 'b' : 'w' };
                    NetworkManager.sendMatchStart(guestOptions);
                }
            }

            this.close();
            if (this.onStartMatch) {
                this.onStartMatch(matchOptions);
            }
        });
    }
};
