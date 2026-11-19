import type { Response } from '@playwright/test';
import { settings } from '../config/settings';

/** Subset of the `POST /api/plp/search` payload that the frontend consumes. */
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

/** Matches the frontend search/filter/sort XHR. Optionally requires a fragment in the request body. */
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
 * Price the card shows as the current price (the "discounted" node in the UI).
 * Falls back to salePrice when there is no promo price.
 */
export const displayedPrice = (record: PlpRecord): number | undefined =>
  record.priceInfo.promoPrice?.price ?? record.priceInfo.salePrice;
