# Guía de Instalación y Ejecución - Compra Inteligente

## Requisitos Previos

- **Navegador moderno:** Chrome (recomendado), Edge, o Firefox
- **Servidor local:** Python 3.x, Node.js, o cualquier servidor HTTP estático
- **Permisos:** Acceso a cámara y micrófono (opcional, para funciones multimodales)

> **⚠️ IMPORTANTE:** Esta aplicación usa ES Modules nativos. No se puede abrir `index.html` directamente con `file://` - requiere un servidor HTTP.

---

## Instalación Rápida

### 1. Extraer el ZIP

```bash
unzip Compra-Inteligente.zip
cd Compra-Inteligente
```

### 2. Iniciar servidor local

#### Opción A: Python (recomendado)
```bash
# Python 3
python -m http.server 8080

# Python 2 (deprecado)
python -m SimpleHTTPServer 8080
```

#### Opción B: Node.js
```bash
# Si tienes npx disponible
npx serve .

# O instalar serve globalmente
npm install -g serve
serve .
```

#### Opción C: VS Code Live Server
1. Instalar extensión "Live Server"
2. Click derecho en `index.html` → "Open with Live Server"

### 3. Acceder a la aplicación

Abrir en el navegador:
```
http://localhost:8080
```

---

## Uso Básico

### Navegación con teclado/ratón
- **← →** Navegar entre productos
- **Enter** Ver detalles del producto
- **A** Añadir al carrito
- **C** Abrir carrito
- **Esc** Volver atrás

### Activar modo multimodal
1. Click en botón **"Cámara"** (header derecha)
2. Conceder permisos de cámara y micrófono
3. Usar gestos manuales frente a la cámara

### Gestos disponibles
- 👍 **Pulgar arriba:** Añadir al carrito
- 👎 **Pulgar abajo:** Quitar del carrito
- ✊ **Puño cerrado:** Ver detalles
- ✌️ **Victoria:** Siguiente paso / Confirmar compra
- ✋ **Palma abierta:** Cancelar / Volver
- 🤌 **Italiano:** Añadir x2
- **Swipe izq/der:** Navegar productos

---

## Solución de Problemas

**Error CORS o módulos no cargan:**
- Asegúrate de usar un servidor HTTP, no abrir el archivo directamente

**Cámara no funciona:**
- Verificar permisos en el navegador (icono de candado en barra de direcciones)
- Usar Chrome para mejor compatibilidad con MediaPipe

---

## Compatibilidad

| Navegador | Gestos | Voz | Notas |
|-----------|--------|-----|-------|
| Chrome    | ✅     | ✅  | Recomendado |
| Edge      | ✅     | ✅  | Funciona bien |
| Firefox   | ✅     | ⚠️  | Voz limitada |
| Safari    | ⚠️     | ⚠️  | Soporte parcial |
