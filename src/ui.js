/**
 * ui.js - Modulo de Interfaz de Usuario
 * Maneja el renderizado de la UI y la actualizacion del DOM
 */

import {
    getState,
    setState,
    subscribe,
    setMode,
    addToCart,
    MODES,
    getCartTotal,
    setFilterCategory,
    setFilterNutriscore,
    clearFilters,
    getFilteredProducts,
    setCartActiveIndex
} from './store.js';

import { renderGrid, updateGrid } from './components/productGrid.js';
import { renderHorizontalCoverflow, updateHorizontalCoverflow } from './components/horizontalCoverflow.js';

let gridInstance = null;
let coverflowInstance = null;
let currentViewMode = 'coverflow'; // 'grid' o 'coverflow'
let userSelectedViewType = 'coverflow'; // Vista seleccionada por el usuario: 'grid' o 'coverflow'

export function isGridViewActive() {
    return userSelectedViewType === 'grid';
}

// Estado del carrito coverflow
// let cartActiveIndex = 0; // Moved to store
let currentCart = [];

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
    els.checkoutModal = document.getElementById('checkout-modal');

    // Crear modal si no existe
    if (!els.checkoutModal) {
        els.checkoutModal = document.createElement('div');
        els.checkoutModal.id = 'checkout-modal';
        els.checkoutModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 1000;
            display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(8px);
        `;
        document.body.appendChild(els.checkoutModal);
    }
}

function renderCheckoutModal(show) {
    if (!els.checkoutModal) return;

    if (show) {
        els.checkoutModal.style.display = 'flex';
        els.checkoutModal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1f2937, #111827);
                padding: 40px 60px; border-radius: 30px;
                text-align: center; border: 1px solid rgba(255,255,255,0.1);
                box-shadow: 0 50px 100px -20px rgba(0,0,0,0.7);
                animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            ">
                <style>
                    @keyframes popIn {
                        from { transform: scale(0.8); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                </style>
                <div style="font-size: 5rem; margin-bottom: 20px;">🛍️</div>
                <h2 style="font-size: 2.5rem; margin-bottom: 10px; color: white;">¿Confirmar Compra?</h2>
                <p style="font-size: 1.25rem; color: #9ca3af; margin-bottom: 40px;">Usa gestos o haz click en los iconos:</p>
                
                <div style="display: flex; gap: 60px; justify-content: center;">
                    <!-- Boton Aceptar -->
                    <div id="checkout-btn-accept" style="
                        display: flex; flex-direction: column; align-items: center; gap: 15px;
                        cursor: pointer; transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <div style="
                            width: 100px; height: 100px; background: rgba(34, 197, 94, 0.2);
                            border-radius: 50%; display: flex; align-items: center; justify-content: center;
                            border: 2px solid #22c55e;
                        ">
                            <img src="assets/icons/Victory.png" alt="Aceptar" style="width: 60px; height: 60px; object-fit: contain;">
                        </div>
                        <div style="text-align: center;">
                            <span style="color: #22c55e; font-weight: bold; font-size: 1.4rem; display: block;">ACEPTAR</span>
                            <span style="color: #6b7280; font-size: 0.9rem;">(Victoria)</span>
                        </div>
                    </div>

                    <!-- Boton Cancelar -->
                    <div id="checkout-btn-cancel" style="
                        display: flex; flex-direction: column; align-items: center; gap: 15px;
                        cursor: pointer; transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <div style="
                            width: 100px; height: 100px; background: rgba(239, 68, 68, 0.2);
                            border-radius: 50%; display: flex; align-items: center; justify-content: center;
                            border: 2px solid #ef4444;
                        ">
                            <img src="assets/icons/Palma_mano.png" alt="Cancelar" style="width: 60px; height: 60px; object-fit: contain;">
                        </div>
                        <div style="text-align: center;">
                            <span style="color: #ef4444; font-weight: bold; font-size: 1.4rem; display: block;">CANCELAR</span>
                            <span style="color: #6b7280; font-size: 0.9rem;">(Mano Abierta)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event Listeners para clicks
        setTimeout(() => {
            // ACEPTAR
            document.getElementById('checkout-btn-accept')?.addEventListener('click', () => {
                handleCheckoutSuccess();
            });

            // CANCELAR
            document.getElementById('checkout-btn-cancel')?.addEventListener('click', () => {
                setMode(MODES.CART);
                showFeedback('CANCELADO', 'error');
            });
        }, 100);
    } else {
        els.checkoutModal.style.display = 'none';
        els.checkoutModal.innerHTML = '';
    }
}

/**
 * Maneja el flujo de éxito de la compra
 * Muestra feedback, espera y luego limpia el estado
 */
export function handleCheckoutSuccess() {
    showFeedback('¡COMPRA REALIZADA! 🥳', 'success');

    // Esperar minimamente para feedback y limpiar
    setTimeout(() => {
        // Vaciar carrito y volver a inicio simultaneamente
        setState({ cart: [] });
        setMode(MODES.BROWSE);
    }, 100);
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

/**
 * Muestra un mensaje de feedback visual
 */
export function showFeedback(text, type = 'info') {
    let feedbackElement = document.getElementById('gesture-feedback');

    // Crear elemento si no existe (Lazy creation)
    if (!feedbackElement) {
        feedbackElement = document.createElement('div');
        feedbackElement.id = 'gesture-feedback';
        feedbackElement.className = 'gesture-feedback';
        feedbackElement.style.cssText = `
            position: fixed; bottom: 20px; left: calc(50% - 30px); transform: translateX(-50%);
            background: rgba(0,0,0,0.85); color: white; padding: 20px 40px;
            border-radius: 50px; font-size: 2rem; font-weight: bold;
            display: none; align-items: center; justify-content: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 2000;
            backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.1);
            transition: opacity 0.3s, transform 0.3s;
        `;
        document.body.appendChild(feedbackElement);
    }

    feedbackElement.textContent = text;
    feedbackElement.style.display = 'flex';

    // Reset transform for animation
    feedbackElement.style.transform = 'translateX(-50%) scale(0.9)';

    requestAnimationFrame(() => {
        feedbackElement.style.opacity = '1';
        feedbackElement.style.transform = 'translateX(-50%) scale(1)';
    });

    // Añadir color segun el tipo
    if (type === 'success') feedbackElement.style.color = '#22c55e';
    else if (type === 'warning') feedbackElement.style.color = '#eab308';
    else if (type === 'error') feedbackElement.style.color = '#ef4444';
    else feedbackElement.style.color = 'white';

    // Ocultar despues de un tiempo
    setTimeout(() => {
        if (feedbackElement.textContent === text) {
            feedbackElement.style.opacity = '0';
            feedbackElement.style.transform = 'translateX(-50%) scale(0.9)';
            setTimeout(() => {
                if (feedbackElement.style.opacity === '0') {
                    feedbackElement.style.display = 'none';
                }
            }, 300);
        }
    }, 1500);
}

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
 * Renderiza productos en grid o coverflow según selección de usuario
 */
function renderProducts(products, forceMode = null) {
    if (!els.productsGrid) return;

    // Determinar el modo de vista (usa la selección del usuario)
    const newMode = forceMode || userSelectedViewType;

    // Si cambiamos de modo, limpiar el contenedor
    if (newMode !== currentViewMode) {
        els.productsGrid.innerHTML = '';
        gridInstance = null;
        coverflowInstance = null;
        currentViewMode = newMode;
    }

    if (newMode === 'grid') {
        // Modo Grid 3x3
        if (!gridInstance) {
            gridInstance = renderGrid(els.productsGrid, products);
        } else {
            updateGrid(products);
        }
    } else {
        // Modo Coverflow horizontal
        if (!coverflowInstance) {
            coverflowInstance = renderHorizontalCoverflow(els.productsGrid, products);
        } else {
            updateHorizontalCoverflow(products);
        }
    }
}

/**
 * Cambia el tipo de vista seleccionado por el usuario
 */
function setViewType(viewType) {
    if (viewType === userSelectedViewType) return;
    userSelectedViewType = viewType;

    // Actualizar UI de botones de vista
    updateViewButtonsUI(viewType);

    // Re-renderizar productos con la nueva vista
    const filteredProducts = getFilteredProducts();
    renderProducts(filteredProducts);
}

/**
 * Actualiza los botones de vista activos
 */
function updateViewButtonsUI(viewType) {
    if (!els.filtersBar) return;
    els.filtersBar.querySelectorAll('[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewType);
    });
}

export function triggerDetailAddAnimation(duration = 1000) {
    const btn = document.getElementById('detail-add-cart');
    if (btn) {
        const originalContent = btn.innerHTML;
        const originalBg = btn.style.background;

        btn.innerHTML = '<span>Añadido ✓</span>';
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.background = originalBg;
        }, duration);
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
        triggerDetailAddAnimation();
    });
}

/**
 * Renderiza una tarjeta del carrito coverflow
 */
function renderCartCard(item, position) {
    if (!item) {
        return `<div class="cart-coverflow-card cart-coverflow-${position}" style="opacity:0; pointer-events:none;"></div>`;
    }

    const image = getProductImage(item);

    // Configuración 3D por posición (horizontal)
    const configs = {
        'far-prev': { x: -320, scale: 0.5, opacity: 0.2, blur: 3, rotateY: 45, z: -150 },
        'prev': { x: -180, scale: 0.75, opacity: 0.6, blur: 1, rotateY: 25, z: -80 },
        'active': { x: 0, scale: 1, opacity: 1, blur: 0, rotateY: 0, z: 0 },
        'next': { x: 180, scale: 0.75, opacity: 0.6, blur: 1, rotateY: -25, z: -80 },
        'far-next': { x: 320, scale: 0.5, opacity: 0.2, blur: 3, rotateY: -45, z: -150 }
    };

    const c = configs[position] || configs.active;

    return `
        <div class="cart-coverflow-card cart-coverflow-${position}"
             style="
                transform: perspective(1000px) translateX(${c.x}px) translateZ(${c.z}px) scale(${c.scale}) rotateY(${c.rotateY}deg);
                opacity: ${c.opacity};
                filter: blur(${c.blur}px);
                z-index: ${position === 'active' ? 50 : 10};
             ">
            <div class="cart-coverflow-card-inner">
                <div class="cart-coverflow-card-image">
                    <img src="${image}" alt="${item.name}">
                    <div class="cart-coverflow-qty">x${item.cartQty}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Obtiene item del carrito en offset relativo al activo
 */
function getCartItemAtOffset(offset) {
    const state = getState();
    const index = state.cartActiveIndex + offset;
    if (index < 0 || index >= currentCart.length) return null;
    return currentCart[index];
}

/**
 * Renderiza el coverflow del carrito
 * @param {string} direction - Dirección de la animación: 'left', 'right', o null
 */
function renderCartCoverflow(direction = null) {
    if (!els.cartItems) return;

    const state = getState();
    const cartActiveIndex = state.cartActiveIndex;
    const slideClass = direction ? `slide-${direction}` : '';

    els.cartItems.innerHTML = `
        <div class="cart-coverflow-stage">
            <div class="cart-coverflow-track ${slideClass}">
                ${renderCartCard(getCartItemAtOffset(-2), 'far-prev')}
                ${renderCartCard(getCartItemAtOffset(-1), 'prev')}
                ${renderCartCard(getCartItemAtOffset(0), 'active')}
                ${renderCartCard(getCartItemAtOffset(1), 'next')}
                ${renderCartCard(getCartItemAtOffset(2), 'far-next')}
            </div>
            <div class="cart-nav-indicator">
                <button class="cart-nav-btn" id="cart-prev-btn" ${cartActiveIndex === 0 ? 'disabled' : ''}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                <span>${cartActiveIndex + 1} / ${currentCart.length}</span>
                <button class="cart-nav-btn" id="cart-next-btn" ${cartActiveIndex >= currentCart.length - 1 ? 'disabled' : ''}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Event listeners para navegación
    els.cartItems.querySelector('#cart-prev-btn')?.addEventListener('click', cartPrev);
    els.cartItems.querySelector('#cart-next-btn')?.addEventListener('click', cartNext);

    // Click en tarjetas prev/next para navegar
    els.cartItems.querySelector('.cart-coverflow-prev')?.addEventListener('click', cartPrev);
    els.cartItems.querySelector('.cart-coverflow-next')?.addEventListener('click', cartNext);
}

/**
 * Navegación del carrito con animación
 */
function cartPrev() {
    const state = getState();
    if (state.cartActiveIndex > 0) {
        setCartActiveIndex(state.cartActiveIndex - 1);
        renderCartCoverflow('right');
    }
}

function cartNext() {
    const state = getState();
    if (state.cartActiveIndex < currentCart.length - 1) {
        setCartActiveIndex(state.cartActiveIndex + 1);
        renderCartCoverflow('left');
    }
}

/**
 * Renderiza carrito
 */
function renderCart(cart) {
    if (!els.cartItems) return;

    currentCart = cart;

    if (cart.length === 0) {

        els.cartItems.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <p>Tu carrito está vacío</p>
            </div>
        `;
        if (els.totalAmount) els.totalAmount.textContent = '0 items';
        return;
    }

    // Ajustar índice (manejado por store)
    const state = getState();
    // No sobreescribimos start.cartActiveIndex aquí, dejemos que renderCartCoverflow lo lea.

    renderCartCoverflow();

    if (els.totalAmount) {
        const total = cart.reduce((sum, item) => sum + item.cartQty, 0);
        els.totalAmount.textContent = `${total} item${total !== 1 ? 's' : ''}`;

        // Obtener contenedor del total y aplicar layout flex
        const totalContainer = document.getElementById('cart-total');
        if (totalContainer) {
            totalContainer.style.display = 'flex';
            totalContainer.style.alignItems = 'center';
            totalContainer.style.justifyContent = 'space-between';
            totalContainer.style.flexWrap = 'wrap';

            let buyBtn = document.getElementById('btn-cart-buy');
            if (!buyBtn) {
                buyBtn = document.createElement('button');
                buyBtn.id = 'btn-cart-buy';
                buyBtn.addEventListener('click', () => setMode(MODES.CHECKOUT));
                totalContainer.appendChild(buyBtn);
            }

            // Aplicar estilo "Añadir al carrito" (Azul) + Icono Victory
            buyBtn.style.cssText = `
                display: inline-flex; align-items: center; gap: 12px;
                padding: 16px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white; border: none; border-radius: 16px;
                font-size: 1.1rem; font-weight: 600; cursor: pointer;
                transition: all 0.3s; box-shadow: 0 10px 30px -10px rgba(59,130,246,0.5);
            `;

            // Efectos hover manuales (ya que es inline style)
            buyBtn.onmouseenter = () => {
                buyBtn.style.transform = 'translateY(-2px)';
                buyBtn.style.boxShadow = '0 15px 40px -10px rgba(59, 130, 246, 0.6)';
            };
            buyBtn.onmouseleave = () => {
                buyBtn.style.transform = 'translateY(0)';
                buyBtn.style.boxShadow = '0 10px 30px -10px rgba(59, 130, 246, 0.5)';
            };

            buyBtn.innerHTML = `
                <span style="font-size: 1.2rem;">Finalizar Compra</span>
            `;
        }
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
        const filterCat = filters.category || null;
        btn.classList.toggle('active', cat === filterCat);
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
            renderCheckoutModal(false);
            break;
        case MODES.DETAILS:
            renderProductDetails(state.selectedProduct);
            renderCheckoutModal(false);
            break;
        case MODES.CART:
            renderCart(state.cart);
            renderCheckoutModal(false);
            break;
        case MODES.CHECKOUT:
            // Aseguramos que la vista base sea CART
            if (!els.viewCart.classList.contains('active')) {
                els.viewCart.classList.add('active');
                renderCart(state.cart); // Re-render cart visible behind
            }
            renderCheckoutModal(true);
            break;
    }

    updateCartCount();

    // Boton cámara
    if (els.btnStartDemo) {
        if (state.demoStarted) {
            els.btnStartDemo.classList.add('active');
            els.btnStartDemo.querySelector('span').textContent = 'Cámara activa';
        } else {
            els.btnStartDemo.classList.remove('active');
            els.btnStartDemo.querySelector('span').textContent = 'Cámara';
        }
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

    // Filtros y cambio de vista
    if (els.filtersBar) {
        els.filtersBar.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-chip');
            if (!btn) return;

            if (btn.dataset.view !== undefined) {
                // Cambio de tipo de vista
                const viewType = btn.dataset.view;
                setViewType(viewType);
            } else if (btn.dataset.category !== undefined) {
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

        // Navegación del carrito con flechas
        if (state.currentMode === MODES.CART && currentCart.length > 0) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                cartPrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                cartNext();
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
