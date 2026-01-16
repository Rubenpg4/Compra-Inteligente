# Demo Multimodal - Voz + Gestos

Aplicacion web estatica **offline-first** que demuestra interaccion multimodal mediante **reconocimiento de voz** y **deteccion de gestos**.

## Caracteristicas

- **SPA sin frameworks**: Vanilla JavaScript con ES6 Modules
- **Offline-first**: Funciona sin conexion (datos de fallback incluidos)
- **Reconocimiento de voz**: Web Speech API para comandos en español
- **Deteccion de gestos**: Placeholder para MediaPipe/TensorFlow.js
- **UI con Tailwind CSS**: Diseño moderno via CDN
- **Estado reactivo**: Store simple con patron Observer

## Estructura del Proyecto

```
PracticaFinal/
├── index.html              # Pagina principal
├── src/
│   ├── app.js             # Modulo principal (orquestador)
│   ├── store.js           # Estado global reactivo
│   ├── ui.js              # Renderizado de interfaz
│   ├── voice.js           # Reconocimiento de voz
│   └── gestures.js        # Deteccion de gestos
├── data/
│   └── products.json      # Datos de productos
├── scripts/
│   └── fetch_sample.js    # Utilidad para generar datos
└── README.md
```

## Requisitos

- Navegador moderno (Chrome, Edge, Firefox)
- HTTPS o localhost (requerido para APIs de camara/microfono)
- Permisos de camara y microfono

## Instalacion y Uso

### Opcion 1: Servidor local simple

```bash
# Con Python 3
python -m http.server 8080

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8080
```

### Opcion 2: Extension Live Server (VS Code)

1. Instalar extension "Live Server"
2. Click derecho en `index.html` > "Open with Live Server"

### Abrir la aplicacion

1. Navegar a `http://localhost:8080`
2. Presionar **"Iniciar Demo"**
3. Conceder permisos de camara y microfono

## Modos de la Aplicacion

| Modo | Descripcion |
|------|-------------|
| **BROWSE** | Vista de catalogo con grid de productos |
| **DETAILS** | Vista detallada de un producto |
| **CART** | Carrito de compras |

## Comandos de Voz

| Comando | Accion |
|---------|--------|
| "ver carrito" | Abre el carrito |
| "ver productos" / "catalogo" | Muestra el catalogo |
| "ver [nombre producto]" | Muestra detalles del producto |
| "agregar" / "comprar" | Agrega producto al carrito |
| "ayuda" | Lista comandos disponibles |

## Gestos Soportados (Placeholder)

| Gesto | Accion |
|-------|--------|
| Swipe izquierda | Volver al catalogo |
| Swipe derecha | Abrir carrito |
| Pulgar arriba | Agregar al carrito |
| Mano abierta | Seleccionar elemento |

> **Nota**: La deteccion de gestos es un placeholder. Para implementacion real, integrar MediaPipe Hands.

## Panel de Estado

El panel muestra el estado de:
- **Camara**: Indica si el stream de video esta activo
- **Microfono**: Indica si hay permiso de audio
- **Modelo ML**: Indica si el modelo de gestos esta cargado
- **Voz Activa**: Indica si esta escuchando comandos

## Panel de Log

Registra todos los eventos multimodales:
- Comandos de voz detectados
- Gestos reconocidos
- Cambios de estado del sistema
- Errores

## Desarrollo

### Generar datos de prueba

```bash
node scripts/fetch_sample.js generate 15
node scripts/fetch_sample.js show
```

### Simular gestos (consola del navegador)

```javascript
// Simular gesto de swipe
window.simulateGesture('swipe_left')

// Ver estado de la app
window.appDebug.getState()
```

## TODOs / Mejoras Pendientes

- [ ] Implementar Service Worker para cache offline completo
- [ ] Integrar MediaPipe Hands para deteccion real de gestos
- [ ] Agregar sintesis de voz (text-to-speech)
- [ ] Implementar wake word ("Hey Demo")
- [ ] Agregar animaciones de transicion
- [ ] Mejorar accesibilidad (ARIA labels)
- [ ] Agregar tests E2E
- [ ] Soporte multi-idioma

## Compatibilidad

| Navegador | Voz | Gestos |
|-----------|-----|--------|
| Chrome 90+ | Si | Si |
| Edge 90+ | Si | Si |
| Firefox 80+ | Parcial | Si |
| Safari 14+ | Parcial | Si |

## Licencia

Proyecto academico - Interfaces de Usuarios Multimodales

---

**Nota**: Esta es una demo educativa. Para produccion, considerar:
- Manejo robusto de errores
- Persistencia de datos
- Seguridad y validacion
- Optimizacion de rendimiento
