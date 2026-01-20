/**
 * productGrid.js - Grid de productos con paginación
 * Muestra productos en grid 3x4 (12 por página)
 */

import {
    setMode,
    addToCart,
    MODES,
    getState
} from '../store.js';

// Configuración del grid
const ROWS = 3;
const COLS = 4;
const ITEMS_PER_PAGE = ROWS * COLS;

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
    currentPage: 0,
    products: [],
    container: null
};

function getProductImage(product) {
    return product.image || categoryImages[product.category] || categoryImages.snacks;
}

function getTotalPages() {
    return Math.ceil(state.products.length / ITEMS_PER_PAGE);
}

function getProductsForPage(page) {
    const start = page * ITEMS_PER_PAGE;
    return state.products.slice(start, start + ITEMS_PER_PAGE);
}

/**
 * Renderiza una tarjeta de producto
 */
function renderCard(product) {
    const image = getProductImage(product);
    const nutriColor = nutriscoreColors[product.nutriscore] || '#6b7280';

    return `
        <div class="grid-card" data-product-id="${product.id}">
            <div class="grid-card-inner">
                <div class="grid-card-image">
                    <img src="${image}" alt="${product.name}" loading="lazy">
                    <div class="grid-card-nutriscore" style="background: ${nutriColor}">
                        ${product.nutriscore}
                    </div>
                </div>
                <div class="grid-card-info">
                    <h3 class="grid-card-title">${product.name}</h3>
                    <p class="grid-card-brand">${product.brand}</p>
                    <p class="grid-card-quantity">${product.quantity}</p>
                </div>
                <button class="grid-card-add" data-product-id="${product.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Añadir
                </button>
            </div>
        </div>
    `;
}

/**
 * Renderiza la paginación
 */
function renderPagination() {
    const totalPages = getTotalPages();
    if (totalPages <= 1) return '';

    let dots = '';
    for (let i = 0; i < totalPages; i++) {
        dots += `<button class="pagination-dot ${i === state.currentPage ? 'active' : ''}" data-page="${i}"></button>`;
    }

    return `
        <div class="pagination">
            <button class="pagination-btn pagination-prev" ${state.currentPage === 0 ? 'disabled' : ''}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"/>
                </svg>
            </button>
            <div class="pagination-dots">
                ${dots}
            </div>
            <button class="pagination-btn pagination-next" ${state.currentPage >= totalPages - 1 ? 'disabled' : ''}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            </button>
        </div>
    `;
}

/**
 * Renderiza estado vacío
 */
function renderEmpty() {
    return `
        <div class="empty-state">
            <div class="empty-icon loading">🛒</div>
            <h3>Cargando productos...</h3>
        </div>
    `;
}

/**
 * Renderiza el grid completo
 */
function render() {
    if (!state.container) return;

    const { products, currentPage } = state;

    if (!products || products.length === 0) {
        state.container.innerHTML = renderEmpty();
        return;
    }

    const pageProducts = getProductsForPage(currentPage);

    state.container.innerHTML = `
        <div class="product-grid-container">
            <div class="product-grid">
                ${pageProducts.map(p => renderCard(p)).join('')}
            </div>
            ${renderPagination()}
        </div>
    `;

    // Event listeners para cards
    state.container.querySelectorAll('.grid-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.grid-card-add')) return;
            const productId = parseInt(card.dataset.productId);
            const product = products.find(p => p.id === productId);
            if (product) {
                setMode(MODES.DETAILS, { product });
            }
        });
    });

    // Event listeners para botones añadir
    state.container.querySelectorAll('.grid-card-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = parseInt(btn.dataset.productId);
            const product = products.find(p => p.id === productId);
            if (product) {
                addToCart(product);
                btn.innerHTML = '<span>✓</span>';
                btn.classList.add('added');
                setTimeout(() => {
                    btn.innerHTML = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Añadir
                    `;
                    btn.classList.remove('added');
                }, 1500);
            }
        });
    });

    // Event listeners para paginación
    state.container.querySelector('.pagination-prev')?.addEventListener('click', prevPage);
    state.container.querySelector('.pagination-next')?.addEventListener('click', nextPage);
    state.container.querySelectorAll('.pagination-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            goToPage(parseInt(dot.dataset.page));
        });
    });
}

// Navegación de páginas
export function prevPage() {
    if (state.currentPage > 0) {
        state.currentPage--;
        render();
    }
}

export function nextPage() {
    if (state.currentPage < getTotalPages() - 1) {
        state.currentPage++;
        render();
    }
}

export function goToPage(page) {
    if (page >= 0 && page < getTotalPages()) {
        state.currentPage = page;
        render();
    }
}

// Keyboard handler
function handleKeydown(e) {
    const currentState = getState();
    if (currentState.currentMode !== MODES.BROWSE) return;
    if (currentState.filters?.category || currentState.filters?.nutriscore) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            prevPage();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextPage();
            break;
    }
}

let initialized = false;

export function updateGrid(products) {
    state.products = products || [];
    state.currentPage = 0;
    render();
}

export function renderGrid(containerEl, products) {
    if (!containerEl) return null;

    state.container = containerEl;
    state.products = products || [];
    state.currentPage = 0;

    if (!initialized) {
        document.addEventListener('keydown', handleKeydown);
        initialized = true;
    }

    render();

    return { nextPage, prevPage, goToPage, update: updateGrid };
}

export default { renderGrid, updateGrid, nextPage, prevPage, goToPage };
