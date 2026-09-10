/**
 * CONTINENTAL - Vertical Main Menu & View Navigation Controller
 * Manages view switching between Main Menu, Game, Options, Armory, and Rules.
 */

const MenuController = {
    activeView: 'main-menu',

    init() {
        this.bindEvents();
    },

    bindEvents() {
        // Main Menu Buttons
        document.getElementById('btn-menu-jugar')?.addEventListener('click', () => {
            MatchSetupModal.open();
        });

        document.getElementById('btn-menu-opciones')?.addEventListener('click', () => {
            this.switchView('options');
        });

        document.getElementById('btn-menu-armeria')?.addEventListener('click', () => {
            this.switchView('armory');
        });

        document.getElementById('btn-menu-reglas')?.addEventListener('click', () => {
            this.switchView('rules');
        });

        document.getElementById('btn-menu-tutorial')?.addEventListener('click', () => {
            this.switchView('tutorial');
        });

        // "Back to Menu" buttons
        document.querySelectorAll('.btn-back-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView('main-menu');
            });
        });
    },

    switchView(viewName) {
        this.activeView = viewName;

        // Hide all app views
        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.add('active');
            this.loadViewContent(viewName);
        }
    },

    loadViewContent(viewName) {
        if (viewName === 'rules') {
            const container = document.getElementById('rules-content-target');
            if (container) RulesTab.render(container);
        } else if (viewName === 'options') {
            const container = document.getElementById('options-content-target');
            if (container) OptionsTab.render(container);
        } else if (viewName === 'armory') {
            const container = document.getElementById('armory-content-target');
            if (container) ArmoryTab.render(container);
        } else if (viewName === 'tutorial') {
            const container = document.getElementById('tutorial-content-target');
            if (container) TutorialTab.render(container);
        }
    }
};

window.showView = (viewName) => MenuController.switchView(viewName);
