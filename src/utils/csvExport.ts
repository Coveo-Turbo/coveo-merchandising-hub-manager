import type { PublicListingPageResponseModel, CsvRow, QueryFilterModel, ConfigState, DetailedListingPageResponseModel, RuleLocaleModel } from '../types';
import { fetchListingById } from '../services/coveoApi';

/**
 * Helper function to safely extract filter value as a string
 * Handles different value types: string, number, or array
 */
function getFilterValueAsString(filter: QueryFilterModel): string {
  if (!filter.value) return '';
  
  // Handle array values (join with comma, filtering out null/undefined)
  if (filter.value.values && Array.isArray(filter.value.values)) {
    return filter.value.values
      .filter(v => v !== null && v !== undefined)
      .map(v => String(v))
      .join(',');
  }
  
  // Handle single value (string or number)
  if (filter.value.value !== undefined && filter.value.value !== null) {
    return String(filter.value.value);
  }
  
  return '';
}

/**
 * Helper function to create CSV rows from filters and locales
 * If multiple locales exist, creates one row per locale
 */
function createRowsFromFilters(
  name: string,
  urlPattern: string,
  filters: QueryFilterModel[],
  locales: RuleLocaleModel[] | undefined
): CsvRow[] {
  const rows: CsvRow[] = [];
  
  if (!filters || filters.length === 0) {
    // No filters, create row(s) for locale(s) only
    if (locales && locales.length > 0) {
      for (const locale of locales) {
        rows.push({
          Name: name,
          UrlPattern: urlPattern,
          FilterField: '',
          FilterValue: '',
          FilterOperator: '',
          Language: locale.language || '',
          Country: locale.country || '',
          Currency: locale.currency || ''
        });
      }
    } else {
      // No filters and no locales
      rows.push({
        Name: name,
        UrlPattern: urlPattern,
        FilterField: '',
        FilterValue: '',
        FilterOperator: '',
        Language: '',
        Country: '',
        Currency: ''
      });
    }
  } else {
    // Has filters
    if (locales && locales.length > 0) {
      // Create row for each filter × each locale
      for (const filter of filters) {
        for (const locale of locales) {
          rows.push({
            Name: name,
            UrlPattern: urlPattern,
            FilterField: filter.fieldName,
            FilterValue: getFilterValueAsString(filter),
            FilterOperator: filter.operator,
            Language: locale.language || '',
            Country: locale.country || '',
            Currency: locale.currency || ''
          });
        }
      }
    } else {
      // Filters but no locales
      for (const filter of filters) {
        rows.push({
          Name: name,
          UrlPattern: urlPattern,
          FilterField: filter.fieldName,
          FilterValue: getFilterValueAsString(filter),
          FilterOperator: filter.operator,
          Language: '',
          Country: '',
          Currency: ''
        });
      }
    }
  }
  
  return rows;
}

/**
 * Converts listing page data from API format to flat CSV rows
 * Each row represents a single filter rule with its associated listing and locale
 * Multiple rules per listing generate multiple rows with the same Name/UrlPattern
 * Handles both modern pageRules format and legacy filterRules format
 */
export async function convertListingsToCsv(
  listings: PublicListingPageResponseModel[], 
  config: ConfigState
): Promise<CsvRow[]> {
  const rows: CsvRow[] = [];

  for (const listing of listings) {
    // Combine all URL patterns into a single semicolon-separated string
    const urlPattern = listing.patterns
      ?.map(p => p.url)
      .filter(url => url !== null && url !== undefined)
      .join(';') || '';

    if (listing.pageRules && listing.pageRules.length > 0) {
      // Modern format: has pageRules
      for (const rule of listing.pageRules) {
        const ruleRows = createRowsFromFilters(
          listing.name,
          urlPattern,
          rule.filters,
          rule.locales
        );
        rows.push(...ruleRows);
      }
    } else {
      // Legacy format or no rules: fetch detailed listing to check for filterRules
      try {
        const detailedListing: DetailedListingPageResponseModel = await fetchListingById(config, listing.id);
        
        if (detailedListing.rules?.filterRules && detailedListing.rules.filterRules.length > 0) {
          // Legacy format: has filterRules
          for (const filterRule of detailedListing.rules.filterRules) {
            const ruleRows = createRowsFromFilters(
              listing.name,
              urlPattern,
              filterRule.filters,
              filterRule.locales
            );
            rows.push(...ruleRows);
          }
        } else {
          // No rules at all - just name and URL pattern
          rows.push({
            Name: listing.name,
            UrlPattern: urlPattern,
            FilterField: '',
            FilterValue: '',
            FilterOperator: '',
            Language: '',
            Country: '',
            Currency: ''
          });
        }
      } catch (error) {
        console.error(`Failed to fetch details for listing ${listing.id}:`, error);
        // Fallback: create basic row without filters
        rows.push({
          Name: listing.name,
          UrlPattern: urlPattern,
          FilterField: '',
          FilterValue: '',
          FilterOperator: '',
          Language: '',
          Country: '',
          Currency: ''
        });
      }
    }
  }

  return rows;
}
