/**
 * store.js - Modulo de Estado Global
 * Implementa un store reactivo simple para la SPA
 * Patron: Observer + State Management
 */

// Modos de la aplicacion SPA
export const MODES = {
    BROWSE: 'BROWSE',
    DETAILS: 'DETAILS',
    CART: 'CART',
    CHECKOUT: 'CHECKOUT'
};

// Categorias disponibles
export const CATEGORIES = ['snacks', 'drinks', 'dairy', 'cereals'];

// Nutriscore disponibles
export const NUTRISCORES = ['A', 'B', 'C', 'D', 'E'];

// Estado inicial de la aplicacion
const initialState = {
    // Modo actual de la SPA
    currentMode: MODES.BROWSE,
    previousMode: null,

    // Producto seleccionado para vista DETAILS
    selectedProduct: null,

    // Lista de productos cargados
    products: [],

    // Carrito de compras
    cart: [],

    // Filtros activos
    filters: 'todas',    // todas, o 'snacks', 'drinks', etc.

    // Estado de los servicios multimodales
    services: {
        camera: false,      // Camara activada
        microphone: false,  // Microfono activado
        model: false,       // Modelo ML cargado
        voiceActive: false  // Reconocimiento de voz activo
    },

    // Demo iniciada
    demoStarted: false,

    // Log de eventos multimodales
    logs: [],

    // Indice del producto activo en el carrito (Coverflow)
    cartActiveIndex: 0
};

// Estado actual (copia del inicial)
let state = JSON.parse(JSON.stringify(initialState));

// Suscriptores para cambios de estado
const subscribers = new Set();

/**
 * Obtiene el estado actual (copia inmutable)
 * @returns {Object} Estado actual
 */
export function getState() {
    return JSON.parse(JSON.stringify(state));
}

/**
 * Actualiza el estado y notifica a los suscriptores
 * @param {Object} partialState - Propiedades a actualizar
 */
export function setState(partialState) {
    const prevState = state;
    state = { ...state, ...partialState };

    // Notificar a todos los suscriptores
    subscribers.forEach(callback => {
        try {
            callback(state, prevState);
        } catch (error) {
            console.error('[Store] Error en subscriber:', error);
        }
    });
}

/**
 * Suscribirse a cambios de estado
 * @param {Function} callback - Funcion a llamar cuando cambie el estado
 * @returns {Function} Funcion para desuscribirse
 */
export function subscribe(callback) {
    subscribers.add(callback);

    // Retorna funcion de cleanup
    return () => {
        subscribers.delete(callback);
    };
}

/**
 * Cambia el modo de la aplicacion (BROWSE, DETAILS, CART)
 * @param {string} mode - Nuevo modo
 * @param {Object} payload - Datos adicionales (ej: producto seleccionado)
 */
export function setMode(mode, payload = {}) {
    if (!Object.values(MODES).includes(mode)) {
        console.error('[Store] Modo invalido:', mode);
        return;
    }

    const updates = {
        currentMode: mode,
        previousMode: state.currentMode
    };

    if (mode === MODES.DETAILS && payload.product) {
        updates.selectedProduct = payload.product;
    }

    setState(updates);
    addLog('system', `Modo cambiado a: ${mode}`);
}

/**
 * Actualiza el estado de un servicio multimodal
 * @param {string} service - Nombre del servicio
 * @param {boolean} status - Estado activo/inactivo
 */
export function setServiceStatus(service, status) {
    const services = { ...state.services, [service]: status };
    setState({ services });
}

/**
 * Agrega un producto al carrito
 * @param {Object} product - Producto a agregar
 */
export function addToCart(product) {
    const existingItem = state.cart.find(item => item.id === product.id);
    let newCart;

    if (existingItem) {
        newCart = state.cart.map(item =>
            item.id === product.id
                ? { ...item, cartQty: item.cartQty + 1 }
                : item
        );
    } else {
        // cartQty = cantidad en carrito (numero)
        // quantity = tamaño del producto ("1L", "500g", etc.)
        newCart = [...state.cart, { ...product, cartQty: 1 }];
    }

    setState({ cart: newCart });
    addLog('cart', `Producto agregado: ${product.name}`);
}

/**
 * Elimina un producto del carrito
 * @param {string|number} productId - ID del producto a eliminar
 */
export function removeFromCart(productId) {
    const newCart = state.cart.filter(item => item.id !== productId);

    // Auto-ajustar indice
    let newIndex = state.cartActiveIndex;
    if (newIndex >= newCart.length) {
        newIndex = Math.max(0, newCart.length - 1);
    }

    setState({ cart: newCart, cartActiveIndex: newIndex });
    addLog('cart', 'Producto eliminado del carrito');
}

/**
 * Decrementa la cantidad de un producto en el carrito
 * @param {Object} product - Producto a decrementar
 */
export function decreaseCartItem(product) {
    const existingItem = state.cart.find(item => item.id === product.id);
    if (!existingItem) return;

    let newCart;
    if (existingItem.cartQty > 1) {
        newCart = state.cart.map(item =>
            item.id === product.id
                ? { ...item, cartQty: item.cartQty - 1 }
                : item
        );
        addLog('cart', `Producto decrementado: ${product.name}`);
        setState({ cart: newCart });
    } else {
        // Eliminar si llega a 0
        newCart = state.cart.filter(item => item.id !== product.id);

        // Auto-ajustar indice
        let newIndex = state.cartActiveIndex;
        if (newIndex >= newCart.length) {
            newIndex = Math.max(0, newCart.length - 1);
        }

        addLog('cart', `Producto eliminado: ${product.name}`);
        setState({ cart: newCart, cartActiveIndex: newIndex });
    }
}

/**
 * Carga los productos en el estado
 * @param {Array} products - Lista de productos
 */
export function setProducts(products) {
    setState({ products });
    addLog('system', `${products.length} productos cargados`);
}

/**
 * Agrega una entrada al log de eventos
 * @param {string} type - Tipo de evento (voice, gesture, system, cart)
 * @param {string} message - Mensaje del evento
 */
export function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        id: Date.now(),
        timestamp,
        type,
        message
    };

    // Mantener solo los ultimos 50 logs
    const logs = [...state.logs, logEntry].slice(-50);
    setState({ logs });
}

/**
 * Limpia el log de eventos
 */
export function clearLogs() {
    setState({ logs: [] });
}

/**
 * Reinicia el estado al inicial
 */
export function resetState() {
    state = JSON.parse(JSON.stringify(initialState));
    subscribers.forEach(callback => callback(state, initialState));
}

/**
 * Calcula el total de items en el carrito
 * @returns {number} Total de items
 */
export function getCartTotal() {
    return state.cart.reduce((total, item) => {
        return total + (item.cartQty || 0);
    }, 0);
}

/**
 * Establece el filtro de categoria
 * @param {string|null} category - Categoria a filtrar o null para todas
 */
export function setFilterCategory(category) {
    const filters = { ...state.filters, category };
    setState({ filters });
    addLog('system', category ? `Filtro categoria: ${category}` : 'Filtro categoria: todas');
}

/**
 * Establece el filtro de nutriscore
 * @param {string|null} nutriscore - Nutriscore a filtrar o null para todos
 */
export function setFilterNutriscore(nutriscore) {
    const filters = { ...state.filters, nutriscore };
    setState({ filters });
    addLog('system', nutriscore ? `Filtro nutriscore: ${nutriscore}` : 'Filtro nutriscore: todos');
}

/**
 * Limpia todos los filtros
 */
export function clearFilters() {
    setState({ filters: { category: null, nutriscore: null } });
    addLog('system', 'Filtros limpiados');
}

/**
 * Obtiene los productos filtrados segun los filtros activos
 * @returns {Array} Productos filtrados
 */
export function getFilteredProducts() {
    let filtered = [...state.products];

    if (state.filters.category) {
        filtered = filtered.filter(p => p.category === state.filters.category);
    }

    if (state.filters.nutriscore) {
        filtered = filtered.filter(p => p.nutriscore === state.filters.nutriscore);
    }

    return filtered;
}

/**
 * Establece el indice activo del carrito
 * @param {number} index - Nuevo indice
 */
export function setCartActiveIndex(index) {
    // Validar limites
    if (index < 0) index = 0;
    if (state.cart.length > 0 && index >= state.cart.length) index = state.cart.length - 1;

    setState({ cartActiveIndex: index });
}


// TODO: Implementar persistencia en localStorage para offline-first
// TODO: Implementar sincronizacion cuando haya conexion
// TODO: Agregar middleware para logging avanzado

export default {
    getState,
    setState,
    subscribe,
    setMode,
    setServiceStatus,
    addToCart,
    removeFromCart,
    decreaseCartItem,
    setProducts,
    addLog,
    clearLogs,
    resetState,
    getCartTotal,
    setFilterCategory,
    setFilterNutriscore,
    clearFilters,
    getFilteredProducts,
    setCartActiveIndex,
    MODES,
    CATEGORIES,
    NUTRISCORES
};
