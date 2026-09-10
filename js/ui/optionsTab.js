/**
 * CONTINENTAL - Options & Settings Tab Component
 */

const OptionsTab = {
    render(container) {
        const lang = I18n.currentLang;
        const currentTheme = localStorage.getItem('continental_theme') || 'classic';
        const currentPieceStyle = localStorage.getItem('continental_piece_style') || 'default';
        const currentCenterTurns = localStorage.getItem('continental_center_turns') || '3';
        const currentCenterConsecutive = localStorage.getItem('continental_center_consecutive') !== 'false';

        const html = `
            <div class="options-container animate-fade-in">
                <header class="tab-header text-center">
                    <h1 class="tab-title" data-i18n="optionsTitle">${I18n.get('optionsTitle')}</h1>
                </header>

                <div class="options-card glass-panel">
                    <!-- LANGUAGE PRESET SELECTOR -->
                    <div class="setting-row">
                        <div class="setting-label">
                            <strong data-i18n="langSettingLabel">${I18n.get('langSettingLabel')}</strong>
                            <span class="setting-sub">Español / English</span>
                        </div>
                        <div class="setting-control">
                            <select id="opt-language-select" class="custom-select">
                                <option value="es" ${lang === 'es' ? 'selected' : ''} data-i18n="langSpanish">${I18n.get('langSpanish')}</option>
                                <option value="en" ${lang === 'en' ? 'selected' : ''} data-i18n="langEnglish">${I18n.get('langEnglish')}</option>
                            </select>
                        </div>
                    </div>

                    <!-- AUDIO FX TOGGLE -->
                    <div class="setting-row">
                        <div class="setting-label">
                            <strong data-i18n="soundFxLabel">${I18n.get('soundFxLabel')}</strong>
                            <span class="setting-sub">Efectos de sonido en movimientos y capturas</span>
                        </div>
                        <div class="setting-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="opt-sound-toggle" ${AudioManager.enabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- VIBRATION TOGGLE -->
                    <div class="setting-row">
                        <div class="setting-label">
                            <strong data-i18n="vibrationLabel">${I18n.get('vibrationLabel')}</strong>
                            <span class="setting-sub">Respuesta táctil al tocar piezas en móviles</span>
                        </div>
                        <div class="setting-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="opt-vibrate-toggle" ${AudioManager.hapticsEnabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- CAPTURA DEL CENTRO: TURNOS -->
                    <div class="setting-row">
                        <div class="setting-label">
                            <strong>Captura del Centro: Turnos</strong>
                            <span class="setting-sub">Cantidad de turnos para ganar el centro</span>
                        </div>
                        <div class="setting-control">
                            <select id="opt-center-turns-select" class="custom-select">
                                <option value="3" ${currentCenterTurns === '3' ? 'selected' : ''}>3 Turnos</option>
                                <option value="5" ${currentCenterTurns === '5' ? 'selected' : ''}>5 Turnos</option>
                                <option value="7" ${currentCenterTurns === '7' ? 'selected' : ''}>7 Turnos</option>
                                <option value="9" ${currentCenterTurns === '9' ? 'selected' : ''}>9 Turnos</option>
                            </select>
                        </div>
                    </div>

                    <!-- CAPTURA DEL CENTRO: MODO -->
                    <div class="setting-row">
                        <div class="setting-label">
                            <strong>Captura del Centro: Modo</strong>
                            <span class="setting-sub">Turnos seguidos (consecutivos) vs acumulados</span>
                        </div>
                        <div class="setting-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="opt-center-consecutive-toggle" ${currentCenterConsecutive ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- PIECE STYLES SELECTOR -->
                    <div class="setting-row">
                        <div class="setting-label">
                            <strong>Estilo de las Piezas</strong>
                            <span class="setting-sub">Elige el aspecto visual de las piezas</span>
                        </div>
                        <div class="setting-control">
                            <select id="opt-piece-style-select" class="custom-select">
                                <option value="default" ${currentPieceStyle === 'default' ? 'selected' : ''}>Default (Oficial)</option>
                            </select>
                        </div>
                    </div>

                    <!-- BOARD THEMES -->
                    <div class="setting-row">
                        <div class="setting-label">
                            <strong data-i18n="boardThemeLabel">${I18n.get('boardThemeLabel')}</strong>
                            <span class="setting-sub">Personaliza el diseño del tablero</span>
                        </div>
                        <div class="setting-control">
                            <select id="opt-theme-select" class="custom-select">
                                <option value="classic" ${currentTheme === 'classic' ? 'selected' : ''} data-i18n="themeClassic">${I18n.get('themeClassic')}</option>
                                <option value="neon" ${currentTheme === 'neon' ? 'selected' : ''} data-i18n="themeNeon">${I18n.get('themeNeon')}</option>
                                <option value="war" ${currentTheme === 'war' ? 'selected' : ''} data-i18n="themeWar">${I18n.get('themeWar')}</option>
                                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''} data-i18n="themeDark">${I18n.get('themeDark')}</option>
                            </select>
                        </div>
                    </div>

                    <div id="opt-status-notice" class="status-notice"></div>

                    <!-- SAVE BUTTON -->
                    <button id="btn-save-options" class="action-btn primary-btn large-btn margin-top-md" data-i18n="saveSettingsBtn">
                        ${I18n.get('saveSettingsBtn')}
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.bindEvents(container);
    },

    bindEvents(container) {
        document.getElementById('opt-language-select')?.addEventListener('change', (e) => {
            const newLang = e.target.value;
            I18n.setLanguage(newLang);
        });

        document.getElementById('opt-theme-select')?.addEventListener('change', (e) => {
            const theme = e.target.value;
            localStorage.setItem('continental_theme', theme);
            document.body.className = `theme-${theme}`;
        });

        document.getElementById('opt-piece-style-select')?.addEventListener('change', (e) => {
            const pStyle = e.target.value;
            localStorage.setItem('continental_piece_style', pStyle);
        });

        document.getElementById('btn-save-options')?.addEventListener('click', () => {
            const langSelect = document.getElementById('opt-language-select');
            const soundToggle = document.getElementById('opt-sound-toggle');
            const vibrateToggle = document.getElementById('opt-vibrate-toggle');
            const themeSelect = document.getElementById('opt-theme-select');
            const pieceStyleSelect = document.getElementById('opt-piece-style-select');
            const centerTurnsSelect = document.getElementById('opt-center-turns-select');
            const centerConsecutiveToggle = document.getElementById('opt-center-consecutive-toggle');

            if (langSelect) I18n.setLanguage(langSelect.value);
            if (soundToggle) {
                AudioManager.enabled = soundToggle.checked;
                localStorage.setItem('continental_sound', soundToggle.checked);
            }
            if (vibrateToggle) {
                AudioManager.hapticsEnabled = vibrateToggle.checked;
                localStorage.setItem('continental_vibrate', vibrateToggle.checked);
            }
            if (themeSelect) {
                const theme = themeSelect.value;
                localStorage.setItem('continental_theme', theme);
                document.body.className = `theme-${theme}`;
            }
            if (pieceStyleSelect) {
                const pStyle = pieceStyleSelect.value;
                localStorage.setItem('continental_piece_style', pStyle);
            }
            if (centerTurnsSelect) {
                localStorage.setItem('continental_center_turns', centerTurnsSelect.value);
            }
            if (centerConsecutiveToggle) {
                localStorage.setItem('continental_center_consecutive', centerConsecutiveToggle.checked);
            }

            const notice = document.getElementById('opt-status-notice');
            if (notice) {
                notice.textContent = I18n.get('savedNotice');
                setTimeout(() => { notice.textContent = ''; }, 3000);
            }
        });
    }
};
