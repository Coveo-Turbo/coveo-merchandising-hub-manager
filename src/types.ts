
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

// Legacy listing page format (filter rules structure)
export interface LegacyFilterRuleModel {
  id: string;
  name: string;
  filters: QueryFilterModel[];
  locales?: RuleLocaleModel[];
  action: 'include' | 'exclude';
  updatedAt?: string;
  updatedBy?: string;
}

// Private API Rule Model (supports both Ranking and Filter rules)
export interface RuleCondition {
  field: string;
  operator: string;
  values?: string[];
  value?: string | number;
}

export interface RuleDefinition {
  boostFactor?: number;
  position?: number;
  [key: string]: unknown;
}

export type RuleAction = 
  // Ranking Rule Actions
  | 'boost' 
  | 'bury' 
  | 'pin' 
  | 'reservedPosition' 
  | 'spotlightContent'
  // Filter Rule Actions
  | 'include' 
  | 'exclude' 
  | 'onlyShow';

export interface RuleModel {
  id?: string;
  name: string;
  description?: string;
  trackingId: string;
  enabled: boolean;
  action: RuleAction;
  conditions?: RuleCondition[];
  definition: RuleDefinition;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Merchandising Hub UI export format
export interface MerchandisingHubRulePayload {
  rule: {
    name: string;
    description?: string;
    action: RuleAction;
    trackingId: string;
    enabled?: boolean;
    type?: string;
    filters?: Array<{
      fieldName: string;
      operator: string;
      value?: {
        type?: string;
        values?: string[];
      };
    }>;
    value?: number;
    locales?: any[];
    rulePrecondition?: any;
    audienceConditions?: any[];
    updatedAt?: number;
    updatedBy?: string;
    id?: string;
    createdBy?: string;
    createdAt?: string;
  };
  solutionType?: 'listing' | 'search';
  schedule?: any;
  ruleTargets?: any;
  isGlobal?: boolean;
}

// Union type for both formats
export type RuleImportModel = RuleModel | MerchandisingHubRulePayload;

// Legacy type alias for backward compatibility
export type RankingRuleModel = RuleModel;
export type RankingRuleCondition = RuleCondition;
export type RankingRuleDefinition = RuleDefinition;

export interface LegacyListingRulesModel {
  rankingRules: RankingRuleModel[];
  filterRules: LegacyFilterRuleModel[];
  pinRules: unknown[];
}

export interface DetailedListingPageResponseModel {
  id: string;
  name: string;
  trackingId?: string;
  patterns: MatchingConfigurationModel[];
  pageRules?: ListingPageApiPageRuleModel[];
  rules?: LegacyListingRulesModel;
}

export interface PublicListingPageResponseModel {
  id: string;
  name: string;
  trackingId?: string;
  patterns: MatchingConfigurationModel[];
  pageRules?: ListingPageApiPageRuleModel[];
}

export interface CommercePageModelPublicListingPageResponseModel {
  items: PublicListingPageResponseModel[];
  totalPages: number;
  totalEntries: number;
}

export interface CsvRow {
  Name: string;
  UrlPattern: string;
  FilterField: string;
  FilterValue: string;
  FilterOperator: string;
  Language: string;
  Country: string;
  Currency: string;
}

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';
