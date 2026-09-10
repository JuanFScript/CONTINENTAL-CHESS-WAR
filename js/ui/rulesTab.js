/**
 * CONTINENTAL - Rules Tab UI Component
 */

const RulesTab = {
    render(container) {
        const html = `
            <div class="rules-container animate-fade-in">
                <header class="tab-header text-center">
                    <h1 class="tab-title" data-i18n="rulesTitle">${I18n.get('rulesTitle')}</h1>
                </header>

                <div class="rules-card glass-panel" data-i18n="rulesContent">
                    ${I18n.get('rulesContent')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }
};
