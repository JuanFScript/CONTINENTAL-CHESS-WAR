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
        
        // Generate Submodes
        const submodes = this.getSubmodesForGame(this.selectedGame);

        const modalHtml = `
            <div id="match-setup-modal" class="modal-overlay modal-active">
                <div class="modal-card match-setup-card animate-pop-in">
                    <button class="action-btn secondary-btn small-btn btn-back-menu" id="btn-close-setup" style="margin-bottom: 15px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 10px;" data-i18n="btnBackMenu">${I18n.get('btnBackMenu') || '⬅️ Volver al Menú'}</button>
                    <h2 class="setup-title" data-i18n="setupMatchTitle">${I18n.get('setupMatchTitle')}</h2>
                    
                    <div class="setup-scroll-area">
                        
                        <!-- 1. GAME MODE SELECTION -->
                        <div class="setup-group">
                            <label class="setup-label" data-i18n="gameModeLabel">${I18n.get('gameModeLabel')}</label>
                            <div class="game-cards-grid">
                                <button class="game-card ${this.selectedGame === 'continental' ? 'game-card-active' : ''}" data-game="continental">
                                    <div class="game-card-icon">⚔️</div>
                                    <div class="game-card-title" data-i18n="gameContinental">${I18n.get('gameContinental')}</div>
                                    <div class="game-card-desc" data-i18n="gameContinentalDesc">${I18n.get('gameContinentalDesc')}</div>
                                </button>
                                <button class="game-card ${this.selectedGame === 'ajedrez' ? 'game-card-active' : ''}" data-game="ajedrez">
                                    <div class="game-card-icon">♟️</div>
                                    <div class="game-card-title" data-i18n="gameClassic">${I18n.get('gameClassic')}</div>
                                    <div class="game-card-desc" data-i18n="gameClassicDesc">${I18n.get('gameClassicDesc')}</div>
                                </button>
                            </div>
                        </div>

                        <!-- 2. SUB-MODE SELECTION -->
                        <div class="setup-group">
                            <label class="setup-label" data-i18n="submodeLabel">${I18n.get('submodeLabel')}</label>
                            <div class="submode-grid" id="submode-grid-container">
                                <!-- Filled dynamically -->
                            </div>

                            <!-- CAPTURA DEL CENTRO CONFIG BOX -->
                            <div id="group-center-config" class="center-config-box" style="display: ${this.selectedSubmode === 'continental_captura_centro' ? 'flex' : 'none'}; flex-direction: column; gap: 10px;">
                                <div class="center-config-row">
                                    <label>Turnos requeridos para ganar el centro:</label>
                                    <select id="modal-center-turns" class="custom-select small-select">
                                        <option value="3" ${centerTurns === '3' ? 'selected' : ''}>3 Turnos</option>
                                        <option value="5" ${centerTurns === '5' ? 'selected' : ''}>5 Turnos</option>
                                        <option value="7" ${centerTurns === '7' ? 'selected' : ''}>7 Turnos</option>
                                        <option value="9" ${centerTurns === '9' ? 'selected' : ''}>9 Turnos</option>
                                        <option value="11" ${centerTurns === '11' ? 'selected' : ''}>11 Turnos</option>
                                        <option value="custom" ${centerTurns === 'custom' ? 'selected' : ''}>Personalizado...</option>
                                    </select>
                                </div>
                                <div class="center-config-row" id="group-custom-center-turns" style="display: ${centerTurns === 'custom' ? 'flex' : 'none'}; align-items: center; gap: 10px; margin-top: -5px; padding-left: 10px;">
                                    <label style="font-size: 0.8rem;">Cantidad de turnos:</label>
                                    <input type="number" id="custom-center-turns-input" class="custom-num-input" value="${customCenterTurnsValue}" min="1" max="999" style="width: 70px;">
                                </div>
                                <div class="center-config-row">
                                    <label>Modo de conteo de turnos:</label>
                                    <select id="modal-center-consecutive" class="custom-select small-select">
                                        <option value="true" ${centerConsecutive ? 'selected' : ''}>Seguidos (Consecutivos)</option>
                                        <option value="false" ${!centerConsecutive ? 'selected' : ''}>Acumulados</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 3. TIME CONTROL -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="timeControlLabel">${I18n.get('timeControlLabel')}</label>
                        <div class="pill-grid" id="time-pill-grid">
                            <button class="pill-btn ${this.selectedTime === '10' ? 'pill-active' : ''}" data-time="10" data-i18n="tcRapid">${I18n.get('tcRapid')}</button>
                            <button class="pill-btn ${this.selectedTime === '5' ? 'pill-active' : ''}" data-time="5" data-i18n="tcBlitz5">${I18n.get('tcBlitz5')}</button>
                            <button class="pill-btn ${this.selectedTime === '3' ? 'pill-active' : ''}" data-time="3" data-i18n="tcBlitz3">${I18n.get('tcBlitz3')}</button>
                            <button class="pill-btn ${this.selectedTime === '1' ? 'pill-active' : ''}" data-time="1" data-i18n="tcBullet">${I18n.get('tcBullet')}</button>
                            <button class="pill-btn ${this.selectedTime === '0' ? 'pill-active' : ''}" data-time="0" data-i18n="tcUnlimited">${I18n.get('tcUnlimited')}</button>
                            <button class="pill-btn ${this.selectedTime === 'custom' ? 'pill-active' : ''}" data-time="custom">⏱️ Custom</button>
                        </div>

                        <!-- CUSTOM TIME MIN & SEC INPUTS -->
                        <div id="group-custom-time" class="custom-time-box" style="display: ${this.selectedTime === 'custom' ? 'flex' : 'none'};">
                            <div class="custom-time-field">
                                <label>Minutos:</label>
                                <input type="number" id="custom-min-input" class="custom-num-input" value="3" min="0" max="180">
                            </div>
                            <div class="custom-time-field">
                                <label>Segundos:</label>
                                <input type="number" id="custom-sec-input" class="custom-num-input" value="30" min="0" max="59">
                            </div>
                        </div>
                    </div>

                    <!-- 4. SIDE SELECTION -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="sideLabel">${I18n.get('sideLabel')}</label>
                        <div class="side-selector" id="side-selector-grid">
                            <button class="side-btn ${this.selectedSide === 'w' ? 'side-active' : ''}" data-side="w">
                                <span class="side-icon">♔</span>
                                <span data-i18n="sideWhite">${I18n.get('sideWhite')}</span>
                            </button>
                            <button class="side-btn ${this.selectedSide === 'random' ? 'side-active' : ''}" data-side="random">
                                <span class="side-icon">🎲</span>
                                <span data-i18n="sideRandom">${I18n.get('sideRandom')}</span>
                            </button>
                            <button class="side-btn ${this.selectedSide === 'b' ? 'side-active' : ''}" data-side="b">
                                <span class="side-icon">♚</span>
                                <span data-i18n="sideBlack">${I18n.get('sideBlack')}</span>
                            </button>
                        </div>
                    </div>

                    <!-- 5. GAME MODE -->
                    <div class="setup-group">
                        <label class="setup-label" data-i18n="modeLabel">${I18n.get('modeLabel')}</label>
                        <div class="mode-grid" id="mode-selector-grid">
                            <button class="mode-card ${this.selectedMode === 'pass' ? 'mode-active' : ''}" data-mode="pass">
                                <div class="mode-icon">👥</div>
                                <div data-i18n="modePassPlay">${I18n.get('modePassPlay')}</div>
                            </button>
                            <button class="mode-card ${this.selectedMode === 'ai' ? 'mode-active' : ''}" data-mode="ai">
                                <div class="mode-icon">🤖</div>
                                <div data-i18n="modeVsAi">${I18n.get('modeVsAi')}</div>
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

                    <!-- LAN ROOM CODE SETUP -->
                    <div class="setup-group lan-box glass-panel" id="group-lan-setup" style="display: ${this.selectedMode === 'lan' ? 'block' : 'none'};">
                        <div class="lan-controls">
                            <button id="btn-lan-host" class="action-btn secondary-btn" data-i18n="lanHostBtn">${I18n.get('lanHostBtn')}</button>
                            <div class="lan-input-group">
                                <input type="text" id="lan-room-input" placeholder="CW-1234" maxlength="8">
                                <button id="btn-lan-join" class="action-btn secondary-btn" data-i18n="lanJoinBtn">${I18n.get('lanJoinBtn')}</button>
                            </div>
                        </div>
                        <div id="lan-status-msg" class="lan-status"></div>
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
        this.bindEvents();
    },

    renderSubmodes() {
        const container = document.getElementById('submode-grid-container');
        if (!container) return;

        const submodes = this.getSubmodesForGame(this.selectedGame);
        container.innerHTML = submodes.map(sm => `
            <button class="submode-card ${this.selectedSubmode === sm.id ? 'submode-active' : ''}" data-submode="${sm.id}">
                <div class="submode-icon">${sm.icon}</div>
                <div class="submode-info">
                    <div class="submode-title" data-i18n="${sm.titleKey}">${I18n.get(sm.titleKey)}</div>
                    <div class="submode-desc" data-i18n="${sm.descKey}">${I18n.get(sm.descKey)}</div>
                </div>
            </button>
        `).join('');

        container.querySelectorAll('[data-submode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedSubmode = btn.dataset.submode;
                container.querySelectorAll('[data-submode]').forEach(b => b.classList.remove('submode-active'));
                btn.classList.add('submode-active');

                const centerBox = document.getElementById('group-center-config');
                if (centerBox) {
                    centerBox.style.display = this.selectedSubmode === 'continental_captura_centro' ? 'flex' : 'none';
                }
            });
        });
    },

    bindEvents() {
        const modal = document.getElementById('match-setup-modal');
        if (!modal) return;

        // Close button
        document.getElementById('btn-close-setup')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // Game Card Selection Clicks
        modal.querySelectorAll('[data-game]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newGame = btn.dataset.game;
                this.selectedGame = newGame;

                // Reset submode if changing game
                if (newGame === 'continental' && !this.selectedSubmode.startsWith('continental_')) {
                    this.selectedSubmode = 'continental_normal';
                } else if (newGame === 'ajedrez' && !this.selectedSubmode.startsWith('ajedrez_')) {
                    this.selectedSubmode = 'ajedrez_normal';
                }

                modal.querySelectorAll('[data-game]').forEach(b => b.classList.remove('game-card-active'));
                btn.classList.add('game-card-active');

                this.renderSubmodes();
            });
        });

        // Time Control Pill Clicks
        modal.querySelectorAll('[data-time]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedTime = btn.dataset.time;
                modal.querySelectorAll('[data-time]').forEach(b => b.classList.remove('pill-active'));
                btn.classList.add('pill-active');

                const customBox = document.getElementById('group-custom-time');
                if (customBox) {
                    customBox.style.display = this.selectedTime === 'custom' ? 'flex' : 'none';
                }
            });
        });

        // Center Turns Dropdown change
        const centerTurnsSelect = document.getElementById('modal-center-turns');
        if (centerTurnsSelect) {
            centerTurnsSelect.addEventListener('change', (e) => {
                const customTurnsBox = document.getElementById('group-custom-center-turns');
                if (customTurnsBox) {
                    customTurnsBox.style.display = e.target.value === 'custom' ? 'flex' : 'none';
                }
            });
        }

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

                // Toggle sub-panels without re-rendering modal
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

        // LAN Host Button
        document.getElementById('btn-lan-host')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const statusEl = document.getElementById('lan-status-msg');
            statusEl.textContent = 'Creando sala LAN...';
            NetworkManager.hostRoom((code) => {
                statusEl.textContent = `${I18n.get('lanWaiting')} (${code})`;
            });
        });

        // LAN Join Button
        document.getElementById('btn-lan-join')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const input = document.getElementById('lan-room-input');
            const code = input ? input.value.trim() : '';
            const statusEl = document.getElementById('lan-status-msg');

            if (!code) {
                statusEl.textContent = 'Ingresa un código de sala válido.';
                return;
            }

            statusEl.textContent = 'Conectando a ' + code + '...';
            NetworkManager.joinRoom(code, (success, err) => {
                if (success) {
                    statusEl.textContent = I18n.get('lanConnected');
                } else {
                    statusEl.textContent = 'Error: ' + (err || 'No se pudo conectar');
                }
            });
        });

        // Start Match Button
        document.getElementById('btn-start-match')?.addEventListener('click', (e) => {
            e.stopPropagation();

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

            // Save for next time (can save 'custom' or the number, maybe save the number so it defaults to it? No, if it was custom, save the number but the dropdown might not match it. Let's just save the parsed number).
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
                    difficulty: this.selectedDifficulty
                });
            }
        });
    }
};
