# Guía de Publicación en Google Play Store - CONTINENTAL (Chess on War / Ajedrez en Guerra)

Este proyecto está optimizado como una **Mobile Web App / PWA** de alto rendimiento con Service Worker offline, respuesta táctil, audio nativo Web Audio API y diseño responsivo para celulares.

Para subir la app a **Google Play Store**, existen 2 métodos extremadamente sencillos:

---

## Método 1: PWABuilder (Recomendado - 100% Gratis y en 5 Minutos)

1. Subes esta carpeta a un hosting web estático gratuito como **GitHub Pages**, **Vercel**, **Netlify**, o **Firebase Hosting**.
2. Ingresas en la web oficial de Microsoft/Google PWA: **[https://www.pwabuilder.com](https://www.pwabuilder.com)**.
3. Pegas la URL de tu app subida (ej. `https://tu-usuario.github.io/continental-chess-war`).
4. Haces clic en **Package for Stores** -> **Android**.
5. PWABuilder generará automáticamente tu archivo **`app-release-signed.aab`** y tu clave de firma.
6. ¡Ese archivo `.aab` es exactamente el que subes en la consola de **Google Play Console**!

---

## Método 2: Bubblewrap (CLI oficial de Google TWA)

Si prefieres compilar la app localmente en tu computadora a través de la terminal:

```bash
# 1. Instalar la herramienta oficial de Google
npm install -g @bubblewrap/cli

# 2. Inicializar el proyecto Android desde el manifest
bubblewrap init --manifest=https://tu-url.com/manifest.json

# 3. Compilar el APK / Android App Bundle (.aab)
bubblewrap build
```

Esto generará el archivo `app-release-signed.aab` en tu computadora para subirlo a la Play Store.

---

## Estructura Modular para Añadir Nuevas Piezas y Reglas

Para agregar tus nuevas piezas de guerra en el futuro, abre el archivo `js/engine/pieces/customPieceTemplate.js` y registra tus piezas con esta estructura:

```javascript
PieceRegistry.register('mi_pieza', {
    name: { es: 'Mi Pieza Especial', en: 'My Special Piece' },
    symbol: '⚔️',
    value: 6,
    category: 'war',
    description: {
        es: 'Descripción de sus movimientos en español',
        en: 'Movement description in English'
    },
    getMoves: (r, c, board, color) => {
        // Retorna un array con casillas a las que puede moverse { r, c, type }
        return [];
    }
});
```
