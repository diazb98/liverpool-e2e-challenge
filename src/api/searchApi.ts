import type { Response } from '@playwright/test';
import { settings } from '../config/settings';

/** Subconjunto de la respuesta de `POST /api/plp/search` que consume el frontend. */
export interface PlpRecord {
  productId: string;
  title: string;
  priceInfo: {
    salePrice?: number;
    listPrice?: { price: number };
    promoPrice?: { price: number };
  };
}

export interface PlpSearchResponse {
  data: {
    records: PlpRecord[];
    pageInfo?: { totalRecordCount?: number };
  };
}

/** Identifica el XHR de búsqueda, filtro u orden del frontend. Opcionalmente exige un fragmento en el cuerpo de la petición. */
export const isSearchApiResponse =
  (bodyIncludes?: string) =>
  (response: Response): boolean => {
    const request = response.request();
    return (
      request.method() === 'POST' &&
      response.url().includes(settings.searchApiPath) &&
      (bodyIncludes === undefined || (request.postData() ?? '').includes(bodyIncludes))
    );
  };

export async function parseSearchResponse(response: Response): Promise<PlpRecord[]> {
  const body = (await response.json()) as PlpSearchResponse;
  const records = body?.data?.records;
  if (!Array.isArray(records)) {
    throw new Error(`Unexpected search API shape (status ${response.status()}): no data.records array`);
  }
  return records;
}

/**
 * Precio que muestra la tarjeta como precio vigente (el nodo "discounted" en la UI).
 * Usa salePrice cuando no hay precio promocional.
 */
export const displayedPrice = (record: PlpRecord): number | undefined =>
  record.priceInfo.promoPrice?.price ?? record.priceInfo.salePrice;
