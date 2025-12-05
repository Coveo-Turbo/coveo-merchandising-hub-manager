import type { PublicListingPageResponseModel, CsvRow } from '../types';

/**
 * Converts listing page data from API format to flat CSV rows
 * Each row represents a single filter rule with its associated listing and locale
 * Multiple rules per listing generate multiple rows with the same Name/UrlPattern
 */
export function convertListingsToCsv(listings: PublicListingPageResponseModel[]): CsvRow[] {
  const rows: CsvRow[] = [];

  for (const listing of listings) {
    // Combine all URL patterns into a single semicolon-separated string
    const urlPattern = listing.patterns.map(p => p.url).join(';');

    if (listing.pageRules && listing.pageRules.length > 0) {
      // Generate a row for each rule
      for (const rule of listing.pageRules) {
        if (rule.filters && rule.filters.length > 0) {
          // For each filter in the rule
          for (const filter of rule.filters) {
            const row: CsvRow = {
              Name: listing.name,
              UrlPattern: urlPattern,
              FilterField: filter.fieldName,
              FilterValue: filter.value.value?.toString() || '',
              FilterOperator: filter.operator,
              Language: rule.locales?.[0]?.language || '',
              Country: rule.locales?.[0]?.country || '',
              Currency: rule.locales?.[0]?.currency || ''
            };
            rows.push(row);
          }
        } else {
          // Rule without filters - just listing with locale
          const row: CsvRow = {
            Name: listing.name,
            UrlPattern: urlPattern,
            FilterField: '',
            FilterValue: '',
            FilterOperator: '',
            Language: rule.locales?.[0]?.language || '',
            Country: rule.locales?.[0]?.country || '',
            Currency: rule.locales?.[0]?.currency || ''
          };
          rows.push(row);
        }
      }
    } else {
      // Listing without rules - just name and URL pattern
      const row: CsvRow = {
        Name: listing.name,
        UrlPattern: urlPattern,
        FilterField: '',
        FilterValue: '',
        FilterOperator: '',
        Language: '',
        Country: '',
        Currency: ''
      };
      rows.push(row);
    }
  }

  return rows;
}
