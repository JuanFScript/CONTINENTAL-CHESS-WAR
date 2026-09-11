/**
 * CONTINENTAL - Service Worker (v4 Update & Immediate Cache Clear)
 */

const CACHE_NAME = 'continental-chess-v72';
const ASSETS = [
    './',
    './index.html?v=72',
    './css/main.css?v=72',
    './css/board.css?v=72',
    './js/i18n.js?v=72',
    './js/audio.js?v=72',
    './js/engine/pieceRegistry.js?v=70',
    './js/engine/pieces/standardPieces.js?v=70',
    './js/engine/pieces/continentalPieces.js?v=72',
    './js/engine/pieces/customPieceTemplate.js?v=72',
    './js/engine/board.js?v=72',
    './js/engine/rulesEngine.js?v=72',
    './js/engine/aiEngine.js?v=72',
    './js/engine/networkManager.js?v=72',
    './js/ui/boardRenderer.js?v=72',
    './js/ui/matchSetupModal.js?v=72',
    './js/ui/gameController.js?v=72',
    './js/ui/rulesTab.js?v=72',
    './js/ui/optionsTab.js?v=72',
    './js/ui/armoryTab.js?v=72',
    './js/ui/tutorialTab.js?v=72',
    './js/ui/menuController.js?v=72',
    './js/app.js?v=42'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('Clearing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
