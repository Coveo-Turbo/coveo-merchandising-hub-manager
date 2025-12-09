import type { CsvRow, PublicListingPageRequestModel, ListingPageApiPageRuleModel } from '../types';

/**
 * Maps CSV rows to Listing Page models
 * Groups rows by Name and consolidates URL patterns and rules
 */
export const mapRowsToListings = (
  rows: CsvRow[],
  trackingId: string
): PublicListingPageRequestModel[] => {
  const listingsMap = new Map<string, PublicListingPageRequestModel>();

  rows.forEach(row => {
    if (!row.Name) return; // Skip invalid rows

    const name = row.Name.trim();
    
    // Get existing or create new listing
    let listing = listingsMap.get(name);
    if (!listing) {
      listing = {
        name: name,
        trackingId: trackingId,
        patterns: [],
        pageRules: []
      };
      listingsMap.set(name, listing);
    }

    // Add URL Patterns (support multiple separated by ;)
    if (row.UrlPattern) {
      const urls = row.UrlPattern.split(';').map(u => u.trim()).filter(u => u);
      urls.forEach(url => {
        // Avoid duplicates
        if (!listing!.patterns.find(p => p.url === url)) {
          listing!.patterns.push({ url });
        }
      });
    }

    // Add Rule if filter is present (skip rows without FilterField or FilterValue)
    if (row.FilterField && row.FilterValue) {
      const operator = row.FilterOperator || 'isExactly';
      
      // Normalize FilterField to lowercase (API requirement)
      const filterField = row.FilterField.toLowerCase();
      
      // Parse FilterValue - support semicolon-separated multiple values
      const filterValues = row.FilterValue.split(';').map(v => v.trim()).filter(v => v);
      const isArrayValue = filterValues.length > 1;
      
      // Check if a rule with the same filter and locale already exists
      const isDuplicateRule = listing.pageRules.some(existingRule => {
        // Check if filters match
        if (existingRule.filters.length !== 1) return false;
        
        const existingFilter = existingRule.filters[0];
        if (existingFilter.fieldName !== filterField || existingFilter.operator !== operator) {
          return false;
        }
        
        // Compare filter values
        let valuesMatch = false;
        if (isArrayValue) {
          // Compare array values efficiently using Set
          const existingValues = existingFilter.value.values || [];
          const filterValuesSet = new Set(filterValues);
          valuesMatch = existingValues.length === filterValues.length &&
            existingValues.every(v => filterValuesSet.has(v));
        } else {
          // Compare single value using the first parsed value
          valuesMatch = existingFilter.value.value === filterValues[0];
        }
        
        if (!valuesMatch) return false;
        
        // Check if locales match
        const hasLocale = !!(row.Language || row.Country || row.Currency);
        const existingHasLocale = !!(existingRule.locales && existingRule.locales.length > 0);
        
        if (!hasLocale && !existingHasLocale) {
          // Both have no locale - they match
          return true;
        }
        
        if (hasLocale !== existingHasLocale) {
          // One has locale, other doesn't - they don't match
          return false;
        }
        
        // Both have locales - compare them
        const existingLocale = existingRule.locales![0];
        return existingLocale.language === (row.Language || undefined) &&
               existingLocale.country === (row.Country || undefined) &&
               existingLocale.currency === (row.Currency || undefined);
      });
      
      // Only add the rule if it's not a duplicate
      if (!isDuplicateRule) {
        const localeParts = [row.Language, row.Country, row.Currency].filter(Boolean);
        const localeSuffix = localeParts.length > 0 ? ` [${localeParts.join('-')}]` : '';
        
        // Generate unique descriptive name (limit to 200 chars to allow for counter suffix)
        let valueDisplay = isArrayValue ? filterValues.join(';') : row.FilterValue;
        const maxValueLength = 150; // Leave room for field name, operator, locale, and counter
        if (valueDisplay.length > maxValueLength) {
          const valueCount = isArrayValue ? filterValues.length : 1;
          valueDisplay = `${valueDisplay.substring(0, maxValueLength)}... (${valueCount} value${valueCount > 1 ? 's' : ''})`;
        }
        
        const baseRuleName = `Rule: ${filterField} ${operator} ${valueDisplay}${localeSuffix}`;
        
        // Ensure final name is under 255 chars
        let ruleName = baseRuleName.length > 255 ? baseRuleName.substring(0, 250) + '...' : baseRuleName;
        
        // Ensure uniqueness within this listing page
        let counter = 1;
        while (listing.pageRules.some(r => r.name === ruleName)) {
          counter++;
          const suffix = ` (${counter})`;
          const maxLength = 255 - suffix.length;
          ruleName = (baseRuleName.length > maxLength ? baseRuleName.substring(0, maxLength) : baseRuleName) + suffix;
        }

        const rule: ListingPageApiPageRuleModel = {
          name: ruleName,
          filters: [{
            fieldName: filterField,
            operator: operator,
            value: isArrayValue ? {
              type: 'array',
              values: filterValues
            } : {
              type: 'string',
              value: filterValues[0] // Use first parsed value for single-value filter
            }
          }]
        };

        // Add Locale if present
        if (row.Language || row.Country || row.Currency) {
          rule.locales = [{
            language: row.Language || undefined,
            country: row.Country || undefined,
            currency: row.Currency || undefined
          }];
        }

        listing.pageRules.push(rule);
      }
    }
  });

  // Filter out listings with no pageRules (API requires at least one rule)
  return Array.from(listingsMap.values()).filter(listing => listing.pageRules.length > 0);
};
