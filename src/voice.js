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
    addLog,
    MODES,
    setFilterCategory,
    setFilterNutriscore,
    clearFilters,
    CATEGORIES,
    NUTRISCORES
} from './store.js';

import {
    next as coverflowNext,
    prev as coverflowPrev,
    selectActive as coverflowSelectActive,
    addActiveToCart as coverflowAddToCart
} from './components/horizontalCoverflow.js';

// Instancia del reconocedor de voz
let recognition = null;

// Estado del modulo
let isListening = false;
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
        setServiceStatus('voiceActive', false);

        // Reiniciar automaticamente si la demo sigue activa
        const state = getState();
        if (state.demoStarted && state.services.microphone) {
            setTimeout(() => {
                if (state.demoStarted) {
                    startListening();
                }
            }, 100);
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
        if (event.error === 'no-speech') {
            // Ignorar errores de "no se detecto voz"
            return;
        }
        addLog('error', `Error de voz: ${event.error}`);
        setServiceStatus('voiceActive', false);
    };
}

/**
 * Procesa un comando de voz recibido
 * @param {string} transcript - Texto reconocido
 */
function processVoiceCommand(transcript) {
    for (const handler of commandHandlers) {
        if (handler.matches(transcript)) {
            addLog('voice', `Comando ejecutado: ${handler.name}`);
            handler.execute(transcript);
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
            console.log('[Voice] Ejecutando comando SIGUIENTE');
            const state = getState();
            console.log('[Voice] Estado:', state.currentMode, 'Filtros:', state.filters);
            // Solo funciona en modo browse con filtros activos (coverflow)
            if (state.currentMode === MODES.BROWSE &&
                (state.filters?.category || state.filters?.nutriscore)) {
                const result = coverflowNext();
                console.log('[Voice] coverflowNext resultado:', result);
                addLog('voice', 'Navegando al siguiente producto');
            } else {
                addLog('voice', 'Comando "siguiente" solo disponible en vista filtrada');
            }
        }
    });

    // Comando: Anterior producto
    registerCommand({
        name: 'anterior',
        matches: (text) => {
            return text.includes('anterior') ||
                   text.includes('previo') ||
                   text.includes('atrás') ||
                   text.includes('atras') ||
                   text.includes('retroceder');
        },
        execute: () => {
            const state = getState();
            // Solo funciona en modo browse con filtros activos (coverflow)
            if (state.currentMode === MODES.BROWSE &&
                (state.filters?.category || state.filters?.nutriscore)) {
                coverflowPrev();
                addLog('voice', 'Navegando al producto anterior');
            } else {
                addLog('voice', 'Comando "anterior" solo disponible en vista filtrada');
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
            // Solo funciona en modo browse con filtros activos (coverflow)
            if (state.currentMode === MODES.BROWSE &&
                (state.filters?.category || state.filters?.nutriscore)) {
                coverflowSelectActive();
                addLog('voice', 'Abriendo detalles del producto');
            } else {
                addLog('voice', 'Comando "detalles" solo disponible en vista filtrada');
            }
        }
    });

    // Comando: Ver productos / inicio
    registerCommand({
        name: 'ver productos',
        matches: (text) => {
            return text.includes('productos') ||
                   text.includes('catalogo') ||
                   text.includes('inicio') ||
                   text.includes('volver');
        },
        execute: () => {
            setMode(MODES.BROWSE);
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
                   text.includes('comprar');
        },
        execute: () => {
            const state = getState();

            // Si estamos en detalles, agregar el producto actual
            if (state.currentMode === MODES.DETAILS && state.selectedProduct) {
                addToCart(state.selectedProduct);
            } else if (state.currentMode === MODES.BROWSE && state.products.length > 0) {
                // En browse, agregar el primer producto como demo
                addToCart(state.products[0]);
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
            addLog('system', '-- FILTROS --');
            addLog('system', '- "snacks/bebidas/lacteos/cereales" - Filtrar categoria');
            addLog('system', '- "saludable" o "letra A/B/C/D/E" - Filtrar nutriscore');
            addLog('system', '- "mostrar todo" - Limpiar filtros');
            addLog('system', '-- COVERFLOW (vista filtrada) --');
            addLog('system', '- "siguiente" - Siguiente producto');
            addLog('system', '- "anterior" - Producto anterior');
            addLog('system', '- "detalles" - Ver detalles del producto');
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
