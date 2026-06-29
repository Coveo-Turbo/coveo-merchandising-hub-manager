import {describe, expect, it} from 'vitest';
import {mapRowsToListings} from '../src/utils/csvParser';
import type {CsvRow} from '../src/types';

describe('mapRowsToListings', () => {
  it('groups rows by listing name and deduplicates rules', () => {
    const rows: CsvRow[] = [
      {
        Name: 'Summer Sale',
        UrlPattern: 'https://site.example/summer;https://site.example/deals',
        FilterField: 'ec_category',
        FilterValue: 'Summer',
        FilterOperator: 'isExactly',
        Language: 'en',
        Country: 'US',
        Currency: 'USD',
      },
      {
        Name: 'Summer Sale',
        UrlPattern: 'https://site.example/summer',
        FilterField: 'ec_category',
        FilterValue: 'Summer',
        FilterOperator: 'isExactly',
        Language: 'en',
        Country: 'US',
        Currency: 'USD',
      },
    ];

    const listings = mapRowsToListings(rows, 'storefront');

    expect(listings).toHaveLength(1);
    expect(listings[0].patterns).toHaveLength(2);
    expect(listings[0].pageRules).toHaveLength(1);
    expect(listings[0].trackingId).toBe('storefront');
  });

  it('uses decimal filter values for numeric comparison operators', () => {
    const rows: CsvRow[] = [
      {
        Name: 'Price Filter',
        UrlPattern: 'https://site.example/pants',
        FilterField: 'ec_price',
        FilterValue: '200',
        FilterOperator: 'isGreaterThan',
        Language: 'en',
        Country: 'US',
        Currency: 'USD',
      },
    ];

    const listings = mapRowsToListings(rows, 'storefront');

    expect(listings[0].pageRules[0].filters[0]).toEqual({
      fieldName: 'ec_price',
      operator: 'isGreaterThan',
      value: {
        type: 'decimal',
        values: ['200'],
      },
    });
  });
});
