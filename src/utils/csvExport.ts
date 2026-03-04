import type { PublicListingPageResponseModel, CsvRow, QueryFilterModel, ConfigState, RuleLocaleModel } from '../types';
import { fetchListingById } from '../services/coveoApi';

/**
 * Helper function to safely extract filter value as a string
 * Handles different value types: string, number, or array
 */
function getFilterValueAsString(filter: QueryFilterModel): string {
  if (!filter.value) return '';
  
  // Handle array values (join with semicolon, filtering out null/undefined)
  if (filter.value.values && Array.isArray(filter.value.values)) {
    return filter.value.values
      .filter(v => v !== null && v !== undefined)
      .map(v => String(v))
      .join(';');
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

  // Separate listings into those with pageRules (modern) and those without (legacy)
  const modernListings: PublicListingPageResponseModel[] = [];
  const legacyListings: PublicListingPageResponseModel[] = [];
  
  for (const listing of listings) {
    if (listing.pageRules && listing.pageRules.length > 0) {
      modernListings.push(listing);
    } else {
      legacyListings.push(listing);
    }
  }

  // Process modern listings synchronously
  for (const listing of modernListings) {
    const urlPattern = listing.patterns
      ?.map(p => p.url)
      .filter(url => url !== null && url !== undefined)
      .join(';') || '';

    // TypeScript safety: pageRules is guaranteed to exist and have length > 0 for modernListings
    if (listing.pageRules) {
      for (const rule of listing.pageRules) {
        const ruleRows = createRowsFromFilters(
          listing.name,
          urlPattern,
          rule.filters,
          rule.locales
        );
        rows.push(...ruleRows);
      }
    }
  }

  // Fetch all legacy listings in parallel for better performance
  if (legacyListings.length > 0) {
    const detailedListingsPromises = legacyListings.map(listing =>
      fetchListingById(config, listing.id)
        .then(detailed => ({ listing, detailed, error: null }))
        .catch(error => ({ listing, detailed: null, error }))
    );

    const detailedListingsResults = await Promise.all(detailedListingsPromises);

    for (const result of detailedListingsResults) {
      const { listing, detailed, error } = result;
      const urlPattern = listing.patterns
        ?.map(p => p.url)
        .filter(url => url !== null && url !== undefined)
        .join(';') || '';

      if (error) {
        console.error(`Failed to fetch details for listing "${listing.name}" (${listing.id}):`, error);
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
        continue;
      }

      if (detailed?.rules?.filterRules && detailed.rules.filterRules.length > 0) {
        // Legacy format: has filterRules
        for (const filterRule of detailed.rules.filterRules) {
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
    }
  }

  return rows;
}
