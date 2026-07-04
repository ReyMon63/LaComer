/**
 * data.js — Base de datos del Preciador de Garantías Extendidas (La Comer)
 * -------------------------------------------------------------------------
 * Fuente: "Preciador LaComer_v1.2.xlsx" (hoja "Preciador").
 * Este archivo es el ÚNICO que debes tocar cuando cambien porcentajes, SKUs,
 * artículos elegibles o claves de acceso. No requiere modificar index.html,
 * style.css ni app.js.
 *
 * Para actualizar en el futuro desde Google Drive / un Google Sheet:
 * reemplaza el contenido de CATALOGO e INSTALACION por lo que exportes de
 * la hoja, respetando esta misma forma (mismos nombres de campos).
 */

// ---------------------------------------------------------------------
// 1) CLAVES DE ACCESO
// ---------------------------------------------------------------------
// Prueba 1: una sola clave hardcodeada. Más adelante esto se reemplaza por
// una tabla real (por ejemplo [{clave:"1234", vendedor:"Juan Pérez"}, ...]).
const ACCESS_CODES = [
  "reymon",
];

// ---------------------------------------------------------------------
// 2) CATÁLOGO DE GARANTÍAS EXTENDIDAS
// ---------------------------------------------------------------------
// Cada categoría trae:
//  - clave / nombre de categoría y subcategoría (tal cual el Excel)
//  - articulos: lista de artículos elegibles (para el buscador dinámico)
//  - opciones: cada opción de venta (años, tipo, SKU y % sobre el precio)
const CATALOGO = [
  {
    categoriaClave: 2399,
    categoriaNombre: "GARANTÍAS EXTENDIDAS",
    subClave: 4989,
    subNombre: "Línea Blanca",
    articulos: [
      "Refrigeradores", "lavasecadoras", "congelador", "secadoras",
      "lavavajillas", "ventiladores", "estufas", "horno parrilla empotrado",
      "lavadora", "horno para empotrar", "centro de lavado",
      "calefactor eléctrico", "minisplit",
    ],
    opciones: [
      { years: 1, tipo: "Garantía", sku: 79740166, pct: 0.0524 },
      { years: 2, tipo: "Garantía", sku: 79740258, pct: 0.0950 },
      { years: 3, tipo: "Garantía", sku: 79740272, pct: 0.1221 },
    ],
  },
  {
    categoriaClave: 2399,
    categoriaNombre: "GARANTÍAS EXTENDIDAS",
    subClave: 4990,
    subNombre: "Electrodomésticos",
    articulos: [
      "Tostador", "enfriador y calentador de agua", "licuadoras",
      "plancha de vapor", "planta eléctrica", "generador de vapor",
      "cafeteras", "exprimidores", "amasadoras", "batidoras",
      "extractor de botellas", "microondas", "sandwichera", "freidoras",
      "hornos personal caliente", "olla de cocimiento lento", "ahumadores",
      "sartén eléctrica", "deshidratadores", "procesador alimenticio",
      "aspiradoras", "horno eléctrico",
    ],
    opciones: [
      { years: 1, tipo: "Garantía", sku: 79740319, pct: 0.0567 },
      { years: 2, tipo: "Garantía", sku: 79740326, pct: 0.0839 },
    ],
  },
  {
    categoriaClave: 2399,
    categoriaNombre: "GARANTÍAS EXTENDIDAS",
    subClave: 4991,
    subNombre: "Electrónica y Cómputo",
    articulos: [
      "Pantallas", "laptops", "teatro en casa", "consolas de videojuegos",
      "bocinas", "monitores", "equipos de audio",
    ],
    opciones: [
      { years: 1, tipo: "Garantía", sku: 79741293, pct: 0.0624 },
      { years: 2, tipo: "Garantía", sku: 79741309, pct: 0.0739 },
      { years: 3, tipo: "Garantía", sku: 79741316, pct: 0.1207 },
    ],
  },
  {
    categoriaClave: 2399,
    categoriaNombre: "GARANTÍAS EXTENDIDAS",
    subClave: 4995,
    subNombre: "Celulares",
    articulos: ["Celulares", "tablets"],
    opciones: [
      { years: 1, tipo: "Garantía", sku: 79742092, pct: 0.0314 },
      { years: 1, tipo: "Robo", sku: 79742221, pct: 0.0796 },
    ],
  },
  {
    categoriaClave: 2399,
    categoriaNombre: "GARANTÍAS EXTENDIDAS",
    subClave: 4996,
    subNombre: "Ferretería",
    articulos: ["Herramientas eléctricas", "hidrolavadoras"],
    opciones: [
      { years: 1, tipo: "Garantía", sku: 79742252, pct: 0.0647 },
      { years: 2, tipo: "Garantía", sku: 79742269, pct: 0.0971 },
    ],
  },
];

// ---------------------------------------------------------------------
// 3) INSTALACIÓN (monto fijo, no es un % — se ofrece solo si el artículo
//    cotizado aplica, según la lista de la hoja original)
// ---------------------------------------------------------------------
const INSTALACION = {
  categoriaClave: 2400,
  categoriaNombre: "TRASLADO E INSTALACIÓN",
  subClave: 4999,
  subNombre: "Instalación",
  sku: 79742290,
  nombre: "Instalación",
  monto: 990,
  nota: "No incluye soporte de pantallas.",
  articulos: [
    "parrillas", "estufas", "hornos", "lavadoras", "secadoras",
    "refrigeradores", "lavavajillas", "pantallas",
  ],
};
