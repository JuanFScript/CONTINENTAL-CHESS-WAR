/**
 * CONTINENTAL - Application Initialization & Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme
    const savedTheme = localStorage.getItem('continental_theme') || 'war';
    document.body.className = `theme-${savedTheme}`;

    // 2. Initial Language Selection Modal check
    const hasChosenLang = localStorage.getItem('continental_lang');
    if (!hasChosenLang) {
        showInitialLangModal();
    } else {
        I18n.updateDOM();
    }

    // 3. Initialize Containers & Controllers
    const modalContainer = document.getElementById('modal-container');
    const boardContainer = document.getElementById('game-board-container');
    const hudContainer = document.getElementById('game-hud-container');

    const gameController = new GameController(boardContainer, hudContainer);

    MatchSetupModal.init(modalContainer, (matchConfig) => {
        MenuController.switchView('game');
        gameController.startMatch(matchConfig);
    });

    // 4. Initialize Menu Navigation
    MenuController.init();

    window.onLanguageChanged = () => {
        const titleEl = document.getElementById('app-main-title');
        const subTitleEl = document.getElementById('app-main-subtitle');
        if (titleEl) titleEl.textContent = I18n.get('appTitle');
        if (subTitleEl) subTitleEl.textContent = I18n.get('appSubtitle');
    };
});

function showInitialLangModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay modal-active';
    modal.innerHTML = `
        <div class="modal-card glass-panel text-center animate-bounce">
            <div class="lang-globe-icon">🌐</div>
            <h2 data-i18n="selectLangTitle">${I18n.get('selectLangTitle')}</h2>
            <p data-i18n="selectLangSub">${I18n.get('selectLangSub')}</p>
            
            <div class="lang-option-grid">
                <button class="lang-btn primary-btn" data-lang="es">
                    <span class="flag-icon">🇦🇷 / 🇪🇸</span>
                    <strong data-i18n="langSpanish">${I18n.get('langSpanish')}</strong>
                </button>
                <button class="lang-btn secondary-btn" data-lang="en">
                    <span class="flag-icon">🇺🇸 / 🇬🇧</span>
                    <strong data-i18n="langEnglish">${I18n.get('langEnglish')}</strong>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll('[data-lang]').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            I18n.setLanguage(lang);
            document.body.removeChild(modal);
        });
    });
}
