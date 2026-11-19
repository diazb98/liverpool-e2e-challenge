import { displayedPrice, type PlpRecord } from '../api/searchApi';

export interface UiProduct {
  id: string;
  name: string;
  price: number;
}

export type DiscrepancyKind = 'name' | 'price' | 'not-in-response';

export interface Discrepancy {
  kind: DiscrepancyKind;
  ui: UiProduct;
  detail: string;
}

export interface ValidationResult {
  matched: number;
  total: number;
  discrepancies: Discrepancy[];
  /** Orden de la UI (ids) frente al orden en que los devolvió el API. */
  orderMatches: boolean;
}

const PRICE_TOLERANCE = 0.005;

export const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** "$14,699.00", "$249 50", "$1,299" -> número. */
export function parsePrice(text: string): number {
  const match = text.match(/\$\s*([\d,]+)(?:\s*\.?\s*(\d{2}))?/);
  if (!match) throw new Error(`Cannot parse price from "${text}"`);
  const integer = Number(match[1].replace(/,/g, ''));
  const cents = match[2] ? Number(match[2]) / 100 : 0;
  return integer + cents;
}

/**
 * Valida de forma cruzada los productos de la UI contra la respuesta interceptada.
 * Un producto "aparece" en la respuesta si coincide su id (preferido) o, en su defecto,
 * su nombre normalizado. Si es el mismo producto pero con otro nombre o precio, cuenta como
 * coincidencia y además se reporta como discrepancia.
 */
export function crossValidate(ui: UiProduct[], records: PlpRecord[]): ValidationResult {
  const byId = new Map(records.map((r) => [r.productId, r]));
  const byName = new Map(records.map((r) => [normalizeName(r.title), r]));
  const discrepancies: Discrepancy[] = [];
  let matched = 0;

  for (const product of ui) {
    const record = byId.get(product.id) ?? byName.get(normalizeName(product.name));
    if (!record) {
      discrepancies.push({ kind: 'not-in-response', ui: product, detail: 'product not found in intercepted response' });
      continue;
    }
    matched++;
    if (normalizeName(record.title) !== normalizeName(product.name)) {
      discrepancies.push({ kind: 'name', ui: product, detail: `UI "${product.name}" vs API "${record.title}"` });
    }
    const apiPrice = displayedPrice(record);
    if (apiPrice === undefined || Math.abs(apiPrice - product.price) > PRICE_TOLERANCE) {
      discrepancies.push({ kind: 'price', ui: product, detail: `UI ${product.price} vs API ${apiPrice}` });
    }
  }

  const apiOrder = records.map((r) => r.productId).filter((id) => ui.some((p) => p.id === id));
  const orderMatches = ui.every((p, i) => apiOrder[i] === p.id);

  return { matched, total: ui.length, discrepancies, orderMatches };
}
