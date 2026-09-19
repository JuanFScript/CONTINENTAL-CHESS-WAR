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
            if (typeof TutorialTab !== 'undefined') TutorialTab.reset();
            this.switchView('tutorial');
        });

        document.getElementById('btn-changelog')?.addEventListener('click', () => {
            this.openChangelogModal();
        });

        // "Back to Menu" buttons
        document.querySelectorAll('.btn-back-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof TutorialTab !== 'undefined') TutorialTab.reset();
                this.switchView('main-menu');
            });
        });
    },

    openChangelogModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-active';
        modal.innerHTML = `
            <div class="modal-card glass-panel" style="position: relative; max-width: 550px; max-height: 85vh; overflow-y: auto; text-align: left; padding: 25px;">
                <button class="btn-close-changelog" style="position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.1em; display: flex; align-items: center; justify-content: center; z-index: 10; transition: background 0.2s;">✖</button>
                <h2 style="color: #ffd700; margin-top: 0; margin-bottom: 20px; font-size: 1.5em; text-align: center; position: sticky; top: -25px; background: rgba(13,42,32,0.95); padding: 15px 0 10px 0; z-index: 5;">📜 Historial de Actualizaciones</h2>
                
                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 85</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Modo LAN Funcional:</strong> Se implementó un lobby completo para red local. Permite unirse con nombre personalizado, crear salas con nombres generados, ver jugadores en espera, y gestionar solicitudes de entrada mediante cupos.</li>
                    <li style="margin-bottom: 8px;"><strong>Unión por Código o Solicitud:</strong> Ingresa por código directo o presiona "Pedir unirse" para que el anfitrión de la sala te acepte antes de iniciar la partida.</li>
                    <li style="margin-bottom: 8px;"><strong>Corrección de Refuerzos en Gran Ejército:</strong> Solucionado el bug que bloqueaba el tablero al jugar con Negras contra el bot al momento de colocar tropas.</li>
                    <li style="margin-bottom: 8px;"><strong>Orientación contra Bots:</strong> Si juegas contra la IA y te tocan las Negras, el tablero ahora aparecerá orientado correctamente desde la perspectiva de las Negras.</li>
                </ul>

                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 84</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Mejoras en el Menú Jugar:</strong> Se movió la opción del Modo Amistoso (Sandbox) al menú Jugar antes de iniciar partida. El tiempo personalizado ahora se guarda automáticamente para la siguiente partida.</li>
                    <li style="margin-bottom: 8px;"><strong>Nueva Interfaz de Menú de Opciones:</strong> Controles alineados a la derecha y con mejor espaciado para mejor usabilidad en móvil.</li>
                    <li style="margin-bottom: 8px;"><strong>Carga de Texturas Priorizada:</strong> Ahora incluye pantalla de carga inicial optimizada para evitar lag de assets. Las texturas no seleccionadas cargan en segundo plano sin ralentizar.</li>
                    <li style="margin-bottom: 8px;"><strong>Nuevo Set Medieval Realista Completo:</strong> Diseños de personas hiperrealistas generados por IA para todas las piezas.</li>
                    <li style="margin-bottom: 8px;"><strong>Limpieza de Sets:</strong> Se eliminaron todos los sets sin piezas implementadas. Solo quedan Default (Oficial) y Medieval Realista.</li>
                    <li style="margin-bottom: 8px;"><strong>Rotación Táctica de Piezas:</strong> El tablero y las coordenadas permanecen fijos. Únicamente las texturas de las piezas rotan 180° en el turno de las Negras.</li>
                    <li style="margin-bottom: 8px;"><strong>Ajuste de Cañón y Escudero:</strong> Arreglado el disparo/avance del Cañón, su sincronización visual de colores (Gris, Amarillo, Rojo), y restringido el contraataque a distancia del Escudero al Modo de Prueba.</li>
                </ul>

                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 83</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Sets de Texturas por Carpetas:</strong> Organización de piezas temáticas en carpetas dedicadas.</li>
                    <li style="margin-bottom: 8px;"><strong>Precarga en Caché:</strong> Eliminación de lag al cargar texturas en el tablero y en la Armería.</li>
                </ul>

                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 80</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Puntaje de Promoción Continental:</strong> Si un peón corona a una unidad Élite pasa a valer 2 puntos; si corona a Comandante (incluyendo Reyes coronados), pasa a valer 3 puntos para el conteo de victoria militar.</li>
                    <li style="margin-bottom: 8px;"><strong>Interacciones Gigante vs Escudero y Defensor:</strong> Si un Gigante arroja y aplasta piezas, los Escuderos enemigos adyacentes pueden retribuirlo y atacarlo al siguiente turno. Además, un Gigante no puede usar su habilidad de arrojar si está encarado directamente por el escudo de un Defensor enemigo adyacente.</li>
                    <li style="margin-bottom: 8px;"><strong>Coordenadas en Pasar y Girar:</strong> Se sincronizaron las coordenadas mostradas en la lista de rotación con las etiquetas oficiales del tablero (g1-a7).</li>
                    <li style="margin-bottom: 8px;"><strong>Modo de Prueba (🧪 Experimental):</strong> Nueva opción desactivada por defecto para probar mecánicas en desarrollo sin afectar el rendimiento oficial del juego (incluye Arquero octogonal con movimiento de cañón y disparo a 3 casillas de frente).</li>
                </ul>

                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 79</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Historial de Actualizaciones (📜):</strong> Se agregó el botón con pergamino y la ventana de Changelog al menú principal.</li>
                    <li style="margin-bottom: 8px;"><strong>Tutorial Continental:</strong> Se corrigió un error interno al iniciar el tutorial, se ajustó el equipo Blanco en el Paso 3 (ahora ambos inician con 1 Peón, 1 Élite y 1 Comandante), y se añadió el botón de "Volver al Menú" durante la selección de tropas.</li>
                </ul>

                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 78</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Arreglo en Botones de Tutorial:</strong> Se corrigió la interacción táctil y los clics en las tarjetas del selector de tutoriales, asegurando respuesta inmediata al tocar cualquier parte de la tarjeta o del botón.</li>
                    <li style="margin-bottom: 8px;"><strong>Limpieza de Navegación:</strong> Se mejoró el reseteo de estado y eliminación de popups al cambiar de tutorial o regresar al menú principal.</li>
                </ul>

                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 77</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Tutoriales Mejorados:</strong> Práctica interactiva con Bot en selección y negociación, contador de puntos en vivo, tablero completo en paso 1, simulación de rayo de cañón y turno libre para probar habilidades.</li>
                    <li style="margin-bottom: 8px;"><strong>Captura el Centro:</strong> Ahora SOLO se puede ganar dominando el centro (condición de puntos deshabilitada). El Rey otorga 4 puntos de refuerzo al inicio.</li>
                </ul>

                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 76</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Defensor (🔰):</strong> Ahora puede capturar piezas enemigas hacia atrás y a sus costados (5 casillas), pero ya no puede atacar en las 3 direcciones frontales que protege su escudo.</li>
                    <li style="margin-bottom: 8px;"><strong>Escudero (🛡️):</strong> Se arregló su habilidad de Retribución para que solo ataque hacia el frente y a los costados.</li>
                    <li style="margin-bottom: 8px;"><strong>Pasar Turno:</strong> Ya no es necesario tener piezas octogonales para pasar el turno libremente usando el botón correspondiente.</li>
                </ul>

                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 74</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>UI de Menús:</strong> Se agregó el tiempo restante, medallas de turno (Blancas/Negras) y un botón de "Ver Tablero" (👁️) a los menús de selección, reclutamiento y negociación.</li>
                    <li style="margin-bottom: 8px;"><strong>Negociación de Tablas:</strong> Ahora el rival puede rechazar la petición explícitamente antes de pasar a la fase de pujas por refuerzos.</li>
                </ul>

                <h3 style="color: #60a5fa; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 73</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Gigante:</strong> Se completó la mecánica de "Intercambio" con aliados (Swap) e información en la armería.</li>
                    <li style="margin-bottom: 8px;"><strong>Defensor:</strong> Ya no puede capturar hacia atrás ni en diagonal hacia atrás. Ahora sobrevive al Rayo del Cañón frontal a corta distancia (el rayo lo traspasa sin detenerse).</li>
                    <li style="margin-bottom: 8px;"><strong>Elefante:</strong> Movimiento corregido. Ahora el bloqueo se calcula en diagonal (como en el Xiangqi) permitiendo un movimiento más preciso.</li>
                </ul>

                <h3 style="color: #9ca3af; margin-bottom: 10px; font-size: 1.2em; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Versión 72</h3>
                <ul style="color: #ddd; font-size: 0.95em; line-height: 1.5; padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Gran Ejército:</strong> Se solucionó un bug en la acumulación de puntos en el banco y se mejoró el flujo de colocación de unidades obligando a ponerlas manualmente en el tablero.</li>
                </ul>

                <div style="text-align: center; margin-top: 25px;">
                    <button class="action-btn primary-btn" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
                </div>
            </div>
        `;
        document.getElementById('modal-container').appendChild(modal);

        modal.querySelector('.btn-close-changelog').addEventListener('click', () => {
            modal.remove();
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
