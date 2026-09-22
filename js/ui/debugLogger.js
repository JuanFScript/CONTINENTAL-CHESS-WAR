/**
 * CONTINENTAL - Debug Logger & In-Game Floating Console
 * Provides a lightweight overlay to log network packets, move events,
 * and errors in real-time. Zero CPU/RAM overhead when disabled.
 */

const DebugLogger = {
    enabled: false,
    logs: [],
    maxLogs: 100,
    panelEl: null,
    isMinimized: false,

    init() {
        this.enabled = localStorage.getItem('continental_debug_mode') === 'true';
        if (this.enabled) {
            this.createOverlay();
        }
    },

    setEnabled(state) {
        this.enabled = !!state;
        localStorage.setItem('continental_debug_mode', this.enabled ? 'true' : 'false');
        if (this.enabled) {
            this.createOverlay();
            this.log('SYS', 'Modo Debug activado.');
        } else {
            this.removeOverlay();
            this.logs = [];
        }
    },

    log(tag, message, level = 'info') {
        if (!this.enabled) return;

        const timeStr = new Date().toLocaleTimeString('es-ES', { hour12: false });
        const entry = { timeStr, tag, message, level };
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        console.log(`[${tag}] ${message}`);
        this.appendLogToDom(entry);
    },

    createOverlay() {
        if (this.panelEl || !this.enabled) return;

        const panel = document.createElement('div');
        panel.id = 'debug-console-panel';
        panel.style.position = 'fixed';
        panel.style.bottom = '10px';
        panel.style.right = '10px';
        panel.style.zIndex = '999999';
        panel.style.width = '340px';
        panel.style.maxWidth = '92vw';
        panel.style.background = 'rgba(10, 15, 25, 0.92)';
        panel.style.backdropFilter = 'blur(8px)';
        panel.style.webkitBackdropFilter = 'blur(8px)';
        panel.style.border = '1.5px solid rgba(52, 211, 153, 0.5)';
        panel.style.borderRadius = '10px';
        panel.style.boxShadow = '0 8px 30px rgba(0,0,0,0.8)';
        panel.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
        panel.style.fontSize = '0.75rem';
        panel.style.color = '#e2e8f0';
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.overflow = 'hidden';

        panel.innerHTML = `
            <div id="debug-panel-header" style="display: flex; justify-content: space-between; align-items: center; background: rgba(16, 185, 129, 0.2); padding: 6px 10px; cursor: move; border-bottom: 1px solid rgba(255,255,255,0.1); user-select: none;">
                <span style="font-weight: bold; color: #a7f3d0; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;">
                    🐞 Debug Console
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button id="btn-debug-copy" title="Copiar historial" style="background: rgba(255,255,255,0.15); border: none; color: #fff; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.7rem;">📋 Copiar</button>
                    <button id="btn-debug-clear" title="Limpiar" style="background: rgba(255,255,255,0.15); border: none; color: #fff; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.7rem;">🗑️</button>
                    <button id="btn-debug-min" title="Minimizar" style="background: rgba(255,255,255,0.15); border: none; color: #fff; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.7rem;">➖</button>
                </div>
            </div>
            <div id="debug-panel-body" style="padding: 8px; max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; scroll-behavior: smooth;">
            </div>
        `;

        document.body.appendChild(panel);
        this.panelEl = panel;

        // Render current history
        const body = panel.querySelector('#debug-panel-body');
        this.logs.forEach(entry => {
            body.appendChild(this.createLogNode(entry));
        });
        body.scrollTop = body.scrollHeight;

        // Buttons handlers
        panel.querySelector('#btn-debug-copy')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyLogsToClipboard();
        });

        panel.querySelector('#btn-debug-clear')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.logs = [];
            if (body) body.innerHTML = '';
        });

        panel.querySelector('#btn-debug-min')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMinimize();
        });
    },

    removeOverlay() {
        if (this.panelEl) {
            this.panelEl.remove();
            this.panelEl = null;
        }
    },

    toggleMinimize() {
        if (!this.panelEl) return;
        const body = this.panelEl.querySelector('#debug-panel-body');
        const btnMin = this.panelEl.querySelector('#btn-debug-min');
        if (this.isMinimized) {
            if (body) body.style.display = 'flex';
            if (btnMin) btnMin.textContent = '➖';
            this.isMinimized = false;
        } else {
            if (body) body.style.display = 'none';
            if (btnMin) btnMin.textContent = '➕';
            this.isMinimized = true;
        }
    },

    createLogNode(entry) {
        const div = document.createElement('div');
        div.style.lineHeight = '1.3';
        div.style.wordBreak = 'break-all';

        let tagColor = '#60a5fa'; // default blue
        if (entry.tag === 'RED') tagColor = '#38bdf8';
        else if (entry.tag === 'JUEGO') tagColor = '#4ade80';
        else if (entry.tag === 'ERROR') tagColor = '#f87171';
        else if (entry.tag === 'SYNC') tagColor = '#facc15';

        div.innerHTML = `<span style="color: #64748b;">[${entry.timeStr}]</span> <strong style="color: ${tagColor};">[${entry.tag}]</strong> ${this.escapeHtml(entry.message)}`;
        return div;
    },

    appendLogToDom(entry) {
        if (!this.panelEl) return;
        const body = this.panelEl.querySelector('#debug-panel-body');
        if (body) {
            body.appendChild(this.createLogNode(entry));
            body.scrollTop = body.scrollHeight;
        }
    },

    copyLogsToClipboard() {
        if (this.logs.length === 0) return;
        const text = this.logs.map(l => `[${l.timeStr}] [${l.tag}] ${l.message}`).join('\n');
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('📋 Logs copiados al portapapeles');
        }).catch(() => {
            this.showToast('⚠️ No se pudo copiar automáticamente');
        });
    },

    showToast(msg) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '200px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999999';
        toast.style.background = '#10b981';
        toast.style.color = '#fff';
        toast.style.padding = '6px 14px';
        toast.style.borderRadius = '20px';
        toast.style.fontWeight = 'bold';
        toast.style.fontSize = '0.8rem';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    },

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
};

// Initialize on DOM Ready
if (typeof window !== 'undefined') {
    window.DebugLogger = DebugLogger;
    document.addEventListener('DOMContentLoaded', () => DebugLogger.init());
}
