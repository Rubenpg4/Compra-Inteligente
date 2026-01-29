# Compra Inteligente 🛒

**Aplicación web multimodal de supermercado online** que demuestra técnicas avanzadas de interacción humano-computadora mediante detección de gestos en tiempo real con MediaPipe.

## Descripción

Compra Inteligente es una Single Page Application (SPA) desarrollada como proyecto académico para la asignatura de Interfaces de Usuario Multimodales. El objetivo principal es explorar métodos de interacción alternativos al tradicional ratón/teclado, permitiendo a los usuarios navegar y comprar productos utilizando únicamente gestos manuales frente a una webcam.

## Arquitectura

La aplicación sigue una arquitectura modular basada en ES6 Modules sin dependencias de frameworks:

- **app.js** - Orquestador principal que coordina la inicialización de todos los subsistemas
- **store.js** - Implementación de estado global reactivo usando patrón Observer
- **ui.js** - Capa de presentación que maneja renderizado DOM y actualizaciones visuales
- **gestures.js** - Motor de detección de gestos con MediaPipe GestureRecognizer
- **voice.js** - Integración con Web Speech API para comandos de voz

### Componentes de Visualización

- **horizontalCoverflow.js** - Carrusel 3D estilo Apple para navegación de productos
- **productGrid.js** - Vista alternativa en grid 3x3 con paginación
- **verticalCoverflow.js** - Variante vertical del coverflow

## Tecnologías Utilizadas

| Tecnología | Propósito |
|------------|-----------|
| JavaScript ES6+ | Lógica de aplicación con ES Modules nativos |
| MediaPipe Tasks Vision | Detección y reconocimiento de gestos manuales |
| Web Speech API | Reconocimiento de comandos de voz |
| TailwindCSS | Sistema de diseño y estilos |
| CSS3 Transforms | Efectos 3D y animaciones del coverflow |

## Gestos Implementados

El sistema reconoce 7 gestos distintos, cada uno mapeado a una acción específica:

- **Thumb Up / Thumb Down** - Incrementar/decrementar cantidad en carrito
- **Closed Fist** - Acceder a detalles del producto
- **Victory** - Avanzar en el flujo (navegar → carrito → checkout → confirmar)
- **Open Palm** - Retroceder/cancelar operación actual
- **Italian Gesture** - Acción especial (añadir x2), detectado con algoritmo personalizado
- **Swipe Horizontal** - Navegación entre productos con sistema de histéresis dinámica

## Comandos de Voz Implementados

El sistema de reconocimiento de voz permite control completo de la aplicación mediante comandos en español:

### Navegación General
| Comando | Alternativas | Acción |
|---------|--------------|--------|
| ver carrito | abrir carrito, mostrar carrito | Abre la vista del carrito |
| ver productos | catálogo, inicio | Vuelve a la vista de productos |
| atrás | volver, regresar, salir | Smart Back: vuelve a la vista anterior contextualmente |

### Navegación Coverflow/Carrito
| Comando | Alternativas | Acción |
|---------|--------------|--------|
| siguiente | próximo, avanzar, adelante | Navega al siguiente producto (funciona en coverflow y carrito) |
| anterior | previo, retroceder | Navega al producto anterior (funciona en coverflow y carrito) |
| detalles | ver detalles, más información, seleccionar | Abre detalles del producto activo (desde coverflow o carrito) |

### Gestión del Carrito
| Comando | Alternativas | Acción |
|---------|--------------|--------|
| agregar | añadir, comprar | Añade el producto actual al carrito |
| quitar | eliminar, borrar, sacar | Reduce cantidad o elimina del carrito |
| finalizar | terminar, pagar, checkout | Va a la pantalla de confirmación |

### Confirmación de Compra
| Comando | Alternativas | Acción |
|---------|--------------|--------|
| aceptar | confirmar, sí, ok, vale | Confirma y realiza la compra |
| cancelar | no, rechazar | Cancela la compra y vuelve al carrito |

### Filtros
| Comando | Alternativas | Acción |
|---------|--------------|--------|
| snacks | aperitivos, botanas | Filtra por categoría snacks |
| bebidas | drinks, refrescos | Filtra por categoría bebidas |
| lácteos | dairy, leche, yogur, queso | Filtra por categoría lácteos |
| cereales | cereals, cereal | Filtra por categoría cereales |
| saludable | letra A/B/C/D/E | Filtra por nutriscore |
| mostrar todo | limpiar filtros, ver todo | Elimina todos los filtros |

### Utilidades
| Comando | Alternativas | Acción |
|---------|--------------|--------|
| ayuda | comandos | Muestra lista de comandos disponibles |

## Características Técnicas

### Detección de Gestos
- Modelo MediaPipe GestureRecognizer cargado desde CDN
- Sistema de cooldowns independientes por gesto para evitar activaciones accidentales
- Algoritmo de histéresis dinámica para swipes que previene falsos positivos por retroceso de mano
- Detección de estabilidad (zero-velocity) para reseteo automático del sistema

### Reconocimiento de Voz
- Basado en Web Speech API (webkitSpeechRecognition)
- Reconocimiento continuo con reinicio automático y sistema de reintentos
- Botón dedicado para activar/desactivar voz independientemente de la cámara
- Comandos contextuales según la vista activa (BROWSE, CART, DETAILS, CHECKOUT)
- Feedback visual en el botón de micrófono (estado activo/inactivo)
- Soporte para múltiples variantes de cada comando (sinónimos)

### Gestión de Estado
- Store centralizado con notificación reactiva a suscriptores
- Máquina de estados implícita: BROWSE → DETAILS → CART → CHECKOUT
- Persistencia del índice activo al cambiar filtros

### Interfaz Visual
- Efecto coverflow con perspectiva 3D y reflexiones
- Animaciones CSS con curvas de Bézier personalizadas
- Feedback visual en leyenda de gestos (progreso, éxito, fallo)
- Cursor virtual que sigue la posición de la mano
- Botones independientes para cámara (gestos) y micrófono (voz) en el header
- Indicadores de estado activo con cambio de color (verde cuando activo)
- Animación de "añadir al carrito" para feedback visual en comandos de voz

## Datos

El catálogo incluye 50 productos alimenticios reales distribuidos en:
- **Categorías:** Snacks (13), Bebidas (13), Lácteos (13), Cereales (11)
- **Nutriscore:** A (15), B (9), C (11), D (10), E (5)

## Limitaciones Conocidas

- Requiere buena iluminación para detección óptima de gestos
- Mejor rendimiento en Chrome/Edge por soporte completo de APIs (Web Speech API y MediaPipe)
- El reconocimiento de voz requiere conexión a internet (usa servidores de Google)
- Sin persistencia de carrito entre sesiones
- Service Worker pendiente de implementación

## Documentación Adicional

- **SETUP.md** - Instrucciones de instalación y ejecución
- **informe_funcional.md** - Análisis técnico detallado del código

## Licencia

Proyecto académico - Universidad
