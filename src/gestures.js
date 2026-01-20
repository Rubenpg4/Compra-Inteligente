/**
 * gestures.js - Modulo de Deteccion de Gestos con MediaPipe
 * Utiliza MediaPipe Tasks Vision (HandLandmarker) para deteccion de manos
 * Implementa cursor virtual y gestos pinch/palm
 */

import {
    getState,
    setMode,
    setServiceStatus,
    addToCart,
    addLog,
    MODES
} from './store.js';

// ============================================================================
// CONFIGURACION
// ============================================================================

const CONFIG = {
    // Umbrales de gestos (aumentados para mejor detección)
    PINCH_THRESHOLD: 0.10,      // Distancia normalizada para detectar pinch
    PALM_THRESHOLD: 0.12,       // Distancia minima entre dedos para palm abierta

    // Cooldowns (ms)
    PINCH_COOLDOWN: 600,
    PALM_COOLDOWN: 800,

    // MediaPipe
    MODEL_URL: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    NUM_HANDS: 1,
    MIN_DETECTION_CONFIDENCE: 0.4,
    MIN_TRACKING_CONFIDENCE: 0.4,

    // Video
    VIDEO_WIDTH: 640,
    VIDEO_HEIGHT: 480,

    // Debug
    DEBUG: true
};

// Indices de landmarks de la mano (MediaPipe)
const LANDMARKS = {
    WRIST: 0,
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

let handLandmarker = null;
let videoElement = null;
let cursorElement = null;
let isRunning = false;
let animationFrameId = null;

// Cooldown timestamps
let lastPinchTime = 0;
let lastPalmTime = 0;

// Elemento actualmente bajo el cursor
let hoveredElement = null;

// Callbacks externos
let callbacks = {
    onPinch: null,
    onPalm: null,
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
 * Usa getBoundingClientRect del body para manejar múltiples pantallas correctamente
 */
function normalizedToViewport(x, y) {
    // Usar el tamaño del documento visible en la ventana actual
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

// ============================================================================
// DETECCION DE GESTOS
// ============================================================================

/**
 * Detecta si hay un gesto de pinch (pulgar-indice juntos)
 */
function detectPinch(landmarks) {
    const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
    const indexTip = landmarks[LANDMARKS.INDEX_TIP];

    const dist = distance2D(thumbTip, indexTip);
    return dist < CONFIG.PINCH_THRESHOLD;
}

/**
 * Detecta si la mano esta abierta (palm gesture)
 * Verifica que todos los dedos esten extendidos
 */
function detectOpenPalm(landmarks) {
    const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
    const indexTip = landmarks[LANDMARKS.INDEX_TIP];
    const middleTip = landmarks[LANDMARKS.MIDDLE_TIP];
    const ringTip = landmarks[LANDMARKS.RING_TIP];
    const pinkyTip = landmarks[LANDMARKS.PINKY_TIP];
    const wrist = landmarks[LANDMARKS.WRIST];

    // Verificar que los dedos esten separados entre si
    const indexMiddleDist = distance2D(indexTip, middleTip);
    const middleRingDist = distance2D(middleTip, ringTip);
    const ringPinkyDist = distance2D(ringTip, pinkyTip);

    // Verificar que los dedos esten lejos del pulgar (no es pinch)
    const thumbIndexDist = distance2D(thumbTip, indexTip);

    // Verificar que los dedos esten extendidos (lejos de la muñeca)
    const indexExtended = distance2D(indexTip, wrist) > 0.2;
    const middleExtended = distance2D(middleTip, wrist) > 0.2;
    const ringExtended = distance2D(ringTip, wrist) > 0.18;
    const pinkyExtended = distance2D(pinkyTip, wrist) > 0.15;

    const fingersSeparated = indexMiddleDist > 0.04 &&
                            middleRingDist > 0.03 &&
                            ringPinkyDist > 0.03;

    const notPinching = thumbIndexDist > CONFIG.PINCH_THRESHOLD * 1.5;

    const allExtended = indexExtended && middleExtended && ringExtended && pinkyExtended;

    return fingersSeparated && notPinching && allExtended;
}

// ============================================================================
// ACCIONES DE GESTOS
// ============================================================================

/**
 * Ejecuta la accion de pinch sobre el elemento actual
 */
function executePinchAction(element, cursorPos) {
    const now = Date.now();
    if (now - lastPinchTime < CONFIG.PINCH_COOLDOWN) return;
    lastPinchTime = now;

    addLog('gesture', 'GESTURE: pinch');

    // Feedback visual
    if (cursorElement) {
        cursorElement.classList.add('pinch');
        setTimeout(() => cursorElement.classList.remove('pinch'), 300);
    }

    if (!element) {
        // No hay elemento bajo el cursor, callback generico
        if (callbacks.onPinch) callbacks.onPinch(null, cursorPos);
        return;
    }

    const state = getState();

    // Pinch sobre card de producto -> abrir detalles
    if (element.classList.contains('product-card')) {
        const productId = element.dataset.productId;
        const product = state.products.find(p => p.id == productId);
        if (product) {
            addLog('gesture', `Pinch: abriendo producto ${product.name}`);
            setMode(MODES.DETAILS, { product });
        }
        return;
    }

    // Pinch sobre boton "Agregar" -> añadir al carrito
    if (element.classList.contains('btn-add-cart') || element.classList.contains('btn-add-cart-detail')) {
        const productId = element.dataset.productId;
        const product = state.products.find(p => p.id == productId);
        if (product) {
            addLog('gesture', `Pinch: agregando ${product.name} al carrito`);
            addToCart(product);
        } else if (state.currentMode === MODES.DETAILS && state.selectedProduct) {
            addLog('gesture', `Pinch: agregando ${state.selectedProduct.name} al carrito`);
            addToCart(state.selectedProduct);
        }
        return;
    }

    // Pinch sobre boton volver
    if (element.id === 'btn-back') {
        addLog('gesture', 'Pinch: volviendo al catalogo');
        setMode(MODES.BROWSE);
        return;
    }

    // Pinch sobre filtro
    if (element.classList.contains('filter-btn')) {
        addLog('gesture', 'Pinch: activando filtro');
        element.click();
        return;
    }

    // Callback generico
    if (callbacks.onPinch) callbacks.onPinch(element, cursorPos);
}

/**
 * Ejecuta la accion de palm (cerrar/cancelar)
 */
function executePalmAction() {
    const now = Date.now();
    if (now - lastPalmTime < CONFIG.PALM_COOLDOWN) return;
    lastPalmTime = now;

    addLog('gesture', 'GESTURE: palm');

    // Feedback visual
    if (cursorElement) {
        cursorElement.classList.add('palm');
        setTimeout(() => cursorElement.classList.remove('palm'), 400);
    }

    const state = getState();

    // Cerrar detalles -> volver a browse
    if (state.currentMode === MODES.DETAILS) {
        addLog('gesture', 'Palm: cerrando detalles');
        setMode(MODES.BROWSE);
        return;
    }

    // Cerrar carrito -> volver a browse
    if (state.currentMode === MODES.CART) {
        addLog('gesture', 'Palm: cerrando carrito');
        setMode(MODES.BROWSE);
        return;
    }

    // Callback generico
    if (callbacks.onPalm) callbacks.onPalm();
}

// ============================================================================
// LOOP DE DETECCION
// ============================================================================

/**
 * Procesa un frame de video y detecta gestos
 */
async function processFrame() {
    if (!isRunning || !handLandmarker || !videoElement) {
        return;
    }

    if (videoElement.readyState < 2) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
    }

    try {
        const startTimeMs = performance.now();
        const results = handLandmarker.detectForVideo(videoElement, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
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

            // Detectar gestos
            const isPinching = detectPinch(landmarks);
            const isPalmOpen = detectOpenPalm(landmarks);

            if (isPinching) {
                executePinchAction(elementUnderCursor, cursorPos);
            } else if (isPalmOpen) {
                executePalmAction();
            }

        } else {
            // No hay mano detectada, ocultar cursor
            if (cursorElement) {
                cursorElement.classList.remove('active', 'pinch', 'palm');
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
    if (!isSupported()) {
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
        addLog('system', 'Gestos: solicitando acceso a camara...');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: CONFIG.VIDEO_WIDTH },
                height: { ideal: CONFIG.VIDEO_HEIGHT },
                facingMode: 'user'
            }
        });

        videoElement.srcObject = stream;
        await videoElement.play();

        setServiceStatus('camera', true);
        addLog('system', 'Gestos: camara OK');

        // Cargar modelo MediaPipe
        addLog('system', 'Gestos: cargando modelo HandLandmarker...');

        // Verificar que MediaPipe esté disponible
        if (!window.FilesetResolver || !window.FilesetResolver.forVisionTasks) {
            throw new Error('MediaPipe Tasks Vision no disponible. Verifica la conexion a Internet.');
        }

        const vision = await window.FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
        );

        handLandmarker = await window.HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: CONFIG.MODEL_URL,
                delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: CONFIG.NUM_HANDS,
            minHandDetectionConfidence: CONFIG.MIN_DETECTION_CONFIDENCE,
            minTrackingConfidence: CONFIG.MIN_TRACKING_CONFIDENCE
        });

        setServiceStatus('model', true);
        addLog('system', 'Gestos: modelo OK');

        return true;

    } catch (error) {
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
    if (!handLandmarker) {
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
        cursorElement.classList.remove('active', 'pinch', 'palm');
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
