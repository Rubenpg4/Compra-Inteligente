/**
 * app.js - Modulo Principal de la Aplicacion
 * Orquesta todos los modulos y maneja la inicializacion
 * Punto de entrada de la SPA multimodal
 */

import { setState, setProducts, addLog, getState } from './store.js';
import { initUI, showLoadingStatus } from './ui.js';
import { initVoice, requestMicrophonePermission, startListening, isSupported as isVoiceSupported } from './voice.js';
import { init as initGesturesModule, startDetection, isSupported as isGesturesSupported } from './gestures.js';

// Version de la aplicacion
const APP_VERSION = '1.0.0';

/**
 * Carga los productos desde el archivo JSON
 * @returns {Promise<Array>}
 */
async function loadProducts() {
    try {
        const response = await fetch('./data/products.json');
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
 * Inicializa todos los servicios y carga los datos
 */
async function onStartDemo() {
    addLog('system', `Iniciando Demo Multimodal v${APP_VERSION}`);
    addLog('system', 'Solicitando permisos...');

    // Marcar demo como iniciada
    setState({ demoStarted: true });

    try {
        // Cargar productos
        await loadProducts();

        // Inicializar servicios multimodales
        const serviceResults = await initMultimodalServices();

        // Log de resultados
        if (serviceResults.voice && serviceResults.microphone) {
            addLog('system', 'Reconocimiento de voz: ACTIVO');
        } else {
            addLog('system', 'Reconocimiento de voz: NO DISPONIBLE');
        }

        if (serviceResults.gestures && serviceResults.camera) {
            addLog('system', 'Deteccion de gestos: ACTIVO');
        } else {
            addLog('system', 'Deteccion de gestos: NO DISPONIBLE');
        }

        addLog('system', '¡Demo lista! Prueba comandos de voz o gestos');
        addLog('system', 'Di "ayuda" para ver comandos disponibles');

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

    // Inicializar UI (esto configura los event listeners)
    initUI(onStartDemo);

    // Intentar registrar Service Worker
    await registerServiceWorker();

    // Log inicial
    addLog('system', 'Aplicacion cargada correctamente');
    addLog('system', 'Presiona "Iniciar Demo" para comenzar');

    // Mostrar info de compatibilidad
    if (!compat.speechRecognition) {
        addLog('system', 'Nota: Reconocimiento de voz no disponible en este navegador');
    }
    if (!compat.getUserMedia) {
        addLog('system', 'Nota: Camara no disponible en este navegador');
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
