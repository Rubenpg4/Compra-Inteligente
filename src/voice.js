/**
 * voice.js - Modulo de Reconocimiento de Voz
 * Utiliza Web Speech API para reconocimiento de voz
 * Soporta comandos en espanol
 */

import {
    getState,
    setMode,
    setServiceStatus,
    addToCart,
    removeFromCart,
    decreaseCartItem,
    setCartActiveIndex,
    addLog,
    MODES,
    setFilterCategory,
    setFilterNutriscore,
    clearFilters,
    CATEGORIES,
    NUTRISCORES,
    acquireActionLock,
    releaseActionLock
} from './store.js';

import {
    next as coverflowNext,
    prev as coverflowPrev,
    selectActive as coverflowSelectActive,
    addActiveToCart as coverflowAddToCart
} from './components/horizontalCoverflow.js';

import { isGridViewActive, triggerDetailAddAnimation, showFeedback, handleCheckoutSuccess } from './ui.js';

// Instancia del reconocedor de voz
let recognition = null;

// Estado del modulo
let isListening = false;
let shouldBeListening = false; // Flag para reinicio automático
let commandHandlers = [];

// Configuracion por defecto
const config = {
    language: 'es-ES',
    continuous: true,
    interimResults: false,
    maxAlternatives: 1
};

/**
 * Verifica si el navegador soporta Web Speech API
 * @returns {boolean}
 */
export function isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Inicializa el reconocedor de voz
 * @returns {Promise<boolean>} true si se inicializo correctamente
 */
export async function initVoice() {
    if (!isSupported()) {
        addLog('error', 'Web Speech API no soportada en este navegador');
        return false;
    }

    try {
        // Crear instancia del reconocedor
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        // Configurar el reconocedor
        recognition.lang = config.language;
        recognition.continuous = config.continuous;
        recognition.interimResults = config.interimResults;
        recognition.maxAlternatives = config.maxAlternatives;

        // Configurar event handlers
        setupRecognitionHandlers();

        // Registrar comandos por defecto
        registerDefaultCommands();

        addLog('system', 'Reconocimiento de voz inicializado');
        return true;

    } catch (error) {
        addLog('error', `Error inicializando voz: ${error.message}`);
        return false;
    }
}

/**
 * Configura los handlers de eventos del reconocedor
 */
function setupRecognitionHandlers() {
    if (!recognition) return;

    recognition.onstart = () => {
        isListening = true;
        setServiceStatus('voiceActive', true);
        addLog('voice', 'Escuchando...');
    };

    recognition.onend = () => {
        isListening = false;

        // Reiniciar automáticamente si debería seguir escuchando
        if (shouldBeListening) {
            // Función de reinicio con reintento
            const restart = (attempt = 0) => {
                if (!shouldBeListening || attempt > 3) return;

                try {
                    recognition.start();
                    isListening = true;
                    setServiceStatus('voiceActive', true);
                } catch (e) {
                    // Si falla, reintentar con más delay
                    setTimeout(() => restart(attempt + 1), 100);
                }
            };

            // Iniciar reinicio inmediato
            setTimeout(restart, 30);
        } else {
            setServiceStatus('voiceActive', false);
        }
    };

    recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
            const transcript = result[0].transcript.toLowerCase().trim();
            const confidence = result[0].confidence;

            addLog('voice', `Escuchado: "${transcript}" (${(confidence * 100).toFixed(0)}%)`);
            processVoiceCommand(transcript);
        }
    };

    recognition.onerror = (event) => {
        // Ignorar errores comunes que no afectan el funcionamiento
        if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
        }

        // Solo mostrar error si es relevante
        if (event.error !== 'network') {
            addLog('error', `Error de voz: ${event.error}`);
        }

        // No desactivar el servicio, dejar que onend maneje el reinicio
    };
}

/**
 * Procesa un comando de voz recibido
 * @param {string} transcript - Texto reconocido
 */
function processVoiceCommand(transcript) {
    for (const handler of commandHandlers) {
        if (handler.matches(transcript)) {
            // Intentar adquirir lock para evitar conflictos con gestos
            if (!acquireActionLock('voice')) {
                addLog('voice', `Comando "${handler.name}" bloqueado (gesto en curso)`);
                return;
            }

            try {
                addLog('voice', `Comando ejecutado: ${handler.name}`);
                handler.execute(transcript);
            } finally {
                // Siempre liberar el lock
                releaseActionLock('voice');
            }
            return;
        }
    }

    addLog('voice', `Comando no reconocido: "${transcript}"`);
}

/**
 * Registra los comandos de voz por defecto
 */
function registerDefaultCommands() {
    // Comando: Ver carrito
    registerCommand({
        name: 'ver carrito',
        matches: (text) => {
            return text.includes('carrito') ||
                   text.includes('ver carrito') ||
                   text.includes('abrir carrito') ||
                   text.includes('mostrar carrito');
        },
        execute: () => {
            setMode(MODES.CART);
        }
    });

    // ========================================
    // COMANDOS DE NAVEGACION COVERFLOW
    // ========================================

    // Comando: Siguiente producto
    registerCommand({
        name: 'siguiente',
        matches: (text) => {
            return text.includes('siguiente') ||
                   text.includes('próximo') ||
                   text.includes('proximo') ||
                   text.includes('avanzar') ||
                   text.includes('adelante');
        },
        execute: () => {
            const state = getState();
            // Funciona en modo browse con vista coverflow (no grid)
            if (state.currentMode === MODES.BROWSE && !isGridViewActive()) {
                coverflowNext();
                addLog('voice', 'Navegando al siguiente producto');
            }
            // También funciona en el carrito
            else if (state.currentMode === MODES.CART && state.cart.length > 0) {
                const newIndex = state.cartActiveIndex + 1;
                if (newIndex < state.cart.length) {
                    setCartActiveIndex(newIndex);
                    addLog('voice', 'Navegando al siguiente en carrito');
                } else {
                    addLog('voice', 'Ya estás en el último producto del carrito');
                }
            } else {
                addLog('voice', 'Comando "siguiente" disponible en coverflow o carrito');
            }
        }
    });

    // Comando: Anterior producto
    registerCommand({
        name: 'anterior',
        matches: (text) => {
            return text.includes('anterior') ||
                   text.includes('previo') ||
                   text.includes('retroceder');
        },
        execute: () => {
            const state = getState();
            // Funciona en modo browse con vista coverflow (no grid)
            if (state.currentMode === MODES.BROWSE && !isGridViewActive()) {
                coverflowPrev();
                addLog('voice', 'Navegando al producto anterior');
            }
            // También funciona en el carrito
            else if (state.currentMode === MODES.CART && state.cart.length > 0) {
                const newIndex = state.cartActiveIndex - 1;
                if (newIndex >= 0) {
                    setCartActiveIndex(newIndex);
                    addLog('voice', 'Navegando al anterior en carrito');
                } else {
                    addLog('voice', 'Ya estás en el primer producto del carrito');
                }
            } else {
                addLog('voice', 'Comando "anterior" disponible en coverflow o carrito');
            }
        }
    });

    // Comando: Ver detalles del producto actual
    registerCommand({
        name: 'ver detalles',
        matches: (text) => {
            return text.includes('ver detalles') ||
                   text.includes('detalles') ||
                   text.includes('más información') ||
                   text.includes('mas informacion') ||
                   text.includes('abrir producto') ||
                   text.includes('seleccionar');
        },
        execute: () => {
            const state = getState();

            // En coverflow (browse), abrir detalles del producto activo
            if (state.currentMode === MODES.BROWSE && !isGridViewActive()) {
                coverflowSelectActive();
                addLog('voice', 'Abriendo detalles del producto');
            }
            // En carrito, abrir detalles del producto activo del carrito
            else if (state.currentMode === MODES.CART && state.cart.length > 0) {
                const currentItem = state.cart[state.cartActiveIndex];
                if (currentItem) {
                    // Buscar el producto original en la lista de productos
                    const product = state.products.find(p => p.id === currentItem.id) || currentItem;
                    setMode(MODES.DETAILS, { product });
                    addLog('voice', `Viendo detalles de "${currentItem.name}"`);
                }
            }
            else {
                addLog('voice', 'Comando "detalles" disponible en coverflow o carrito');
            }
        }
    });

    // Comando: Ver productos / inicio
    registerCommand({
        name: 'ver productos',
        matches: (text) => {
            return text.includes('productos') ||
                   text.includes('catalogo') ||
                   text.includes('inicio');
        },
        execute: () => {
            setMode(MODES.BROWSE);
            showFeedback('TIENDA', 'info');
        }
    });

    // Comando: Atrás (Smart Back - igual que gesto Open_Palm)
    registerCommand({
        name: 'atrás',
        matches: (text) => {
            return text.includes('atrás') ||
                   text.includes('atras') ||
                   text.includes('volver') ||
                   text.includes('regresar') ||
                   text.includes('salir');
        },
        execute: () => {
            const state = getState();

            if (state.currentMode === MODES.CART) {
                setMode(MODES.BROWSE);
                showFeedback('VOLVER A TIENDA', 'warning');
                addLog('voice', 'Volviendo a la tienda');
            }
            else if (state.currentMode === MODES.DETAILS) {
                // Smart Back: Si venimos del carrito, volver al carrito
                if (state.previousMode === MODES.CART) {
                    setMode(MODES.CART);
                    showFeedback('VOLVER AL CARRITO', 'warning');
                    addLog('voice', 'Volviendo al carrito');
                } else {
                    setMode(MODES.BROWSE);
                    showFeedback('VOLVER A TIENDA', 'warning');
                    addLog('voice', 'Volviendo a la tienda');
                }
            }
            else if (state.currentMode === MODES.CHECKOUT) {
                setMode(MODES.CART);
                showFeedback('CANCELADO', 'error');
                addLog('voice', 'Compra cancelada, volviendo al carrito');
            }
            else {
                addLog('voice', 'Ya estás en la vista principal');
            }
        }
    });

    // Comando: Ver producto especifico
    registerCommand({
        name: 'ver producto',
        matches: (text) => {
            return text.includes('ver ') && !text.includes('carrito');
        },
        execute: (text) => {
            const state = getState();
            // Extraer nombre del producto del comando
            const productName = text.replace(/ver\s+/i, '').replace(/producto\s*/i, '').trim();

            // Buscar producto que coincida
            const product = state.products.find(p =>
                p.name.toLowerCase().includes(productName) ||
                productName.includes(p.name.toLowerCase())
            );

            if (product) {
                setMode(MODES.DETAILS, { product });
            } else {
                addLog('voice', `Producto "${productName}" no encontrado`);
            }
        }
    });

    // Comando: Agregar al carrito
    registerCommand({
        name: 'agregar al carrito',
        matches: (text) => {
            return text.includes('agregar') ||
                   text.includes('anadir') ||
                   text.includes('añadir') ||
                   text.includes('comprar');
        },
        execute: () => {
            const state = getState();

            // Si estamos en detalles, agregar el producto actual
            if (state.currentMode === MODES.DETAILS && state.selectedProduct) {
                addToCart(state.selectedProduct);
                triggerDetailAddAnimation();
                addLog('voice', `"${state.selectedProduct.name}" añadido al carrito`);
            } else if (state.currentMode === MODES.BROWSE && !isGridViewActive()) {
                // En coverflow, agregar el producto activo
                const added = coverflowAddToCart();
                if (added) {
                    showFeedback('AÑADIDO AL CARRITO', 'success');
                }
            } else {
                addLog('voice', 'Usa este comando en la vista de detalles o coverflow');
            }
        }
    });

    // ========================================
    // COMANDOS DE FILTROS
    // ========================================

    // Comando: Filtrar por categoria
    registerCommand({
        name: 'filtrar categoria',
        matches: (text) => {
            // Detectar nombres de categorias en español e ingles
            const categoryKeywords = {
                snacks: ['snacks', 'snack', 'aperitivos', 'aperitivo', 'botanas'],
                drinks: ['drinks', 'bebidas', 'bebida', 'refrescos', 'refresco'],
                dairy: ['dairy', 'lacteos', 'lacteo', 'leche', 'yogur', 'queso'],
                cereals: ['cereals', 'cereales', 'cereal']
            };

            for (const keywords of Object.values(categoryKeywords)) {
                if (keywords.some(kw => text.includes(kw))) {
                    return true;
                }
            }
            return false;
        },
        execute: (text) => {
            const categoryKeywords = {
                snacks: ['snacks', 'snack', 'aperitivos', 'aperitivo', 'botanas'],
                drinks: ['drinks', 'bebidas', 'bebida', 'refrescos', 'refresco'],
                dairy: ['dairy', 'lacteos', 'lacteo', 'leche', 'yogur', 'queso'],
                cereals: ['cereals', 'cereales', 'cereal']
            };

            for (const [category, keywords] of Object.entries(categoryKeywords)) {
                if (keywords.some(kw => text.includes(kw))) {
                    setFilterCategory(category);
                    addLog('voice', `Filtrado por categoria: ${category}`);
                    return;
                }
            }
        }
    });

    // Comando: Filtrar por nutriscore
    registerCommand({
        name: 'filtrar nutriscore',
        matches: (text) => {
            // Detectar nutriscore o terminos relacionados
            return text.includes('nutriscore') ||
                   text.includes('nutricion') ||
                   text.includes('saludable') ||
                   text.includes('sano') ||
                   text.includes('letra a') ||
                   text.includes('letra b') ||
                   text.includes('letra c') ||
                   text.includes('letra d') ||
                   text.includes('letra e') ||
                   /\b(solo|filtrar|mostrar)\s+[abcde]\b/.test(text);
        },
        execute: (text) => {
            // Mapeo de terminos a nutriscore
            if (text.includes('saludable') || text.includes('sano') || text.includes('letra a')) {
                setFilterNutriscore('A');
                addLog('voice', 'Filtrado por nutriscore: A (mas saludable)');
            } else if (text.includes('letra b') || /\bsolo b\b/.test(text) || /\bfiltrar b\b/.test(text)) {
                setFilterNutriscore('B');
                addLog('voice', 'Filtrado por nutriscore: B');
            } else if (text.includes('letra c') || /\bsolo c\b/.test(text) || /\bfiltrar c\b/.test(text)) {
                setFilterNutriscore('C');
                addLog('voice', 'Filtrado por nutriscore: C');
            } else if (text.includes('letra d') || /\bsolo d\b/.test(text) || /\bfiltrar d\b/.test(text)) {
                setFilterNutriscore('D');
                addLog('voice', 'Filtrado por nutriscore: D');
            } else if (text.includes('letra e') || /\bsolo e\b/.test(text) || /\bfiltrar e\b/.test(text)) {
                setFilterNutriscore('E');
                addLog('voice', 'Filtrado por nutriscore: E');
            } else {
                // Buscar letra A-E en el texto
                const match = text.match(/\b([abcde])\b/i);
                if (match) {
                    const score = match[1].toUpperCase();
                    setFilterNutriscore(score);
                    addLog('voice', `Filtrado por nutriscore: ${score}`);
                }
            }
        }
    });

    // Comando: Limpiar filtros
    registerCommand({
        name: 'limpiar filtros',
        matches: (text) => {
            return text.includes('limpiar filtro') ||
                   text.includes('quitar filtro') ||
                   text.includes('borrar filtro') ||
                   text.includes('sin filtro') ||
                   text.includes('mostrar todo') ||
                   text.includes('ver todo') ||
                   text.includes('todos los producto');
        },
        execute: () => {
            clearFilters();
            addLog('voice', 'Filtros eliminados - mostrando todos los productos');
        }
    });

    // ========================================
    // COMANDOS DE CARRITO
    // ========================================

    // Comando: Quitar del carrito
    registerCommand({
        name: 'quitar del carrito',
        matches: (text) => {
            return text.includes('quitar') ||
                   text.includes('eliminar') ||
                   text.includes('borrar') ||
                   text.includes('sacar');
        },
        execute: () => {
            const state = getState();

            if (state.currentMode === MODES.CART && state.cart.length > 0) {
                const currentItem = state.cart[state.cartActiveIndex];
                if (currentItem) {
                    // Decrementar cantidad o eliminar si es 1
                    if (currentItem.cartQty > 1) {
                        decreaseCartItem(currentItem);
                        showFeedback(`-1 ${currentItem.name}`, 'warning');
                        addLog('voice', `Reducida cantidad de "${currentItem.name}"`);
                    } else {
                        removeFromCart(currentItem.id);
                        showFeedback('ELIMINADO', 'error');
                        addLog('voice', `"${currentItem.name}" eliminado del carrito`);
                    }
                }
            } else {
                addLog('voice', 'Usa este comando en la vista del carrito');
            }
        }
    });

    // Comando: Finalizar compra
    registerCommand({
        name: 'finalizar compra',
        matches: (text) => {
            return text.includes('finalizar') ||
                   text.includes('terminar') ||
                   text.includes('pagar') ||
                   text.includes('checkout') ||
                   text.includes('confirmar compra');
        },
        execute: () => {
            const state = getState();

            if (state.cart.length === 0) {
                addLog('voice', 'El carrito está vacío');
                return;
            }

            if (state.currentMode === MODES.CART) {
                // Ir al checkout
                setMode(MODES.CHECKOUT);
                addLog('voice', 'Mostrando confirmación de compra');
            } else if (state.currentMode === MODES.CHECKOUT) {
                // Confirmar la compra
                handleCheckoutSuccess();
                addLog('voice', '¡Compra realizada con éxito!');
            } else {
                // Desde cualquier vista, ir al carrito primero
                setMode(MODES.CART);
                addLog('voice', 'Ve al carrito y di "finalizar" para comprar');
            }
        }
    });

    // Comando: Cancelar compra (en checkout)
    registerCommand({
        name: 'cancelar',
        matches: (text) => {
            return text.includes('cancelar') ||
                   text.includes('no') ||
                   text.includes('rechazar');
        },
        execute: () => {
            const state = getState();

            if (state.currentMode === MODES.CHECKOUT) {
                setMode(MODES.CART);
                showFeedback('CANCELADO', 'error');
                addLog('voice', 'Compra cancelada');
            } else {
                addLog('voice', 'Comando "cancelar" solo disponible en confirmación de compra');
            }
        }
    });

    // Comando: Aceptar compra (en checkout)
    registerCommand({
        name: 'aceptar',
        matches: (text) => {
            return text.includes('aceptar') ||
                   text.includes('confirmar') ||
                   text.includes('sí') ||
                   text.includes('si') ||
                   text.includes('ok') ||
                   text.includes('vale');
        },
        execute: () => {
            const state = getState();

            if (state.currentMode === MODES.CHECKOUT) {
                handleCheckoutSuccess();
                addLog('voice', '¡Compra realizada con éxito!');
            } else {
                addLog('voice', 'Comando "aceptar" solo disponible en confirmación de compra');
            }
        }
    });

    // Comando: Ayuda
    registerCommand({
        name: 'ayuda',
        matches: (text) => {
            return text.includes('ayuda') || text.includes('comandos');
        },
        execute: () => {
            addLog('system', 'Comandos disponibles:');
            addLog('system', '-- NAVEGACION --');
            addLog('system', '- "ver carrito" - Abrir el carrito');
            addLog('system', '- "ver productos" - Ver catalogo');
            addLog('system', '- "ver [producto]" - Ver detalles');
            addLog('system', '- "agregar" - Agregar al carrito');
            addLog('system', '- "atrás/volver" - Volver a vista anterior');
            addLog('system', '-- FILTROS --');
            addLog('system', '- "snacks/bebidas/lacteos/cereales" - Filtrar categoria');
            addLog('system', '- "saludable" o "letra A/B/C/D/E" - Filtrar nutriscore');
            addLog('system', '- "mostrar todo" - Limpiar filtros');
            addLog('system', '-- COVERFLOW/CARRITO --');
            addLog('system', '- "siguiente" - Siguiente producto');
            addLog('system', '- "anterior" - Producto anterior');
            addLog('system', '- "detalles" - Ver detalles del producto');
            addLog('system', '-- CARRITO --');
            addLog('system', '- "quitar" - Quitar producto del carrito');
            addLog('system', '- "finalizar" - Ir a confirmación de compra');
            addLog('system', '-- CONFIRMACIÓN --');
            addLog('system', '- "aceptar/sí/confirmar" - Confirmar compra');
            addLog('system', '- "cancelar/no" - Cancelar compra');
        }
    });
}

/**
 * Registra un nuevo comando de voz
 * @param {Object} command - Definicion del comando
 * @param {string} command.name - Nombre del comando
 * @param {Function} command.matches - Funcion que verifica si el texto coincide
 * @param {Function} command.execute - Funcion a ejecutar cuando coincide
 */
export function registerCommand(command) {
    if (!command.name || !command.matches || !command.execute) {
        console.error('[Voice] Comando invalido:', command);
        return;
    }
    commandHandlers.push(command);
}

/**
 * Inicia el reconocimiento de voz
 * @returns {Promise<boolean>}
 */
export async function startListening() {
    if (!recognition) {
        addLog('error', 'Reconocedor no inicializado');
        return false;
    }

    shouldBeListening = true;

    if (isListening) {
        return true;
    }

    try {
        recognition.start();
        return true;
    } catch (error) {
        addLog('error', `Error al iniciar escucha: ${error.message}`);
        return false;
    }
}

/**
 * Detiene el reconocimiento de voz
 */
export function stopListening() {
    shouldBeListening = false;
    if (recognition && isListening) {
        recognition.stop();
        isListening = false;
        setServiceStatus('voiceActive', false);
    }
}

/**
 * Solicita permisos de microfono
 * @returns {Promise<boolean>}
 */
export async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Detener el stream (solo necesitabamos el permiso)
        stream.getTracks().forEach(track => track.stop());

        setServiceStatus('microphone', true);
        addLog('system', 'Permiso de microfono concedido');
        return true;

    } catch (error) {
        setServiceStatus('microphone', false);
        addLog('error', `Permiso de microfono denegado: ${error.message}`);
        return false;
    }
}

/**
 * Verifica si el reconocimiento esta activo
 * @returns {boolean}
 */
export function isActive() {
    return isListening;
}

// TODO: Implementar sintesis de voz (text-to-speech) para feedback auditivo
// TODO: Agregar comandos de voz personalizables
// TODO: Implementar wake word ("Hey Demo")
// TODO: Mejorar reconocimiento con fuzzy matching
// TODO: Agregar soporte multi-idioma

export default {
    isSupported,
    initVoice,
    startListening,
    stopListening,
    requestMicrophonePermission,
    registerCommand,
    isActive
};
