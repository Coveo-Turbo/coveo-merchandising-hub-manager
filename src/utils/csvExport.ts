import type { PublicListingPageResponseModel, CsvRow, QueryFilterModel } from '../types';

/**
 * Helper function to safely extract filter value as a string
 * Handles different value types: string, number, or array
 */
function getFilterValueAsString(filter: QueryFilterModel): string {
  if (!filter.value) return '';
  
  // Handle array values (join with comma)
  if (filter.value.values && Array.isArray(filter.value.values)) {
    return filter.value.values.join(',');
  }
  
  // Handle single value (string or number)
  if (filter.value.value !== undefined && filter.value.value !== null) {
    return String(filter.value.value);
  }
  
  return '';
}

/**
 * Converts listing page data from API format to flat CSV rows
 * Each row represents a single filter rule with its associated listing and locale
 * Multiple rules per listing generate multiple rows with the same Name/UrlPattern
 */
export function convertListingsToCsv(listings: PublicListingPageResponseModel[]): CsvRow[] {
  const rows: CsvRow[] = [];

  for (const listing of listings) {
    // Combine all URL patterns into a single semicolon-separated string
    const urlPattern = listing.patterns?.map(p => p.url).join(';') || '';

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
              FilterValue: getFilterValueAsString(filter),
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
