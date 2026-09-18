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
        const currentAutoRotateBlack = localStorage.getItem('continental_auto_rotate_black') !== 'false';
        const currentTestMode = localStorage.getItem('continental_test_mode') === 'true';

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

                    <!-- PIECE STYLES SELECTOR (WHITE & BLACK INDEPENDENT) -->
                    <div class="setting-row" style="flex-direction: column; align-items: stretch; gap: 10px;">
                        <div class="setting-label">
                            <strong>Estilos de Piezas (Blancas y Negras)</strong>
                            <span class="setting-sub">Personaliza el aspecto de cada jugador por separado (ej: Piratas vs Ninjas)</span>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 140px;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Jugador Blanco ♔</span>
                                <div id="btn-open-piece-modal-w" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--panel-border); margin-top: 4px;">
                                    <div id="current-piece-style-display-w" style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.85rem;">
                                        Cargando...
                                    </div>
                                    <span style="font-size: 0.75rem; opacity: 0.7;">▼</span>
                                </div>
                            </div>
                            <div style="flex: 1; min-width: 140px;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Jugador Negro ♚</span>
                                <div id="btn-open-piece-modal-b" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--panel-border); margin-top: 4px;">
                                    <div id="current-piece-style-display-b" style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.85rem;">
                                        Cargando...
                                    </div>
                                    <span style="font-size: 0.75rem; opacity: 0.7;">▼</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- HIDDEN PIECE STYLE MODAL -->
                    <div id="piece-style-modal" class="modal-overlay" style="z-index: 2000;">
                        <div class="modal-card glass-panel" style="max-height: 85vh; display: flex; flex-direction: column;">
                            <button type="button" id="close-piece-modal" class="modal-close-btn">&times;</button>
                            <h3 id="piece-modal-title" class="modal-title" style="margin-bottom: 16px;">Elegir Estilo de Piezas</h3>
                            <div id="piece-style-list" style="overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 4px;">
                                <!-- Filled by JS -->
                            </div>
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
                                <option value="war" ${currentTheme === 'war' ? 'selected' : ''} data-i18n="themeWar">${I18n.get('themeWar')}</option>
                                <option value="classic" ${currentTheme === 'classic' ? 'selected' : ''} data-i18n="themeClassic">${I18n.get('themeClassic')}</option>
                                <option value="neon" ${currentTheme === 'neon' ? 'selected' : ''} data-i18n="themeNeon">${I18n.get('themeNeon')}</option>
                                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''} data-i18n="themeDark">${I18n.get('themeDark')}</option>
                                <option value="crystal" ${currentTheme === 'crystal' ? 'selected' : ''}>Cuarzo & Amatista</option>
                            </select>
                        </div>
                    </div>

                    <!-- MODO DE PRUEBA -->
                    <div class="setting-row">
                        <div class="setting-label">
                            <strong style="color: #f59e0b;">🧪 Modo de prueba</strong>
                            <span class="setting-sub" style="color: #9ca3af; font-size: 0.8rem; line-height: 1.3; display: block; margin-top: 3px;">
                                Al activar esta opcion, ciertas reglas y piezas cambiaran a versiones de prueba, que pueden o no llegar a formar parte del juego final. Lo mas probable es estas . Usar bajo tu propio riesgo.
                            </span>
                        </div>
                        <div class="setting-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="opt-test-mode-toggle" ${currentTestMode ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
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
            if (typeof GraphicsEngine !== 'undefined') {
                GraphicsEngine.applyTheme(theme);
            } else {
                localStorage.setItem('continental_theme', theme);
                document.body.className = `theme-${theme}`;
            }
        });

        // CUSTOM PIECE STYLE SELECTOR LOGIC (DUAL W/B)
        const btnOpenModalW = document.getElementById('btn-open-piece-modal-w');
        const btnOpenModalB = document.getElementById('btn-open-piece-modal-b');
        const pieceModal = document.getElementById('piece-style-modal');
        const pieceModalTitle = document.getElementById('piece-modal-title');
        const closePieceModalBtn = document.getElementById('close-piece-modal');
        const pieceStyleList = document.getElementById('piece-style-list');
        const currentDisplayW = document.getElementById('current-piece-style-display-w');
        const currentDisplayB = document.getElementById('current-piece-style-display-b');

        let activeSelectingTarget = 'w'; // 'w' or 'b'
        
        const pieceStyles = (typeof PieceSetRegistry !== 'undefined')
            ? PieceSetRegistry.getStructuredPieceStyles()
            : [
                { id: 'default', label: 'Default (Oficial)', group: null }
            ];

        let currentStyleW = localStorage.getItem('continental_piece_style_white') || localStorage.getItem('continental_piece_style') || 'default';
        let currentStyleB = localStorage.getItem('continental_piece_style_black') || localStorage.getItem('continental_piece_style') || 'default';

        function getStyleDef(id) {
            let found = pieceStyles.find(s => s.id === id);
            if (!found) {
                const formattedLabel = (typeof PieceSetRegistry !== 'undefined')
                    ? PieceSetRegistry.formatUncategorizedLabel(id)
                    : id;
                found = { id: id, label: formattedLabel };
            }
            return found;
        }

        function updateDisplayW(id) {
            if (!currentDisplayW) return;
            const styleDef = getStyleDef(id);
            let wkUrl = (typeof GraphicsEngine !== 'undefined') ? GraphicsEngine.getPieceTexture('k', 'w', id).src : `Imagenes de las piezas/${id}/rey_blanco.png`;
            if (id === 'default') wkUrl = 'Imagenes de las piezas/default/rey_blanco.svg';
            
            currentDisplayW.innerHTML = `
                <img src="${wkUrl}" style="width: 22px; height: 22px; object-fit: contain;" onerror="this.src='Imagenes de las piezas/default/rey_blanco.svg'">
                <span>${styleDef.label}</span>
            `;
            if (btnOpenModalW) btnOpenModalW.dataset.value = id;
        }

        function updateDisplayB(id) {
            if (!currentDisplayB) return;
            const styleDef = getStyleDef(id);
            let bkUrl = (typeof GraphicsEngine !== 'undefined') ? GraphicsEngine.getPieceTexture('k', 'b', id).src : `Imagenes de las piezas/${id}/rey_negro.png`;
            if (id === 'default') bkUrl = 'Imagenes de las piezas/default/rey_negro.svg';
            
            currentDisplayB.innerHTML = `
                <img src="${bkUrl}" style="width: 22px; height: 22px; object-fit: contain;" onerror="this.src='Imagenes de las piezas/default/rey_negro.svg'">
                <span>${styleDef.label}</span>
            `;
            if (btnOpenModalB) btnOpenModalB.dataset.value = id;
        }

        updateDisplayW(currentStyleW);
        updateDisplayB(currentStyleB);

        function renderModalList(targetColor) {
            if (!pieceStyleList) return;
            const activeStyle = (targetColor === 'w') ? (btnOpenModalW?.dataset.value || currentStyleW) : (btnOpenModalB?.dataset.value || currentStyleB);
            
            let listHtml = '';
            pieceStyles.forEach(style => {
                if (style.isGroup) {
                    listHtml += `<div style="margin-top: 10px; padding: 0 4px 4px 4px; font-weight: bold; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.1);">${style.label}</div>`;
                } else {
                    let wkUrl = (typeof GraphicsEngine !== 'undefined') ? GraphicsEngine.getPieceTexture('k', 'w', style.id).src : `Imagenes de las piezas/${style.id}/rey_blanco.png`;
                    let bkUrl = (typeof GraphicsEngine !== 'undefined') ? GraphicsEngine.getPieceTexture('k', 'b', style.id).src : `Imagenes de las piezas/${style.id}/rey_negro.png`;
                    if (style.id === 'default') {
                        wkUrl = 'Imagenes de las piezas/default/rey_blanco.svg';
                        bkUrl = 'Imagenes de las piezas/default/rey_negro.svg';
                    }
                    
                    const isSelected = style.id === activeStyle;
                    listHtml += `
                        <div class="ps-option-card ${isSelected ? 'active' : ''}" data-value="${style.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: ${isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                            <span style="font-weight: 600; font-size: 0.95rem; color: ${isSelected ? '#fff' : 'var(--text-secondary)'}">${style.label}</span>
                            <div style="display: flex; gap: 6px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                                <img src="${wkUrl}" style="width: 34px; height: 34px; object-fit: contain;" onerror="this.src='Imagenes de las piezas/default/rey_blanco.svg'">
                                <img src="${bkUrl}" style="width: 34px; height: 34px; object-fit: contain;" onerror="this.src='Imagenes de las piezas/default/rey_negro.svg'">
                            </div>
                        </div>
                    `;
                }
            });
            pieceStyleList.innerHTML = listHtml;

            pieceStyleList.querySelectorAll('.ps-option-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const newStyle = e.currentTarget.dataset.value;
                    
                    if (activeSelectingTarget === 'w') {
                        updateDisplayW(newStyle);
                        if (typeof GraphicsEngine !== 'undefined') GraphicsEngine.setPieceStyle(newStyle, 'w');
                    } else {
                        updateDisplayB(newStyle);
                        if (typeof GraphicsEngine !== 'undefined') GraphicsEngine.setPieceStyle(newStyle, 'b');
                    }

                    pieceModal.classList.remove('modal-active');
                });
            });
        }

        if (btnOpenModalW && pieceModal) {
            btnOpenModalW.addEventListener('click', () => {
                activeSelectingTarget = 'w';
                if (pieceModalTitle) pieceModalTitle.textContent = "Estilo de Piezas (Blancas ♔)";
                renderModalList('w');
                pieceModal.classList.add('modal-active');
            });
        }

        if (btnOpenModalB && pieceModal) {
            btnOpenModalB.addEventListener('click', () => {
                activeSelectingTarget = 'b';
                if (pieceModalTitle) pieceModalTitle.textContent = "Estilo de Piezas (Negras ♚)";
                renderModalList('b');
                pieceModal.classList.add('modal-active');
            });
        }
        
        if (closePieceModalBtn && pieceModal) {
            closePieceModalBtn.addEventListener('click', () => {
                pieceModal.classList.remove('modal-active');
            });
        }
        
        if (pieceModal) {
            pieceModal.addEventListener('click', (e) => {
                if (e.target === pieceModal) {
                    pieceModal.classList.remove('modal-active');
                }
            });
        }

        document.getElementById('btn-save-options')?.addEventListener('click', () => {
            const langSelect = document.getElementById('opt-language-select');
            const soundToggle = document.getElementById('opt-sound-toggle');
            const vibrateToggle = document.getElementById('opt-vibrate-toggle');
            const themeSelect = document.getElementById('opt-theme-select');
            const centerTurnsSelect = document.getElementById('opt-center-turns-select');
            const centerConsecutiveToggle = document.getElementById('opt-center-consecutive-toggle');
            const testModeToggle = document.getElementById('opt-test-mode-toggle');

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
                if (typeof GraphicsEngine !== 'undefined') {
                    GraphicsEngine.applyTheme(theme);
                } else {
                    localStorage.setItem('continental_theme', theme);
                    document.body.className = `theme-${theme}`;
                }
            }
            
            const saveBtnModal = document.getElementById('btn-open-piece-modal');
            if (saveBtnModal && saveBtnModal.dataset.value) {
                const pStyle = saveBtnModal.dataset.value;
                if (typeof GraphicsEngine !== 'undefined') {
                    GraphicsEngine.setPieceStyle(pStyle);
                } else {
                    localStorage.setItem('continental_piece_style', pStyle);
                }
            }

            if (centerTurnsSelect) {
                localStorage.setItem('continental_center_turns', centerTurnsSelect.value);
            }
            if (centerConsecutiveToggle) {
                localStorage.setItem('continental_center_consecutive', centerConsecutiveToggle.checked);
            }
            const autoRotateToggle = document.getElementById('opt-auto-rotate-black-toggle');
            if (autoRotateToggle) {
                localStorage.setItem('continental_auto_rotate_black', autoRotateToggle.checked);
            }
            if (testModeToggle) {
                const isTestMode = testModeToggle.checked;
                localStorage.setItem('continental_test_mode', isTestMode);
                window.CONTINENTAL_TEST_MODE = isTestMode;
                window.dispatchEvent(new CustomEvent('continental:testModeChanged', { detail: { enabled: isTestMode } }));
            }

            const notice = document.getElementById('opt-status-notice');
            if (notice) {
                notice.textContent = I18n.get('savedNotice');
                setTimeout(() => { notice.textContent = ''; }, 3000);
            }
        });
    }
};

if (typeof window !== 'undefined') {
    window.CONTINENTAL_TEST_MODE = (localStorage.getItem('continental_test_mode') === 'true');
}


