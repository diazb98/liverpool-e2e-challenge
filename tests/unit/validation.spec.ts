import { expect, test } from '@playwright/test';
import type { PlpRecord } from '../../src/api/searchApi';
import { crossValidate, normalizeName, parsePrice } from '../../src/utils/validation';

const record = (id: string, title: string, promo: number, sale = promo): PlpRecord => ({
  productId: id,
  title,
  priceInfo: { salePrice: sale, promoPrice: { price: promo } },
});

test.describe('parsePrice', () => {
  test('parses thousands separators and cents', () => {
    expect(parsePrice('$14,699.00')).toBe(14699);
    expect(parsePrice('$249.50')).toBe(249.5);
    expect(parsePrice('$249 50')).toBe(249.5);
    expect(parsePrice('$1,299')).toBe(1299);
  });
  test('throws when there is no price', () => {
    expect(() => parsePrice('agotado')).toThrow();
  });
});

test('normalizeName ignores case, accents and spacing', () => {
  expect(normalizeName('  Consola  PS5 edición ')).toBe('consola ps5 edicion');
});

test.describe('crossValidate', () => {
  const api = [record('1', 'Consola PS5', 100), record('2', 'Control DualSense', 50), record('3', 'Juego', 20)];

  test('all matching → no discrepancies', () => {
    const ui = [
      { id: '1', name: 'Consola PS5', price: 100 },
      { id: '2', name: 'Control DualSense', price: 50 },
    ];
    const r = crossValidate(ui, api);
    expect(r.matched).toBe(2);
    expect(r.discrepancies).toEqual([]);
    expect(r.orderMatches).toBe(true);
  });

  test('reports price and name differences but still counts the match', () => {
    const r = crossValidate([{ id: '1', name: 'Consola PS5 Slim', price: 120 }], api);
    expect(r.matched).toBe(1);
    expect(r.discrepancies.map((d) => d.kind).sort()).toEqual(['name', 'price']);
  });

  test('unknown product is reported and not counted', () => {
    const r = crossValidate([{ id: '99', name: 'Otro', price: 1 }], api);
    expect(r.matched).toBe(0);
    expect(r.discrepancies[0].kind).toBe('not-in-response');
  });

  test('falls back to name match when ids differ', () => {
    const r = crossValidate([{ id: 'x', name: 'consola ps5', price: 100 }], api);
    expect(r.matched).toBe(1);
  });

  test('detects order mismatch', () => {
    const ui = [
      { id: '2', name: 'Control DualSense', price: 50 },
      { id: '1', name: 'Consola PS5', price: 100 },
    ];
    expect(crossValidate(ui, api).orderMatches).toBe(false);
  });
});
