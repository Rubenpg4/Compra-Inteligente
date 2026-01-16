/**
 * ui.js - Modulo de Interfaz de Usuario
 * Maneja el renderizado de la UI y la actualizacion del DOM
 * Se suscribe al store para actualizaciones reactivas
 */

import {
    getState,
    subscribe,
    setMode,
    addToCart,
    MODES,
    clearLogs,
    getCartTotal,
    setFilterCategory,
    setFilterNutriscore,
    clearFilters,
    getFilteredProducts
} from './store.js';

// Referencias a elementos del DOM
const elements = {
    // Panel de estado
    statusCamera: null,
    statusMic: null,
    statusModel: null,
    statusVoice: null,

    // Vistas principales
    viewBrowse: null,
    viewDetails: null,
    viewCart: null,
    productsGrid: null,
    productDetails: null,
    cartItems: null,
    totalAmount: null,

    // Filtros
    filterCategory: null,
    filterNutriscore: null,
    btnClearFilters: null,
    productsCount: null,

    // Log
    logPanel: null,
    btnClearLog: null,

    // Botones
    btnStartDemo: null,
    btnBack: null
};

/**
 * Inicializa las referencias al DOM
 */
function initElements() {
    elements.statusCamera = document.getElementById('status-camera');
    elements.statusMic = document.getElementById('status-mic');
    elements.statusModel = document.getElementById('status-model');
    elements.statusVoice = document.getElementById('status-voice');

    elements.viewBrowse = document.getElementById('view-browse');
    elements.viewDetails = document.getElementById('view-details');
    elements.viewCart = document.getElementById('view-cart');
    elements.productsGrid = document.getElementById('products-grid');
    elements.productDetails = document.getElementById('product-details');
    elements.cartItems = document.getElementById('cart-items');
    elements.totalAmount = document.getElementById('total-amount');

    // Filtros
    elements.filterCategory = document.getElementById('filter-category');
    elements.filterNutriscore = document.getElementById('filter-nutriscore');
    elements.btnClearFilters = document.getElementById('btn-clear-filters');
    elements.productsCount = document.getElementById('products-count');

    elements.logPanel = document.getElementById('log-panel');
    elements.btnClearLog = document.getElementById('btn-clear-log');
    elements.btnStartDemo = document.getElementById('btn-start-demo');
    elements.btnBack = document.getElementById('btn-back');
}

/**
 * Actualiza los indicadores de estado de los servicios
 * @param {Object} services - Estado de los servicios
 */
function updateStatusIndicators(services) {
    const setStatus = (element, active) => {
        if (!element) return;
        element.classList.remove('status-off', 'status-on', 'status-loading');
        element.classList.add(active ? 'status-on' : 'status-off');
    };

    setStatus(elements.statusCamera, services.camera);
    setStatus(elements.statusMic, services.microphone);
    setStatus(elements.statusModel, services.model);
    setStatus(elements.statusVoice, services.voiceActive);
}

// Iconos por categoria
const categoryIcons = {
    snacks: '🍿',
    drinks: '🥤',
    dairy: '🥛',
    cereals: '🥣'
};

// Colores por nutriscore
const nutriscoreColors = {
    A: 'bg-green-500',
    B: 'bg-lime-500',
    C: 'bg-yellow-500',
    D: 'bg-orange-500',
    E: 'bg-red-500'
};

/**
 * Renderiza la lista de productos en modo BROWSE
 * @param {Array} products - Lista de productos
 */
function renderProducts(products) {
    if (!elements.productsGrid) return;

    if (products.length === 0) {
        elements.productsGrid.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-8">
                No hay productos disponibles
            </div>
        `;
        return;
    }

    elements.productsGrid.innerHTML = products.map(product => {
        const icon = categoryIcons[product.category] || '📦';
        const nutriColor = nutriscoreColors[product.nutriscore] || 'bg-gray-500';

        return `
            <div class="product-card bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                 data-product-id="${product.id}">
                <div class="aspect-square bg-gray-600 rounded mb-3 flex items-center justify-center relative">
                    <span class="text-5xl">${icon}</span>
                    <span class="absolute top-2 right-2 ${nutriColor} text-white text-xs font-bold px-2 py-1 rounded">
                        ${product.nutriscore}
                    </span>
                </div>
                <h3 class="font-semibold text-white truncate">${product.name}</h3>
                <p class="text-gray-400 text-sm">${product.brand}</p>
                <div class="mt-2 flex justify-between items-center">
                    <span class="text-blue-300 text-sm">${product.quantity}</span>
                    <button class="btn-add-cart bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
                            data-product-id="${product.id}">
                        Agregar
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Event listeners para tarjetas de producto
    elements.productsGrid.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Si hizo clic en el boton de agregar, no cambiar de vista
            if (e.target.classList.contains('btn-add-cart')) return;

            const productId = card.dataset.productId;
            const state = getState();
            const product = state.products.find(p => p.id == productId);
            if (product) {
                setMode(MODES.DETAILS, { product });
            }
        });
    });

    // Event listeners para botones de agregar al carrito
    elements.productsGrid.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = btn.dataset.productId;
            const state = getState();
            const product = state.products.find(p => p.id == productId);
            if (product) {
                addToCart(product);
            }
        });
    });
}

/**
 * Renderiza los detalles de un producto en modo DETAILS
 * @param {Object} product - Producto a mostrar
 */
function renderProductDetails(product) {
    if (!elements.productDetails || !product) return;

    const icon = categoryIcons[product.category] || '📦';
    const nutriColor = nutriscoreColors[product.nutriscore] || 'bg-gray-500';
    const keywords = product.keywords ? product.keywords.join(', ') : '';

    elements.productDetails.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6">
            <div class="md:w-1/3">
                <div class="aspect-square bg-gray-700 rounded-lg flex items-center justify-center relative">
                    <span class="text-8xl">${icon}</span>
                    <span class="absolute top-4 right-4 ${nutriColor} text-white text-lg font-bold px-3 py-1 rounded">
                        ${product.nutriscore}
                    </span>
                </div>
            </div>
            <div class="md:w-2/3">
                <h2 class="text-2xl font-bold text-white mb-1">${product.name}</h2>
                <p class="text-blue-400 text-lg mb-4">${product.brand}</p>
                <div class="space-y-3 text-sm text-gray-300 mb-6">
                    <p><strong class="text-gray-400">Categoria:</strong> <span class="capitalize">${product.category}</span></p>
                    <p><strong class="text-gray-400">Cantidad:</strong> ${product.quantity}</p>
                    <p><strong class="text-gray-400">Nutriscore:</strong>
                        <span class="${nutriColor} text-white px-2 py-0.5 rounded text-xs font-bold">${product.nutriscore}</span>
                    </p>
                    ${keywords ? `<p><strong class="text-gray-400">Tags:</strong> ${keywords}</p>` : ''}
                </div>
                <button class="btn-add-cart-detail bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
                        data-product-id="${product.id}">
                    Agregar al Carrito
                </button>
            </div>
        </div>
    `;

    // Event listener para agregar al carrito desde detalles
    const btnAdd = elements.productDetails.querySelector('.btn-add-cart-detail');
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            addToCart(product);
        });
    }
}

/**
 * Renderiza los items del carrito en modo CART
 * @param {Array} cart - Items del carrito
 */
function renderCart(cart) {
    if (!elements.cartItems) return;

    if (cart.length === 0) {
        elements.cartItems.innerHTML = `
            <p class="text-gray-500 text-center py-8">El carrito esta vacio</p>
        `;
        if (elements.totalAmount) {
            elements.totalAmount.textContent = '0 items';
        }
        return;
    }

    elements.cartItems.innerHTML = cart.map(item => {
        const icon = categoryIcons[item.category] || '📦';
        const nutriColor = nutriscoreColors[item.nutriscore] || 'bg-gray-500';

        return `
            <div class="cart-item flex items-center justify-between bg-gray-700 rounded p-3 mb-2">
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${icon}</span>
                    <div>
                        <h4 class="font-semibold text-white">${item.name}</h4>
                        <p class="text-sm text-gray-400">${item.brand} - ${item.quantity}</p>
                    </div>
                </div>
                <div class="text-right flex items-center gap-3">
                    <span class="${nutriColor} text-white text-xs font-bold px-2 py-1 rounded">${item.nutriscore}</span>
                    <span class="bg-blue-600 text-white text-sm px-2 py-1 rounded">x${item.cartQty}</span>
                </div>
            </div>
        `;
    }).join('');

    // Actualizar total (cantidad de items)
    if (elements.totalAmount) {
        const totalItems = cart.reduce((sum, item) => sum + item.cartQty, 0);
        elements.totalAmount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    }
}

/**
 * Renderiza el log de eventos
 * @param {Array} logs - Entradas del log
 */
function renderLogs(logs) {
    if (!elements.logPanel) return;

    if (logs.length === 0) {
        elements.logPanel.innerHTML = `
            <div class="log-entry text-gray-500">[Sistema] Log vacio</div>
        `;
        return;
    }

    const typeColors = {
        voice: 'text-blue-400',
        gesture: 'text-purple-400',
        system: 'text-gray-400',
        cart: 'text-yellow-400',
        error: 'text-red-400'
    };

    elements.logPanel.innerHTML = logs.map(log => {
        const colorClass = typeColors[log.type] || 'text-gray-400';
        return `
            <div class="log-entry ${colorClass}">
                [${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}
            </div>
        `;
    }).join('');

    // Auto-scroll al final
    elements.logPanel.scrollTop = elements.logPanel.scrollHeight;
}

/**
 * Cambia la vista visible segun el modo actual
 * @param {string} mode - Modo actual (BROWSE, DETAILS, CART)
 */
function switchView(mode) {
    // Ocultar todas las vistas
    [elements.viewBrowse, elements.viewDetails, elements.viewCart].forEach(view => {
        if (view) view.classList.add('hidden');
    });

    // Mostrar vista correspondiente
    switch (mode) {
        case MODES.BROWSE:
            if (elements.viewBrowse) elements.viewBrowse.classList.remove('hidden');
            break;
        case MODES.DETAILS:
            if (elements.viewDetails) elements.viewDetails.classList.remove('hidden');
            break;
        case MODES.CART:
            if (elements.viewCart) elements.viewCart.classList.remove('hidden');
            break;
    }
}

/**
 * Actualiza la UI de los filtros segun el estado actual
 * @param {Object} filters - Estado de los filtros
 * @param {number} filteredCount - Cantidad de productos filtrados
 * @param {number} totalCount - Total de productos
 */
function updateFiltersUI(filters, filteredCount, totalCount) {
    // Actualizar botones de categoria
    if (elements.filterCategory) {
        elements.filterCategory.querySelectorAll('.filter-btn').forEach(btn => {
            const category = btn.dataset.category;
            btn.classList.toggle('filter-btn-active', category === (filters.category || ''));
        });
    }

    // Actualizar botones de nutriscore
    if (elements.filterNutriscore) {
        elements.filterNutriscore.querySelectorAll('.filter-btn').forEach(btn => {
            const nutriscore = btn.dataset.nutriscore;
            btn.classList.toggle('filter-btn-active', nutriscore === (filters.nutriscore || ''));
        });
    }

    // Actualizar contador de productos
    if (elements.productsCount) {
        if (filters.category || filters.nutriscore) {
            elements.productsCount.textContent = `Mostrando ${filteredCount} de ${totalCount} productos`;
        } else {
            elements.productsCount.textContent = `${totalCount} productos`;
        }
    }
}

/**
 * Callback principal de actualizacion de UI
 * Se ejecuta cada vez que cambia el estado
 * @param {Object} state - Estado actual
 * @param {Object} prevState - Estado anterior
 */
function onStateChange(state, prevState) {
    // Actualizar indicadores de estado
    updateStatusIndicators(state.services);

    // Cambiar vista si el modo cambio
    if (state.currentMode !== prevState?.currentMode) {
        switchView(state.currentMode);
    }

    // Obtener productos filtrados
    const filteredProducts = getFilteredProducts();

    // Renderizar segun el modo actual
    switch (state.currentMode) {
        case MODES.BROWSE:
            renderProducts(filteredProducts);
            updateFiltersUI(state.filters, filteredProducts.length, state.products.length);
            break;
        case MODES.DETAILS:
            renderProductDetails(state.selectedProduct);
            break;
        case MODES.CART:
            renderCart(state.cart);
            break;
    }

    // Actualizar log siempre
    renderLogs(state.logs);

    // Actualizar boton de demo
    if (elements.btnStartDemo) {
        if (state.demoStarted) {
            elements.btnStartDemo.textContent = 'Demo Activa';
            elements.btnStartDemo.disabled = true;
            elements.btnStartDemo.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

/**
 * Configura los event listeners iniciales
 * @param {Function} onStartDemo - Callback cuando se inicia la demo
 */
function setupEventListeners(onStartDemo) {
    // Boton de inicio de demo
    if (elements.btnStartDemo && onStartDemo) {
        elements.btnStartDemo.addEventListener('click', onStartDemo);
    }

    // Boton de volver
    if (elements.btnBack) {
        elements.btnBack.addEventListener('click', () => {
            setMode(MODES.BROWSE);
        });
    }

    // Boton limpiar log
    if (elements.btnClearLog) {
        elements.btnClearLog.addEventListener('click', () => {
            clearLogs();
        });
    }

    // Filtro de categoria
    if (elements.filterCategory) {
        elements.filterCategory.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            const category = btn.dataset.category || null;
            setFilterCategory(category);
        });
    }

    // Filtro de nutriscore
    if (elements.filterNutriscore) {
        elements.filterNutriscore.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            const nutriscore = btn.dataset.nutriscore || null;
            setFilterNutriscore(nutriscore);
        });
    }

    // Boton limpiar filtros
    if (elements.btnClearFilters) {
        elements.btnClearFilters.addEventListener('click', () => {
            clearFilters();
        });
    }

    // Navegacion por teclado (para accesibilidad)
    document.addEventListener('keydown', (e) => {
        const state = getState();
        if (!state.demoStarted) return;

        switch (e.key) {
            case 'Escape':
                if (state.currentMode !== MODES.BROWSE) {
                    setMode(MODES.BROWSE);
                }
                break;
            case 'c':
            case 'C':
                if (e.ctrlKey || e.metaKey) return; // No interferir con copy
                setMode(MODES.CART);
                break;
        }
    });
}

/**
 * Inicializa el modulo de UI
 * @param {Function} onStartDemo - Callback cuando se inicia la demo
 */
export function initUI(onStartDemo) {
    // Inicializar referencias al DOM
    initElements();

    // Configurar event listeners
    setupEventListeners(onStartDemo);

    // Suscribirse a cambios de estado
    subscribe(onStateChange);

    // Renderizar estado inicial
    const state = getState();
    onStateChange(state, {});

    console.log('[UI] Modulo inicializado');
}

/**
 * Muestra un indicador de carga en un servicio
 * @param {string} service - Nombre del servicio
 */
export function showLoadingStatus(service) {
    const elementMap = {
        camera: elements.statusCamera,
        microphone: elements.statusMic,
        model: elements.statusModel,
        voiceActive: elements.statusVoice
    };

    const element = elementMap[service];
    if (element) {
        element.classList.remove('status-off', 'status-on');
        element.classList.add('status-loading');
    }
}

// TODO: Agregar animaciones de transicion entre vistas
// TODO: Implementar feedback visual para gestos detectados
// TODO: Agregar indicador de voz escuchando
// TODO: Mejorar accesibilidad con ARIA labels

export default {
    initUI,
    showLoadingStatus
};
