/**
 * ui.js - Modulo de Interfaz de Usuario
 * Maneja el renderizado de la UI y la actualizacion del DOM
 */

import {
    getState,
    subscribe,
    setMode,
    addToCart,
    MODES,
    getCartTotal,
    setFilterCategory,
    setFilterNutriscore,
    clearFilters,
    getFilteredProducts
} from './store.js';

import { renderGrid, updateGrid } from './components/productGrid.js';
import { renderHorizontalCoverflow, updateHorizontalCoverflow } from './components/horizontalCoverflow.js';

let gridInstance = null;
let coverflowInstance = null;
let currentViewMode = 'grid'; // 'grid' o 'coverflow'

// Referencias DOM
const els = {};

function initElements() {
    els.productsGrid = document.getElementById('products-grid');
    els.productDetails = document.getElementById('product-details');
    els.cartItems = document.getElementById('cart-items');
    els.totalAmount = document.getElementById('total-amount');
    els.cartCount = document.getElementById('cart-count');
    els.btnStartDemo = document.getElementById('btn-start-demo');
    els.btnBack = document.getElementById('btn-back');
    els.btnBackCart = document.getElementById('btn-back-cart');
    els.btnCart = document.getElementById('btn-cart');
    els.filtersBar = document.getElementById('filters-bar');
    els.viewBrowse = document.getElementById('view-browse');
    els.viewDetails = document.getElementById('view-details');
    els.viewCart = document.getElementById('view-cart');
}

// Imagenes por categoria
const categoryImages = {
    snacks: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop',
    drinks: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=400&fit=crop',
    dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=400&fit=crop',
    cereals: 'https://images.unsplash.com/photo-1517456215183-9a2c3a748f8c?w=400&h=400&fit=crop'
};

const nutriscoreColors = {
    A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', E: '#ef4444'
};

function getProductImage(product) {
    return categoryImages[product.category] || categoryImages.snacks;
}

/**
 * Determina si hay filtros activos
 */
function hasActiveFilters() {
    const state = getState();
    return !!(state.filters?.category || state.filters?.nutriscore);
}

/**
 * Renderiza productos en grid o coverflow según filtros
 */
function renderProducts(products, forceMode = null) {
    if (!els.productsGrid) return;

    const useFilters = forceMode ? forceMode === 'coverflow' : hasActiveFilters();
    const newMode = useFilters ? 'coverflow' : 'grid';

    // Si cambiamos de modo, limpiar el contenedor
    if (newMode !== currentViewMode) {
        els.productsGrid.innerHTML = '';
        gridInstance = null;
        coverflowInstance = null;
        currentViewMode = newMode;
    }

    if (newMode === 'grid') {
        // Modo Grid (sin filtros)
        if (!gridInstance) {
            gridInstance = renderGrid(els.productsGrid, products);
        } else {
            updateGrid(products);
        }
    } else {
        // Modo Coverflow horizontal (con filtros)
        if (!coverflowInstance) {
            coverflowInstance = renderHorizontalCoverflow(els.productsGrid, products);
        } else {
            updateHorizontalCoverflow(products);
        }
    }
}

/**
 * Renderiza detalles del producto
 */
function renderProductDetails(product) {
    if (!els.productDetails || !product) return;

    const image = getProductImage(product);
    const nutriColor = nutriscoreColors[product.nutriscore] || '#6b7280';

    els.productDetails.innerHTML = `
        <div style="display: flex; gap: 40px; align-items: flex-start;">
            <div style="flex: 0 0 400px;">
                <img src="${image}" alt="${product.name}"
                     style="width: 100%; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            </div>
            <div style="flex: 1;">
                <h1 style="font-size: 2.5rem; font-weight: 700; color: white; margin-bottom: 8px;">${product.name}</h1>
                <p style="font-size: 1.25rem; color: #60a5fa; margin-bottom: 24px;">${product.brand}</p>

                <div style="display: flex; gap: 16px; margin-bottom: 32px;">
                    <span style="padding: 8px 20px; background: rgba(255,255,255,0.1); border-radius: 24px; color: #d1d5db;">
                        ${product.quantity}
                    </span>
                    <span style="padding: 8px 20px; background: ${nutriColor}; border-radius: 24px; color: white; font-weight: 600;">
                        Nutriscore ${product.nutriscore}
                    </span>
                </div>

                ${product.keywords ? `
                    <div style="margin-bottom: 32px;">
                        <p style="color: #6b7280; margin-bottom: 8px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Tags</p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${product.keywords.map(k => `<span style="padding: 6px 12px; background: rgba(59,130,246,0.2); border-radius: 16px; color: #60a5fa; font-size: 0.85rem;">${k}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <button id="detail-add-cart" style="
                    display: inline-flex; align-items: center; gap: 12px;
                    padding: 16px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white; border: none; border-radius: 16px;
                    font-size: 1.1rem; font-weight: 600; cursor: pointer;
                    transition: all 0.3s; box-shadow: 0 10px 30px -10px rgba(59,130,246,0.5);
                ">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 6h15l-1.5 9h-12z"></path>
                        <circle cx="9" cy="20" r="1"></circle>
                        <circle cx="18" cy="20" r="1"></circle>
                    </svg>
                    Añadir al carrito
                </button>
            </div>
        </div>
    `;

    document.getElementById('detail-add-cart')?.addEventListener('click', () => {
        addToCart(product);
        const btn = document.getElementById('detail-add-cart');
        if (btn) {
            btn.innerHTML = '<span>Añadido ✓</span>';
            btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        }
    });
}

/**
 * Renderiza carrito
 */
function renderCart(cart) {
    if (!els.cartItems) return;

    if (cart.length === 0) {
        els.cartItems.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
                <div style="font-size: 4rem; margin-bottom: 20px;">🛒</div>
                <p>Tu carrito está vacío</p>
            </div>
        `;
        if (els.totalAmount) els.totalAmount.textContent = '0 items';
        return;
    }

    els.cartItems.innerHTML = cart.map(item => {
        const image = getProductImage(item);
        return `
            <div class="cart-item">
                <img src="${image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-brand">${item.brand} - ${item.quantity}</div>
                </div>
                <span class="cart-item-qty">x${item.cartQty}</span>
            </div>
        `;
    }).join('');

    if (els.totalAmount) {
        const total = cart.reduce((sum, item) => sum + item.cartQty, 0);
        els.totalAmount.textContent = `${total} item${total !== 1 ? 's' : ''}`;
    }
}

/**
 * Cambia la vista activa
 */
function switchView(mode) {
    [els.viewBrowse, els.viewDetails, els.viewCart].forEach(v => {
        if (v) v.classList.remove('active');
    });

    // Mostrar/ocultar filtros
    if (els.filtersBar) {
        els.filtersBar.style.display = mode === MODES.BROWSE ? 'flex' : 'none';
    }

    switch (mode) {
        case MODES.BROWSE:
            if (els.viewBrowse) els.viewBrowse.classList.add('active');
            break;
        case MODES.DETAILS:
            if (els.viewDetails) els.viewDetails.classList.add('active');
            break;
        case MODES.CART:
            if (els.viewCart) els.viewCart.classList.add('active');
            break;
    }
}

/**
 * Actualiza UI de filtros
 */
function updateFiltersUI(filters) {
    if (!els.filtersBar) return;

    // Categoria
    els.filtersBar.querySelectorAll('[data-category]').forEach(btn => {
        const cat = btn.dataset.category || null;
        btn.classList.toggle('active', cat === (filters.category || ''));
    });

    // Nutriscore
    els.filtersBar.querySelectorAll('[data-nutriscore]').forEach(btn => {
        const ns = btn.dataset.nutriscore || null;
        btn.classList.toggle('active', ns === filters.nutriscore);
    });
}

/**
 * Actualiza contador del carrito
 */
function updateCartCount() {
    const total = getCartTotal();
    if (els.cartCount) {
        els.cartCount.textContent = total;
        els.cartCount.style.display = total > 0 ? 'flex' : 'none';
    }
}

/**
 * Callback de cambio de estado
 */
function onStateChange(state, prevState) {
    // Cambio de vista
    if (state.currentMode !== prevState?.currentMode) {
        switchView(state.currentMode);
    }

    const filteredProducts = getFilteredProducts();

    switch (state.currentMode) {
        case MODES.BROWSE:
            renderProducts(filteredProducts);
            updateFiltersUI(state.filters);
            break;
        case MODES.DETAILS:
            renderProductDetails(state.selectedProduct);
            break;
        case MODES.CART:
            renderCart(state.cart);
            break;
    }

    updateCartCount();

    // Boton voz
    if (els.btnStartDemo && state.demoStarted) {
        els.btnStartDemo.classList.add('active');
        els.btnStartDemo.querySelector('span').textContent = 'Voz activa';
    }
}

/**
 * Configura event listeners
 */
function setupEventListeners(onStartDemo) {
    // Boton voz
    if (els.btnStartDemo && onStartDemo) {
        els.btnStartDemo.addEventListener('click', onStartDemo);
    }

    // Boton volver
    if (els.btnBack) {
        els.btnBack.addEventListener('click', () => setMode(MODES.BROWSE));
    }
    if (els.btnBackCart) {
        els.btnBackCart.addEventListener('click', () => setMode(MODES.BROWSE));
    }

    // Boton carrito
    if (els.btnCart) {
        els.btnCart.addEventListener('click', () => setMode(MODES.CART));
    }

    // Filtros
    if (els.filtersBar) {
        els.filtersBar.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-chip');
            if (!btn) return;

            if (btn.dataset.category !== undefined) {
                const cat = btn.dataset.category || null;
                setFilterCategory(cat);
            } else if (btn.dataset.nutriscore !== undefined) {
                const ns = btn.dataset.nutriscore || null;
                const state = getState();
                // Toggle: si ya está activo, desactivar
                if (state.filters.nutriscore === ns) {
                    setFilterNutriscore(null);
                } else {
                    setFilterNutriscore(ns);
                }
            }
        });
    }

    // Teclado global
    document.addEventListener('keydown', (e) => {
        const state = getState();

        if (e.key === 'Escape' && state.currentMode !== MODES.BROWSE) {
            setMode(MODES.BROWSE);
        }
        if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
            if (state.currentMode === MODES.BROWSE) {
                setMode(MODES.CART);
            }
        }
    });
}

/**
 * Muestra estado de carga de un servicio
 */
export function showLoadingStatus(service) {
    console.log(`[UI] Cargando servicio: ${service}`);
}

/**
 * Inicializa UI
 */
export function initUI(onStartDemo) {
    initElements();
    setupEventListeners(onStartDemo);
    subscribe(onStateChange);

    const state = getState();
    onStateChange(state, {});

    console.log('[UI] Inicializado');
}

export default { initUI };
