/**
 * gestures.js - Modulo de Deteccion de Gestos con MediaPipe
 * Utiliza MediaPipe Tasks Vision (HandLandmarker) para deteccion de manos
 * Implementa cursor virtual y gestos pinch/palm
 */

import {
    getState,
    setState,
    setMode,
    setServiceStatus,
    addToCart,
    decreaseCartItem,
    addLog,
    MODES,
    setCartActiveIndex
} from './store.js';

import { next as coverflowNext, prev as coverflowPrev, getActiveProduct, triggerAddAnimation } from './components/horizontalCoverflow.js';
import { triggerDetailAddAnimation, showFeedback, handleCheckoutSuccess, isGridViewActive } from './ui.js';
import { FilesetResolver, GestureRecognizer } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/+esm';

// ============================================================================
// CONFIGURACION
// ============================================================================

const CONFIG = {
    // MediaPipe
    MODEL_URL: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
    NUM_HANDS: 1,
    MIN_DETECTION_CONFIDENCE: 0.5,
    MIN_TRACKING_CONFIDENCE: 0.5,
    MIN_HAND_PRESENCE_CONFIDENCE: 0.5,

    // Cooldowns (ms)
    CONFIRM_COOLDOWN: 1000,
    STOP_COOLDOWN: 1000,
    VICTORY_COOLDOWN: 1500,
    SWIPE_COOLDOWN: 500,
    ITALIAN_COOLDOWN: 1500,
    REMOVE_COOLDOWN: 1000,

    // Configuración de Swipe (Dynamic Hysteresis)
    SWIPE_BASE_THRESHOLD: 0.15,    // Umbral normal
    SWIPE_REVERSE_THRESHOLD: 0.35, // Umbral exigente para contra-movimientos
    SWIPE_TIME_LIMIT: 2000,
    SWIPE_MIN_VELOCITY: 0.0001,

    // Video
    VIDEO_WIDTH: 640,
    VIDEO_HEIGHT: 480,

    // Debug
    DEBUG: false
};

// Indices de landmarks de la mano (MediaPipe)
const LANDMARKS = {
    WRIST: 0,
    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,
    INDEX_TIP: 8,
    MIDDLE_TIP: 12,
    RING_TIP: 16,
    PINKY_TIP: 20,
    INDEX_MCP: 5,
    MIDDLE_MCP: 9,
    RING_MCP: 13,
    PINKY_MCP: 17
};

// ============================================================================
// ESTADO DEL MODULO
// ============================================================================

let gestureRecognizer = null;
let videoElement = null;
let cursorElement = null;
let isRunning = false;
let animationFrameId = null;

// Cooldown timestamps
let lastConfirmTime = 0;
let lastStopTime = 0;
let lastVictoryTime = 0;
let lastSwipeTime = 0;
let lastItalianTime = 0;
let lastRemoveTime = 0; // Cooldown para remove
let lastFistTime = 0; // Cooldown para puño cerrado

// Estado para Confirmación de Compra
let purchaseConfirmationPending = false;
let purchaseConfirmationTimer = null;

// Estado para deteccion de swipe
let swipeStartX = null;
let swipeStartY = null; // ADDED
let lastSwipeDirection = null; // Dynamic Hysteresis: 'left'|'right'|null
let swipeStartTime = 0;
let lastWristPos = null; // {x, y, time}

// Zero-Velocity Unlock State
let stableFrameCount = 0;
let zeroVelocityLastX = null;

// Elemento actualmente bajo el cursor
let hoveredElement = null;

// Callbacks externos
let callbacks = {
    onPinch: null,
    onPalm: null, // Stop/Cancel
    onSwipeLeft: null,
    onSwipeRight: null,
    onOk: null,
    onItalian: null,
    onCursorMove: null
};

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Calcula la distancia euclidiana entre dos puntos 2D
 */
function distance2D(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Convierte coordenadas normalizadas (0-1) a coordenadas de la ventana del navegador
 * Usa getBoundingClientRect del body para manejar mÃºltiples pantallas correctamente
 */
function normalizedToViewport(x, y) {
    // Usar el tamaÃ±o del documento visible en la ventana actual
    const docWidth = document.documentElement.clientWidth;
    const docHeight = document.documentElement.clientHeight;

    return {
        x: (1 - x) * docWidth,   // Invertir X para efecto espejo
        y: y * docHeight
    };
}

/**
 * Obtiene el elemento interactivo bajo las coordenadas dadas
 */
function getInteractiveElementAt(x, y) {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    // Buscar elemento interactivo (card, boton, etc.)
    const interactive = element.closest('.product-card, .btn-add-cart, .btn-add-cart-detail, #btn-back, .filter-btn');
    return interactive;
}

/**
 * Actualiza el highlight del elemento bajo el cursor
 */
function updateHoverHighlight(element) {
    // Quitar highlight anterior
    if (hoveredElement && hoveredElement !== element) {
        hoveredElement.classList.remove('gesture-hover');
    }

    // Añadir highlight nuevo
    if (element) {
        element.classList.add('gesture-hover');
    }

    hoveredElement = element;
}



/**
 * Actualiza el highlight de la leyenda de gestos con progreso visual
 * @param {string|null} gestureName - Nombre del gesto activo o null para limpiar
 * @param {number} progress - Progreso de 0 a 100 (opcional)
 */
function updateLegendHighlight(gestureName, progress = 0) {
    const legendItems = document.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
        if (item.dataset.gesture === gestureName) {
            item.classList.add('active');
            // Actualizar progreso con CSS variable
            item.style.setProperty('--gesture-progress', `${progress}%`);
        } else {
            item.classList.remove('active');
            item.style.setProperty('--gesture-progress', '0%');
        }
    });
}

/**
 * Muestra estado de éxito (verde) en el legend item del gesto
 */
function showGestureSuccess(gestureName) {
    const legendItems = document.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
        if (item.dataset.gesture === gestureName) {
            item.classList.remove('active', 'failure');
            item.classList.add('success');
            item.style.setProperty('--gesture-progress', '100%');

            // Remover después de 1 segundo
            setTimeout(() => {
                item.classList.remove('success');
                item.style.setProperty('--gesture-progress', '0%');
            }, 1000);
        }
    });
}

/**
 * Muestra estado de fallo (rojo) en el legend item del gesto
 */
function showGestureFailure(gestureName, currentProgress = 0) {
    const legendItems = document.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
        if (item.dataset.gesture === gestureName) {
            item.classList.remove('active', 'success');
            item.classList.add('failure');
            // Mantener el progreso actual al fallar para efecto visual
            item.style.setProperty('--gesture-progress', `${currentProgress}%`);

            // Remover después de 1 segundo
            setTimeout(() => {
                item.classList.remove('failure');
                item.style.setProperty('--gesture-progress', '0%');
            }, 1000);
        }
    });
}

// ============================================================================
// DETECCION DE GESTOS MANUALES (Italiano y Swipe)
// ============================================================================

/**
 * Detecta gesto Italiano (Todos los dedos juntos apuntando arriba)
 * "Pinecone" o "Purse"
 */
function detectItalianGesture(landmarks) {
    const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
    const indexTip = landmarks[LANDMARKS.INDEX_TIP];
    const middleTip = landmarks[LANDMARKS.MIDDLE_TIP];
    const ringTip = landmarks[LANDMARKS.RING_TIP];
    const pinkyTip = landmarks[LANDMARKS.PINKY_TIP];

    const wrist = landmarks[LANDMARKS.WRIST];
    const middleMcp = landmarks[LANDMARKS.MIDDLE_MCP];

    // 1. Orientacion ESTRICTA: Mano apuntando hacia ARRIBA
    // En coordenadas de pantalla, Y disminuye hacia arriba.
    // Wrist debe tener mayor Y (estar mas abajo) que las puntas.
    // Ademas, para evitar falsos positivos laterales, exigimos una diferencia significativa.
    if (wrist.y < indexTip.y || wrist.y < middleTip.y || wrist.y < pinkyTip.y) {
        return false;
    }

    // Comparar tambien con MCP para asegurar que no estan doblados hacia abajo
    if (middleMcp.y < middleTip.y) return false;

    // 2. Calcular tamaño de mano (referencia)
    const handSize = distance2D(wrist, middleMcp);

    // 3. Calcular Centroide de las puntas
    const centroid = {
        x: (thumbTip.x + indexTip.x + middleTip.x + ringTip.x + pinkyTip.x) / 5,
        y: (thumbTip.y + indexTip.y + middleTip.y + ringTip.y + pinkyTip.y) / 5
    };

    // 4. CHECK AGUJA (Hacia arriba)
    // El centroide de las puntas debe estar directamente arriba de la muñeca (alineacion horizontal)
    // Permitimos un poco de inclinacion, pero no mucha.
    const horizontalSkew = Math.abs(centroid.x - wrist.x);
    if (horizontalSkew > handSize * 0.8) {
        return false; // Mano muy inclinada o de lado
    }

    // 5. CHECK DISPERSION (Todos juntos)
    // Verificar distancia MAXIMA, no promedio. "Todos los dedos... en un mismo punto"
    const dThumb = distance2D(thumbTip, centroid);
    const dIndex = distance2D(indexTip, centroid);
    const dMiddle = distance2D(middleTip, centroid);
    const dRing = distance2D(ringTip, centroid);
    const dPinky = distance2D(pinkyTip, centroid);

    // Umbral estricto: 0.25 del tamaño de la mano (dedos muy pegados)
    const MAX_SPREAD_THRESHOLD = handSize * 0.25;

    if (dThumb > MAX_SPREAD_THRESHOLD ||
        dIndex > MAX_SPREAD_THRESHOLD ||
        dMiddle > MAX_SPREAD_THRESHOLD ||
        dRing > MAX_SPREAD_THRESHOLD ||
        dPinky > MAX_SPREAD_THRESHOLD) {
        return false;
    }

    // 6. CHECK EXTENSION (Anti-Puño estricto)
    // En el gesto italiano, los dedos se juntan LEJOS de la palma.
    // La distancia del centroide a la muñeca debe ser similar a la mano extendida.
    const distCentroidToWrist = distance2D(centroid, wrist);

    // Si la distancia es muy corta, es un puño cerrado de frente
    if (distCentroidToWrist < handSize * 1.5) {
        return false;
    }

    console.log('>>> DETECTADO GESTO ITALIANO 🤌 <<<');
    return true;
}

/**
 * Helper: Detecta si la mano esta en pose de señalar (Indice extendido, otros cerrados)
 * Se usa para restringir el Swipe a solo el dedo indice.
 */
function isPointingPose(landmarks) {
    const wrist = landmarks[LANDMARKS.WRIST];
    const indexTip = landmarks[LANDMARKS.INDEX_TIP];
    const middleTip = landmarks[LANDMARKS.MIDDLE_TIP];
    const ringTip = landmarks[LANDMARKS.RING_TIP];
    const pinkyTip = landmarks[LANDMARKS.PINKY_TIP];

    const dIndex = distance2D(indexTip, wrist);
    const dMiddle = distance2D(middleTip, wrist);
    const dRing = distance2D(ringTip, wrist);
    const dPinky = distance2D(pinkyTip, wrist);

    // Indice debe estar extendido (dominantemente mas lejos de la muñeca que los otros)
    // Los otros dedos deben estar cerrados (cerca de la muñeca)
    // Usamos un umbral relativo: los dedos cerrados deben ser < 80% de la distancia del indice
    const CLOSED_THRESHOLD_RATIO = 0.8;

    if (dMiddle > dIndex * CLOSED_THRESHOLD_RATIO) return false;
    if (dRing > dIndex * CLOSED_THRESHOLD_RATIO) return false;
    if (dPinky > dIndex * CLOSED_THRESHOLD_RATIO) return false;

    // Opcional: Verificar que el indice esta realmente extendido comparado con su MCP
    const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
    const dIndexMcp = distance2D(indexMcp, wrist);
    if (dIndex < dIndexMcp * 1.5) return false; // Indice no esta suficientemente estirado

    return true;
}

/**
 * Detecta Swipe Izquierda/Derecha
 * Modificado: Solo funciona si el dedo indice esta alzado y el resto cerrados
 */
// Estado para deteccion de swipe (declarado arriba, añadiendo Y)
// let swipeStartX = null; (Ya existe)
// let swipeStartY = null; (Necesitamos añadirlo o usarlo localmente si fuera posible, pero mejor global para tracking)

function detectSwipe(landmarks) {
    const now = Date.now();
    const wrist = landmarks[LANDMARKS.WRIST];

    // 0. Check Cooldown Global
    if (now - lastSwipeTime < CONFIG.SWIPE_COOLDOWN) {
        swipeStartX = null;
        swipeStartY = null;
        return null;
    }

    // --- LOGICA DE ESTABILIDAD: RESET DE HISTÉRESIS ---
    // Si la mano está quieta, reseteamos lastSwipeDirection para facilitar el siguiente gesto
    if (lastSwipeDirection !== null) {
        if (zeroVelocityLastX === null) zeroVelocityLastX = wrist.x;

        const velocity = Math.abs(wrist.x - zeroVelocityLastX);
        zeroVelocityLastX = wrist.x;

        if (velocity < 0.005) {
            stableFrameCount++;
        } else {
            stableFrameCount = 0;
        }

        if (stableFrameCount > 10) {
            console.log('>>> Mano ESTABLE: Reset Hysteresis <<<');
            lastSwipeDirection = null;
            stableFrameCount = 0;
            swipeStartX = wrist.x;
            swipeStartY = wrist.y;
            swipeStartTime = now;
        }
    } else {
        stableFrameCount = 0;
        zeroVelocityLastX = wrist.x;
    }
    // ------------------------------------------------------------

    // 1. Anchor: Guardar posición inicial si no existe
    if (swipeStartX === null) {
        swipeStartX = wrist.x;
        swipeStartY = wrist.y;
        swipeStartTime = now;
        return null;
    }

    // 2. Calcular Deltas
    const deltaX = wrist.x - swipeStartX;
    const deltaY = wrist.y - swipeStartY;

    // (Opcional) Reset si pasa demasiado tiempo sin trigger
    if (now - swipeStartTime > CONFIG.SWIPE_TIME_LIMIT) {
        swipeStartX = wrist.x;
        swipeStartY = wrist.y;
        swipeStartTime = now;
        return null;
    }

    // 3. Determinar dirección candidata y umbral dinámico
    const candidateDir = deltaX > 0 ? 'left' : 'right';

    // Dynamic Hysteresis: Si el movimiento es OPUESTO al último swipe, exigir más distancia
    let threshold;
    if (lastSwipeDirection !== null && lastSwipeDirection !== candidateDir) {
        // Es un contra-movimiento -> Umbral exigente
        threshold = CONFIG.SWIPE_REVERSE_THRESHOLD;
    } else {
        // Movimiento normal -> Umbral base
        threshold = CONFIG.SWIPE_BASE_THRESHOLD;
    }

    // 4. Trigger: Superar umbral
    if (Math.abs(deltaX) > threshold) {

        // Sanity Check Vertical
        if (Math.abs(deltaY) > Math.abs(deltaX) * 2.0) {
            swipeStartX = wrist.x;
            swipeStartY = wrist.y;
            swipeStartTime = now;
            return null;
        }

        // SWIPE VALIDO
        swipeStartX = null;
        swipeStartY = null;

        // Actualizar histéresis
        lastSwipeDirection = candidateDir;
        stableFrameCount = 0;
        zeroVelocityLastX = wrist.x;

        console.log(`>>> SWIPE ${candidateDir} EXE <<<`);
        return candidateDir;
    }

    return null;
}

// ============================================================================
// ACCIONES DE GESTOS
// ============================================================================

/**
 * Ejecuta la accion de Confirmar (Thumb_Up)
 */
function executeConfirmAction(element, cursorPos) {
    const now = Date.now();
    if (now - lastConfirmTime < CONFIG.CONFIRM_COOLDOWN) return;
    lastConfirmTime = now;

    addLog('gesture', 'GESTURE: Confirm (ThumbUp)');

    // Feedback visual
    if (cursorElement) {
        cursorElement.classList.add('confirm');
        setTimeout(() => cursorElement.classList.remove('confirm'), 300);
    }

    const state = getState();
    // Si estamos en modo BROWSE (Coverflow por defecto) -> Añadir producto en foco
    if (state.currentMode === MODES.BROWSE) {
        console.log('[DEBUG Confirm] currentMode:', state.currentMode, 'MODES.BROWSE:', MODES.BROWSE, 'Match:', state.currentMode === MODES.BROWSE);
        const focusedProduct = getActiveProduct();
        if (focusedProduct) {
            addToCart(focusedProduct);
            showFeedback(`+1 ${focusedProduct.name}`, 'success');
            addLog('cart', `CARRITO: +1 ${focusedProduct.name}`);
            setTimeout(() => triggerAddAnimation(1000), 50); // Small delay to ensure render completes
        } else {
            showFeedback('No hay producto en foco', 'warning');
        }
        return;
    }

    // Si estamos en modo CART -> +1 al item activo
    if (state.currentMode === MODES.CART) {
        if (state.cart.length > 0) {
            const currentItem = state.cart[state.cartActiveIndex];
            if (currentItem) {
                addToCart(currentItem); // Add +1
                showFeedback(`+1 ${currentItem.name}`, 'success');
                addLog('cart', `CARRITO: +1 ${currentItem.name}`);
            }
        } else {
            showFeedback('Carrito Vacío', 'warning');
        }
        return;
    }

    // Si estamos en modo DETAILS -> Añadir producto seleccionado
    if (state.currentMode === MODES.DETAILS) {
        if (state.selectedProduct) {
            addToCart(state.selectedProduct);
            showFeedback(`+1 ${state.selectedProduct.name}`, 'success');
            addLog('cart', `CARRITO: +1 ${state.selectedProduct.name}`);
            setTimeout(() => triggerDetailAddAnimation(1000), 50);
        }
        return;
    }

    // Lógica original para otros casos
    if (!element) {
        showFeedback('CONFIRMAR', 'info');
        return;
    }

    // Confirm sobre card -> detalles
    if (element.classList.contains('product-card')) {
        const productId = element.dataset.productId;
        const product = state.products.find(p => p.id == productId);
        if (product) {
            setMode(MODES.DETAILS, { product });
        }
        return;
    }

    // Confirm sobre boton agregar
    if (element.classList.contains('btn-add-cart') || element.classList.contains('btn-add-cart-detail')) {
        const productId = element.dataset.productId;
        const product = state.products.find(p => p.id == productId);
        if (product) {
            addToCart(product);
        } else if (state.currentMode === MODES.DETAILS && state.selectedProduct) {
            addToCart(state.selectedProduct);
            triggerDetailAddAnimation(1000);
        }
        return;
    }

    // Confirm sobre boton volver
    if (element.id === 'btn-back') {
        setMode(MODES.BROWSE);
        return;
    }
}

/**
 * Ejecuta la accion de Remover (Thumb_Down)
 */
function executeRemoveAction(element, cursorPos) {
    const now = Date.now();
    if (now - lastRemoveTime < CONFIG.REMOVE_COOLDOWN) return;
    lastRemoveTime = now;

    addLog('gesture', 'GESTURE: Remove (ThumbDown)');

    // Feedback visual
    if (cursorElement) {
        cursorElement.classList.add('remove');
        setTimeout(() => cursorElement.classList.remove('remove'), 300);
    }

    const state = getState();

    // Si estamos en modo CART -> -1 al item activo (o eliminar)
    if (state.currentMode === MODES.CART) {
        if (state.cart.length > 0) {
            const currentItem = state.cart[state.cartActiveIndex];
            if (currentItem) {
                decreaseCartItem(currentItem); // -1 or remove
                showFeedback(`-1 ${currentItem.name}`, 'warning');
                addLog('cart', `CARRITO: -1 ${currentItem.name}`);
            }
        } else {
            showFeedback('Carrito Vacío', 'warning');
        }
        return;
    }

    // Si apuntamos a un elemento valido (producto)
    if (element) {
        let productToMod = null;

        if (element.classList.contains('product-card')) {
            const productId = element.dataset.productId;
            productToMod = state.products.find(p => p.id == productId);
        } else if (element.classList.contains('btn-add-cart') || element.classList.contains('btn-add-cart-detail')) {
            const productId = element.dataset.productId;
            productToMod = state.products.find(p => p.id == productId);
        }

        if (productToMod) {
            decreaseCartItem(productToMod);
            showFeedback(`-1 ${productToMod.name}`, 'warning');
            return;
        }
    }

    // Si no apuntamos a nada especifico
    showFeedback('Apunta a un producto', 'warning');
}

/**
 * Ejecuta la accion de Stop/Back (Open_Palm)
 * LOGICA MODIFICADA: Inverso a Victoria.
 * Checkout(Pending) -> Cart -> Browse
 */
function executeStopAction() {
    const now = Date.now();
    if (now - lastStopTime < CONFIG.STOP_COOLDOWN) return;
    lastStopTime = now;

    addLog('gesture', 'GESTURE: Stop/Back (OpenPalm)');

    // 0. Si estamos en espera de confirmacion de compra, CANCELAR
    if (purchaseConfirmationPending) {
        purchaseConfirmationPending = false;
        if (purchaseConfirmationTimer) clearTimeout(purchaseConfirmationTimer);
        showFeedback('COMPRA CANCELADA', 'error');
        return;
    }

    const state = getState();

    // Navegación Inversa
    if (state.currentMode === MODES.CART) {
        setMode(MODES.BROWSE);
        showFeedback('VOLVER A TIENDA', 'error');
    }
    else if (state.currentMode === MODES.DETAILS) {
        // Smart Back: Si venimos del carrito, volver al carrito
        if (state.previousMode === MODES.CART) {
            setMode(MODES.CART);
            showFeedback('VOLVER AL CARRITO', 'warning');
        } else {
            setMode(MODES.BROWSE);
            showFeedback('VOLVER A TIENDA', 'error');
        }
    }
    // Cancelar Checkout -> Volver al Carrito
    else if (state.currentMode === MODES.CHECKOUT) {
        setMode(MODES.CART);
        showFeedback('CANCELADO', 'error');
    }
    else {
        showFeedback('STOP / ATRAS', 'error');
    }

    if (cursorElement) {
        cursorElement.classList.add('stop');
        setTimeout(() => cursorElement.classList.remove('stop'), 400);
    }
}

/**
 * Ejecuta accion para gesto de Victoria (Next)
 * LOGICA NUEVA: Siguiente paso.
 * Browse/Details -> Cart -> [Confirm] -> Finish
 */
function executeVictoryAction() {
    const now = Date.now();
    if (now - lastVictoryTime < CONFIG.VICTORY_COOLDOWN) return;
    lastVictoryTime = now;

    addLog('gesture', 'GESTURE: Victory (Siguiente)');
    const state = getState();

    // 1. Browse/Details -> Ir al Carrito
    if (state.currentMode === MODES.BROWSE || state.currentMode === MODES.DETAILS) {
        setMode(MODES.CART);
        showFeedback('IR AL CARRITO', 'success');
        return;
    }

    // 2. Cart -> Confirmar (Ir a Modal)
    if (state.currentMode === MODES.CART) {
        if (state.cart.length === 0) {
            showFeedback('CARRITO VACIO', 'warning');
            return;
        }
        setMode(MODES.CHECKOUT);
        showFeedback('¿CONFIRMAR?', 'info');
        return;
    }

    // 3. Checkout Modal -> Confirmar FINAL
    if (state.currentMode === MODES.CHECKOUT) {
        addLog('system', 'COMPRA FINALIZADA CON EXITO');
        handleCheckoutSuccess();
        return;
    }
}

/**
 * Ejecuta accion para gesto Italiano
 * MODIFICADO: Añade el producto en foco DOS VECES
 */
function executeItalianAction(element) {
    const now = Date.now();
    if (now - lastItalianTime < CONFIG.ITALIAN_COOLDOWN) return;
    lastItalianTime = now;

    addLog('gesture', 'GESTURE: Italiano (x2)');

    const state = getState();
    // Si estamos en modo BROWSE (Coverflow por defecto) -> Añadir producto en foco x2
    if (state.currentMode === MODES.BROWSE) {
        console.log('[DEBUG Italian] currentMode:', state.currentMode, 'MODES.BROWSE:', MODES.BROWSE, 'Match:', state.currentMode === MODES.BROWSE);
        const focusedProduct = getActiveProduct();
        if (focusedProduct) {
            addToCart(focusedProduct);
            addToCart(focusedProduct);
            showFeedback(`+2 ${focusedProduct.name} 🤌`, 'success');
            addLog('cart', `CARRITO: +2 ${focusedProduct.name}`);
            setTimeout(() => triggerAddAnimation(1000), 50); // Small delay to ensure render completes
        } else {
            showFeedback('No hay producto en foco', 'warning');
        }
        return;
    }



    // Si estamos en modo CART -> +2 al item activo
    if (state.currentMode === MODES.CART) {
        if (state.cart.length > 0) {
            const currentItem = state.cart[state.cartActiveIndex];
            if (currentItem) {
                addToCart(currentItem);
                addToCart(currentItem);
                showFeedback(`+2 ${currentItem.name} 🤌`, 'success');
                addLog('cart', `CARRITO: +2 ${currentItem.name}`);
            }
        } else {
            showFeedback('Carrito Vacío', 'warning');
        }
        return;
    }

    // Si estamos en modo DETAILS -> Añadir producto seleccionado x2
    if (state.currentMode === MODES.DETAILS) {
        if (state.selectedProduct) {
            addToCart(state.selectedProduct);
            addToCart(state.selectedProduct);
            showFeedback(`+2 ${state.selectedProduct.name} 🤌`, 'success');
            addLog('cart', `CARRITO: +2 ${state.selectedProduct.name}`);
            setTimeout(() => triggerDetailAddAnimation(1000), 50);
        }
        return;
    }

    // Lógica original para otros casos
    showFeedback('ITALIANO', 'warning');
    if (state.currentMode === MODES.BROWSE) {
        setMode(MODES.CART);
    }
}

/**
 * Ejecuta accion para gesto de Puño Cerrado
 * Muestra los detalles del producto en foco
 */
function executeClosedFistAction() {
    const now = Date.now();
    if (now - lastFistTime < CONFIG.CONFIRM_COOLDOWN) return;
    lastFistTime = now;

    addLog('gesture', 'GESTURE: Closed Fist (Detalles)');

    const state = getState();
    console.log('[DEBUG Fist] currentMode:', state.currentMode, 'MODES.BROWSE:', MODES.BROWSE, 'Match:', state.currentMode === MODES.BROWSE);
    // Si estamos en modo BROWSE (Coverflow por defecto) -> Ver detalles del producto en foco
    if (state.currentMode === MODES.BROWSE) {
        const focusedProduct = getActiveProduct();
        if (focusedProduct) {
            setMode(MODES.DETAILS, { product: focusedProduct });
            showFeedback(`Detalles: ${focusedProduct.name}`, 'info');
        } else {
            showFeedback('No hay producto en foco', 'warning');
        }
        return;
    }

    // Si estamos en modo CART -> Ver detalles del item activo
    if (state.currentMode === MODES.CART) {
        if (state.cart.length > 0) {
            const currentItem = state.cart[state.cartActiveIndex];
            if (currentItem) {
                setMode(MODES.DETAILS, { product: currentItem });
                showFeedback(`Detalles: ${currentItem.name}`, 'info');
            }
        } else {
            showFeedback('Carrito Vacío', 'warning');
        }
        return;
    }

    // Feedback genérico si no estamos en coverflow
    showFeedback('PUÑO CERRADO', 'info');
    if (cursorElement) cursorElement.classList.add('holding');
}

/**
 * Ejecuta accion para Swipe
 */
function executeSwipeAction(direction) {
    const now = Date.now();
    if (now - lastSwipeTime < CONFIG.SWIPE_COOLDOWN) return;
    lastSwipeTime = now;

    const state = getState();
    // 1. Si estamos en BROWSE -> Navegación Coverflow
    if (state.currentMode === MODES.BROWSE) {
        let success = false;
        // Swipe Left (Mano va a la izq) -> Queremos ver lo de la derecha -> Next
        if (direction === 'left') {
            success = coverflowNext();
            if (success) showFeedback('SIGUIENTE', 'success');
        }
        // Swipe Right (Mano va a la derecha) -> Queremos ver lo de la izq -> Prev
        else if (direction === 'right') {
            success = coverflowPrev();
            if (success) showFeedback('ANTERIOR', 'success');
        }

        if (!success) {
            // Feedback si estamos al final o principio
            showFeedback('LIMITE ALCANZADO', 'warning');
        } else {
            addLog('gesture', `GESTURE: Swipe ${direction}`);
        }
        return;
    }

    // 2. Si estamos en CART -> Navegación Coverflow del Carrito
    if (state.currentMode === MODES.CART && state.cart.length > 0) {
        if (direction === 'left') {
            // Swipe Left -> Next (igual que coverflow)
            setCartActiveIndex(state.cartActiveIndex + 1);
            showFeedback('SIGUIENTE', 'success');
        } else if (direction === 'right') {
            // Swipe Right -> Prev
            setCartActiveIndex(state.cartActiveIndex - 1);
            showFeedback('ANTERIOR', 'success');
        }
        addLog('gesture', `GESTURE: Swipe ${direction} (Cart)`);
        return;
    }

    addLog('gesture', `GESTURE: Swipe ${direction}`);
    // 3. Otros casos
    showFeedback(`SWIPE ${direction.toUpperCase()}`, 'success');
}

// ============================================================================
// LOOP DE DETECCION
// ============================================================================

/**
 * Procesa un frame de video y detecta gestos
 */
// Estado para gesture holding/dwell
let pendingGesture = null; // Gesto que se esta manteniendo: 'Italian', 'Thumb_Up', etc.
let pendingGestureStart = 0;
let lastPendingGesture = null; // Para trackear interrupciones
let lastPendingProgress = 0; // Progreso al momento de interrupción
let gestureJustSucceeded = false; // Flag para evitar mostrar fallo tras éxito
const GESTURE_HOLD_DURATION = 2000; // 2 segundos para confirmar

// ... (existente)

/**
 * Procesa un frame de video y detecta gestos
 */
async function processFrame() {
    if (!isRunning || !gestureRecognizer || !videoElement) {
        return;
    }



    if (videoElement.readyState < 2) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
    }

    try {
        const startTimeMs = performance.now();
        // Usamos recognizeForVideo con GestureRecognizer
        const results = gestureRecognizer.recognizeForVideo(videoElement, startTimeMs);
        // 1. Manejo del Cursor (igual que antes)
        if (results.landmarks && results.landmarks.length > 0) {
            // Check si estamos en Grid View -> Desactivar TODO (cursor y gestos)
            if (isGridViewActive()) {
                // Asegurar limpieza
                if (cursorElement) {
                    cursorElement.classList.remove('active', 'pinch', 'palm', 'stop', 'confirm', 'holding');
                }
                updateHoverHighlight(null);
                updateLegendHighlight(null);
                pendingGesture = null;
                lastSwipeDirection = null;

                // IMPORTANTE: Mantener el loop vivo aunque no procesemos
                animationFrameId = requestAnimationFrame(processFrame);
                return; // Salir del procesamiento de landmarks
            }

            const landmarks = results.landmarks[0];

            // Obtener posicion del indice para el cursor
            const indexTip = landmarks[LANDMARKS.INDEX_TIP];
            const cursorPos = normalizedToViewport(indexTip.x, indexTip.y);

            // Mover cursor
            if (cursorElement) {
                cursorElement.style.left = `${cursorPos.x}px`;
                cursorElement.style.top = `${cursorPos.y}px`;
                cursorElement.classList.add('active');
            }

            // Obtener elemento bajo el cursor
            const elementUnderCursor = getInteractiveElementAt(cursorPos.x, cursorPos.y);
            updateHoverHighlight(elementUnderCursor);

            // Callback de movimiento
            if (callbacks.onCursorMove) {
                callbacks.onCursorMove(cursorPos, elementUnderCursor);
            }

            // ---------------------------------------------------------
            // 2. Detección de CANDIDATOS a Gesto (Static)
            // ---------------------------------------------------------
            let currentFrameGesture = null;

            // A) Chequeo Manual: Italiano
            if (detectItalianGesture(landmarks)) {
                currentFrameGesture = 'Italian';
            }
            // B) Chequeo Modelo: Thumb_Up, Open_Palm, Victory
            else if (results.gestures && results.gestures.length > 0) {
                const categories = results.gestures[0];
                const topGesture = categories[0];
                if (topGesture.score > 0.5) {
                    if (['Thumb_Up', 'Thumb_Down', 'Open_Palm', 'Victory', 'Closed_Fist'].includes(topGesture.categoryName)) {
                        currentFrameGesture = topGesture.categoryName;
                    }
                }
            }

            // ---------------------------------------------------------
            // 3. Lógica de HOLD / DWELL (Mantener x segundos)
            // ---------------------------------------------------------
            const now = Date.now();

            if (currentFrameGesture) {
                const elapsed = now - pendingGestureStart;
                const progress = Math.min(100, Math.max(0, (elapsed / GESTURE_HOLD_DURATION) * 100));

                if (pendingGesture !== currentFrameGesture) {
                    // Cambio de gesto: Mostrar fallo si había un gesto previo con progreso
                    if (pendingGesture !== null && lastPendingProgress > 10) {
                        showGestureFailure(pendingGesture, lastPendingProgress);
                    }
                    // Reiniciar contador para nuevo gesto
                    pendingGesture = currentFrameGesture;
                    pendingGestureStart = now;
                    lastPendingProgress = 0;
                    // Inicializar highlight con progreso 0
                    updateLegendHighlight(currentFrameGesture, 0);
                } else {
                    // Mismo gesto mantenido: Actualizar progreso visual
                    lastPendingProgress = progress;
                    lastPendingGesture = currentFrameGesture;

                    // Actualizar barra de progreso visual en el legend item
                    updateLegendHighlight(currentFrameGesture, progress);

                    if (elapsed >= GESTURE_HOLD_DURATION) {
                        // GESTO CONFIRMADO TRAS 2s - Mostrar éxito
                        showGestureSuccess(currentFrameGesture);
                        gestureJustSucceeded = true; // Marcar que acaba de tener éxito
                        switch (currentFrameGesture) {
                            case 'Italian':
                                executeItalianAction(elementUnderCursor);
                                break;
                            case 'Thumb_Up':
                                executeConfirmAction(elementUnderCursor, cursorPos);
                                break;
                            case 'Thumb_Down':
                                executeRemoveAction(elementUnderCursor, cursorPos);
                                break;
                            case 'Open_Palm':
                                executeStopAction();
                                break;
                            case 'Victory':
                                executeVictoryAction();
                                break;
                            case 'Closed_Fist':
                                executeClosedFistAction();
                                break;
                        }

                        // Reset tras éxito con delay para evitar reinicio inmediato en la mitad
                        pendingGestureStart = now + 1000;
                        lastPendingProgress = 0;
                    }
                }
            } else {
                // No hay gesto reconocido en este frame
                // Mostrar fallo SOLO si había un gesto pendiente con progreso Y no acaba de tener éxito
                if (pendingGesture !== null && lastPendingProgress > 10 && !gestureJustSucceeded) {
                    showGestureFailure(pendingGesture, lastPendingProgress);
                }
                pendingGesture = null;
                pendingGestureStart = 0;
                lastPendingProgress = 0;
                gestureJustSucceeded = false; // Resetear el flag
                updateLegendHighlight(null); // Clear legend highlight
                if (cursorElement) cursorElement.classList.remove('holding');
            }

            // ---------------------------------------------------------
            // 4. Detección Instántanea (Swipe) - NO requiere Hold
            // ---------------------------------------------------------
            // Swipe es un movimiento, no una pose estática.
            const swipeDir = detectSwipe(landmarks);
            if (swipeDir) {
                executeSwipeAction(swipeDir);

                // Mostrar éxito en el legend item de Swipe correspondiente
                const swipeGestureName = swipeDir === 'left' ? 'Swipe_Left' : 'Swipe_Right';
                showGestureSuccess(swipeGestureName);

                // Resetear hold si hay movimiento brusco
                pendingGesture = null;
                lastPendingProgress = 0;
            }

        } else {
            // No hay mano detectada
            // Mostrar fallo si había un gesto pendiente con progreso Y no acaba de tener éxito
            if (pendingGesture !== null && lastPendingProgress > 10 && !gestureJustSucceeded) {
                showGestureFailure(pendingGesture, lastPendingProgress);
            }

            pendingGesture = null;
            pendingGestureStart = 0;
            lastPendingProgress = 0;
            gestureJustSucceeded = false;
            updateLegendHighlight(null); // Limpiar highlight y progreso

            // Reset de Swipe y Histéresis al perder la mano
            lastSwipeDirection = null;
            stableFrameCount = 0;
            swipeStartX = null;
            swipeStartY = null;

            if (cursorElement) {
                cursorElement.classList.remove('active', 'pinch', 'palm', 'stop', 'confirm', 'holding');
            }
            updateHoverHighlight(null);
        }

    } catch (error) {
        console.error('[Gestures] Error procesando frame:', error);
    }

    animationFrameId = requestAnimationFrame(processFrame);
}

// ============================================================================
// API PUBLICA
// ============================================================================

/**
 * Verifica si el navegador soporta las APIs necesarias
 */
export function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Inicializa el modulo de gestos
 * @param {HTMLVideoElement} videoEl - Elemento de video para la camara
 * @param {HTMLElement} overlayEl - Elemento cursor para overlay (opcional)
 * @param {Object} cbs - Callbacks opcionales { onPinch, onPalm, onCursorMove }
 */
export async function init(videoEl, overlayEl, cbs = {}) {
    console.log('[Gestures] init() llamado');
    if (!isSupported()) {
        console.error('[Gestures] getUserMedia no soportado');
        addLog('error', 'Gestos: getUserMedia no soportado');
        setServiceStatus('camera', false);
        setServiceStatus('model', false);
        return false;
    }

    videoElement = videoEl || document.getElementById('gesture-video');
    cursorElement = overlayEl || document.getElementById('gesture-cursor');

    callbacks = { ...callbacks, ...cbs };

    if (!videoElement) {
        addLog('error', 'Gestos: elemento de video no encontrado');
        return false;
    }

    addLog('system', 'Gestos: inicializando...');

    try {
        // Solicitar acceso a la camara
        console.log('[Gestures] Solicitando acceso a camara...');
        addLog('system', 'Gestos: solicitando acceso a camara...');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: CONFIG.VIDEO_WIDTH },
                height: { ideal: CONFIG.VIDEO_HEIGHT },
                facingMode: 'user'
            }
        });

        console.log('[Gestures] Camara obtenida, asignando a video...');
        videoElement.srcObject = stream;
        await videoElement.play();
        console.log('[Gestures] Video reproduciento...');

        setServiceStatus('camera', true);
        addLog('system', 'Gestos: camara OK');

        // Cargar modelo MediaPipe
        console.log('[Gestures] Cargando modelo GestureRecognizer...');
        addLog('system', 'Gestos: cargando modelo GestureRecognizer...');

        // Verificar que MediaPipe esté disponible
        // if (!window.FilesetResolver || !window.FilesetResolver.forVisionTasks) {
        //     console.error('[Gestures] ERROR: MediaPipe no encontrado en window');
        //     throw new Error('MediaPipe Tasks Vision no disponible. Verifica la conexion a Internet.');
        // }

        console.log('[Gestures] Creando FilesetResolver...');
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
        );
        console.log('[Gestures] FilesetResolver creado.');

        console.log('[Gestures] Creando GestureRecognizer...');
        console.log('[Gestures] Model URL:', CONFIG.MODEL_URL);

        try {
            // Timeout para evitar hang indefinido
            console.log('[Gestures] Iniciando createFromOptions...');
            const createGestureRecognizer = GestureRecognizer.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: CONFIG.MODEL_URL,
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: CONFIG.NUM_HANDS,
                minHandDetectionConfidence: CONFIG.MIN_DETECTION_CONFIDENCE,
                minTrackingConfidence: CONFIG.MIN_TRACKING_CONFIDENCE,
                minHandPresenceConfidence: CONFIG.MIN_HAND_PRESENCE_CONFIDENCE
            });

            console.log('[Gestures] createFromOptions iniciado, esperando respuesta...');

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout cargando modelo (15s)')), 15000)
            );

            gestureRecognizer = await Promise.race([createGestureRecognizer, timeoutPromise]);

            console.log('[Gestures] GestureRecognizer creado EXITOSAMENTE.');
            setServiceStatus('model', true);
            addLog('system', 'Gestos: modelo OK');

            return true;

        } catch (modelError) {
            console.error('[Gestures] ERROR creando GestureRecognizer:', modelError);
            throw modelError; // Re-lanzar para que lo capture el catch externo
        }

    } catch (error) {
        console.error('[Gestures] ERROR FATAL en init:', error);
        const errorMsg = error.name === 'NotAllowedError'
            ? 'Permiso de camara denegado'
            : error.name === 'NotFoundError'
                ? 'No se encontro camara'
                : error.message;

        addLog('error', `Gestos: ${errorMsg}`);
        setServiceStatus('camera', false);
        setServiceStatus('model', false);
        return false;
    }
}

/**
 * Inicia la deteccion de gestos
 */
export function startDetection() {
    if (!gestureRecognizer) {
        addLog('error', 'Gestos: modelo no inicializado');
        return false;
    }

    if (isRunning) return true;

    isRunning = true;
    addLog('system', 'Gestos: deteccion iniciada');

    // Iniciar loop
    processFrame();

    return true;
}

/**
 * Detiene la deteccion de gestos
 */
export function stopDetection() {
    isRunning = false;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (cursorElement) {
        cursorElement.classList.remove('active', 'pinch', 'palm', 'stop', 'confirm', 'holding');
    }

    updateHoverHighlight(null);

    addLog('system', 'Gestos: deteccion detenida');
}

/**
 * Detiene la camara completamente
 */
export function stopCamera() {
    stopDetection();

    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }

    setServiceStatus('camera', false);
    setServiceStatus('model', false);

    addLog('system', 'Gestos: camara detenida');
}

/**
 * Verifica si la deteccion esta activa
 */
export function isActive() {
    return isRunning;
}

// ============================================================================
// FUNCIONES LEGACY (compatibilidad con app.js existente)
// ============================================================================

export async function initGestures() {
    return init();
}

export async function requestCameraPermission() {
    // Ya se solicita en init()
    return getState().services.camera;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    isSupported,
    init,
    initGestures,
    requestCameraPermission,
    startDetection,
    stopDetection,
    stopCamera,
    isActive
};
