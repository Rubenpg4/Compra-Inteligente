/**
 * app.js - Modulo Principal de la Aplicacion
 * Orquesta todos los modulos y maneja la inicializacion
 * Punto de entrada de la SPA multimodal
 */

import { setState, setProducts, addLog, getState } from './store.js';
import { initUI, showLoadingStatus } from './ui.js';
import { initVoice, requestMicrophonePermission, startListening, isSupported as isVoiceSupported } from './voice.js';
import { init as initGesturesModule, startDetection, isSupported as isGesturesSupported, stopCamera } from './gestures.js';

// Version de la aplicacion
const APP_VERSION = '1.0.0';

/**
 * Carga los productos desde el archivo JSON
 * @returns {Promise<Array>}
 */
async function loadProducts() {
    try {
        const response = await fetch('/data/products.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();

        // Soportar ambos formatos: { meta, products } o array directo
        const products = Array.isArray(data) ? data : data.products;

        if (!products || products.length === 0) {
            throw new Error('No se encontraron productos');
        }

        setProducts(products);
        addLog('system', `${products.length} productos cargados`);
        return products;
    } catch (error) {
        addLog('error', `Error cargando productos: ${error.message}`);

        // Cargar productos de fallback para demo offline
        const fallbackProducts = [
            { id: 1, name: 'Agua Mineral', brand: 'Bezoya', category: 'drinks', image: null, nutriscore: 'A', quantity: '1.5L', keywords: ['agua', 'mineral'] },
            { id: 2, name: 'Yogur Natural', brand: 'Danone', category: 'dairy', image: null, nutriscore: 'A', quantity: '4x125g', keywords: ['yogur', 'natural'] },
            { id: 3, name: 'Corn Flakes', brand: 'Kelloggs', category: 'cereals', image: null, nutriscore: 'B', quantity: '500g', keywords: ['cereales', 'maiz'] },
            { id: 4, name: 'Patatas Fritas', brand: 'Lays', category: 'snacks', image: null, nutriscore: 'D', quantity: '150g', keywords: ['patatas', 'snack'] },
            { id: 5, name: 'Leche Entera', brand: 'Pascual', category: 'dairy', image: null, nutriscore: 'A', quantity: '1L', keywords: ['leche', 'calcio'] },
            { id: 6, name: 'Zumo Naranja', brand: 'Tropicana', category: 'drinks', image: null, nutriscore: 'C', quantity: '1L', keywords: ['zumo', 'naranja'] }
        ];

        addLog('system', 'Usando productos de fallback (offline)');
        setProducts(fallbackProducts);
        return fallbackProducts;
    }
}

/**
 * Inicializa los servicios multimodales (voz y gestos)
 * @returns {Promise<Object>} Estado de inicializacion de cada servicio
 */
async function initMultimodalServices() {
    const results = {
        voice: false,
        gestures: false,
        microphone: false,
        camera: false
    };

    // Inicializar modulo de voz
    if (isVoiceSupported()) {
        showLoadingStatus('microphone');
        results.voice = await initVoice();

        if (results.voice) {
            results.microphone = await requestMicrophonePermission();
            if (results.microphone) {
                await startListening();
            }
        }
    } else {
        addLog('error', 'Web Speech API no disponible');
    }

    // Inicializar modulo de gestos (camara + modelo MediaPipe)
    // Inicializar modulo de gestos (camara + modelo MediaPipe)
    if (isGesturesSupported()) {
        showLoadingStatus('camera');
        showLoadingStatus('model');

        // init() solicita camara y carga modelo en un solo paso
        const gesturesReady = await initGesturesModule();

        if (gesturesReady) {
            results.gestures = true;
            results.camera = true;
            startDetection();
        }
    } else {
        addLog('error', 'getUserMedia no disponible');
    }

    return results;
}

/**
 * Handler para el boton "Iniciar Demo"
 * Activa los servicios multimodales (voz)
 * Los productos ya estan cargados automaticamente
 */
async function onStartDemo() {
    addLog('system', `Iniciando servicios multimodales v${APP_VERSION}`);
    addLog('system', 'Solicitando permisos...');

    const state = getState();
    if (state.demoStarted) {
        addLog('system', 'Desactivando cámara...');
        try {
            stopCamera();
        } catch (e) {
            console.error('[App] Error al detener cámara:', e);
            addLog('error', 'Error al detener cámara');
        }
        setState({ demoStarted: false });
        return;
    }

    // Marcar demo como iniciada
    setState({ demoStarted: true });

    try {
        // Inicializar servicios multimodales (voz)
        const serviceResults = await initMultimodalServices();

        // Log de resultados
        if (serviceResults.voice && serviceResults.microphone) {
            addLog('system', 'Reconocimiento de voz: ACTIVO');
            addLog('system', 'Di "ayuda" para ver comandos disponibles');
        } else {
            addLog('system', 'Reconocimiento de voz: NO DISPONIBLE');
        }

        addLog('system', '¡Demo lista! Usa teclado o voz para navegar');

    } catch (error) {
        addLog('error', `Error iniciando demo: ${error.message}`);
        setState({ demoStarted: false });
    }
}

/**
 * Registra el Service Worker para funcionalidad offline
 * @returns {Promise<boolean>}
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // TODO: Crear service-worker.js para cache offline
            // const registration = await navigator.serviceWorker.register('./service-worker.js');
            // addLog('system', 'Service Worker registrado');
            // return true;
            addLog('system', 'Service Worker pendiente de implementar');
            return false;
        } catch (error) {
            addLog('error', `Error registrando SW: ${error.message}`);
            return false;
        }
    }
    return false;
}

/**
 * Verifica la compatibilidad del navegador
 * @returns {Object} Resultados de compatibilidad
 */
function checkBrowserCompatibility() {
    const compatibility = {
        es6Modules: 'noModule' in document.createElement('script'),
        speechRecognition: isVoiceSupported(),
        getUserMedia: isGesturesSupported(),
        serviceWorker: 'serviceWorker' in navigator,
        localStorage: (() => {
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                return true;
            } catch (e) {
                return false;
            }
        })()
    };

    return compatibility;
}

/**
 * Punto de entrada principal de la aplicacion
 */
async function main() {
    console.log(`[App] Demo Multimodal v${APP_VERSION}`);
    console.log('[App] Inicializando...');

    // Verificar compatibilidad
    const compat = checkBrowserCompatibility();
    console.log('[App] Compatibilidad:', compat);

    if (!compat.es6Modules) {
        alert('Tu navegador no soporta ES6 Modules. Por favor usa un navegador moderno.');
        return;
    }

    // CARGAR PRODUCTOS PRIMERO (antes de UI)
    console.log('[App] Cargando productos...');
    const products = await loadProducts();
    console.log('[App] Productos cargados:', products?.length);

    // Inicializar UI (esto configura los event listeners y renderiza)
    initUI(onStartDemo);

    // Intentar registrar Service Worker (en background)
    registerServiceWorker();

    // Log inicial
    addLog('system', `${products?.length || 0} productos cargados`);
    addLog('system', 'Usa ↑↓ para navegar, Enter para detalles');

    // Mostrar info de compatibilidad
    if (!compat.speechRecognition) {
        addLog('system', 'Nota: Reconocimiento de voz no disponible en este navegador');
    }

    console.log('[App] Inicializacion completa');
}

// Ejecutar cuando el DOM este listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

// TODO: Implementar Service Worker para cache offline completo
// TODO: Agregar analytics de uso multimodal
// TODO: Implementar modo de entrenamiento de gestos
// TODO: Agregar soporte para multiples idiomas
// TODO: Implementar tests E2E

// Exponer funciones utiles para debugging
if (typeof window !== 'undefined') {
    window.appDebug = {
        getState,
        version: APP_VERSION,
        checkCompatibility: checkBrowserCompatibility
    };
}

export { onStartDemo, loadProducts, checkBrowserCompatibility };
