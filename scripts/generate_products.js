#!/usr/bin/env node

/**
 * generate_products.js - Generador de productos ficticios realistas
 * Genera 50 productos agrupados por categorias (snacks, drinks, dairy, cereals)
 * Sin dependencias externas ni llamadas a APIs
 *
 * Ejecutar: node scripts/generate_products.js
 */

const fs = require('fs');
const path = require('path');

// Ruta de salida
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'products.json');

// ============================================================================
// BASE DE DATOS DE PRODUCTOS POR CATEGORIA
// ============================================================================

const productDatabase = {
    snacks: {
        products: [
            { name: 'Patatas Fritas Clasicas', brand: 'Lays', nutriscore: 'D', quantity: '150g', keywords: ['patatas', 'fritas', 'aperitivo', 'salado'] },
            { name: 'Patatas Fritas Campesinas', brand: 'Ruffles', nutriscore: 'D', quantity: '170g', keywords: ['patatas', 'onduladas', 'crujiente'] },
            { name: 'Tortitas de Maiz', brand: 'Bicentury', nutriscore: 'A', quantity: '130g', keywords: ['maiz', 'tortitas', 'ligero', 'sin gluten'] },
            { name: 'Nachos Tex-Mex', brand: 'Doritos', nutriscore: 'D', quantity: '150g', keywords: ['nachos', 'maiz', 'picante', 'mexicano'] },
            { name: 'Palomitas de Maiz', brand: 'Act II', nutriscore: 'C', quantity: '100g', keywords: ['palomitas', 'maiz', 'microondas'] },
            { name: 'Galletas de Chocolate', brand: 'Oreo', nutriscore: 'E', quantity: '154g', keywords: ['galletas', 'chocolate', 'dulce', 'rellenas'] },
            { name: 'Galletas Digestive', brand: 'Fontaneda', nutriscore: 'C', quantity: '400g', keywords: ['galletas', 'digestive', 'fibra', 'integral'] },
            { name: 'Barritas de Cereales', brand: 'Hero', nutriscore: 'B', quantity: '6x25g', keywords: ['barritas', 'cereales', 'muesli', 'avena'] },
            { name: 'Frutos Secos Mix', brand: 'Borges', nutriscore: 'A', quantity: '200g', keywords: ['frutos secos', 'nueces', 'almendras', 'natural'] },
            { name: 'Almendras Tostadas', brand: 'Hacendado', nutriscore: 'A', quantity: '150g', keywords: ['almendras', 'tostadas', 'proteina'] },
            { name: 'Cacahuetes Salados', brand: 'MisterCorn', nutriscore: 'C', quantity: '200g', keywords: ['cacahuetes', 'salado', 'aperitivo'] },
            { name: 'Gusanitos de Maiz', brand: 'Cheetos', nutriscore: 'D', quantity: '96g', keywords: ['gusanitos', 'maiz', 'queso', 'infantil'] },
            { name: 'Crackers Integrales', brand: 'Wasa', nutriscore: 'A', quantity: '275g', keywords: ['crackers', 'integral', 'fibra', 'tostadas'] }
        ]
    },
    drinks: {
        products: [
            { name: 'Agua Mineral Natural', brand: 'Bezoya', nutriscore: 'A', quantity: '1.5L', keywords: ['agua', 'mineral', 'natural', 'hidratacion'] },
            { name: 'Agua con Gas', brand: 'Perrier', nutriscore: 'A', quantity: '750ml', keywords: ['agua', 'gas', 'sparkling', 'burbujas'] },
            { name: 'Zumo de Naranja', brand: 'Tropicana', nutriscore: 'C', quantity: '1L', keywords: ['zumo', 'naranja', 'vitamina c', 'natural'] },
            { name: 'Zumo Multifrutas', brand: 'Don Simon', nutriscore: 'C', quantity: '1L', keywords: ['zumo', 'multifrutas', 'vitaminas'] },
            { name: 'Refresco de Cola', brand: 'Coca-Cola', nutriscore: 'E', quantity: '2L', keywords: ['refresco', 'cola', 'gas', 'azucar'] },
            { name: 'Refresco de Cola Zero', brand: 'Coca-Cola', nutriscore: 'B', quantity: '2L', keywords: ['refresco', 'cola', 'zero', 'sin azucar'] },
            { name: 'Refresco de Limon', brand: 'Fanta', nutriscore: 'E', quantity: '2L', keywords: ['refresco', 'limon', 'citrico', 'gas'] },
            { name: 'Refresco de Naranja', brand: 'Fanta', nutriscore: 'E', quantity: '2L', keywords: ['refresco', 'naranja', 'gas'] },
            { name: 'Te Frio al Limon', brand: 'Nestea', nutriscore: 'D', quantity: '1.5L', keywords: ['te', 'limon', 'frio', 'refresco'] },
            { name: 'Te Frio al Melocoton', brand: 'Lipton', nutriscore: 'D', quantity: '1.5L', keywords: ['te', 'melocoton', 'frio'] },
            { name: 'Bebida Isotonica', brand: 'Aquarius', nutriscore: 'C', quantity: '1.5L', keywords: ['isotonica', 'deporte', 'limon', 'hidratacion'] },
            { name: 'Bebida Energetica', brand: 'Red Bull', nutriscore: 'E', quantity: '250ml', keywords: ['energetica', 'cafeina', 'taurina'] },
            { name: 'Batido de Chocolate', brand: 'Puleva', nutriscore: 'C', quantity: '1L', keywords: ['batido', 'chocolate', 'leche', 'cacao'] }
        ]
    },
    dairy: {
        products: [
            { name: 'Leche Entera', brand: 'Pascual', nutriscore: 'A', quantity: '1L', keywords: ['leche', 'entera', 'calcio', 'proteina'] },
            { name: 'Leche Semidesnatada', brand: 'Central Lechera', nutriscore: 'A', quantity: '1L', keywords: ['leche', 'semidesnatada', 'ligera'] },
            { name: 'Leche Desnatada', brand: 'Puleva', nutriscore: 'A', quantity: '1L', keywords: ['leche', 'desnatada', 'light', '0%'] },
            { name: 'Leche sin Lactosa', brand: 'Kaiku', nutriscore: 'A', quantity: '1L', keywords: ['leche', 'sin lactosa', 'digestiva'] },
            { name: 'Yogur Natural', brand: 'Danone', nutriscore: 'A', quantity: '4x125g', keywords: ['yogur', 'natural', 'probioticos'] },
            { name: 'Yogur Griego', brand: 'Oikos', nutriscore: 'B', quantity: '4x110g', keywords: ['yogur', 'griego', 'cremoso', 'proteina'] },
            { name: 'Yogur de Fresa', brand: 'Activia', nutriscore: 'B', quantity: '4x120g', keywords: ['yogur', 'fresa', 'frutas', 'bifidus'] },
            { name: 'Queso Fresco', brand: 'Burgos', nutriscore: 'A', quantity: '250g', keywords: ['queso', 'fresco', 'ligero', 'proteina'] },
            { name: 'Queso Manchego Curado', brand: 'Garcia Baquero', nutriscore: 'D', quantity: '250g', keywords: ['queso', 'manchego', 'curado', 'oveja'] },
            { name: 'Queso en Lonchas', brand: 'El Caserio', nutriscore: 'C', quantity: '200g', keywords: ['queso', 'lonchas', 'sandwich'] },
            { name: 'Mantequilla', brand: 'President', nutriscore: 'D', quantity: '250g', keywords: ['mantequilla', 'grasa', 'untar'] },
            { name: 'Margarina Ligera', brand: 'Flora', nutriscore: 'C', quantity: '250g', keywords: ['margarina', 'ligera', 'omega 3'] },
            { name: 'Nata para Cocinar', brand: 'Pascual', nutriscore: 'D', quantity: '200ml', keywords: ['nata', 'cocinar', 'crema', 'salsas'] }
        ]
    },
    cereals: {
        products: [
            { name: 'Copos de Avena', brand: 'Quaker', nutriscore: 'A', quantity: '500g', keywords: ['avena', 'copos', 'fibra', 'integral'] },
            { name: 'Muesli con Frutas', brand: 'Kelloggs', nutriscore: 'B', quantity: '500g', keywords: ['muesli', 'frutas', 'avena', 'pasas'] },
            { name: 'Cereales Integrales', brand: 'All Bran', nutriscore: 'A', quantity: '450g', keywords: ['cereales', 'integral', 'fibra', 'digestivo'] },
            { name: 'Corn Flakes', brand: 'Kelloggs', nutriscore: 'B', quantity: '500g', keywords: ['corn flakes', 'maiz', 'crujiente', 'clasico'] },
            { name: 'Cereales de Chocolate', brand: 'Chocapic', nutriscore: 'D', quantity: '375g', keywords: ['cereales', 'chocolate', 'infantil'] },
            { name: 'Arroz Inflado con Miel', brand: 'Special K', nutriscore: 'C', quantity: '375g', keywords: ['arroz', 'miel', 'ligero'] },
            { name: 'Granola Crujiente', brand: 'Jordans', nutriscore: 'B', quantity: '400g', keywords: ['granola', 'avena', 'miel', 'nueces'] },
            { name: 'Cereales Fitness', brand: 'Nestle', nutriscore: 'B', quantity: '375g', keywords: ['fitness', 'integral', 'ligero', 'trigo'] },
            { name: 'Copos de Trigo', brand: 'Weetabix', nutriscore: 'A', quantity: '430g', keywords: ['trigo', 'integral', 'fibra', 'british'] },
            { name: 'Cereales con Almendras', brand: 'Alpen', nutriscore: 'B', quantity: '550g', keywords: ['cereales', 'almendras', 'muesli'] },
            { name: 'Cereales de Arroz', brand: 'Rice Krispies', nutriscore: 'C', quantity: '340g', keywords: ['arroz', 'inflado', 'crujiente'] }
        ]
    }
};

// ============================================================================
// FUNCIONES DE GENERACION
// ============================================================================

/**
 * Genera un ID unico basado en categoria y numero
 * @param {string} category - Categoria del producto
 * @param {number} index - Indice dentro de la categoria
 * @returns {string} ID unico
 */
function generateId(category, index) {
    const prefixes = {
        snacks: 'SNK',
        drinks: 'DRK',
        dairy: 'DRY',
        cereals: 'CRL'
    };
    return `${prefixes[category]}-${String(index + 1).padStart(3, '0')}`;
}

/**
 * Selecciona N productos aleatorios de un array
 * @param {Array} array - Array de productos
 * @param {number} n - Numero de productos a seleccionar
 * @returns {Array} Productos seleccionados
 */
function selectRandom(array, n) {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, array.length));
}

/**
 * Genera los 50 productos distribuidos por categoria
 * @returns {Array} Lista de productos generados
 */
function generateProducts() {
    const products = [];
    let globalId = 1;

    // Distribucion: 13 snacks, 13 drinks, 13 dairy, 11 cereals = 50
    const distribution = {
        snacks: 13,
        drinks: 13,
        dairy: 13,
        cereals: 11
    };

    console.log('\n📦 Generando productos por categoria...\n');

    for (const [category, count] of Object.entries(distribution)) {
        const categoryProducts = productDatabase[category].products;
        const selected = selectRandom(categoryProducts, count);

        console.log(`  [${category.toUpperCase()}] Seleccionando ${selected.length} productos...`);

        selected.forEach((product, index) => {
            products.push({
                id: globalId++,
                code: generateId(category, index),
                name: product.name,
                brand: product.brand,
                category: category,
                image: null,
                nutriscore: product.nutriscore,
                quantity: product.quantity,
                keywords: product.keywords
            });
        });
    }

    // Mezclar el orden final
    return products.sort(() => Math.random() - 0.5);
}

/**
 * Genera el bloque meta con informacion del archivo
 * @param {Array} products - Lista de productos generados
 * @returns {Object} Objeto meta
 */
function generateMeta(products) {
    const categories = [...new Set(products.map(p => p.category))].sort();
    const categoryCounts = {};

    categories.forEach(cat => {
        categoryCounts[cat] = products.filter(p => p.category === cat).length;
    });

    return {
        generated_at: new Date().toISOString(),
        total_products: products.length,
        categories: categories,
        products_per_category: categoryCounts,
        nutriscore_distribution: {
            A: products.filter(p => p.nutriscore === 'A').length,
            B: products.filter(p => p.nutriscore === 'B').length,
            C: products.filter(p => p.nutriscore === 'C').length,
            D: products.filter(p => p.nutriscore === 'D').length,
            E: products.filter(p => p.nutriscore === 'E').length
        }
    };
}

/**
 * Guarda el JSON en el archivo de destino
 * @param {Object} data - Datos a guardar
 */
function saveToFile(data) {
    const dirPath = path.dirname(OUTPUT_FILE);

    // Crear directorio si no existe
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`\n📁 Directorio creado: ${dirPath}`);
    }

    // Guardar con indentacion de 2 espacios
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================================
// EJECUCION PRINCIPAL
// ============================================================================

function main() {
    console.log('═'.repeat(60));
    console.log('  GENERADOR DE PRODUCTOS - Demo Multimodal');
    console.log('═'.repeat(60));

    // Generar productos
    const products = generateProducts();

    // Generar metadata
    const meta = generateMeta(products);

    // Estructura final del JSON
    const output = {
        meta: meta,
        products: products
    };

    // Guardar archivo
    saveToFile(output);

    // Resumen en consola
    console.log('\n' + '─'.repeat(60));
    console.log('✅ GENERACION COMPLETADA\n');
    console.log(`   📄 Archivo: ${OUTPUT_FILE}`);
    console.log(`   📊 Total productos: ${meta.total_products}`);
    console.log(`   📁 Categorias: ${meta.categories.join(', ')}`);
    console.log('\n   Distribucion por categoria:');
    Object.entries(meta.products_per_category).forEach(([cat, count]) => {
        console.log(`      - ${cat}: ${count} productos`);
    });
    console.log('\n   Distribucion Nutriscore:');
    Object.entries(meta.nutriscore_distribution).forEach(([score, count]) => {
        const bar = '█'.repeat(count) + '░'.repeat(15 - count);
        console.log(`      ${score}: ${bar} (${count})`);
    });
    console.log('\n' + '═'.repeat(60));
}

// Ejecutar
main();
