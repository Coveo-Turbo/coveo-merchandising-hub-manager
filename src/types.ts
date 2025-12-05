
export interface ConfigState {
  organizationId: string;
  trackingId: string;
  accessToken: string;
  platformUrl: string;
}

// Coveo API Models based on provided Swagger
export interface MatchingConfigurationModel {
  url: string;
}

export interface RuleLocaleModel {
  language?: string;
  country?: string;
  currency?: string;
}

export interface QueryFilterModel {
  fieldName: string;
  operator: 'isExactly' | 'contains' | 'isBetween' | 'isGreaterThan' | 'isLessThan' | string;
  value: {
    type: 'string' | 'decimal' | 'array';
    value?: string | number;
    values?: string[];
  };
}

export interface ListingPageApiPageRuleModel {
  name: string;
  filters: QueryFilterModel[];
  locales?: RuleLocaleModel[];
}

export interface PublicListingPageRequestModel {
  id?: string;
  name: string;
  trackingId: string;
  patterns: MatchingConfigurationModel[];
  pageRules: ListingPageApiPageRuleModel[];
}

export interface PublicListingPageResponseModel {
  id: string;
  name: string;
  trackingId?: string;
  patterns: MatchingConfigurationModel[];
  pageRules: ListingPageApiPageRuleModel[];
}

export interface CommercePageModelPublicListingPageResponseModel {
  items: PublicListingPageResponseModel[];
  totalPages: number;
  totalEntries: number;
}

export interface CsvRow {
  Name: string;
  UrlPattern: string;
  FilterField?: string;
  FilterValue?: string;
  FilterOperator?: string;
  Language?: string;
  Country?: string;
  Currency?: string;
}

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';
