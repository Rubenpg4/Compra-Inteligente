/**
 * horizontalCoverflow.js - Coverflow Horizontal
 * Muestra 3 productos con el del centro en foco
 */

import {
    setMode,
    addToCart,
    MODES,
    addLog,
    clearFilters,
    getState
} from '../store.js';

// Imágenes por categoría
const categoryImages = {
    snacks: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop',
    drinks: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=400&fit=crop',
    dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=400&fit=crop',
    cereals: 'https://images.unsplash.com/photo-1517456215183-9a2c3a748f8c?w=400&h=400&fit=crop'
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
    return product.image || categoryImages[product.category] || categoryImages.snacks;
}

function getProductAtOffset(offset) {
    const index = state.activeIndex + offset;
    if (index < 0 || index >= state.products.length) return null;
    return state.products[index];
}

/**
 * Renderiza una tarjeta de producto para el coverflow horizontal
 */
function renderCard(product, position) {
    if (!product) {
        return `<div class="hcoverflow-card hcoverflow-${position}" style="opacity:0; pointer-events:none;"></div>`;
    }

    const image = getProductImage(product);
    const nutriColor = nutriscoreColors[product.nutriscore] || '#6b7280';

    // Configuración 3D por posición (horizontal)
    const configs = {
        'prev': { x: -320, scale: 0.75, opacity: 0.6, blur: 2, rotateY: 35, z: -150 },
        'active': { x: 0, scale: 1, opacity: 1, blur: 0, rotateY: 0, z: 0 },
        'next': { x: 320, scale: 0.75, opacity: 0.6, blur: 2, rotateY: -35, z: -150 }
    };

    const c = configs[position] || configs.active;
    const isActive = position === 'active';

    return `
        <div class="hcoverflow-card hcoverflow-${position}"
             style="
                transform: perspective(1000px) translateX(${c.x}px) translateZ(${c.z}px) scale(${c.scale}) rotateY(${c.rotateY}deg);
                opacity: ${c.opacity};
                filter: blur(${c.blur}px);
                z-index: ${isActive ? 50 : 10};
             "
             data-product-id="${product.id}"
             data-position="${position}">

            <div class="hcoverflow-card-inner">
                <div class="hcoverflow-card-image">
                    <img src="${image}" alt="${product.name}" loading="lazy">
                    <div class="hcoverflow-card-reflection"></div>
                </div>

                <div class="hcoverflow-nutriscore" style="background: ${nutriColor}">
                    ${product.nutriscore}
                </div>

                <div class="hcoverflow-card-info ${isActive ? 'visible' : ''}">
                    <h3 class="hcoverflow-card-title">${product.name}</h3>
                    <p class="hcoverflow-card-brand">${product.brand}</p>
                    <p class="hcoverflow-card-quantity">${product.quantity}</p>
                    ${isActive ? `
                        <button class="hcoverflow-add-btn" data-product-id="${product.id}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M6 6h15l-1.5 9h-12z"></path>
                                <circle cx="9" cy="20" r="1"></circle>
                                <circle cx="18" cy="20" r="1"></circle>
                            </svg>
                            Añadir al carrito
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza estado vacío con opción de limpiar filtros
 */
function renderEmpty() {
    return `
        <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>Sin resultados</h3>
            <p>No hay productos con estos filtros</p>
            <button id="hcoverflow-clear-filters" class="clear-btn">Limpiar filtros</button>
        </div>
    `;
}

/**
 * Renderiza el coverflow completo
 * @param {string} direction - Dirección de la animación: 'left', 'right', o null
 */
function render(direction = null) {
    if (!state.container) return;

    const { products, activeIndex } = state;

    if (!products || products.length === 0) {
        state.container.innerHTML = renderEmpty();
        state.container.querySelector('#hcoverflow-clear-filters')?.addEventListener('click', () => {
            clearFilters();
        });
        return;
    }

    const activeProduct = products[activeIndex];
    const slideClass = direction ? `slide-${direction}` : '';

    state.container.innerHTML = `
        <div class="hcoverflow-stage">
            <div class="hcoverflow-track ${slideClass}">
                ${renderCard(getProductAtOffset(-1), 'prev')}
                ${renderCard(getProductAtOffset(0), 'active')}
                ${renderCard(getProductAtOffset(1), 'next')}
            </div>

            <div class="hcoverflow-nav">
                <button class="hcoverflow-nav-btn hcoverflow-nav-prev" ${activeIndex === 0 ? 'disabled' : ''}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                <div class="hcoverflow-indicator">
                    <span class="hcoverflow-current">${activeIndex + 1}</span>
                    <span class="hcoverflow-separator">/</span>
                    <span class="hcoverflow-total">${products.length}</span>
                </div>
                <button class="hcoverflow-nav-btn hcoverflow-nav-next" ${activeIndex >= products.length - 1 ? 'disabled' : ''}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                </button>
            </div>
        </div>
    `;

    // Event listeners
    state.container.querySelector('.hcoverflow-nav-prev')?.addEventListener('click', prev);
    state.container.querySelector('.hcoverflow-nav-next')?.addEventListener('click', next);

    // Click en tarjeta activa para ver detalles
    state.container.querySelector('.hcoverflow-active')?.addEventListener('click', (e) => {
        if (e.target.closest('.hcoverflow-add-btn')) return;
        selectActive();
    });

    // Click en prev/next cards para navegar
    state.container.querySelector('.hcoverflow-prev')?.addEventListener('click', prev);
    state.container.querySelector('.hcoverflow-next')?.addEventListener('click', next);

    // Botón añadir al carrito
    state.container.querySelector('.hcoverflow-add-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        addActiveToCart();
    });
}

// Navegación con animación
export function prev() {
    console.log('[Coverflow] prev() llamado, activeIndex:', state.activeIndex, 'products:', state.products.length);
    if (!state.container || state.products.length === 0) {
        console.log('[Coverflow] No hay container o productos');
        return false;
    }
    if (state.activeIndex > 0) {
        console.log('[Coverflow] Retrocediendo al producto anterior');
        state.activeIndex--;
        render('right');
        return true;
    }
    return false;
}

export function next() {
    console.log('[Coverflow] next() llamado, activeIndex:', state.activeIndex, 'products:', state.products.length);
    if (!state.container || state.products.length === 0) {
        console.log('[Coverflow] No hay container o productos');
        return false;
    }
    if (state.activeIndex < state.products.length - 1) {
        console.log('[Coverflow] Avanzando al siguiente producto');
        state.activeIndex++;
        render('left');
        return true;
    }
    return false;
}

export function selectActive() {
    const product = getProductAtOffset(0);
    if (product) {
        setMode(MODES.DETAILS, { product });
    }
}

/**
 * Retorna el producto actualmente en foco (para uso externo)
 */
export function getActiveProduct() {
    console.log('[DEBUG getActiveProduct] state.products.length:', state.products.length, 'activeIndex:', state.activeIndex);
    const product = getProductAtOffset(0);
    console.log('[DEBUG getActiveProduct] product:', product);
    return product;
}

export function triggerAddAnimation(duration = 1000) {
    const btn = state.container?.querySelector('.hcoverflow-add-btn');
    if (btn) {
        btn.classList.add('added');
        btn.innerHTML = '<span>Añadido ✓</span>';
        setTimeout(() => {
            btn.classList.remove('added');
            btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 6h15l-1.5 9h-12z"></path>
                    <circle cx="9" cy="20" r="1"></circle>
                    <circle cx="18" cy="20" r="1"></circle>
                </svg>
                Añadir al carrito
            `;
        }, duration);
    }
}

export function addActiveToCart() {
    const product = getProductAtOffset(0);
    if (product) {
        addToCart(product);
        triggerAddAnimation();
    }
}

// Keyboard handler
function handleKeydown(e) {
    const currentState = getState();
    if (currentState.currentMode !== MODES.BROWSE) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            prev();
            break;
        case 'ArrowRight':
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

// Wheel handler
function handleWheel(e) {
    const currentState = getState();
    if (currentState.currentMode !== MODES.BROWSE) return;

    e.preventDefault();
    if (e.deltaY > 0 || e.deltaX > 0) {
        next();
    } else {
        prev();
    }
}

let initialized = false;

export function updateHorizontalCoverflow(products) {
    const newProducts = products || [];

    // Logic: Try to keep the same product focused
    let newIndex = 0;

    if (state.products.length > 0 && state.activeIndex < state.products.length) {
        const currentProduct = state.products[state.activeIndex];
        // Buscar este producto en la nueva lista
        const foundIndex = newProducts.findIndex(p => p.id === currentProduct.id);

        if (foundIndex !== -1) {
            // El producto sigue existiendo, mantenemos foco en el
            // console.log(`[Coverflow] Manteniendo foco en producto ${currentProduct.name} (idx ${foundIndex})`);
            newIndex = foundIndex;
        } else {
            console.log('[Coverflow] Producto activo ya no existe, reset a 0');
        }
    }

    state.products = newProducts;
    state.activeIndex = newIndex;
    render();
}

export function renderHorizontalCoverflow(containerEl, products) {
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

    return { next, prev, selectActive, addActiveToCart, update: updateHorizontalCoverflow };
}

export default { renderHorizontalCoverflow, updateHorizontalCoverflow, next, prev, selectActive, addActiveToCart, getActiveProduct };
