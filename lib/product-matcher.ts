import { Product } from '../models/product.model';

/**
 * Normaliza cualquier valor (código, barcode, id) a un string limpio en minúsculas sin espacios
 */
export function normalizeProductCode(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
}

/**
 * Extrae el código de barras primario o alternativo del producto
 */
export function getProductBarcode(product: Product): string {
  if (!product) return '';
  const code = product.barcode ?? (product as { code?: string }).code ?? (product as { codigo?: string }).codigo ?? '';
  return String(code).trim();
}

/**
 * Determina si un producto coincide EXACTAMENTE con un código (barcode, code, id)
 */
export function isExactProductCodeMatch(product: Product, queryCode: string): boolean {
  if (!product || !queryCode) return false;
  const target = normalizeProductCode(queryCode);
  if (!target) return false;

  const barcode = normalizeProductCode(product.barcode);
  const altCode = normalizeProductCode((product as { code?: string }).code);
  const altCodigo = normalizeProductCode((product as { codigo?: string }).codigo);
  const id = normalizeProductCode(product.id);

  // 1. Coincidencia exacta directa
  if (barcode === target || altCode === target || altCodigo === target || id === target) {
    return true;
  }

  // 2. Coincidencia numérica sin ceros iniciales si ambos son numéricos
  const targetNoZeros = target.replace(/^0+/, '');
  const barcodeNoZeros = barcode.replace(/^0+/, '');
  if (targetNoZeros && barcodeNoZeros && targetNoZeros === barcodeNoZeros) {
    return true;
  }

  return false;
}

/**
 * Busca si algún producto coincide exactamente con el código proporcionado
 */
export function findProductByExactCode(products: Product[], queryCode: string): Product | undefined {
  if (!products || products.length === 0 || !queryCode) return undefined;
  return products.find((p) => isExactProductCodeMatch(p, queryCode));
}

/**
 * Determina si un producto coincide exactamente o parcialmente con un código (barcode, code, id)
 */
export function matchesProductCode(product: Product, queryCode: string): boolean {
  if (!product || !queryCode) return false;
  const target = normalizeProductCode(queryCode);
  if (!target) return false;

  const barcode = normalizeProductCode(product.barcode);
  const altCode = normalizeProductCode((product as { code?: string }).code);
  const altCodigo = normalizeProductCode((product as { codigo?: string }).codigo);
  const id = normalizeProductCode(product.id);

  // 1. Coincidencia exacta directa
  if (barcode === target || altCode === target || altCodigo === target || id === target) {
    return true;
  }

  // 2. Coincidencia quitando ceros iniciales (o viceversa) si son numéricos
  const targetNoZeros = target.replace(/^0+/, '');
  const barcodeNoZeros = barcode.replace(/^0+/, '');
  if (targetNoZeros && barcodeNoZeros && targetNoZeros === barcodeNoZeros) {
    return true;
  }

  // 3. Coincidencia donde uno contiene al otro (si tiene al menos 3 caracteres)
  if (target.length >= 3) {
    if (barcode && (barcode.includes(target) || target.includes(barcode))) return true;
    if (altCode && (altCode.includes(target) || target.includes(altCode))) return true;
  }

  return false;
}

/**
 * Determina si un producto coincide con un término de búsqueda (nombre, código de barras o id)
 */
export function searchMatchesProduct(product: Product, query: string): boolean {
  if (!product || !query) return false;
  const q = normalizeProductCode(query);
  if (!q) return false;

  const name = String(product.name || '').toLowerCase();
  if (name.includes(q)) return true;

  return matchesProductCode(product, q);
}

/**
 * Busca el producto que mejor coincide con un código o término
 */
export function findBestProductMatch(products: Product[], query: string): Product | undefined {
  if (!products || products.length === 0 || !query) return undefined;
  const q = normalizeProductCode(query);
  if (!q) return undefined;

  // 1. Coincidencia exacta por código de barras primario
  const exactBarcode = products.find((p) => normalizeProductCode(p.barcode) === q);
  if (exactBarcode) return exactBarcode;

  // 2. Coincidencia exacta por código alternativo o ID
  const exactAlt = products.find((p) => {
    const altCode = normalizeProductCode((p as { code?: string }).code);
    const altCodigo = normalizeProductCode((p as { codigo?: string }).codigo);
    const id = normalizeProductCode(p.id);
    return altCode === q || altCodigo === q || id === q;
  });
  if (exactAlt) return exactAlt;

  // 3. Coincidencia numérica sin ceros iniciales
  const qNoZeros = q.replace(/^0+/, '');
  if (qNoZeros) {
    const noZerosMatch = products.find((p) => {
      const b = normalizeProductCode(p.barcode).replace(/^0+/, '');
      return b && b === qNoZeros;
    });
    if (noZerosMatch) return noZerosMatch;
  }

  // 4. Coincidencia parcial por código de barras (al menos 3 dígitos)
  if (q.length >= 3) {
    const partialCode = products.find((p) => {
      const b = normalizeProductCode(p.barcode);
      const c = normalizeProductCode((p as { code?: string }).code);
      return (b && (b.includes(q) || q.includes(b))) || (c && (c.includes(q) || q.includes(c)));
    });
    if (partialCode) return partialCode;
  }

  // 5. Coincidencia exacta por nombre
  const exactName = products.find((p) => normalizeProductCode(p.name) === q);
  if (exactName) return exactName;

  // 6. Coincidencia parcial por nombre
  return products.find((p) => String(p.name || '').toLowerCase().includes(q));
}
