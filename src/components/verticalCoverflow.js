/**
 * verticalCoverflow.js - Apple-style Vertical Coverflow
 * Efecto coverflow 3D profesional para ecommerce
 */

import {
    setMode,
    addToCart,
    MODES,
    addLog,
    clearFilters,
    getState
} from '../store.js';

// Imagenes por categoria (placeholders profesionales)
const categoryImages = {
    snacks: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop',
    drinks: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=400&fit=crop',
    dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=400&fit=crop',
    cereals: 'https://images.unsplash.com/photo-1495214783159-3503fd1b572d?w=400&h=400&fit=crop'
};

// Imagenes especificas por producto (fallback a categoria)
const productImages = {
    'Yogur Griego': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop',
    'Leche Entera': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
    'Agua Mineral': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop',
    'Zumo Naranja': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=400&fit=crop',
    'Corn Flakes': 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400&h=400&fit=crop',
    'Patatas Fritas': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop',
    'Chocolate': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&h=400&fit=crop',
    'Galletas': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    'Queso': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop',
    'Mantequilla': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop'
};

// Colores por nutriscore
const nutriscoreColors = {
    A: '#22c55e',
    B: '#84cc16',
    C: '#eab308',
    D: '#f97316',
    E: '#ef4444'
};

// Estado interno
let state = {
    activeIndex: 0,
    products: [],
    container: null
};

function getProductImage(product) {
    return productImages[product.name] || categoryImages[product.category] || categoryImages.snacks;
}

function getProductAtOffset(offset) {
    const index = state.activeIndex + offset;
    if (index < 0 || index >= state.products.length) return null;
    return state.products[index];
}

/**
 * Renderiza una tarjeta de producto estilo Apple Coverflow
 */
function renderCard(product, position) {
    if (!product) {
        return `<div class="coverflow-card coverflow-${position}" style="opacity:0; pointer-events:none;"></div>`;
    }

    const image = getProductImage(product);
    const nutriColor = nutriscoreColors[product.nutriscore] || '#6b7280';

    // Configuracion 3D por posicion
    const configs = {
        'far-prev': { y: -220, scale: 0.5, opacity: 0.2, blur: 4, rotateX: 45, z: -200 },
        'prev': { y: -120, scale: 0.7, opacity: 0.5, blur: 2, rotateX: 25, z: -100 },
        'active': { y: 0, scale: 1, opacity: 1, blur: 0, rotateX: 0, z: 0 },
        'next': { y: 120, scale: 0.7, opacity: 0.5, blur: 2, rotateX: -25, z: -100 },
        'far-next': { y: 220, scale: 0.5, opacity: 0.2, blur: 4, rotateX: -45, z: -200 }
    };

    const c = configs[position] || configs.active;

    return `
        <div class="coverflow-card coverflow-${position}"
             style="
                transform: perspective(1000px) translateY(${c.y}px) translateZ(${c.z}px) scale(${c.scale}) rotateX(${c.rotateX}deg);
                opacity: ${c.opacity};
                filter: blur(${c.blur}px);
                z-index: ${position === 'active' ? 50 : 10};
             "
             data-product-id="${product.id}">

            <!-- Card Container -->
            <div class="card-inner">
                <!-- Product Image -->
                <div class="card-image">
                    <img src="${image}" alt="${product.name}" loading="lazy">
                    <div class="card-reflection"></div>
                </div>

                <!-- Nutriscore Badge -->
                <div class="nutriscore-badge" style="background: ${nutriColor}">
                    ${product.nutriscore}
                </div>

                <!-- Product Info (solo visible en active) -->
                <div class="card-info ${position === 'active' ? 'visible' : ''}">
                    <h3 class="card-title">${product.name}</h3>
                    <p class="card-brand">${product.brand}</p>
                    <p class="card-quantity">${product.quantity}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza estado vacio
 */
function renderEmpty(hasFilters) {
    if (hasFilters) {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>Sin resultados</h3>
                <p>No hay productos con estos filtros</p>
                <button id="clear-filters-btn" class="clear-btn">Limpiar filtros</button>
            </div>
        `;
    }
    return `
        <div class="empty-state">
            <div class="empty-icon loading">🛒</div>
            <h3>Cargando...</h3>
        </div>
    `;
}

/**
 * Renderiza el coverflow completo
 */
function render() {
    if (!state.container) return;

    const { products, activeIndex } = state;
    const currentState = getState();
    const hasFilters = currentState.filters?.category || currentState.filters?.nutriscore;

    if (!products || products.length === 0) {
        state.container.innerHTML = renderEmpty(hasFilters);
        if (hasFilters) {
            state.container.querySelector('#clear-filters-btn')?.addEventListener('click', () => {
                clearFilters();
            });
        }
        return;
    }

    const activeProduct = products[activeIndex];

    state.container.innerHTML = `
        <div class="coverflow-stage">
            <!-- Coverflow Cards -->
            <div class="coverflow-track">
                ${renderCard(getProductAtOffset(-2), 'far-prev')}
                ${renderCard(getProductAtOffset(-1), 'prev')}
                ${renderCard(getProductAtOffset(0), 'active')}
                ${renderCard(getProductAtOffset(1), 'next')}
                ${renderCard(getProductAtOffset(2), 'far-next')}
            </div>

            <!-- Active Product Details -->
            <div class="product-details">
                <h2 class="product-name">${activeProduct.name}</h2>
                <p class="product-brand">${activeProduct.brand}</p>
                <div class="product-meta">
                    <span class="product-quantity">${activeProduct.quantity}</span>
                    <span class="product-nutriscore" style="background: ${nutriscoreColors[activeProduct.nutriscore]}">
                        Nutriscore ${activeProduct.nutriscore}
                    </span>
                </div>
                <button class="add-to-cart-btn" id="add-cart-btn">
                    <span>Añadir al carrito</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 6h15l-1.5 9h-12z"></path>
                        <circle cx="9" cy="20" r="1"></circle>
                        <circle cx="18" cy="20" r="1"></circle>
                    </svg>
                </button>
            </div>

            <!-- Navigation Indicator -->
            <div class="nav-indicator">
                <span class="nav-current">${activeIndex + 1}</span>
                <span class="nav-separator">/</span>
                <span class="nav-total">${products.length}</span>
            </div>

            <!-- Scroll Hint -->
            <div class="scroll-hint">
                <span>↑ ↓</span>
            </div>
        </div>
    `;

    // Event listeners
    state.container.querySelector('#add-cart-btn')?.addEventListener('click', addActiveToCart);
    state.container.querySelector('.coverflow-active')?.addEventListener('click', selectActive);

    // Click en prev/next para navegar
    state.container.querySelector('.coverflow-prev')?.addEventListener('click', prev);
    state.container.querySelector('.coverflow-next')?.addEventListener('click', next);
}

// Navegacion
export function prev() {
    if (state.activeIndex > 0) {
        state.activeIndex--;
        render();
    }
}

export function next() {
    if (state.activeIndex < state.products.length - 1) {
        state.activeIndex++;
        render();
    }
}

export function selectActive() {
    const product = getProductAtOffset(0);
    if (product) {
        setMode(MODES.DETAILS, { product });
    }
}

export function addActiveToCart() {
    const product = getProductAtOffset(0);
    if (product) {
        addToCart(product);
        // Feedback visual
        const btn = state.container?.querySelector('#add-cart-btn');
        if (btn) {
            btn.classList.add('added');
            btn.innerHTML = '<span>Añadido ✓</span>';
            setTimeout(() => {
                btn.classList.remove('added');
                btn.innerHTML = `<span>Añadir al carrito</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 6h15l-1.5 9h-12z"></path>
                        <circle cx="9" cy="20" r="1"></circle>
                        <circle cx="18" cy="20" r="1"></circle>
                    </svg>`;
            }, 1500);
        }
    }
}

// Keyboard handler
function handleKeydown(e) {
    const currentState = getState();
    if (currentState.currentMode !== MODES.BROWSE) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault();
            prev();
            break;
        case 'ArrowDown':
            e.preventDefault();
            next();
            break;
        case 'Enter':
            e.preventDefault();
            selectActive();
            break;
        case 'a':
        case 'A':
            if (e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            addActiveToCart();
            break;
    }
}

// Wheel handler para scroll natural
function handleWheel(e) {
    const currentState = getState();
    if (currentState.currentMode !== MODES.BROWSE) return;

    e.preventDefault();
    if (e.deltaY > 0) {
        next();
    } else {
        prev();
    }
}

let initialized = false;

export function updateCoverflow(products) {
    state.products = products || [];
    state.activeIndex = 0;
    render();
}

export function renderCoverflow(containerEl, products) {
    if (!containerEl) return null;

    state.container = containerEl;
    state.products = products || [];
    state.activeIndex = 0;

    if (!initialized) {
        document.addEventListener('keydown', handleKeydown);
        containerEl.addEventListener('wheel', handleWheel, { passive: false });
        initialized = true;
    }

    render();

    return { next, prev, selectActive, addActiveToCart, update: updateCoverflow };
}

export default { renderCoverflow, updateCoverflow, next, prev, selectActive, addActiveToCart };
