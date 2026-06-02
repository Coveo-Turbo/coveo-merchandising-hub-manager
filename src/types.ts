export interface ConfigState {
  organizationId: string;
  trackingId: string;
  accessToken: string;
  platformUrl: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type SessionSource = 'manual' | 'hub';

export interface SessionContext extends ConfigState {
  trackingIds: string[];
  source: SessionSource;
  organizationName?: string;
  propertyName?: string;
  locale?: string;
}

export interface ConnectionSessionSnapshot extends SessionContext {
  selectedTrackingId: string;
}

export interface HubContextSnapshot {
  organizationId?: string;
  organizationName?: string;
  trackingId?: string;
  trackingIds?: string[];
  propertyName?: string;
  locale?: string;
  accessToken?: string;
  platformUrl?: string;
}

export interface EmbeddedAppearance {
  fontFamily?: string;
  backgroundColor?: string;
}

export interface MatchingConfigurationModel {
  url: string;
}

export interface RuleLocaleModel {
  language?: string;
  country?: string;
  currency?: string;
}

export interface QueryFilterValueModel {
  type: 'string' | 'decimal' | 'array';
  value?: string | number;
  values?: string[];
}

export interface QueryFilterModel {
  fieldName: string;
  operator: 'isExactly' | 'contains' | 'isBetween' | 'isGreaterThan' | 'isLessThan' | string;
  value: QueryFilterValueModel;
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

export interface LegacyFilterRuleModel {
  id: string;
  name: string;
  filters: QueryFilterModel[];
  locales?: RuleLocaleModel[];
  action: 'include' | 'exclude';
  updatedAt?: string;
  updatedBy?: string;
}

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
  | 'boost'
  | 'bury'
  | 'pin'
  | 'reservedPosition'
  | 'spotlightContent'
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

export interface HubRuleFilter {
  fieldName: string;
  operator: string;
  value?: {
    type?: string;
    values?: string[];
  };
}

export interface MerchandisingHubRuleRecord {
  name: string;
  description?: string;
  action: RuleAction;
  trackingId: string;
  enabled?: boolean;
  type?: string;
  filters?: HubRuleFilter[];
  value?: number;
  locales?: unknown[];
  rulePrecondition?: unknown;
  audienceConditions?: unknown[];
  updatedAt?: number;
  updatedBy?: string;
  id?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface MerchandisingHubRulePayload {
  rule: MerchandisingHubRuleRecord;
  solutionType?: 'listing' | 'search';
  schedule?: unknown;
  ruleTargets?: unknown;
  isGlobal?: boolean;
}

export type RuleImportModel = RuleModel | MerchandisingHubRulePayload;
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
export type AppSection = 'listings' | 'global-config' | 'context-mappings' | 'rules' | 'maintenance';
export type ListingStep = 1 | 2 | 3 | 4;
export type GlobalConfigType = 'search' | 'listing' | 'product-suggest' | 'recommendation';

export interface SortDisplayName {
  language: string;
  value: string;
}

export interface SortFieldDefinition {
  field?: string;
  direction?: string;
  displayNames?: SortDisplayName[];
}

export interface SortDefinition {
  sortCriteria?: string;
  fields?: SortFieldDefinition[];
}

export interface SharedSettings {
  perPage?: number;
  additionalFields?: string[];
  sorts?: SortDefinition[];
}

export type JsonValue = unknown;
export interface JsonObject {
  [key: string]: unknown;
}

export interface QueryConfigData {
  perPage?: number;
  additionalFields?: string[];
  sorts?: SortDefinition[];
  [key: string]: unknown;
}

export interface GlobalConfigDataShape extends QueryConfigData {
  id?: JsonValue;
  trackingId?: string;
  queryConfiguration?: QueryConfigData;
  rules?: JsonValue;
}

export interface ContextMappingDefinition extends JsonObject {
  key?: string;
  type?: string;
  destinations?: string[];
}

export interface ContextMappingsDocument extends JsonObject {
  mappings?: ContextMappingDefinition[];
}

export type ContextMappingsDataShape = ContextMappingsDocument | JsonValue[];

export interface AppStatus {
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface BulkCreateRulesResult {
  success: unknown[];
  errors: Array<{rule: string; error: string}>;
}

export interface CommerceTroubleshootDeployRequest {
  organizationId: string;
  accessToken: string;
  platformUrl: string;
  trackingId: string;
  hostedPageName: string;
  hostedPageId?: string;
  dryRun?: boolean;
}

export interface CommerceTroubleshootDeployKeyInfo {
  created: boolean;
  reused: boolean;
  source: 'managed' | 'provided';
  engineKeyId?: string;
  cmhKeyId?: string;
}

export interface CommerceTroubleshootDeployResult {
  organizationId: string;
  hostedPageName: string;
  hostedPageId?: string;
  deployed: boolean;
  diagnostics: string[];
  keyInfo: CommerceTroubleshootDeployKeyInfo;
}

export interface CommerceTroubleshootDeployFormState {
  hostedPageName: string;
  hostedPageId: string;
  trackingId: string;
  dryRun: boolean;
}
