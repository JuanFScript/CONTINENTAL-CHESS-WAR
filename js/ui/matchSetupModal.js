/**
 * CONTINENTAL - Match Setup Modal (Chess.com Style)
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

        const playerName = (typeof NetworkManager !== 'undefined') ? NetworkManager.getPlayerName() : 'Comandante Drake';

        // Generate Submodes
        const submodes = this.getSubmodesForGame(this.selectedGame);

        const modalHtml = `
            <div id="match-setup-modal" class="modal-overlay modal-active">
                <div class="modal-card match-setup-card animate-pop-in">
                    <button class="modal-close-btn" id="btn-close-setup">×</button>
                    
                    <h2 class="modal-title" data-i18n="setupTitle">${I18n.get('setupTitle')}</h2>

                    <!-- 1. GAME SELECTOR (TABS) -->
                    <div class="setup-tabs">
                        <button class="setup-tab-btn ${this.selectedGame === 'continental' ? 'tab-active' : ''}" data-game="continental" data-i18n="gameContinental">
                            ${I18n.get('gameContinental')}
                        </button>
                        <button class="setup-tab-btn ${this.selectedGame === 'ajedrez' ? 'tab-active' : ''}" data-game="ajedrez" data-i18n="gameAjedrez">
                            ${I18n.get('gameAjedrez')}
                        </button>
                    </div>

                    <!-- 2. SUBMODES CAROUSEL / SELECTOR -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="submodesLabel">${I18n.get('submodesLabel')}</label>
                        <div class="submode-grid" id="submode-options-grid">
                            <!-- Dynamic submodes injected here -->
                        </div>
                    </div>

                    <!-- 2.1 CAPTURA DEL CENTRO SPECIAL RULES CONFIG (Only visible if continental_captura_centro is selected) -->
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
                        <label class="setup-label" data-i18n="timeControlLabel">${I18n.get('timeControlLabel')}</label>
                        <div class="pill-grid" id="time-pill-grid">
                            <button class="pill-btn ${this.selectedTime === '1' ? 'pill-active' : ''}" data-time="1">⚡ 1 min</button>
                            <button class="pill-btn ${this.selectedTime === '3' ? 'pill-active' : ''}" data-time="3">🔥 3 min</button>
                            <button class="pill-btn ${this.selectedTime === '5' ? 'pill-active' : ''}" data-time="5">⏱️ 5 min</button>
                            <button class="pill-btn ${this.selectedTime === '10' ? 'pill-active' : ''}" data-time="10">🛡️ 10 min</button>
                            <button class="pill-btn ${this.selectedTime === '15' ? 'pill-active' : ''}" data-time="15">⏳ 15 min</button>
                            <button class="pill-btn ${this.selectedTime === 'custom' ? 'pill-active' : ''}" data-time="custom">⚙️ Custom</button>
                        </div>
                        
                        <!-- CUSTOM TIME INPUTS (Minutos y Segundos) -->
                        <div id="custom-time-inputs" class="custom-time-container" style="display: ${this.selectedTime === 'custom' ? 'flex' : 'none'};">
                            <div class="custom-time-group">
                                <label for="custom-min-input">Min</label>
                                <input type="number" id="custom-min-input" min="0" max="180" value="${customTimeMin}" class="custom-time-box">
                            </div>
                            <span class="custom-time-separator">:</span>
                            <div class="custom-time-group">
                                <label for="custom-sec-input">Seg</label>
                                <input type="number" id="custom-sec-input" min="0" max="59" value="${customTimeSec}" class="custom-time-box">
                            </div>
                        </div>
                    </div>

                    <!-- 4. SIDE / COLOR SELECTOR -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="sideLabel">${I18n.get('sideLabel')}</label>
                        <div class="side-selector">
                            <button class="side-btn ${this.selectedSide === 'w' ? 'side-active' : ''}" data-side="w" title="Blancas">
                                <div class="side-circle side-white">♔</div>
                                <span data-i18n="sideWhite">${I18n.get('sideWhite')}</span>
                            </button>
                            <button class="side-btn ${this.selectedSide === 'random' ? 'side-active' : ''}" data-side="random" title="Aleatorio">
                                <div class="side-circle side-random">☯</div>
                                <span data-i18n="sideRandom">${I18n.get('sideRandom')}</span>
                            </button>
                            <button class="side-btn ${this.selectedSide === 'b' ? 'side-active' : ''}" data-side="b" title="Negras">
                                <div class="side-circle side-black">♚</div>
                                <span data-i18n="sideBlack">${I18n.get('sideBlack')}</span>
                            </button>
                        </div>
                    </div>

                    <!-- 5. OPPONENT / MODE (VS BOT, PASS & PLAY, LAN) -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="modeLabel">${I18n.get('modeLabel')}</label>
                        <div class="mode-grid">
                            <button class="mode-card ${this.selectedMode === 'ai' ? 'mode-active' : ''}" data-mode="ai">
                                <div class="mode-icon">🤖</div>
                                <div data-i18n="modeAI">${I18n.get('modeAI')}</div>
                            </button>
                            <button class="mode-card ${this.selectedMode === 'pass' ? 'mode-active' : ''}" data-mode="pass">
                                <div class="mode-icon">📱</div>
                                <div data-i18n="modePass">${I18n.get('modePass')}</div>
                            </button>
                            <button class="mode-card ${this.selectedMode === 'lan' ? 'mode-active' : ''}" data-mode="lan">
                                <div class="mode-icon">📡</div>
                                <div data-i18n="modeLan">${I18n.get('modeLan')}</div>
                            </button>
                        </div>
                    </div>

                    <!-- AI DIFFICULTY -->
                    <div class="setup-group" id="group-ai-diff" style="display: ${this.selectedMode === 'ai' ? 'block' : 'none'};">
                        <label class="setup-label" data-i18n="aiDifficultyLabel">${I18n.get('aiDifficultyLabel')}</label>
                        <div class="pill-grid" id="diff-pill-grid">
                            <button class="pill-btn ${this.selectedDifficulty === 'novice' ? 'pill-active' : ''}" data-diff="novice" data-i18n="aiNovice">${I18n.get('aiNovice')}</button>
                            <button class="pill-btn ${this.selectedDifficulty === 'intermediate' ? 'pill-active' : ''}" data-diff="intermediate" data-i18n="aiIntermediate">${I18n.get('aiIntermediate')}</button>
                            <button class="pill-btn ${this.selectedDifficulty === 'master' ? 'pill-active' : ''}" data-diff="master" data-i18n="aiMaster">${I18n.get('aiMaster')}</button>
                        </div>
                    </div>

                    <!-- LAN ROOM SETUP & LOBBY DISCOVERY -->
                    <div class="setup-group lan-box glass-panel" id="group-lan-setup" style="display: ${this.selectedMode === 'lan' ? 'block' : 'none'};">
                        <!-- Identidad / Nombre del Jugador -->
                        <div style="margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);">
                            <label style="font-size: 0.82rem; color: #93c5fd; font-weight: bold; display: block; margin-bottom: 4px;">👤 Unirse como:</label>
                            <div style="display: flex; gap: 6px;">
                                <input type="text" id="lan-player-name-input" value="${playerName}" placeholder="Tu nombre en LAN..." maxlength="22" style="flex: 1; padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: #fff; font-weight: bold; font-size: 0.9rem;">
                                <button id="btn-lan-randomize-name" class="action-btn secondary-btn small-btn" title="Generar otro nombre" style="padding: 0 10px; font-size: 1.1rem;">🎲</button>
                            </div>
                        </div>

                        <!-- Acciones Principales LAN -->
                        <div class="lan-controls" style="display: flex; flex-direction: column; gap: 8px;">
                            <button id="btn-lan-host" class="action-btn primary-btn" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); width: 100%; padding: 10px; font-weight: bold; font-size: 0.95rem;">
                                📡 Crear Sala
                            </button>
                            <div class="lan-input-group" style="display: flex; gap: 6px;">
                                <input type="text" id="lan-room-input" placeholder="Código (ej: CW-8492)" maxlength="10" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4); color: #fff; font-weight: bold; text-transform: uppercase;">
                                <button id="btn-lan-join" class="action-btn secondary-btn" style="padding: 8px 14px; font-weight: bold;">
                                    Entrar
                                </button>
                            </div>
                        </div>
                        <div id="lan-status-msg" class="lan-status" style="font-size: 0.8rem; color: #cbd5e1; margin-top: 6px;"></div>

                        <!-- Lista de Personas Esperando y Salas Disponibles -->
                        <div style="margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label style="font-size: 0.8rem; color: #fbbf24; font-weight: bold;">👥 Esperando partida en LAN:</label>
                                <button id="btn-lan-refresh-list" style="background: none; border: none; color: #93c5fd; font-size: 0.8rem; cursor: pointer;">🔄 Actualizar</button>
                            </div>
                            <div id="lan-waiting-list" style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
                                <!-- Lista inyectada dinámicamente -->
                            </div>
                        </div>
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
                        ${I18n.get('startGameBtn')}
                    </button>
                </div>
            </div>
        `;

        this.container.innerHTML = modalHtml;
        this.renderSubmodes();
        this.renderLanWaitingList();
        this.bindEvents();
    },

    renderLanWaitingList() {
        const listEl = document.getElementById('lan-waiting-list');
        if (!listEl || typeof NetworkManager === 'undefined') return;

        const rooms = NetworkManager.getAvailableRooms();
        const waitingPlayers = NetworkManager.getWaitingPlayers();

        let html = '';

        if (rooms.length === 0 && waitingPlayers.length === 0) {
            html = `<div style="color: #9ca3af; font-size: 0.8rem; text-align: center; padding: 10px;">Buscando jugadores y salas en la red local...</div>`;
        } else {
            // Salas abiertas
            rooms.forEach(room => {
                html += `
                    <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; font-size: 0.85rem; color: #60a5fa;">${room.name}</div>
                            <div style="font-size: 0.72rem; color: #cbd5e1;">👤 ${room.hostName} · ⚔️ ${room.modeTitle}</div>
                            <div style="font-size: 0.7rem; color: #a7f3d0;">Cupos: ${room.slots.current}/${room.slots.max}</div>
                        </div>
                        <button class="btn-request-join-room action-btn secondary-btn small-btn" data-room-code="${room.code}" style="padding: 4px 8px; font-size: 0.75rem; background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #93c5fd;">
                            📩 Pedir unirse
                        </button>
                    </div>
                `;
            });

            // Personas en espera
            waitingPlayers.forEach(p => {
                html += `
                    <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 5px 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem; color: #f3f4f6;">👤 <strong>${p.name}</strong></span>
                        <span style="font-size: 0.72rem; color: #9ca3af;">${p.status}</span>
                    </div>
                `;
            });
        }

        listEl.innerHTML = html;

        // Bind Pedir unirse buttons
        listEl.querySelectorAll('.btn-request-join-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.dataset.roomCode;
                this.requestJoinRoomFromList(code, btn);
            });
        });
    },

    requestJoinRoomFromList(roomCode, btnEl) {
        if (typeof NetworkManager === 'undefined') return;

        // Save current chosen player name first
        const nameInput = document.getElementById('lan-player-name-input');
        if (nameInput) NetworkManager.setPlayerName(nameInput.value);

        const statusEl = document.getElementById('lan-status-msg');
        if (btnEl) {
            btnEl.disabled = true;
            btnEl.textContent = '⏳ Solicitado...';
        }
        if (statusEl) statusEl.textContent = `Solicitud enviada a la sala ${roomCode}. Esperando aprobación del anfitrión...`;

        NetworkManager.onMatchStart = (matchOptions) => {
            this.close();
            if (this.onStartMatch) this.onStartMatch(matchOptions);
        };

        NetworkManager.requestToJoinRoom(roomCode, (res) => {
            if (statusEl) statusEl.textContent = `Solicitud enviada a ${roomCode}.`;
        });
    },

    openLanLobbyModal(room) {
        if (!room) return;

        // Close setup modal
        this.close();

        // Create or select Lobby Modal
        let lobbyModal = document.getElementById('modal-lan-lobby');
        if (lobbyModal) lobbyModal.remove();

        lobbyModal = document.createElement('div');
        lobbyModal.id = 'modal-lan-lobby';
        lobbyModal.className = 'modal-overlay modal-active';

        const renderLobbyContent = () => {
            const currentRoom = NetworkManager.currentRoom || room;
            const otherRooms = NetworkManager.getAvailableRooms().filter(r => r.code !== currentRoom.code);

            let requestsHtml = '';
            if (!currentRoom.pendingRequests || currentRoom.pendingRequests.length === 0) {
                requestsHtml = `<div style="color: #9ca3af; font-size: 0.8rem; font-style: italic; padding: 6px 0;">No hay solicitudes de unión pendientes...</div>`;
            } else {
                currentRoom.pendingRequests.forEach(req => {
                    requestsHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 6px 8px; margin-bottom: 6px;">
                            <div>
                                <strong style="font-size: 0.85rem; color: #60a5fa;">${req.playerName}</strong>
                                <span style="font-size: 0.72rem; color: #9ca3af; display: block;">Quiere entrar a la sala</span>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <button class="btn-lobby-accept action-btn primary-btn small-btn" data-req-id="${req.requestId}" style="padding: 4px 8px; font-size: 0.75rem; background: #10b981;">✅ Aceptar</button>
                                <button class="btn-lobby-reject action-btn secondary-btn small-btn" data-req-id="${req.requestId}" style="padding: 4px 8px; font-size: 0.75rem; background: rgba(239,68,68,0.2); border-color: #ef4444; color: #fca5a5;">❌ Rechazar</button>
                            </div>
                        </div>
                    `;
                });
            }

            let otherRoomsHtml = '';
            if (otherRooms.length === 0) {
                otherRoomsHtml = `<div style="color: #9ca3af; font-size: 0.8rem; font-style: italic;">No hay otras salas activas en este momento.</div>`;
            } else {
                otherRooms.forEach(or => {
                    otherRoomsHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 6px 8px; margin-bottom: 6px;">
                            <div>
                                <div style="font-size: 0.82rem; font-weight: bold; color: #e2e8f0;">${or.name} (${or.code})</div>
                                <div style="font-size: 0.72rem; color: #94a3b8;">⚔️ ${or.modeTitle} · Cupos: ${or.slots.current}/${or.slots.max}</div>
                            </div>
                            <button class="btn-lobby-ask-join action-btn secondary-btn small-btn" data-room-code="${or.code}" style="font-size: 0.75rem; padding: 4px 8px;">📩 Pedir unirse</button>
                        </div>
                    `;
                });
            }

            lobbyModal.innerHTML = `
                <div class="modal-card glass-panel animate-pop-in" style="max-width: 460px; padding: 20px; max-height: 88vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 8px;">
                        <div>
                            <h2 style="font-size: 1.25rem; color: #ffd700; margin: 0;">📡 Sala LAN</h2>
                            <span style="font-size: 0.8rem; color: #94a3b8;">Código de Sala: <strong style="color: #60a5fa; font-size: 1.1rem; letter-spacing: 1px;">${currentRoom.code}</strong></span>
                        </div>
                        <span class="badge" id="lobby-slots-badge" style="background: rgba(16, 185, 129, 0.25); border: 1px solid #10b981; color: #a7f3d0; font-weight: bold; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem;">
                            Cupos: ${currentRoom.slots.current}/${currentRoom.slots.max}
                        </span>
                    </div>

                    <!-- Nombre de la Sala (Editable) -->
                    <div class="setup-group">
                        <label class="setup-label" style="color: #93c5fd; font-size: 0.8rem;">🏷️ Nombre de la Sala (editable):</label>
                        <input type="text" id="lobby-room-name-input" value="${currentRoom.name}" maxlength="30" style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.25); background: rgba(0,0,0,0.5); color: #fff; font-weight: bold; font-size: 0.95rem; margin-top: 4px;">
                    </div>

                    <!-- Lista de Jugadores en Sala (Cupos) -->
                    <div class="setup-group" style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                        <label class="setup-label" style="font-size: 0.75rem; color: #cbd5e1; margin-bottom: 4px; display: block;">Jugadores en la sala:</label>
                        <div style="font-size: 0.85rem; color: #fff; display: flex; flex-direction: column; gap: 4px;">
                            <div>👑 <strong>${currentRoom.players[0]?.name || currentRoom.hostName}</strong> (Anfitrión - Blancas)</div>
                            <div>${currentRoom.players[1] ? `⚔️ <strong>${currentRoom.players[1].name}</strong> (Invitado - Negras)` : `<span style="color: #9ca3af; font-style: italic;">⏳ Esperando jugador para completar cupo...</span>`}</div>
                        </div>
                    </div>

                    <!-- Solicitudes para Unirse -->
                    <div class="setup-group" style="margin-top: 14px;">
                        <label class="setup-label" style="color: #fbbf24; font-size: 0.8rem; display: block; margin-bottom: 6px;">👥 Gente intentando unirse a la sala:</label>
                        <div id="lobby-requests-container">
                            ${requestsHtml}
                        </div>
                    </div>

                    <!-- Otras Salas Disponibles -->
                    <div class="setup-group" style="margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <label class="setup-label" style="color: #60a5fa; font-size: 0.8rem; display: block; margin-bottom: 6px;">🌐 Otras salas disponibles en la red:</label>
                        <div id="lobby-other-rooms-container">
                            ${otherRoomsHtml}
                        </div>
                    </div>

                    <!-- Botón Volver al Menú -->
                    <button id="btn-lobby-back-menu" class="action-btn secondary-btn" style="width: 100%; margin-top: 15px; padding: 10px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5;">
                        ⬅️ Volver al Menú
                    </button>
                </div>
            `;

            // Bind Lobby Inputs & Buttons
            const nameInput = lobbyModal.querySelector('#lobby-room-name-input');
            nameInput?.addEventListener('input', (e) => {
                NetworkManager.updateRoomName(e.target.value);
            });

            lobbyModal.querySelectorAll('.btn-lobby-accept').forEach(btn => {
                btn.addEventListener('click', () => {
                    const reqId = btn.dataset.reqId;
                    NetworkManager.acceptJoinRequest(reqId);
                });
            });

            lobbyModal.querySelectorAll('.btn-lobby-reject').forEach(btn => {
                btn.addEventListener('click', () => {
                    const reqId = btn.dataset.reqId;
                    NetworkManager.rejectJoinRequest(reqId);
                });
            });

            lobbyModal.querySelectorAll('.btn-lobby-ask-join').forEach(btn => {
                btn.addEventListener('click', () => {
                    const code = btn.dataset.roomCode;
                    btn.disabled = true;
                    btn.textContent = '⏳ Solicitado';
                    this.requestJoinRoomFromList(code, btn);
                });
            });

            lobbyModal.querySelector('#btn-lobby-back-menu')?.addEventListener('click', () => {
                NetworkManager.leaveRoom();
                lobbyModal.remove();
                if (typeof MenuController !== 'undefined') {
                    MenuController.switchView('main-menu');
                }
            });
        };

        renderLobbyContent();
        document.body.appendChild(lobbyModal);

        // Lobby auto-refresh handler
        NetworkManager.onLobbyUpdated = () => {
            renderLobbyContent();
        };

        // When full cupos filled, start match!
        NetworkManager.onMatchStart = (matchOptions) => {
            lobbyModal.remove();
            if (this.onStartMatch) {
                this.onStartMatch(matchOptions);
            }
        };
    },

    renderSubmodes() {
        const grid = document.getElementById('submode-options-grid');
        if (!grid) return;

        const submodes = this.getSubmodesForGame(this.selectedGame);
        grid.innerHTML = submodes.map(sub => `
            <div class="submode-card ${this.selectedSubmode === sub.id ? 'submode-active' : ''}" data-submode="${sub.id}">
                <div class="submode-icon">${sub.icon}</div>
                <div class="submode-info">
                    <h4 class="submode-title" data-i18n="${sub.titleKey}">${I18n.get(sub.titleKey)}</h4>
                    <p class="submode-desc" data-i18n="${sub.descKey}">${I18n.get(sub.descKey)}</p>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.submode-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedSubmode = card.dataset.submode;
                grid.querySelectorAll('.submode-card').forEach(c => c.classList.remove('submode-active'));
                card.classList.add('submode-active');

                const centerPanel = document.getElementById('center-capture-config');
                if (centerPanel) {
                    centerPanel.style.display = this.selectedSubmode === 'continental_captura_centro' ? 'block' : 'none';
                }
            });
        });
    },

    bindEvents() {
        const modal = document.getElementById('match-setup-modal');
        if (!modal) return;

        // Close Button
        document.getElementById('btn-close-setup')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // Game Tabs
        modal.querySelectorAll('[data-game]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedGame = btn.dataset.game;
                this.selectedSubmode = this.selectedGame === 'continental' ? 'continental_normal' : 'ajedrez_normal';

                modal.querySelectorAll('[data-game]').forEach(b => b.classList.remove('tab-active'));
                btn.classList.add('tab-active');

                this.renderSubmodes();
            });
        });

        // Center Turns Select Change
        document.getElementById('modal-center-turns')?.addEventListener('change', (e) => {
            const customInput = document.getElementById('custom-center-turns-input');
            if (customInput) {
                customInput.style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
            }
        });

        // Time Pill Clicks
        modal.querySelectorAll('[data-time]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedTime = btn.dataset.time;
                modal.querySelectorAll('[data-time]').forEach(b => b.classList.remove('pill-active'));
                btn.classList.add('pill-active');

                const customInputs = document.getElementById('custom-time-inputs');
                if (customInputs) {
                    customInputs.style.display = this.selectedTime === 'custom' ? 'flex' : 'none';
                }
            });
        });

        // Side Clicks
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
                if (lanGroup) lanGroup.style.display = this.selectedMode === 'lan' ? 'block' : 'none';
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

        // LAN: Randomize Player Name
        document.getElementById('btn-lan-randomize-name')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof NetworkManager !== 'undefined') {
                const newName = NetworkManager.generateRandomPlayerName();
                NetworkManager.setPlayerName(newName);
                const input = document.getElementById('lan-player-name-input');
                if (input) input.value = newName;
            }
        });

        // LAN: Player Name Input Edit
        document.getElementById('lan-player-name-input')?.addEventListener('input', (e) => {
            if (typeof NetworkManager !== 'undefined') {
                NetworkManager.setPlayerName(e.target.value);
            }
        });

        // LAN: Refresh Waiting List
        document.getElementById('btn-lan-refresh-list')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.renderLanWaitingList();
        });

        // LAN: Host Room Button -> Opens Lobby Modal
        document.getElementById('btn-lan-host')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof NetworkManager !== 'undefined') {
                const nameInput = document.getElementById('lan-player-name-input');
                if (nameInput) NetworkManager.setPlayerName(nameInput.value);

                let actualTimeSec = 0;
                let actualTimeMin = 0;
                if (this.selectedTime === 'custom') {
                    const cMin = parseInt(document.getElementById('custom-min-input')?.value || '3', 10);
                    const cSec = parseInt(document.getElementById('custom-sec-input')?.value || '0', 10);
                    actualTimeSec = Math.max(0, cMin * 60 + cSec);
                    actualTimeMin = Math.floor(actualTimeSec / 60);
                } else {
                    actualTimeMin = parseInt(this.selectedTime, 10) || 0;
                    actualTimeSec = actualTimeMin * 60;
                }

                const room = NetworkManager.hostRoom({
                    gameType: this.selectedGame,
                    submode: this.selectedSubmode,
                    timeMinutes: actualTimeMin,
                    timeSeconds: actualTimeSec
                });

                this.openLanLobbyModal(room);
            }
        });

        // LAN: Direct Code Join Button -> Starts Instantly!
        document.getElementById('btn-lan-join')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const input = document.getElementById('lan-room-input');
            const code = input ? input.value.trim() : '';
            const statusEl = document.getElementById('lan-status-msg');

            if (!code) {
                if (statusEl) statusEl.textContent = 'Ingresa un código de sala válido.';
                return;
            }

            const nameInput = document.getElementById('lan-player-name-input');
            if (nameInput && typeof NetworkManager !== 'undefined') {
                NetworkManager.setPlayerName(nameInput.value);
            }

            if (statusEl) statusEl.textContent = 'Entrando a sala ' + code + '...';

            if (typeof NetworkManager !== 'undefined') {
                NetworkManager.joinByCode(code, (res) => {
                    if (res && res.success) {
                        this.close();
                        if (this.onStartMatch) {
                            this.onStartMatch(res.matchOptions);
                        }
                    } else {
                        if (statusEl) statusEl.textContent = res?.error || 'No se pudo conectar a la sala.';
                    }
                });
            }
        });

        // Start Match Button
        document.getElementById('btn-start-match')?.addEventListener('click', (e) => {
            e.stopPropagation();

            // If in LAN mode, guide user to host or join
            if (this.selectedMode === 'lan') {
                document.getElementById('btn-lan-host')?.click();
                return;
            }

            // Calculate Custom Time (if selected)
            let actualTimeSec = 0;
            let actualTimeMin = 0;
            if (this.selectedTime === 'custom') {
                const cMin = parseInt(document.getElementById('custom-min-input')?.value || '3', 10);
                const cSec = parseInt(document.getElementById('custom-sec-input')?.value || '0', 10);
                actualTimeSec = Math.max(0, cMin * 60 + cSec);
                actualTimeMin = Math.floor(actualTimeSec / 60);
            } else {
                actualTimeMin = parseInt(this.selectedTime, 10) || 0;
                actualTimeSec = actualTimeMin * 60;
            }

            // Save & Pass Center Capture Config
            let modalCenterTurns = document.getElementById('modal-center-turns')?.value || localStorage.getItem('continental_center_turns') || '3';
            if (modalCenterTurns === 'custom') {
                const customInput = document.getElementById('custom-center-turns-input');
                if (customInput) modalCenterTurns = customInput.value;
            }
            const modalCenterConsecutive = document.getElementById('modal-center-consecutive') ? (document.getElementById('modal-center-consecutive').value === 'true') : (localStorage.getItem('continental_center_consecutive') !== 'false');

            const isSandbox = document.getElementById('modal-sandbox-toggle')?.checked || false;

            // Save custom times for next time
            if (this.selectedTime === 'custom') {
                const cMin = parseInt(document.getElementById('custom-min-input')?.value || '3', 10);
                const cSec = parseInt(document.getElementById('custom-sec-input')?.value || '0', 10);
                localStorage.setItem('continental_custom_time_min', cMin);
                localStorage.setItem('continental_custom_time_sec', cSec);
            }
            localStorage.setItem('continental_center_turns', modalCenterTurns);
            localStorage.setItem('continental_center_consecutive', modalCenterConsecutive);

            this.close();
            if (this.onStartMatch) {
                let actualSide = this.selectedSide;
                if (actualSide === 'random') {
                    actualSide = Math.random() > 0.5 ? 'w' : 'b';
                }
                this.onStartMatch({
                    gameType: this.selectedGame,
                    submode: this.selectedSubmode,
                    timeMinutes: actualTimeMin,
                    timeSeconds: actualTimeSec,
                    centerTurns: parseInt(modalCenterTurns, 10),
                    centerConsecutive: modalCenterConsecutive,
                    playerSide: actualSide,
                    mode: this.selectedMode,
                    difficulty: this.selectedDifficulty,
                    sandboxMode: isSandbox
                });
            }
        });
    }
};

window.MatchSetupModal = MatchSetupModal;
