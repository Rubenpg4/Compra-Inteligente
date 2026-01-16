#!/usr/bin/env node

/**
 * fetch_sample.js - Script para obtener datos de muestra
 * Utilidad para generar o actualizar el archivo products.json
 * Ejecutar con: node scripts/fetch_sample.js
 */

const fs = require('fs');
const path = require('path');

// Ruta al archivo de productos
const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

/**
 * Genera productos de muestra aleatorios
 * @param {number} count - Numero de productos a generar
 * @returns {Array} Lista de productos
 */
function generateSampleProducts(count = 10) {
    const categories = ['Tecnologia', 'Audio', 'Wearables', 'Fotografia', 'Perifericos', 'Gaming'];

    const productTemplates = [
        { name: 'Laptop', emoji: '💻', basePrice: 800, category: 'Tecnologia' },
        { name: 'Auriculares', emoji: '🎧', basePrice: 100, category: 'Audio' },
        { name: 'Smartwatch', emoji: '⌚', basePrice: 200, category: 'Wearables' },
        { name: 'Camara', emoji: '📷', basePrice: 500, category: 'Fotografia' },
        { name: 'Teclado', emoji: '⌨️', basePrice: 80, category: 'Perifericos' },
        { name: 'Monitor', emoji: '🖥️', basePrice: 300, category: 'Tecnologia' },
        { name: 'Tablet', emoji: '📱', basePrice: 400, category: 'Tecnologia' },
        { name: 'Altavoz', emoji: '🔊', basePrice: 60, category: 'Audio' },
        { name: 'Webcam', emoji: '📹', basePrice: 50, category: 'Perifericos' },
        { name: 'Mouse Gaming', emoji: '🖱️', basePrice: 40, category: 'Gaming' },
        { name: 'Consola', emoji: '🎮', basePrice: 400, category: 'Gaming' },
        { name: 'Drone', emoji: '🚁', basePrice: 600, category: 'Fotografia' }
    ];

    const adjectives = ['Pro', 'Ultra', 'Max', 'Elite', 'Plus', 'Premium', 'Lite', 'X'];
    const descriptions = [
        'Producto de alta calidad con las mejores caracteristicas',
        'Diseño moderno y funcionalidad excepcional',
        'Tecnologia de ultima generacion',
        'Rendimiento superior para usuarios exigentes',
        'La mejor relacion calidad-precio del mercado'
    ];

    const products = [];

    for (let i = 0; i < count; i++) {
        const template = productTemplates[i % productTemplates.length];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];

        products.push({
            id: i + 1,
            name: `${template.name} ${adjective}`,
            emoji: template.emoji,
            price: parseFloat((template.basePrice + Math.random() * template.basePrice).toFixed(2)),
            description: descriptions[Math.floor(Math.random() * descriptions.length)],
            category: template.category,
            stock: Math.floor(Math.random() * 50) + 5
        });
    }

    return products;
}

/**
 * Guarda los productos en el archivo JSON
 * @param {Array} products - Lista de productos
 */
function saveProducts(products) {
    const dirPath = path.dirname(PRODUCTS_FILE);

    // Crear directorio si no existe
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(
        PRODUCTS_FILE,
        JSON.stringify(products, null, 4),
        'utf-8'
    );

    console.log(`[OK] ${products.length} productos guardados en ${PRODUCTS_FILE}`);
}

/**
 * Carga productos existentes
 * @returns {Array|null}
 */
function loadExistingProducts() {
    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[Error] No se pudieron cargar productos existentes:', error.message);
    }
    return null;
}

/**
 * Funcion principal
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'generate';
    const count = parseInt(args[1]) || 10;

    console.log('=== Script de Datos de Muestra ===\n');

    switch (command) {
        case 'generate':
            console.log(`Generando ${count} productos de muestra...`);
            const newProducts = generateSampleProducts(count);
            saveProducts(newProducts);
            break;

        case 'show':
            const existing = loadExistingProducts();
            if (existing) {
                console.log(`Productos actuales (${existing.length}):\n`);
                existing.forEach(p => {
                    console.log(`  ${p.emoji} ${p.name} - $${p.price} (${p.category})`);
                });
            } else {
                console.log('No hay productos existentes.');
            }
            break;

        case 'help':
            console.log('Uso: node fetch_sample.js [comando] [opciones]\n');
            console.log('Comandos:');
            console.log('  generate [n]  Genera n productos de muestra (default: 10)');
            console.log('  show          Muestra productos existentes');
            console.log('  help          Muestra esta ayuda');
            break;

        default:
            console.log(`Comando desconocido: ${command}`);
            console.log('Usa "help" para ver comandos disponibles');
    }
}

// Ejecutar
main();

// TODO: Agregar opcion para fetch desde API externa
// TODO: Implementar validacion de schema JSON
// TODO: Agregar generacion de imagenes placeholder
